<?php
// GET/POST, Authorization: Bearer <token>
// Pure resume — used on page load/refresh/reconnect to find out where the
// student is without submitting anything. Still runs the expiry-advance
// sweep, so reopening a long-abandoned tab correctly closes out whatever
// questions timed out while it was closed.
declare(strict_types=1);
require_once __DIR__ . '/_lib/attempt.php';

$fs = mocktest_firestore();
$attempt = require_attempt_by_token($fs);

if (($attempt['status'] ?? '') === 'entered') {
    json_response(['ok' => true, 'status' => 'entered']);
}

$mockTest = load_mock_test($fs, $attempt['mockTestId']);
$attempt = advance_expired_questions($fs, $mockTest, $attempt);
json_response(build_state_payload($attempt, $mockTest));
