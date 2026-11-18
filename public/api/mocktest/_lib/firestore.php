<?php
// Minimal Firestore REST client — no SDK/composer. Auth is a Google OAuth2
// JWT bearer flow signed with the service account's RSA private key via
// openssl_sign (no library needed, just the openssl extension health.php
// already confirmed is available). Access tokens are cached to a local
// file for ~50 minutes so we don't round-trip to Google on every request.
declare(strict_types=1);

class FirestoreError extends Exception {
    public int $httpStatus;
    public function __construct(string $message, int $httpStatus = 500) {
        parent::__construct($message);
        $this->httpStatus = $httpStatus;
    }
}

class Firestore {
    private string $projectId;
    private string $clientEmail;
    private string $privateKey;
    private string $baseUrl;
    private string $cacheDir;

    public function __construct(string $serviceAccountPath, string $cacheDir) {
        if (!is_file($serviceAccountPath)) {
            throw new FirestoreError('Service account file not found at ' . $serviceAccountPath, 500);
        }
        $sa = json_decode((string) file_get_contents($serviceAccountPath), true);
        if (!is_array($sa) || empty($sa['client_email']) || empty($sa['private_key']) || empty($sa['project_id'])) {
            throw new FirestoreError('Service account JSON is missing required fields', 500);
        }
        $this->projectId = $sa['project_id'];
        $this->clientEmail = $sa['client_email'];
        $this->privateKey = $sa['private_key'];
        $this->baseUrl = "https://firestore.googleapis.com/v1/projects/{$this->projectId}/databases/(default)/documents";
        $this->cacheDir = rtrim($cacheDir, '/');
    }

    // ── OAuth2 JWT bearer flow ──────────────────────────────────────────
    private function base64url(string $data): string {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private function getAccessToken(): string {
        $cacheFile = $this->cacheDir . '/token_cache.json';
        if (is_file($cacheFile)) {
            $cached = json_decode((string) file_get_contents($cacheFile), true);
            if (is_array($cached) && !empty($cached['expires']) && $cached['expires'] > time() + 60) {
                return $cached['token'];
            }
        }

        $now = time();
        $header = $this->base64url(json_encode(['alg' => 'RS256', 'typ' => 'JWT']));
        $claims = $this->base64url(json_encode([
            'iss' => $this->clientEmail,
            'scope' => 'https://www.googleapis.com/auth/datastore',
            'aud' => 'https://oauth2.googleapis.com/token',
            'iat' => $now,
            'exp' => $now + 3600,
        ]));
        $signingInput = $header . '.' . $claims;
        $signature = '';
        $ok = openssl_sign($signingInput, $signature, $this->privateKey, OPENSSL_ALGO_SHA256);
        if (!$ok) {
            throw new FirestoreError('Failed to sign JWT with service account key', 500);
        }
        $jwt = $signingInput . '.' . $this->base64url($signature);

        $ch = curl_init('https://oauth2.googleapis.com/token');
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POSTFIELDS => http_build_query([
                'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'assertion' => $jwt,
            ]),
            CURLOPT_TIMEOUT => 15,
        ]);
        $resp = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        $data = json_decode((string) $resp, true);
        if ($status !== 200 || empty($data['access_token'])) {
            throw new FirestoreError('OAuth token exchange failed: ' . substr((string) $resp, 0, 300), 502);
        }

