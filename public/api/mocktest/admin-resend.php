<?php
// POST { attemptId }, Authorization: Bearer <firebase admin ID token>
// Explicit admin action — always sends, regardless of emailStatus, unlike
// the automatic sends elsewhere which are careful never to duplicate.
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
if (!$attempt || ($attempt['status'] ?? '') !== 'completed') {
    json_error('Attempt not found or not completed yet.', 404);
}
$mockTest = load_mock_test($fs, $attempt['mockTestId']);

$cert = !empty($attempt['certCode']) ? ['certCode' => $attempt['certCode']] : null;
$certPending = !empty($attempt['eligible']) && !$cert;
$sent = mocktest_send_result_email($attempt, $mockTest, $cert, $certPending);

$fs->patchDoc('mockAttempts/' . $attemptId, ['emailStatus' => $sent ? 'sent' : 'failed']);
$fs->createDoc('activityLog', bin2hex(random_bytes(12)), [
    'action' => 'mocktest_resend_email',
    'actorEmail' => $adminEmail,
    'details' => ['attemptId' => $attemptId, 'sent' => $sent],
    'createdAt' => gmdate('c'),
]);

json_response(['ok' => $sent, 'sent' => $sent]);
