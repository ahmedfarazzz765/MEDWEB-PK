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

// ── Branded HTML wrapper — PORTED FROM src/firebase/email.js's wrapHtml(),
// identical markup/inline styles, so a mock-test result email looks exactly
// like every other MEDWEB-PK email (webinar confirmation, webinar
// certificate). Keep the two in sync by hand if that file's design ever
// changes — PHP can't import a JS template literal.
function mocktest_wrap_html(string $bodyHtml): string {
    $year = gmdate('Y');
    return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- HEADER -->
        <tr><td style="background:linear-gradient(135deg,#1655c3,#64ac37);border-radius:16px 16px 0 0;padding:28px 32px;text-align:center;">
          <h1 style="margin:0;color:#fff;font-size:22px;font-weight:900;letter-spacing:-0.5px;">MEDWEB<span style="color:rgba(255,255,255,0.7)">-PK</span></h1>
          <p style="margin:4px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">Connecting Medical Minds</p>
        </td></tr>

        <!-- BODY -->
        <tr><td style="background:#fff;padding:32px;border-radius:0 0 16px 16px;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
          {$bodyHtml}
        </td></tr>

        <!-- FOOTER -->
        <tr><td style="padding:20px;text-align:center;">
          <p style="margin:0;color:#aaa;font-size:11px;">© {$year} MEDWEB-PK · Pakistan's Medical Education Platform</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
HTML;
}

// The "Don't stop here" / Join Community / Explore / socials block shared
// by both the eligible and not-eligible mock-test emails — identical
// content to the bottom of sendCertificateEmail() in src/firebase/email.js,
// factored out here since both branches below need it but only one needs
// the certificate-specific middle section.
function mocktest_email_footer_sections(Firestore $fs, string $homeUrl): string {
    $settings = $fs->getDoc('settings/site');
    $communityLink = $settings['communityLink'] ?? '';
    $socialLinks = [
        'WhatsApp' => $settings['footerWhatsapp'] ?? '',
        'Facebook' => $settings['footerFacebook'] ?? '',
        'Instagram' => $settings['footerInstagram'] ?? '',
        'LinkedIn' => $settings['footerLinkedin'] ?? '',
    ];
    $socialsHtml = '';
    foreach ($socialLinks as $label => $url) {
        if (!$url) continue;
        $socialsHtml .= '<a href="' . htmlspecialchars($url, ENT_QUOTES) . '" style="display:inline-block;margin:0 8px;color:#1655c3;font-size:12px;font-weight:600;text-decoration:none;">' . $label . '</a>';
    }

    $communityHtml = $communityLink ? '
      <div style="text-align:center;margin-bottom:20px;">
        <a href="' . htmlspecialchars($communityLink, ENT_QUOTES) . '"
           style="display:inline-block;background:linear-gradient(135deg,#25D366,#1655c3);color:#fff;text-decoration:none;padding:13px 28px;border-radius:10px;font-weight:700;font-size:13px;">
          📲 Join the MEDWEB Community
        </a>
      </div>' : '';

    $socialsBlock = $socialsHtml ? '
      <div style="text-align:center;margin-top:20px;">
        ' . $socialsHtml . '
      </div>' : '';

    return <<<HTML
      <div style="border-top:1px solid #eee;padding-top:22px;margin-bottom:8px;">
        <p style="margin:0 0 4px;color:#1a1a1a;font-size:15px;font-weight:800;">💡 Don't stop here!</p>
        <p style="color:#666;font-size:13px;line-height:1.7;margin:0 0 16px;">
          Keep the momentum going — MEDWEB-PK runs new expert-led webinars and courses every week to help you stay ahead in your field.
        </p>
      </div>
      {$communityHtml}
      <div style="text-align:center;margin-bottom:8px;">
        <a href="{$homeUrl}" style="color:#1655c3;font-size:13px;font-weight:700;text-decoration:none;">Explore More Webinars & Courses →</a>
      </div>
      {$socialsBlock}
      <br><p style="color:#888;font-size:13px;margin:0;text-align:center;">Proud of you — keep going! 🌱<br>— The MEDWEB-PK Team</p>
HTML;
}

