<?php
// GET, Authorization: Bearer <token>
// Reopening the link after completion just returns the saved result —
// scoring never re-runs.
declare(strict_types=1);
require_once __DIR__ . '/_lib/attempt.php';

$fs = mocktest_firestore();
$attempt = require_attempt_by_token($fs);

if (($attempt['status'] ?? '') !== 'completed') {
    // Let the frontend decide what to do (e.g. redirect back into the test)
    // rather than erroring — reaching the result page before finishing is
    // a routing/state issue on the client, not a hard failure.
    json_response(['ok' => true, 'status' => $attempt['status'] ?? 'entered']);
}

json_response([
    'ok' => true,
    'status' => 'completed',
    'studentName' => $attempt['studentName'] ?? '',
    'courseTitle' => $attempt['courseTitle'] ?? '',
    'testTitle' => $attempt['mockTestTitle'] ?? '',
    'totalQuestions' => $attempt['totalQuestions'] ?? 0,
    'correctCount' => $attempt['correctCount'] ?? 0,
    'incorrectCount' => $attempt['incorrectCount'] ?? 0,
    'unansweredCount' => $attempt['unansweredCount'] ?? 0,
    'percent' => $attempt['percent'] ?? 0,
    'passPercent' => $attempt['passPercent'] ?? 70,
    'eligible' => (bool) ($attempt['eligible'] ?? false),
    'certificateStatus' => $attempt['certificateStatus'] ?? 'not_applicable',
    'certCode' => $attempt['certCode'] ?? null,
    'certificateImageUrl' => $attempt['certificateImageUrl'] ?? null,
]);
