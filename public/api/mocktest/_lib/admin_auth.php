<?php
declare(strict_types=1);
require_once __DIR__ . '/util.php';

// Mirrors src/constants/superAdmins.js byte-for-byte — PHP can't import a
// JS file, so like docs/firestore.rules.proposed, this is a second
// hardcoded copy. Keep all three in sync.
const MOCKTEST_SUPER_ADMINS = ['medwebpk@gmail.com', 'admin@gmail.com'];

function firebase_project_id(): string {
    $secrets = mocktest_secrets();
    if (!empty($secrets['FIREBASE_PROJECT_ID'])) return $secrets['FIREBASE_PROJECT_ID'];
    $saPath = mocktest_private_dir() . '/service-account.json';
    $sa = json_decode((string) @file_get_contents($saPath), true);
    return $sa['project_id'] ?? '';
}

function google_id_token_certs(): array {
    $cacheFile = mocktest_private_dir() . '/google_certs_cache.json';
    if (is_file($cacheFile) && filemtime($cacheFile) > time() - 3600) {
        $cached = json_decode((string) file_get_contents($cacheFile), true);
        if (is_array($cached)) return $cached;
    }
    $ch = curl_init('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com');
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10]);
    $resp = curl_exec($ch);
    curl_close($ch);
    $certs = json_decode((string) $resp, true);
    if (is_array($certs)) {
        @file_put_contents($cacheFile, json_encode($certs), LOCK_EX);
        return $certs;
    }
    return [];
}

function base64url_decode(string $data): string {
    return (string) base64_decode(strtr($data, '-_', '+/') . str_repeat('=', (4 - strlen($data) % 4) % 4));
}

// Verifies a Firebase Auth ID token's RS256 signature against Google's
// published certs, and checks iss/aud/exp. Returns the decoded payload
// (with 'email') on success, or null on any failure — callers must treat
// null as "not authenticated", never fall back to trusting the token.
function verify_firebase_id_token(string $idToken): ?array {
    $parts = explode('.', $idToken);
    if (count($parts) !== 3) return null;
    [$headerB64, $payloadB64, $sigB64] = $parts;
    $header = json_decode(base64url_decode($headerB64), true);
    $payload = json_decode(base64url_decode($payloadB64), true);
    $signature = base64url_decode($sigB64);
    if (!is_array($header) || !is_array($payload) || empty($header['kid'])) return null;

    $certs = google_id_token_certs();
    $pem = $certs[$header['kid']] ?? null;
    if (!$pem) return null;

    $publicKey = openssl_pkey_get_public($pem);
    if (!$publicKey) return null;
    $signingInput = $headerB64 . '.' . $payloadB64;
    $ok = openssl_verify($signingInput, $signature, $publicKey, OPENSSL_ALGO_SHA256);
    if ($ok !== 1) return null;

    $projectId = firebase_project_id();
    $now = time();
    if (($payload['aud'] ?? '') !== $projectId) return null;
    if (($payload['iss'] ?? '') !== 'https://securetoken.google.com/' . $projectId) return null;
    if (($payload['exp'] ?? 0) < $now) return null;
    if (($payload['iat'] ?? $now) > $now + 60) return null;
    if (empty($payload['email'])) return null;

    return $payload;
}

// Reads Authorization: Bearer <firebase-id-token>, verifies it, and
// confirms the account is a super admin or a non-viewer admin (mirrors
// useAdminPermissions.js's canWrite — "isAdmin && role !== 'viewer'").
// 401/403s and exits on any failure; returns the admin's email on success.
function require_admin_write(Firestore $fs): string {
    $headers = function_exists('getallheaders') ? getallheaders() : [];
    $auth = $headers['Authorization'] ?? $headers['authorization'] ?? ($_SERVER['HTTP_AUTHORIZATION'] ?? '');
    if (!preg_match('/^Bearer\s+(.+)$/i', (string) $auth, $m)) {
        json_error('Missing admin credentials.', 401);
    }
    $payload = verify_firebase_id_token(trim($m[1]));
    if (!$payload) {
        json_error('Invalid or expired admin session.', 401);
    }
    $email = $payload['email'];

    if (in_array($email, MOCKTEST_SUPER_ADMINS, true)) {
        return $email;
    }
    $record = $fs->getDoc('adminUsers/' . $email);
    if (!$record || ($record['role'] ?? 'editor') === 'viewer') {
        json_error('You do not have permission to perform this action.', 403);
    }
    return $email;
}
