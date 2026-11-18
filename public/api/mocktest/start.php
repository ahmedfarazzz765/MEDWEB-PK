<?php
// POST, Authorization: Bearer <token>
// Idempotent: calling this again on an already-started attempt just
// returns the current state rather than reshuffling/restarting.
declare(strict_types=1);
require_once __DIR__ . '/_lib/attempt.php';

require_post();
$fs = mocktest_firestore();
$attempt = require_attempt_by_token($fs);
$mockTest = load_mock_test($fs, $attempt['mockTestId']);

if (($attempt['status'] ?? '') === 'entered') {
    $order = ensure_question_order($mockTest, $attempt);
    $update = [
        'questionOrder' => $order,
        'currentIndex' => 0,
        'currentQuestionStartedAt' => gmdate('c'),
        'answers' => [],
        'totalQuestions' => count($order),
        'passPercent' => (float) ($mockTest['passPercent'] ?? 70),
        'status' => 'in_progress',
        'startedAt' => gmdate('c'),
    ];
    $fs->patchDoc('mockAttempts/' . $attempt['id'], $update);
    $attempt = array_merge($attempt, $update);
}

$attempt = advance_expired_questions($fs, $mockTest, $attempt);
json_response(build_state_payload($attempt, $mockTest));
