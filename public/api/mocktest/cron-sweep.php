<?php
// GET/POST ?secret=<MOCKTEST_CRON_SECRET>
// Manual-use-only trigger for the same fallback-email sweep that normally
// rides opportunistically on real traffic (see maybe_run_fallback_sweep()
// in _lib/attempt.php, called from enter.php/answer.php/result.php) — no
// scheduled job hits this (would burn private-repo Actions minutes for no
// real benefit). Kept around for whenever you want to force it on demand.
// Not admin-session-authenticated since there's no logged-in user driving
// it, just a shared secret.
declare(strict_types=1);
require_once __DIR__ . '/_lib/attempt.php';

$secrets = mocktest_secrets();
$expected = $secrets['CRON_SECRET'] ?? '';
$given = $_GET['secret'] ?? ($_POST['secret'] ?? '');
if ($expected === '' || !hash_equals($expected, (string) $given)) {
    json_error('Not found.', 404); // 404, not 401 — don't even confirm this endpoint exists
}

$fs = mocktest_firestore();
$result = run_fallback_sweep($fs);
json_response(array_merge(['ok' => true], $result));
