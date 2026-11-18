<?php
// POST { attemptId }, Authorization: Bearer <firebase admin ID token>
// Resets an attempt back to 'entered' so the student can retake it — the
// confirm dialog is the frontend's job (ConfirmDialog, same as every other
// destructive admin action); this endpoint just does the write + logs it.
// Does NOT touch certCode/certificateImageUrl if a certificate was already
// issued — revoking a previously-earned certificate is a separate, explicit
// action (the existing Certificates page's own Revoke button), not an
// implicit side effect of a retake reset.
declare(strict_types=1);
require_once __DIR__ . '/_lib/attempt.php';
require_once __DIR__ . '/_lib/admin_auth.php';

require_post();
$fs = mocktest_firestore();
$adminEmail = require_admin_write($fs);

$body = read_json_body();
$attemptId = trim((string) ($body['attemptId'] ?? ''));
if ($attemptId === '') json_error('attemptId is required.', 400);

$attempt = $fs->getDoc('mockAttempts/' . $attemptId);
if (!$attempt) json_error('Attempt not found.', 404);

$fs->patchDoc('mockAttempts/' . $attemptId, [
    'status' => 'entered',
    'tokenHash' => '',
    'questionOrder' => [],
    'currentIndex' => 0,
    'answers' => [],
    'correctCount' => 0,
    'incorrectCount' => 0,
    'unansweredCount' => 0,
    'percent' => 0,
    'eligible' => false,
    'finishedAt' => null,
    'emailStatus' => '',
]);

$fs->createDoc('activityLog', bin2hex(random_bytes(12)), [
    'action' => 'mocktest_reset_attempt',
    'actorEmail' => $adminEmail,
    'details' => ['attemptId' => $attemptId, 'enrollmentId' => $attempt['enrollmentId'] ?? ''],
    'createdAt' => gmdate('c'),
]);

json_response(['ok' => true]);