// Bottom CTA block — identical copy/links on the result screen
// (src/components/MockTestCtaBox.jsx) and the PDF export
// (src/lib/mockTestResultPdf.js). Keep all three in sync by hand.
function mocktest_cta_box_html(): string {
    return <<<HTML
      <div style="background:linear-gradient(135deg,#1655c3,#64ac37);border-radius:14px;padding:22px 24px;text-align:center;margin:28px 0;">
        <p style="margin:0 0 4px;color:#fff;font-size:16px;font-weight:900;">Want in-depth AMR clinical case studies?</p>
        <p style="margin:0 0 14px;color:rgba(255,255,255,0.95);font-size:14px;font-weight:700;">Join our ONE-WEEK course on Antimicrobial Resistance with clinical case studies.</p>
        <p style="margin:0;color:#fff;font-size:13px;">
          <a href="tel:+923291692899" style="color:#fff;text-decoration:underline;font-weight:700;">0329 169 2899</a>
          (<a href="https://wa.me/923291692899" style="color:#fff;text-decoration:underline;">WhatsApp</a>/Call)
          &nbsp;|&nbsp; Email: <a href="mailto:medwebpk@gmail.com" style="color:#fff;text-decoration:underline;font-weight:700;">medwebpk@gmail.com</a>
        </p>
      </div>
HTML;
}

// The "here's what you got wrong, with why" block — only the INCORRECT
// questions, each with the student's answer, the correct one, and the
// Explanation text from the admin import (option-letter-free, since
// options are shuffled per student). Empty string (nothing rendered) when
// everything was correct.
function mocktest_incorrect_review_html(array $review): string {
    $incorrect = array_values(array_filter($review, fn($r) => empty($r['correct'])));
    if (!$incorrect) return '';

    $rows = '';
    foreach ($incorrect as $r) {
        $q = htmlspecialchars((string) $r['questionText'], ENT_QUOTES);
        $your = $r['selectedIndex'] !== null
            ? htmlspecialchars((string) ($r['options'][$r['selectedIndex']] ?? ''), ENT_QUOTES)
            : '<em>Not answered</em>';
        $correct = htmlspecialchars((string) ($r['options'][$r['correctIndex']] ?? ''), ENT_QUOTES);
        $explanation = (string) ($r['explanation'] ?? '');
        $explanationBlock = $explanation !== '' ? '
            <p style="margin:6px 0 0;color:#666;font-size:12px;line-height:1.6;background:#f7f9fc;border-radius:8px;padding:10px 12px;">' . nl2br(htmlspecialchars($explanation, ENT_QUOTES)) . '</p>' : '';
        $rows .= <<<HTML
          <div style="border-left:3px solid #ef4444;padding:10px 14px;margin-bottom:12px;background:#fff8f8;border-radius:0 8px 8px 0;">
            <p style="margin:0 0 4px;color:#1a1a1a;font-size:13px;font-weight:700;">{$q}</p>
            <p style="margin:0;color:#888;font-size:12px;">Your answer: <strong style="color:#ef4444;">{$your}</strong></p>
            <p style="margin:2px 0 0;color:#888;font-size:12px;">Correct answer: <strong style="color:#16a34a;">{$correct}</strong></p>
            {$explanationBlock}
          </div>
HTML;
    }

    return <<<HTML
      <div style="margin:22px 0;">
        <p style="margin:0 0 10px;color:#1a1a1a;font-size:14px;font-weight:800;">Review — Questions You Missed</p>
        {$rows}
      </div>
HTML;
}

