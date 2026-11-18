<?php
// POST { imageUrl }, Authorization: Bearer <student attempt token>
// Called by the result page's browser AFTER it has already rendered the
// certificate via the existing certificateGenerator.js canvas pipeline and
// uploaded the image to Cloudinary — this endpoint only creates the
// authoritative Firestore record from that URL (server decides eligibility
// and the cert code; the browser never gets to assert either). Idempotent.
declare(strict_types=1);
require_once __DIR__ . '/_lib/attempt.php';

require_post();
$fs = mocktest_firestore();
$attempt = require_attempt_by_token($fs);
$mockTest = load_mock_test($fs, $attempt['mockTestId']);

$body = read_json_body();
$imageUrl = trim((string) ($body['imageUrl'] ?? ''));
if ($imageUrl === '') json_error('imageUrl is required.', 400);

try {
    $attempt = issue_certificate_for_attempt($fs, $attempt, $mockTest, $imageUrl);
} catch (FirestoreError $e) {
    json_error($e->getMessage(), $e->httpStatus);
}

json_response([
    'ok' => true,
    'certCode' => $attempt['certCode'],
    'certificateImageUrl' => $attempt['certificateImageUrl'],
]);
