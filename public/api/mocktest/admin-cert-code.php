<?php
// POST { attemptId }, Authorization: Bearer <firebase admin ID token>
// Reveals the cert code admin-generate-cert.php will use for a given
// attempt, WITHOUT creating anything — the admin's browser needs this
// before it renders the certificate image (the code is drawn into the
// pixels), and can't compute it itself since derive_mock_test_cert_code()
// is an HMAC keyed by the server-only CRON_SECRET (deliberately not
// derivable client-side by anyone, admin included — see that function's
// comment in _lib/util.php). Still admin-auth-gated even though the value
// itself isn't especially sensitive, so it's never exposed to anyone who
// isn't already allowed to see this attempt.
declare(strict_types=1);
require_once __DIR__ . '/_lib/attempt.php';
require_once __DIR__ . '/_lib/admin_auth.php';

require_post();
$fs = mocktest_firestore();
require_admin_write($fs);

$body = read_json_body();
$attemptId = trim((string) ($body['attemptId'] ?? ''));
if ($attemptId === '') json_error('attemptId is required.', 400);

$attempt = $fs->getDoc('mockAttempts/' . $attemptId);
if (!$attempt) json_error('Attempt not found.', 404);

json_response([
    'ok' => true,
    'certCode' => $attempt['certCode'] ?? derive_mock_test_cert_code($attemptId),
]);
