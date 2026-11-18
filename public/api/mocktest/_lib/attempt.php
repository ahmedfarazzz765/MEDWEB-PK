<?php
declare(strict_types=1);
require_once __DIR__ . '/util.php';
require_once __DIR__ . '/email.php';

function load_mock_test(Firestore $fs, string $id): array {
    $mt = $fs->getDoc('mockTests/' . $id);
    if (!$mt) throw new FirestoreError('Mock test not found: ' . $id, 404);
    return $mt;
}

// Builds (once) or returns the stored server-shuffled question order —
// indices into $mockTest['questions']. Options are never shuffled, only
// question order, per spec.
function ensure_question_order(array $mockTest, array $attempt): array {
    if (!empty($attempt['questionOrder'])) return $attempt['questionOrder'];
    $n = count($mockTest['questions'] ?? []);
    $order = range(0, $n - 1);
    shuffle($order);
    return $order;
}

function per_question_seconds(array $mockTest, int $questionIndex): int {
    $q = $mockTest['questions'][$questionIndex] ?? [];
    $seconds = $q['seconds'] ?? null;
    if (is_numeric($seconds) && $seconds > 0) return (int) $seconds;
    return (int) ($mockTest['defaultSeconds'] ?? 60);
}

// Public (answer-key-free) view of the question currently at $orderPos in
// the shuffled order.
function public_question_view(array $mockTest, array $order, int $orderPos): ?array {
    if ($orderPos >= count($order)) return null;
    $qIndex = $order[$orderPos];
    $q = $mockTest['questions'][$qIndex] ?? null;
    if (!$q) return null;
    return [
        'position' => $orderPos,
        'total' => count($order),
        'text' => $q['questionText'] ?? '',
        'options' => $q['options'] ?? [],
        'seconds' => per_question_seconds($mockTest, $qIndex),
    ];
}

// Core resume/advance logic — shared by state.php, answer.php and
// result.php. Walks the attempt forward past any question(s) whose
// server-timestamped deadline has already passed (e.g. the student closed
// the tab), recording each as answered-if-submitted-else-unanswered,
// WITHOUT granting bonus time: each auto-advance's new deadline starts
// from the previous deadline, not from "now". Patches Firestore once at
// the end. Returns the (possibly updated) attempt array.
function advance_expired_questions(Firestore $fs, array $mockTest, array $attempt): array {
    if (($attempt['status'] ?? '') !== 'in_progress') return $attempt;

    $order = $attempt['questionOrder'];
    $answers = $attempt['answers'] ?? [];
    $idx = (int) $attempt['currentIndex'];
    $deadline = strtotime((string) $attempt['currentQuestionStartedAt']) + per_question_seconds($mockTest, $order[$idx]);
    $now = time();
    $changed = false;

    while ($idx < count($order) && $now > $deadline) {
        if (!array_key_exists((string) $idx, $answers) && !array_key_exists($idx, $answers)) {
            $answers[$idx] = ['selected' => null, 'autoExpired' => true];
        }
        $idx++;
        $changed = true;
        if ($idx < count($order)) {
            $deadline = $deadline + per_question_seconds($mockTest, $order[$idx]);
        }
    }

    if (!$changed) return $attempt;

    $attempt['currentIndex'] = $idx;
    $attempt['answers'] = $answers;
    $attempt['currentQuestionStartedAt'] = gmdate('c', $deadline);

    if ($idx >= count($order)) {
        return finish_attempt($fs, $mockTest, $attempt);
    }

    $fs->patchDoc('mockAttempts/' . $attempt['id'], [
        'currentIndex' => $idx,
        'answers' => $answers,
        'currentQuestionStartedAt' => $attempt['currentQuestionStartedAt'],
    ]);
    return $attempt;
}

// Scores the attempt and marks it completed. 1 mark per correct answer, 0
// for wrong/unanswered, no negative marking. Eligibility compares the
// EXACT fraction (correctCount*100 >= passPercent*total) to avoid float
// rounding ever flipping a borderline pass/fail; percent is rounded only
// for display.
function finish_attempt(Firestore $fs, array $mockTest, array $attempt): array {
    $order = $attempt['questionOrder'];
    $answers = $attempt['answers'] ?? [];
    $questions = $mockTest['questions'];
    $total = count($order);
    $correctCount = 0;
    foreach ($order as $pos => $qIndex) {
        $a = $answers[$pos] ?? $answers[(string) $pos] ?? null;
        $selected = is_array($a) ? ($a['selected'] ?? null) : null;
        $isCorrect = $selected !== null && (int) $selected === (int) ($questions[$qIndex]['correctIndex'] ?? -1);
        if ($isCorrect) $correctCount++;
        if (is_array($a)) {
            $a['correct'] = $isCorrect;
            $answers[$pos] = $a;
        }
    }
    $passPercent = (float) ($attempt['passPercent'] ?? $mockTest['passPercent'] ?? 70);
    $eligible = $total > 0 && ($correctCount * 100) >= ($passPercent * $total);
    $percent = $total > 0 ? round(($correctCount / $total) * 100, 2) : 0;

    $update = [
        'status' => 'completed',
        'answers' => $answers,
        'correctCount' => $correctCount,
        'incorrectCount' => $total - $correctCount - count(array_filter($answers, fn($a) => ($a['selected'] ?? null) === null)),
        'unansweredCount' => count(array_filter($answers, fn($a) => ($a['selected'] ?? null) === null)),
        'totalQuestions' => $total,
        'percent' => $percent,
        'eligible' => $eligible,
        'finishedAt' => gmdate('c'),
        'certificateStatus' => $eligible ? 'pending' : 'not_applicable',
        'emailStatus' => 'pending',
    ];
    $fs->patchDoc('mockAttempts/' . $attempt['id'], $update);
    $attempt = array_merge($attempt, $update);

    if (!$eligible) {
        $sent = mocktest_send_result_email($attempt, $mockTest, null);
        $fs->patchDoc('mockAttempts/' . $attempt['id'], ['emailStatus' => $sent ? 'sent' : 'failed']);
        $attempt['emailStatus'] = $sent ? 'sent' : 'failed';
    }
    // Eligible: email is deferred until issue-cert.php (or the 10-minute
    // cron-sweep.php fallback) — see those files.

    return $attempt;
}

