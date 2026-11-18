<?php
// POST { attemptId, imageUrl }, Authorization: Bearer <firebase admin ID token>
// Same flow as issue-cert.php but triggered from the admin's own browser
// (Results tab "Generate certificate") for a student who left before
// their own browser rendered it — the admin's browser does the canvas
// render + Cloudinary upload (reusing the exact same certificateGenerator.js
// code), then calls this. Idempotent, same as issue-cert.php.
declare(strict_types=1);
require_once __DIR__ . '/_lib/attempt.php';
require_once __DIR__ . '/_lib/admin_auth.php';

require_post();
$fs = mocktest_firestore();
require_admin_write($fs);

$body = read_json_body();
$attemptId = trim((string) ($body['attemptId'] ?? ''));
$imageUrl = trim((string) ($body['imageUrl'] ?? ''));
if ($attemptId === '' || $imageUrl === '') json_error('attemptId and imageUrl are required.', 400);

$attempt = $fs->getDoc('mockAttempts/' . $attemptId);
if (!$attempt) json_error('Attempt not found.', 404);
$mockTest = load_mock_test($fs, $attempt['mockTestId']);

try {
    $attempt = issue_certificate_for_attempt($fs, $attempt, $mockTest, $imageUrl);
} catch (FirestoreError $e) {
    json_error($e->getMessage(), $e->httpStatus);
}

json_response(['ok' => true, 'certCode' => $attempt['certCode'], 'certificateImageUrl' => $attempt['certificateImageUrl']]);
