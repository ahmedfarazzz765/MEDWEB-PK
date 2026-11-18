<?php
// GET/POST ?secret=<MOCKTEST_CRON_SECRET>
// For attempts that are completed + eligible but still waiting on a
// certificate 10+ minutes after finishing (student closed the tab before
// their browser rendered it), sends the "certificate will follow" result
// email so the student at least knows their score promptly — admin can
// Resend once the certificate is actually issued (via admin-generate-cert
// or the student revisiting the link). Meant to be called on a schedule
// (e.g. a GitHub Actions cron hitting this URL every few minutes) — not
// admin-session-authenticated since there's no logged-in user driving it,
// just a shared secret.
declare(strict_types=1);
require_once __DIR__ . '/_lib/attempt.php';

$secrets = mocktest_secrets();
$expected = $secrets['CRON_SECRET'] ?? '';
$given = $_GET['secret'] ?? ($_POST['secret'] ?? '');
if ($expected === '' || !hash_equals($expected, (string) $given)) {
    json_error('Not found.', 404); // 404, not 401 — don't even confirm this endpoint exists
}

$fs = mocktest_firestore();
$candidates = $fs->query('mockAttempts', [
    ['status', 'EQUAL', 'completed'],
    ['eligible', 'EQUAL', true],
    ['emailStatus', 'EQUAL', 'pending'],
], 200);

$cutoff = time() - 600;
$processed = 0;
$mockTestCache = [];

foreach ($candidates as $attempt) {
    $finishedAt = strtotime((string) ($attempt['finishedAt'] ?? ''));
    if ($finishedAt === false || $finishedAt > $cutoff) continue;

    $mtId = $attempt['mockTestId'];
    if (!isset($mockTestCache[$mtId])) {
        $mockTestCache[$mtId] = load_mock_test($fs, $mtId);
    }
    $sent = mocktest_send_result_email($attempt, $mockTestCache[$mtId], null, true);
    if ($sent) {
        $fs->patchDoc('mockAttempts/' . $attempt['id'], ['emailStatus' => 'sent_pending_cert']);
        $processed++;
    }
}

json_response(['ok' => true, 'processed' => $processed, 'checked' => count($candidates)]);
