<?php
// POST { courseSlug, registrationId, fullName, phone }
// Validates eligibility, creates (or reuses) the one attempt doc for this
// registration, and issues a fresh bearer token for it. Never reveals
// *which* check failed — same generic message for "no such registration",
// "wrong course", "not approved", "name doesn't match", "phone doesn't
// match" — so the endpoint can't be used to enumerate valid registration
// IDs or probe which field was wrong.
declare(strict_types=1);
require_once __DIR__ . '/_lib/attempt.php';

require_post();
$ip = client_ip();
rate_limit_check_and_record($ip, false); // 429 before doing any work if already over the limit

$body = read_json_body();
$courseSlug = trim((string) ($body['courseSlug'] ?? ''));
$registrationId = trim((string) ($body['registrationId'] ?? ''));
$fullName = trim((string) ($body['fullName'] ?? ''));
$phone = trim((string) ($body['phone'] ?? ''));

if ($courseSlug === '' || $registrationId === '' || $fullName === '' || $phone === '') {
    json_error('Please fill in all fields.', 400);
}

const GENERIC_INELIGIBLE = 'Registration ID is invalid or is not eligible for this mock test.';

function fail_ineligible(string $ip): void {
    rate_limit_check_and_record($ip, true);
    json_error(GENERIC_INELIGIBLE, 403);
}

$fs = mocktest_firestore();
maybe_run_fallback_sweep($fs);

$course = $fs->queryOne('courses', [['slug', 'EQUAL', $courseSlug]]);
if (!$course || empty($course['mockTestEnabled']) || empty($course['mockTestId'])) {
    fail_ineligible($ip);
}

$mockTest = $fs->getDoc('mockTests/' . $course['mockTestId']);
if (!$mockTest || ($mockTest['status'] ?? '') !== 'Ready') {
    fail_ineligible($ip);
}

$enrollment = $fs->queryOne('courseEnrollments', [['enrollmentId', 'EQUAL', $registrationId]]);
if (!$enrollment || ($enrollment['courseId'] ?? null) !== $course['id']) {
    fail_ineligible($ip);
}
if (($enrollment['status'] ?? '') !== 'Approved') {
    fail_ineligible($ip);
}

// CourseEnrollForm.jsx writes `name`; CourseLinkedForm.jsx (Form-Builder-
// linked courses) writes `fullName` instead — check whichever is present.
$enrolledName = (string) ($enrollment['name'] ?? $enrollment['fullName'] ?? '');
if (normalize_name($enrolledName) !== normalize_name($fullName)) {
    fail_ineligible($ip);
}
if (normalize_phone((string) ($enrollment['whatsapp'] ?? '')) !== normalize_phone($phone)) {
    fail_ineligible($ip);
}

// Deterministic ID -> createDoc's create-only semantics are the atomicity
// guarantee for "one attempt per registration", even under concurrent tabs.
$attemptId = $course['id'] . '__' . $enrollment['enrollmentId'];
$result = $fs->createDoc('mockAttempts', $attemptId, [
    'courseId' => $course['id'],
    'courseSlug' => $course['slug'],
    'courseTitle' => $course['title'] ?? '',
    'mockTestId' => $mockTest['id'],
    'mockTestTitle' => $mockTest['title'] ?? '',
    'enrollmentId' => $enrollment['enrollmentId'],
    'studentName' => $enrolledName,
    'email' => $enrollment['email'] ?? '',
    'phone' => $enrollment['whatsapp'] ?? '',
    'status' => 'entered',
    'tokenHash' => '',
    'createdAt' => gmdate('c'),
]);
$attempt = $result['doc'];

// Re-entry with the correct ID+name+phone always re-issues a token for the
// SAME attempt — never a new one. Works for an attempt at any stage,
// including 'completed' (so the student/admin can reopen the result).
$token = new_token();
$fs->patchDoc('mockAttempts/' . $attemptId, [
    'tokenHash' => hash_token($token),
    'tokenIssuedAt' => gmdate('c'),
]);

json_response([
    'ok' => true,
    'token' => $token,
    'status' => $attempt['status'],
    'testTitle' => $mockTest['title'] ?? '',
    'courseTitle' => $course['title'] ?? '',
]);
