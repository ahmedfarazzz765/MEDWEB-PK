<?php
declare(strict_types=1);

// Sends via Brevo's REST API directly (same provider the rest of the admin
// panel uses via src/firebase/email.js, but called server-side here with
// its own GitHub-secret-sourced key rather than the Firestore-settings key
// the browser uses — see mocktest_secrets() in util.php).
function mocktest_brevo_send(string $toEmail, string $toName, string $subject, string $htmlContent): bool {
    $secrets = mocktest_secrets();
    $apiKey = $secrets['BREVO_API_KEY'] ?? '';
    $fromEmail = $secrets['BREVO_FROM_EMAIL'] ?? 'no-reply@medwebpk.com';
    $fromName = $secrets['BREVO_FROM_NAME'] ?? 'MEDWEB';
    if ($apiKey === '' || $toEmail === '') return false;

    $ch = curl_init('https://api.brevo.com/v3/smtp/email');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'api-key: ' . $apiKey,
            'Content-Type: application/json',
            'Accept: application/json',
        ],
        CURLOPT_POSTFIELDS => json_encode([
            'sender' => ['email' => $fromEmail, 'name' => $fromName],
            'to' => [['email' => $toEmail, 'name' => $toName ?: $toEmail]],
            'subject' => $subject,
            'htmlContent' => $htmlContent,
        ]),
        CURLOPT_TIMEOUT => 15,
    ]);
    $resp = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return $status >= 200 && $status < 300;
}

// $cert = null for a not-eligible result, or ['certCode'=>..., 'imageUrl'=>...]
// once issued. A third case — eligible but cert not yet issued — is handled
// by cron-sweep.php calling this with $certPending = true.
function mocktest_send_result_email(array $attempt, array $mockTest, ?array $cert, bool $certPending = false): bool {
    $name = htmlspecialchars((string) ($attempt['studentName'] ?? 'Student'), ENT_QUOTES);
    $testTitle = htmlspecialchars((string) ($mockTest['title'] ?? $attempt['mockTestTitle'] ?? 'Mock Test'), ENT_QUOTES);
    $courseTitle = htmlspecialchars((string) ($attempt['courseTitle'] ?? ''), ENT_QUOTES);
    $percent = $attempt['percent'] ?? 0;
    $correct = $attempt['correctCount'] ?? 0;
    $total = $attempt['totalQuestions'] ?? 0;
    $passPercent = $attempt['passPercent'] ?? ($mockTest['passPercent'] ?? 70);

    if (!empty($attempt['eligible']) && $cert) {
        $verifyUrl = 'https://medwebpk.com/certificate/' . rawurlencode((string) $cert['certCode']);
        $subject = "Your result for {$testTitle} — Certificate issued";
        $body = "<p>Hi {$name},</p>"
            . "<p>You scored <strong>{$correct}/{$total} ({$percent}%)</strong> on <strong>{$testTitle}</strong>"
            . ($courseTitle ? " ({$courseTitle})" : '') . ". Congratulations — you're eligible for a certificate.</p>"
            . "<p><a href=\"{$verifyUrl}\">View / download your certificate</a></p>";
    } elseif (!empty($attempt['eligible']) && $certPending) {
        $subject = "Your result for {$testTitle}";
        $body = "<p>Hi {$name},</p>"
            . "<p>You scored <strong>{$correct}/{$total} ({$percent}%)</strong> on <strong>{$testTitle}</strong>"
            . ($courseTitle ? " ({$courseTitle})" : '') . ". You're eligible for a certificate — it's still being generated and we'll follow up with it shortly.</p>";
    } else {
        $subject = "Your result for {$testTitle}";
        $body = "<p>Hi {$name},</p>"
            . "<p>You scored <strong>{$correct}/{$total} ({$percent}%)</strong> on <strong>{$testTitle}</strong>"
            . ($courseTitle ? " ({$courseTitle})" : '') . ".</p>"
            . "<p>The pass mark for a certificate is {$passPercent}%, so you are not eligible for a certificate this time.</p>";
    }

    return mocktest_brevo_send((string) ($attempt['email'] ?? ''), (string) ($attempt['studentName'] ?? ''), $subject, $body);
}
