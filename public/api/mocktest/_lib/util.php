<?php
declare(strict_types=1);

require_once __DIR__ . '/firestore.php';

const MOCKTEST_CLOUDINARY_CLOUD_HOSTS = ['res.cloudinary.com'];

// Every endpoint is a plain top-level script (no surrounding try/catch), so
// an uncaught FirestoreError (or anything else) would otherwise fall
// through to PHP's default HTML error page — breaking the "this API always
// returns JSON" contract the frontend relies on, and potentially leaking a
// file path in the message. This turns any uncaught throw into the same
// json_error() shape as a deliberate one.
set_exception_handler(function (Throwable $e): void {
    $status = $e instanceof FirestoreError ? $e->httpStatus : 500;
    json_error($e->getMessage(), $status);
});

function json_response(array $data, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json');
    header('Cache-Control: no-store');
    echo json_encode($data);
    exit;
}

function json_error(string $message, int $status = 400, array $extra = []): void {
    json_response(array_merge(['ok' => false, 'error' => $message], $extra), $status);
}

function read_json_body(): array {
    $raw = file_get_contents('php://input');
    $data = json_decode((string) $raw, true);
    return is_array($data) ? $data : [];
}

// Loaded from the private, deploy-time-written config — see
// .github/workflows/deploy.yml and public/api/mocktest/_private/.htaccess.
function mocktest_private_dir(): string {
    return __DIR__ . '/../_private';
}

function mocktest_firestore(): Firestore {
    static $fs = null;
    if ($fs === null) {
        $dir = mocktest_private_dir();
        $fs = new Firestore($dir . '/service-account.json', $dir);
    }
    return $fs;
}

function mocktest_secrets(): array {
    static $secrets = null;
    if ($secrets === null) {
        $path = mocktest_private_dir() . '/secrets.php';
        $secrets = is_file($path) ? (require $path) : [];
        if (!is_array($secrets)) $secrets = [];
    }
    return $secrets;
}

// Collapses whitespace and lowercases for a forgiving (but not loose) exact
// name match — "Hassan  Raza" and "hassan raza" match, "Hassan" alone doesn't.
function normalize_name(string $name): string {
    $name = trim(preg_replace('/\s+/', ' ', $name) ?? $name);
    return mb_strtolower($name);
}

// Accepts 03xxxxxxxxx, +923xxxxxxxxx, 923xxxxxxxxx, with/without spaces or
// dashes — reduces to the bare 10-digit subscriber number (3xxxxxxxxx) so
// all three forms compare equal.
function normalize_phone(string $phone): string {
    $digits = preg_replace('/\D+/', '', $phone) ?? '';
    if (strlen($digits) === 11 && str_starts_with($digits, '0')) {
        $digits = substr($digits, 1);
    } elseif (strlen($digits) === 12 && str_starts_with($digits, '92')) {
        $digits = substr($digits, 2);
    } elseif (strlen($digits) === 13 && str_starts_with($digits, '092')) {
        $digits = substr($digits, 3);
    }
    return substr($digits, -10);
}

function new_token(): string {
    return bin2hex(random_bytes(32));
}

function hash_token(string $token): string {
    return hash('sha256', $token);
}

// Mock-test certs use a DETERMINISTIC code — HMAC-SHA256(attemptId,
// CRON_SECRET), first 10 hex chars (hex is already a valid subset of the
// random scheme's base36 alphabet, so the format is indistinguishable from
// a webinar cert's), made 'MEDWEB-' + that, rather than new_cert_code()'s
// random one. Reason: the certificate IMAGE has the code drawn into its
// pixels by the browser BEFORE this doc is created (see issue-cert.php's
// comment) — a random code generated only at doc-creation time would never
// match what's already baked into the uploaded image.
//
// HMAC (not plain sha256(attemptId)) specifically so the code can't be
// computed by anyone who only knows (or guesses) an attemptId — it needs
// the server-only CRON_SECRET too. The browser never computes this itself;
// it's handed the code by result.php (student) or admin-cert-code.php
// (admin), both of which require a valid session (attempt token / Firebase
// admin ID token) before revealing it for a given attempt.
//
// Collision risk is a non-issue: createDoc()'s create-only semantics make
// a repeat call for the same attempt land on the SAME existing doc rather
// than erroring, which is actually a better idempotency story than the
// random scheme's collision-check-and-retry loop.
function derive_mock_test_cert_code(string $attemptId): string {
    $secret = mocktest_secrets()['CRON_SECRET'] ?? '';
    return 'MEDWEB-' . substr(hash_hmac('sha256', $attemptId, $secret), 0, 10);
}

