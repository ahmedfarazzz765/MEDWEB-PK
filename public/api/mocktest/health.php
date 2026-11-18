<?php
// Mock Test API — health check only. No secrets, no Firestore calls, no
// dependencies — just confirms Hostinger actually executes PHP for us and
// reports what's available so we know what the real endpoints can rely on
// before any of them are built.
declare(strict_types=1);

header('Content-Type: application/json');
header('Cache-Control: no-store');

echo json_encode([
    'ok' => true,
    'service' => 'mocktest-api',
    'time' => gmdate('c'),
    'php_version' => PHP_VERSION,
    'extensions' => [
        'openssl' => extension_loaded('openssl'),
        'curl' => extension_loaded('curl'),
        'json' => extension_loaded('json'),
        'mbstring' => extension_loaded('mbstring'),
    ],
], JSON_PRETTY_PRINT);