// Cloudinary cloud name used by the existing webinar/course certificate
// pipeline (src/lib/certificateGenerator.js) — the browser uploads there
// unsigned via an upload preset, so this is public info already shipped in
// the frontend bundle, safe to hardcode here too. Used only to sanity-check
// that a submitted image URL is actually ours before trusting it.
function cloudinary_host_allowed(string $url): bool {
    $host = parse_url($url, PHP_URL_HOST);
    return $host !== false && in_array($host, MOCKTEST_CLOUDINARY_CLOUD_HOSTS, true);
}

// Idempotent: calling this twice for the same completed/eligible attempt
// never creates a second certificates doc — it just returns the existing
// one. Shape matches certificatesService exactly (same fields the webinar/
// course pipeline writes) so the public Certificate Verification page and
// the admin Certificates page/folders work on it unchanged.
function issue_certificate_for_attempt(Firestore $fs, array $attempt, array $mockTest, string $imageUrl): array {
    if (($attempt['status'] ?? '') !== 'completed' || empty($attempt['eligible'])) {
        throw new FirestoreError('Attempt is not a completed, eligible result.', 409);
    }
    if (!empty($attempt['certCode']) && ($attempt['certificateStatus'] ?? '') === 'issued') {
        return $attempt; // already issued — no-op
    }
    if (!cloudinary_host_allowed($imageUrl)) {
        throw new FirestoreError('Certificate image URL is not on our Cloudinary account.', 400);
    }

    $certCode = new_cert_code($fs);
    $certId = $certCode; // certificatesService also keys docs by certCode — see services.js
    $fs->createDoc('certificates', $certId, [
        'certCode' => $certCode,
        'recipient' => $attempt['studentName'] ?? '',
        'recipientEmail' => $attempt['email'] ?? '',
        'phone' => $attempt['phone'] ?? '',
        'title' => $mockTest['title'] ?? '',
        'sourceType' => 'mockTest',
        'sourceId' => $mockTest['id'],
        'mockTestId' => $mockTest['id'],
        'mockTestTitle' => $mockTest['title'] ?? '',
        'courseId' => $attempt['courseId'] ?? '',
        'courseTitle' => $attempt['courseTitle'] ?? '',
        'attemptId' => $attempt['id'],
        'certificateImageUrl' => $imageUrl,
        'issued' => gmdate('Y-m-d'),
        'status' => 'Valid',
        'verifications' => 0,
        'createdAt' => gmdate('c'),
    ]);

    $update = [
        'certCode' => $certCode,
        'certificateImageUrl' => $imageUrl,
        'certificateStatus' => 'issued',
    ];
    $fs->patchDoc('mockAttempts/' . $attempt['id'], $update);
    $attempt = array_merge($attempt, $update);

    // Only the first issuance sends the "certificate issued" email — a
    // later admin "Generate certificate" re-run (e.g. after a failed first
    // attempt) doesn't re-email if cron-sweep.php's fallback already went
    // out, matching "admin Resend is explicit" from the spec.
    if (($attempt['emailStatus'] ?? '') !== 'sent') {
        $sent = mocktest_send_result_email($attempt, $mockTest, ['certCode' => $certCode]);
        $fs->patchDoc('mockAttempts/' . $attempt['id'], ['emailStatus' => $sent ? 'sent' : 'failed']);
        $attempt['emailStatus'] = $sent ? 'sent' : 'failed';
    }

    return $attempt;
}

// Shared "where is this attempt right now" response shape for start.php,
// state.php and answer.php — either the current question + its deadline,
// or (if finish_attempt has already run) the final result.
function build_state_payload(array $attempt, array $mockTest): array {
    if (($attempt['status'] ?? '') === 'completed') {
        return ['ok' => true, 'status' => 'completed'];
    }
    $q = public_question_view($mockTest, $attempt['questionOrder'], $attempt['currentIndex']);
    $deadline = strtotime((string) $attempt['currentQuestionStartedAt']) + $q['seconds'];
    return [
        'ok' => true,
        'status' => 'in_progress',
        'question' => $q,
        'serverTime' => time(),
        'deadline' => $deadline,
        'secondsRemaining' => max(0, $deadline - time()),
    ];
}