// Same scheme as certificatesService.generateUniqueCode() in
// src/firebase/services.js — MEDWEB-<10 random base36 chars>, so certs
// created here verify on the exact same public page/query as webinar certs.
// (Kept for completeness/future use — issue_certificate_for_attempt()
// actually uses derive_mock_test_cert_code() above, not this.)
function new_cert_code(Firestore $fs): string {
    $alphabet = '0123456789abcdefghijklmnopqrstuvwxyz';
    for ($attempt = 0; $attempt < 10; $attempt++) {
        $code = 'MEDWEB-';
        for ($i = 0; $i < 10; $i++) {
            $code .= $alphabet[random_int(0, strlen($alphabet) - 1)];
        }
        $existing = $fs->queryOne('certificates', [['certCode', 'EQUAL', $code]]);
        if (!$existing) return $code;
    }
    throw new FirestoreError('Could not generate a unique certificate code', 500);
}

// File-based IP rate limiter — 5 failed eligibility attempts per IP per 10
// minutes. Local disk (not Firestore) since this is a same-server, single-
// node Hostinger deploy and it avoids a Firestore round-trip on every hit.
function rate_limit_check_and_record(string $ip, bool $recordFailure): void {
    $dir = mocktest_private_dir() . '/ratelimit';
    if (!is_dir($dir)) @mkdir($dir, 0700, true);
    $file = $dir . '/' . md5($ip) . '.json';
    $now = time();
    $windowStart = $now - 600;

    $fh = fopen($file, 'c+');
    if (!$fh) return; // fail open — never let a disk hiccup block legitimate students
    flock($fh, LOCK_EX);
    $raw = stream_get_contents($fh);
    $timestamps = json_decode((string) $raw, true);
    if (!is_array($timestamps)) $timestamps = [];
    $timestamps = array_values(array_filter($timestamps, fn($t) => $t > $windowStart));

    if (count($timestamps) >= 5) {
        flock($fh, LOCK_UN);
        fclose($fh);
        json_error('Too many attempts. Please try again in a few minutes.', 429);
    }

    if ($recordFailure) {
        $timestamps[] = $now;
        ftruncate($fh, 0);
        rewind($fh);
        fwrite($fh, json_encode($timestamps));
    }
    flock($fh, LOCK_UN);
    fclose($fh);
}

// Looks up the attempt by its bearer token, 401s if missing/invalid/expired.
// Tokens don't expire on a timer by themselves — re-entry (enter.php) is
// what reissues them; this just confirms the hash matches what's on file.
function require_attempt_by_token(Firestore $fs): array {
    $headers = function_exists('getallheaders') ? getallheaders() : [];
    $auth = $headers['Authorization'] ?? $headers['authorization'] ?? ($_SERVER['HTTP_AUTHORIZATION'] ?? '');
    if (!preg_match('/^Bearer\s+(.+)$/i', (string) $auth, $m)) {
        json_error('Missing or malformed Authorization header.', 401);
    }
    $token = trim($m[1]);
    $hash = hash_token($token);
    $attempt = $fs->queryOne('mockAttempts', [['tokenHash', 'EQUAL', $hash]]);
    if (!$attempt) {
        json_error('Session expired or invalid. Please re-enter your details.', 401);
    }
    return $attempt;
}

function require_post(): void {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        json_error('Method not allowed.', 405);
    }
}

function client_ip(): string {
    return $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
}
