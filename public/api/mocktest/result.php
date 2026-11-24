<?php
// GET, Authorization: Bearer <token>
// Reopening the link after completion just returns the saved result —
// scoring never re-runs.
declare(strict_types=1);
require_once __DIR__ . '/_lib/attempt.php';

$fs = mocktest_firestore();
maybe_run_fallback_sweep($fs);
$attempt = require_attempt_by_token($fs);

if (($attempt['status'] ?? '') !== 'completed') {
    // Let the frontend decide what to do (e.g. redirect back into the test)
    // rather than erroring — reaching the result page before finishing is
    // a routing/state issue on the client, not a hard failure.
    json_response(['ok' => true, 'status' => $attempt['status'] ?? 'entered']);
}

// mockTests is admin-only in Firestore rules (it holds answer keys) — the
// student's browser can never read it directly, so it's loaded here
// server-side for both the certTemplate (below) and the full per-question
// review (build_review() — safe now that the attempt is finished).
$mockTest = load_mock_test($fs, $attempt['mockTestId']);

// certTemplate has no answer-key material in it at all (just an image URL +
// text positions), so it's the one piece of that doc safe to hand back
// here, needed so the result page can render the certificate client-side
// exactly like the admin's own CertPositionEditor preview does.
//
// certCode: the browser can't compute derive_mock_test_cert_code() itself
// (it's an HMAC keyed by the server-only CRON_SECRET, deliberately — see
// that function's comment) — this is the one place a NOT-YET-issued
// attempt's eventual code is revealed, and only to the attempt's own
// token-holder, so the certificate image can be drawn with the exact code
// issue-cert.php will use when it actually creates the record.
$certTemplate = null;
$certCode = $attempt['certCode'] ?? null;
if (!empty($attempt['eligible'])) {
    if (($attempt['certificateStatus'] ?? '') !== 'issued') {
        $certTemplate = $mockTest['certTemplate'] ?? null;
        $certCode = derive_mock_test_cert_code($attempt['id']);
    }
}

json_response([
    'ok' => true,
    'status' => 'completed',
    'attemptId' => $attempt['id'],
    'studentName' => $attempt['studentName'] ?? '',
    'enrollmentId' => $attempt['enrollmentId'] ?? '',
    'courseTitle' => $attempt['courseTitle'] ?? '',
    'testTitle' => $attempt['mockTestTitle'] ?? '',
    'totalQuestions' => $attempt['totalQuestions'] ?? 0,
    'correctCount' => $attempt['correctCount'] ?? 0,
    'incorrectCount' => $attempt['incorrectCount'] ?? 0,
    'unansweredCount' => $attempt['unansweredCount'] ?? 0,
    'percent' => $attempt['percent'] ?? 0,
    'passPercent' => $attempt['passPercent'] ?? 70,
    'startedAt' => $attempt['startedAt'] ?? null,
    'finishedAt' => $attempt['finishedAt'] ?? null,
    'eligible' => (bool) ($attempt['eligible'] ?? false),
    'certificateStatus' => $attempt['certificateStatus'] ?? 'not_applicable',
    'certCode' => $certCode,
    'certificateImageUrl' => $attempt['certificateImageUrl'] ?? null,
    'certTemplate' => $certTemplate,
    'review' => build_review($mockTest, $attempt),
]);