// Score card — big percent (green/amber by eligibility) + a 2-column stat
// grid (Marks Obtained/Time Taken/Correct/Incorrect/Unanswered/Pass Mark).
// Table-based (not flex/grid) so it survives Gmail's CSS stripping.
function mocktest_score_card_html(array $attempt, string $duration): string {
    $percent = htmlspecialchars((string) ($attempt['percent'] ?? 0), ENT_QUOTES);
    $color = !empty($attempt['eligible']) ? '#64ac37' : '#d97706';
    $correct = (int) ($attempt['correctCount'] ?? 0);
    $incorrect = (int) ($attempt['incorrectCount'] ?? 0);
    $unanswered = (int) ($attempt['unansweredCount'] ?? 0);
    $total = (int) ($attempt['totalQuestions'] ?? 0);
    $passPercent = (int) ($attempt['passPercent'] ?? 70);

    $cell = function (string $label, string $value): string {
        $label = htmlspecialchars($label, ENT_QUOTES);
        $value = htmlspecialchars($value, ENT_QUOTES);
        return '<td style="width:50%;padding:6px;"><div style="background:#f7f9fc;border-radius:10px;padding:12px;text-align:center;"><div style="font-size:16px;font-weight:800;color:#1a1a1a;">' . $value . '</div><div style="font-size:10px;color:#999;text-transform:uppercase;font-weight:700;letter-spacing:0.5px;margin-top:2px;">' . $label . '</div></div></td>';
    };

    $rows = '<tr>' . $cell('Marks Obtained', "{$correct}/{$total}") . $cell('Time Taken', $duration) . '</tr>'
        . '<tr><td colspan="2" style="height:8px;line-height:8px;font-size:0;">&nbsp;</td></tr>'
        . '<tr>' . $cell('Correct', (string) $correct) . $cell('Incorrect', (string) $incorrect) . '</tr>'
        . '<tr><td colspan="2" style="height:8px;line-height:8px;font-size:0;">&nbsp;</td></tr>'
        . '<tr>' . $cell('Unanswered', (string) $unanswered) . $cell('Pass Mark', "{$passPercent}%") . '</tr>';

    return '
      <div style="text-align:center;margin:8px 0 18px;">
        <div style="font-size:46px;font-weight:900;color:' . $color . ';line-height:1;">' . $percent . '%</div>
        <div style="font-size:11px;color:#999;text-transform:uppercase;font-weight:700;letter-spacing:1px;">Your Score</div>
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:18px;">' . $rows . '</table>';
}

// "View Full Result & Download PDF" — links back to the public mock-test
// page for this course (re-entering with the same Reg ID/name/phone just
// re-opens this same completed attempt's result — see enter.php).
function mocktest_view_result_button_html(string $resultUrl): string {
    return '
      <div style="text-align:center;margin-bottom:20px;">
        <a href="' . htmlspecialchars($resultUrl, ENT_QUOTES) . '" style="display:inline-block;background:#fff;color:#1655c3;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;font-size:13px;border:2px solid #1655c3;">
          View Full Result &amp; Download PDF
        </a>
      </div>';
}

