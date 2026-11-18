<?php
// POST { position: int, selectedIndex: int|null }, Authorization: Bearer <token>
// "Next" submits an answer for the question at `position` and advances —
// no going back. `position` must match the attempt's current index at the
// moment the server processes the request; a late submission for a
// question that has since auto-expired (e.g. the request was in flight
// when the timer ran out) is silently ignored rather than erroring, and
// the response just reflects wherever the attempt actually is now — this
// is the idempotent "late/duplicate submissions rejected" behaviour.
declare(strict_types=1);
require_once __DIR__ . '/_lib/attempt.php';

require_post();
$fs = mocktest_firestore();
maybe_run_fallback_sweep($fs);
$attempt = require_attempt_by_token($fs);

if (($attempt['status'] ?? '') !== 'in_progress') {
    json_response(['ok' => true, 'status' => $attempt['status'] ?? 'entered']);
}

$mockTest = load_mock_test($fs, $attempt['mockTestId']);
$attempt = advance_expired_questions($fs, $mockTest, $attempt);
if ($attempt['status'] === 'completed') {
    json_response(build_state_payload($attempt, $mockTest));
}

$body = read_json_body();
$position = (int) ($body['position'] ?? -1);
$selected = array_key_exists('selectedIndex', $body) ? $body['selectedIndex'] : null;
if ($selected !== null) $selected = (int) $selected;

if ($position !== (int) $attempt['currentIndex']) {
    // Stale/late — the question has already moved on. Just resync the
    // client to wherever the attempt actually is.
    json_response(build_state_payload($attempt, $mockTest));
}

$order = $attempt['questionOrder'];
$qIndex = $order[$position];
$optionCount = count($mockTest['questions'][$qIndex]['options'] ?? []);
if ($selected !== null && ($selected < 0 || $selected >= $optionCount)) {
    json_error('Invalid option selected.', 400);
}

$answers = $attempt['answers'] ?? [];
$answers[$position] = ['selected' => $selected, 'autoExpired' => false];
$nextIndex = $position + 1;

$attempt['answers'] = $answers;
$attempt['currentIndex'] = $nextIndex;
$attempt['currentQuestionStartedAt'] = gmdate('c');

if ($nextIndex >= count($order)) {
    $attempt = finish_attempt($fs, $mockTest, $attempt);
} else {
    $fs->patchDoc('mockAttempts/' . $attempt['id'], [
        'answers' => $answers,
        'currentIndex' => $nextIndex,
        'currentQuestionStartedAt' => $attempt['currentQuestionStartedAt'],
    ]);
}

json_response(build_state_payload($attempt, $mockTest));
