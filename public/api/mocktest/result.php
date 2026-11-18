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
// student's browser can never read it directly. certTemplate has no
// answer-key material in it at all (just an image URL + text positions),
// so it's the one piece of that doc safe to hand back here, needed so the
// result page can render the certificate client-side exactly like the
// admin's own CertPositionEditor preview does.
$certTemplate = null;
if (!empty($attempt['eligible']) && ($attempt['certificateStatus'] ?? '') !== 'issued') {
    $mockTest = load_mock_test($fs, $attempt['mockTestId']);
    $certTemplate = $mockTest['certTemplate'] ?? null;
}

json_response([
    'ok' => true,
    'status' => 'completed',
    // Lets the browser independently derive the exact same cert code PHP
    // will use (see derive_mock_test_cert_code() in _lib/util.php) BEFORE
    // compositing the certificate image, so the code drawn into the image
    // and the code on the Firestore doc issue-cert.php creates always match.
    'attemptId' => $attempt['id'],
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
    'certTemplate' => $certTemplate,
]);