// $cert = null for a not-eligible result, or ['certCode'=>..., 'imageUrl'=>...|null]
// once eligible (imageUrl may still be null if the student's own browser
// hasn't rendered/uploaded it yet — the Certificate ID box + Verify button
// still show, using the code's already known via derive_mock_test_cert_code()
// even before issue-cert.php has created the actual certificates doc;
// verification simply won't resolve until it does). $certPending is true
// only for cron-sweep.php's/maybe_run_fallback_sweep()'s 10-minute fallback
// — same body as the normal eligible email, since by then the code is
// always known regardless of whether the image exists yet.
function mocktest_send_result_email(Firestore $fs, array $attempt, array $mockTest, ?array $cert, bool $certPending = false): bool {
    $name = htmlspecialchars((string) ($attempt['studentName'] ?? 'Student'), ENT_QUOTES);
    $testTitle = htmlspecialchars((string) ($mockTest['title'] ?? $attempt['mockTestTitle'] ?? 'Mock Test'), ENT_QUOTES);
    $courseTitle = htmlspecialchars((string) ($attempt['courseTitle'] ?? ''), ENT_QUOTES);
    $percentDisplay = $attempt['percent'] ?? 0;
    $passPercent = $attempt['passPercent'] ?? ($mockTest['passPercent'] ?? 70);
    $homeUrl = 'https://medwebpk.com';
    $duration = mocktest_format_duration($attempt['startedAt'] ?? null, $attempt['finishedAt'] ?? null);
    $resultUrl = $homeUrl . '/mock-test/' . rawurlencode((string) ($attempt['courseSlug'] ?? ''));

    $reviewHtml = mocktest_incorrect_review_html(build_review($mockTest, $attempt));
    $ctaHtml = mocktest_cta_box_html();
    $scoreCardHtml = mocktest_score_card_html($attempt, $duration);
    $viewResultHtml = mocktest_view_result_button_html($resultUrl);
    $subject = "Your MEDWEB Mock Test Result — {$percentDisplay}%";
    $courseSuffix = $courseTitle === '' ? '' : " ({$courseTitle})";

    $intro = <<<HTML
      <h2 style="margin:0 0 4px;color:#1a1a1a;font-size:20px;">Dear {$name},</h2>
      <p style="color:#555;margin:0 0 16px;line-height:1.7;">
        Here is your result for <strong>"{$testTitle}"</strong>{$courseSuffix}.
      </p>
      {$scoreCardHtml}
HTML;

    if (!empty($attempt['eligible']) && $cert) {
        $certCode = htmlspecialchars((string) $cert['certCode'], ENT_QUOTES);
        $imageUrl = $cert['imageUrl'] ?? null;
        $verifyUrl = $homeUrl . '/certificate/' . rawurlencode((string) $cert['certCode']);

        $imageBlock = $imageUrl ? '
      <div style="text-align:center;margin-bottom:24px;">
        <img src="' . htmlspecialchars($imageUrl, ENT_QUOTES) . '" alt="Certificate" style="max-width:100%;border-radius:10px;box-shadow:0 4px 20px rgba(0,0,0,0.1);" />
      </div>' : '';

        $footerSections = mocktest_email_footer_sections($fs, $homeUrl);
        $body = <<<HTML
      {$intro}
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:12px 16px;text-align:center;margin-bottom:20px;color:#166534;font-weight:700;font-size:13px;">
        🎉 Congratulations! You are eligible for the certificate (pass mark {$passPercent}%).
      </div>
      {$imageBlock}
      <div style="background:#eff6ff;border:2px solid #1655c3;border-radius:12px;padding:16px;text-align:center;margin-bottom:24px;">
        <p style="margin:0 0 4px;color:#666;font-size:11px;text-transform:uppercase;letter-spacing:1px;font-weight:700;">Certificate ID</p>
        <p style="margin:0;color:#1655c3;font-size:20px;font-weight:900;font-family:monospace;">{$certCode}</p>
      </div>
      <div style="text-align:center;margin-bottom:8px;">
        <a href="{$verifyUrl}"
           style="display:inline-block;background:linear-gradient(135deg,#1655c3,#64ac37);color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:14px;">
          Verify Certificate →
        </a>
      </div>
      <p style="color:#aaa;font-size:12px;margin:0 0 20px;text-align:center;">
        Share your certificate link: <a href="{$verifyUrl}" style="color:#1655c3;">{$verifyUrl}</a>
      </p>
      {$viewResultHtml}
      {$reviewHtml}
      {$ctaHtml}
      {$footerSections}
HTML;
    } else {
        $eligibilityBlock = !empty($attempt['eligible'])
            ? '<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:12px 16px;text-align:center;margin-bottom:20px;color:#1655c3;font-weight:700;font-size:13px;">You\'re eligible for a certificate — it\'s still being generated and we\'ll email you again shortly with it.</div>'
            : '<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:12px 16px;text-align:center;margin-bottom:20px;color:#92400e;font-weight:700;font-size:13px;">Not eligible yet — required ' . (int) $passPercent . '%. Review your answers below.</div>';

        $footerSections = mocktest_email_footer_sections($fs, $homeUrl);
        $body = <<<HTML
      {$intro}
      {$eligibilityBlock}
      {$viewResultHtml}
      {$reviewHtml}
      {$ctaHtml}
      {$footerSections}
HTML;
    }

    return mocktest_brevo_send((string) ($attempt['email'] ?? ''), (string) ($attempt['studentName'] ?? ''), $subject, mocktest_wrap_html($body));
}