        $token = $data['access_token'];
        $expires = $now + (int) ($data['expires_in'] ?? 3600) - 60; // 60s safety margin
        @file_put_contents($cacheFile, json_encode(['token' => $token, 'expires' => $expires]), LOCK_EX);
        return $token;
    }

    // ── Value <-> Firestore typed-value conversion ──────────────────────
    public static function toValue($v): array {
        if ($v === null) return ['nullValue' => null];
        if (is_bool($v)) return ['booleanValue' => $v];
        if (is_int($v)) return ['integerValue' => (string) $v];
        if (is_float($v)) return ['doubleValue' => $v];
        if (is_array($v) && array_is_list($v)) {
            return ['arrayValue' => ['values' => array_map([self::class, 'toValue'], $v)]];
        }
        if (is_array($v)) {
            $fields = [];
            foreach ($v as $k => $vv) $fields[$k] = self::toValue($vv);
            return ['mapValue' => ['fields' => $fields]];
        }
        return ['stringValue' => (string) $v];
    }

    public static function fromValue(array $v) {
        if (array_key_exists('nullValue', $v)) return null;
        if (array_key_exists('booleanValue', $v)) return $v['booleanValue'];
        if (array_key_exists('integerValue', $v)) return (int) $v['integerValue'];
        if (array_key_exists('doubleValue', $v)) return (float) $v['doubleValue'];
        if (array_key_exists('timestampValue', $v)) return $v['timestampValue'];
        if (array_key_exists('stringValue', $v)) return $v['stringValue'];
        if (array_key_exists('arrayValue', $v)) {
            return array_map([self::class, 'fromValue'], $v['arrayValue']['values'] ?? []);
        }
        if (array_key_exists('mapValue', $v)) {
            return self::fieldsToArray($v['mapValue']['fields'] ?? []);
        }
        return null;
    }

    public static function fieldsToArray(array $fields): array {
        $out = [];
        foreach ($fields as $k => $v) $out[$k] = self::fromValue($v);
        return $out;
    }

    private static function arrayToFields(array $plain): array {
        $fields = [];
        foreach ($plain as $k => $v) $fields[$k] = self::toValue($v);
        return $fields;
    }

    // Turns a Firestore document response (with its own resource name) into
    // ['id' => ..., ...plain fields...], or null if $doc is falsy.
    private static function docToPlain(?array $doc): ?array {
        if (!$doc || empty($doc['name'])) return null;
        $parts = explode('/', $doc['name']);
        $id = end($parts);
        return array_merge(['id' => $id], self::fieldsToArray($doc['fields'] ?? []));
    }

    // ── HTTP ─────────────────────────────────────────────────────────
    private function request(string $method, string $url, ?array $body = null): array {
        $token = $this->getAccessToken();
        $ch = curl_init($url);
        $headers = ['Authorization: Bearer ' . $token, 'Content-Type: application/json'];
        $opts = [
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_TIMEOUT => 15,
        ];
        if ($body !== null) $opts[CURLOPT_POSTFIELDS] = json_encode($body);
        curl_setopt_array($ch, $opts);
        $resp = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        $data = json_decode((string) $resp, true);
        return ['status' => $status, 'data' => $data, 'raw' => $resp];
    }

    // ── Document operations ─────────────────────────────────────────
    // Returns ['id'=>..., ...fields] or null if not found.
    public function getDoc(string $path): ?array {
        $res = $this->request('GET', $this->baseUrl . '/' . $path);
        if ($res['status'] === 404) return null;
        if ($res['status'] !== 200) {
            throw new FirestoreError('Firestore getDoc failed (' . $path . '): ' . substr((string) $res['raw'], 0, 300), 502);
        }
        return self::docToPlain($res['data']);
    }

    // Creates a new doc with an explicit ID. Firestore's createDocument
    // semantics are create-only — it 409s if the ID already exists, which
    // is exactly the atomic "one attempt per registration" guarantee we
    // need, with no separate transaction required.
    // Returns ['created' => bool, 'doc' => plain fields array].
    public function createDoc(string $collectionPath, string $docId, array $plainFields): array {
        $url = $this->baseUrl . '/' . $collectionPath . '?documentId=' . rawurlencode($docId);
        $res = $this->request('POST', $url, ['fields' => self::arrayToFields($plainFields)]);
        if ($res['status'] === 200 || $res['status'] === 201) {
            return ['created' => true, 'doc' => self::docToPlain($res['data'])];
        }
        $alreadyExists = $res['status'] === 409
            || (is_array($res['data']) && isset($res['data']['error']['status']) && $res['data']['error']['status'] === 'ALREADY_EXISTS');
        if ($alreadyExists) {
            $existing = $this->getDoc($collectionPath . '/' . $docId);
            return ['created' => false, 'doc' => $existing];
        }
        throw new FirestoreError('Firestore createDoc failed (' . $collectionPath . '/' . $docId . '): ' . substr((string) $res['raw'], 0, 300), 502);
    }

    // Partial update — only the given field names are touched, others on
    // the existing doc are left alone.
    public function patchDoc(string $path, array $plainFields): array {
        $mask = implode('&', array_map(fn($k) => 'updateMask.fieldPaths=' . rawurlencode($k), array_keys($plainFields)));
        $url = $this->baseUrl . '/' . $path . '?' . $mask;
        $res = $this->request('PATCH', $url, ['fields' => self::arrayToFields($plainFields)]);
        if ($res['status'] !== 200) {
            throw new FirestoreError('Firestore patchDoc failed (' . $path . '): ' . substr((string) $res['raw'], 0, 300), 502);
        }
        return self::docToPlain($res['data']);
    }

    // Structured query against a top-level collection. $where = [[field, op, value], ...]
    // all AND-ed together. $op is one of EQUAL, LESS_THAN, GREATER_THAN, etc.
    public function query(string $collectionId, array $where = [], int $limit = 10): array {
        $filters = array_map(function ($w) {
            [$field, $op, $value] = $w;
            return [
                'fieldFilter' => [
                    'field' => ['fieldPath' => $field],
                    'op' => $op,
                    'value' => self::toValue($value),
                ],
            ];
        }, $where);

        $structuredQuery = [
            'from' => [['collectionId' => $collectionId]],
            'limit' => $limit,
        ];
        if (count($filters) === 1) {
            $structuredQuery['where'] = $filters[0];
        } elseif (count($filters) > 1) {
            $structuredQuery['where'] = ['compositeFilter' => ['op' => 'AND', 'filters' => $filters]];
        }

        $res = $this->request('POST', $this->baseUrl . ':runQuery', ['structuredQuery' => $structuredQuery]);
        if ($res['status'] !== 200) {
            throw new FirestoreError('Firestore query failed (' . $collectionId . '): ' . substr((string) $res['raw'], 0, 300), 502);
        }
        $out = [];
        foreach ((array) $res['data'] as $row) {
            if (!empty($row['document'])) $out[] = self::docToPlain($row['document']);
        }
        return $out;
    }

    public function queryOne(string $collectionId, array $where = []): ?array {
        $rows = $this->query($collectionId, $where, 1);
        return $rows[0] ?? null;
    }
}
