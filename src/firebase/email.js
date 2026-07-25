// ── MEDWEB Auto-Email Service (Brevo) ────────────────────────────────────────
// Frontend email sending via Brevo's free REST API — no backend required.
// Free plan: 300 emails/day, ~9 000/month, no credit card needed.
//
// SETUP (one time):
//   1. Create a free account at https://app.brevo.com
//   2. Go to  Account → SMTP & API → API Keys → Generate a new API key
//      → copy it (starts with "xkeysib-…")
//   3. Under Senders & IP → Senders, add + verify the email address
//      you want to send FROM (e.g. info@medweb.pk or your Gmail).
//   4. In the Admin Panel → Email Settings paste:
//        • Brevo API Key  (the "xkeysib-…" key)
//        • Sender Email   (the verified sender address)
//        • From Name      (e.g. "MEDWEB-PK")
//      Tick "Enable automatic emails" → Save.
//
// All certificate, confirmation, newsletter, and ambassador emails flow
// through the single sendEmail() function below.

import { settingsService, emailUsageService } from './services'

let cachedConfig = null

// Load Brevo config from Firestore settings.
export async function loadEmailConfig(force = false) {
  if (cachedConfig && !force) return cachedConfig
  const settings = await settingsService.get().catch(() => null)
  cachedConfig = settings?.email || null
  return cachedConfig
}

export function isEmailEnabled(cfg) {
  return !!(cfg && cfg.enabled && cfg.brevoApiKey && cfg.senderEmail)
}

// Brevo free plan: 300 emails/day ≈ 9 000/month
export const BREVO_MONTHLY_QUOTA = 9000

export async function getRemainingEmailQuota() {
  const usage = await emailUsageService.get().catch(() => null)
  const monthKey = new Date().toISOString().slice(0, 7)
  const used = (usage && usage.month === monthKey) ? (usage.count || 0) : 0
  return Math.max(0, BREVO_MONTHLY_QUOTA - used)
}

// ── HTML email wrapper ────────────────────────────────────────────────────────
function wrapHtml(bodyHtml) {
  return `<!DOCTYPE html>
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
          ${bodyHtml}
        </td></tr>

        <!-- FOOTER -->
        <tr><td style="padding:20px;text-align:center;">
          <p style="margin:0;color:#aaa;font-size:11px;">© ${new Date().getFullYear()} MEDWEB-PK · Pakistan's Medical Education Platform</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

/**
 * Core send function — calls Brevo's transactional email API.
 * Silently no-ops (returns {skipped:true}) if not configured.
 */
export async function sendEmail({ to_name, to_email, subject, htmlContent, message }) {
  try {
    const cfg = await loadEmailConfig()
    if (!isEmailEnabled(cfg)) {
      return { skipped: true, reason: 'Email not configured' }
    }

    // Fall back to plain-text → basic HTML if caller didn't supply htmlContent
    const html = htmlContent || wrapHtml(
      `<p style="color:#333;line-height:1.7;">${
        (message || '').replace(/\n/g, '<br>')
      }</p>`
    )

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': cfg.brevoApiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { name: cfg.fromName || 'MEDWEB', email: cfg.senderEmail },
        to: [{ email: to_email, name: to_name }],
        subject,
        htmlContent: html,
      }),
    })

    emailUsageService.increment().catch(() => {})

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return { sent: false, error: err.message || `HTTP ${res.status}` }
    }
    return { sent: true }
  } catch (err) {
    console.error('sendEmail error:', err)
    emailUsageService.increment().catch(() => {})
    return { sent: false, error: err?.message || String(err) }
  }
}

// ── Convenience senders ───────────────────────────────────────────────────────

// Webinar registration confirmation
export async function sendWebinarConfirmation({ name, email, webinar }) {
  const topic = webinar?.topic || webinar?.title || 'MEDWEB Webinar'
  return sendEmail({
    to_name: name,
    to_email: email,
    subject: `Registration Confirmed — ${topic}`,
    htmlContent: wrapHtml(`
      <h2 style="margin:0 0 8px;color:#1a1a1a;font-size:20px;">You're Registered! 🎉</h2>
      <p style="color:#555;margin:0 0 20px;">Hi <strong>${name}</strong>, your seat for the webinar below is confirmed.</p>
      <div style="background:#f7f9fc;border-radius:12px;padding:20px;margin-bottom:24px;">
        <p style="margin:0 0 6px;font-weight:700;color:#1655c3;font-size:15px;">${topic}</p>
        ${webinar?.speaker ? `<p style="margin:0 0 4px;color:#666;font-size:13px;">🎤 ${webinar.speaker}</p>` : ''}
        ${webinar?.date   ? `<p style="margin:0 0 4px;color:#666;font-size:13px;">📅 ${webinar.date}</p>` : ''}
        ${webinar?.time   ? `<p style="margin:0;color:#666;font-size:13px;">🕐 ${webinar.time}</p>` : ''}
      </div>
      <p style="color:#888;font-size:13px;margin:0;">We look forward to seeing you! Stay tuned for the join link.</p>
      <br><p style="color:#888;font-size:13px;margin:0;">— MEDWEB Team</p>
    `),
  })
}

// Certificate email after feedback submission
export async function sendCertificateEmail({ name, email, certCode, webinarTitle, certificateImageUrl }) {
  const verifyUrl = `${window.location.origin}/certificate/${encodeURIComponent(certCode)}`
  const homeUrl = window.location.origin
  const settings = await settingsService.get().catch(() => null)
  const communityLink = settings?.communityLink
  const socials = [
    { url: settings?.footerWhatsapp,  label: 'WhatsApp' },
    { url: settings?.footerFacebook,  label: 'Facebook' },
    { url: settings?.footerInstagram, label: 'Instagram' },
    { url: settings?.footerLinkedin,  label: 'LinkedIn' },
  ].filter(s => s.url)

  return sendEmail({
    to_name: name,
    to_email: email,
    subject: `🏆 You Did It, ${name}! Your Certificate Is Ready`,
    htmlContent: wrapHtml(`
      <h2 style="margin:0 0 6px;color:#1a1a1a;font-size:22px;">Congratulations, ${name}! 🏆</h2>
      <p style="color:#555;margin:0 0 20px;line-height:1.7;">
        That's one more step forward in your medical career! You've successfully completed
        <strong>"${webinarTitle || 'the webinar'}"</strong> with MEDWEB-PK, and your official certificate
        is attached below — proof of the time and dedication you're putting into becoming an
        outstanding healthcare professional.
      </p>

      ${certificateImageUrl ? `
      <div style="text-align:center;margin-bottom:24px;">
        <img src="${certificateImageUrl}" alt="Certificate" style="max-width:100%;border-radius:10px;box-shadow:0 4px 20px rgba(0,0,0,0.1);" />
      </div>` : ''}

      <div style="background:#eff6ff;border:2px solid #1655c3;border-radius:12px;padding:16px;text-align:center;margin-bottom:24px;">
        <p style="margin:0 0 4px;color:#666;font-size:11px;text-transform:uppercase;letter-spacing:1px;font-weight:700;">Certificate ID</p>
        <p style="margin:0;color:#1655c3;font-size:20px;font-weight:900;font-family:monospace;">${certCode}</p>
      </div>

      <div style="text-align:center;margin-bottom:8px;">
        <a href="${verifyUrl}"
           style="display:inline-block;background:linear-gradient(135deg,#1655c3,#64ac37);color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:14px;">
          Verify Certificate →
        </a>
      </div>
      <p style="color:#aaa;font-size:12px;margin:0 0 28px;text-align:center;">
        Share your certificate link: <a href="${verifyUrl}" style="color:#1655c3;">${verifyUrl}</a>
      </p>

      <div style="border-top:1px solid #eee;padding-top:22px;margin-bottom:8px;">
        <p style="margin:0 0 4px;color:#1a1a1a;font-size:15px;font-weight:800;">💡 Don't stop here!</p>
        <p style="color:#666;font-size:13px;line-height:1.7;margin:0 0 16px;">
          Add this certificate to your CV or LinkedIn profile, and keep the momentum going — MEDWEB-PK
          runs new expert-led webinars and courses every week to help you stay ahead in your field.
        </p>
      </div>

      ${communityLink ? `
      <div style="text-align:center;margin-bottom:20px;">
        <a href="${communityLink}"
           style="display:inline-block;background:linear-gradient(135deg,#25D366,#1655c3);color:#fff;text-decoration:none;padding:13px 28px;border-radius:10px;font-weight:700;font-size:13px;">
          📲 Join the MEDWEB Community
        </a>
      </div>` : ''}

      <div style="text-align:center;margin-bottom:8px;">
        <a href="${homeUrl}" style="color:#1655c3;font-size:13px;font-weight:700;text-decoration:none;">Explore More Webinars & Courses →</a>
      </div>

      ${socials.length ? `
      <div style="text-align:center;margin-top:20px;">
        ${socials.map(s => `<a href="${s.url}" style="display:inline-block;margin:0 8px;color:#1655c3;font-size:12px;font-weight:600;text-decoration:none;">${s.label}</a>`).join('')}
      </div>` : ''}

      <br><p style="color:#888;font-size:13px;margin:0;text-align:center;">Proud of you — keep going! 🌱<br>— The MEDWEB-PK Team</p>
    `),
  })
}

// Newsletter email per subscriber
export async function sendNewsletterEmail({ toEmail, title, excerpt, postUrl, unsubscribeUrl }) {
  return sendEmail({
    to_name: 'Subscriber',
    to_email: toEmail,
    subject: `New on MEDWEB: ${title}`,
    htmlContent: wrapHtml(`
      <h2 style="margin:0 0 8px;color:#1a1a1a;font-size:18px;">${title}</h2>
      <p style="color:#555;margin:0 0 20px;line-height:1.7;">${excerpt}</p>
      <div style="text-align:center;margin-bottom:24px;">
        <a href="${postUrl}" style="display:inline-block;background:linear-gradient(135deg,#1655c3,#64ac37);color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;font-size:14px;">Read More →</a>
      </div>
      <p style="color:#aaa;font-size:12px;text-align:center;margin:0;">
        <a href="${unsubscribeUrl}" style="color:#aaa;">Unsubscribe</a>
      </p>
    `),
  })
}

// Ambassador welcome email
export async function sendAmbassadorWelcomeEmail({ name, email, ambCode, university, rank }) {
  return sendEmail({
    to_name: name,
    to_email: email,
    subject: `Welcome to the MEDWEB-PK Ambassador Program!`,
    htmlContent: wrapHtml(`
      <h2 style="margin:0 0 8px;color:#1a1a1a;">Welcome aboard, ${name}! 🌟</h2>
      <p style="color:#555;margin:0 0 16px;line-height:1.7;">
        Congratulations! You've officially joined the MEDWEB-PK Ambassador Program
        ${rank ? ` as a <strong>${rank}</strong>` : ''}
        ${university ? `, representing <strong>${university}</strong>` : ''}.
      </p>
      ${ambCode ? `
      <div style="background:#f0fdf4;border:2px solid #64ac37;border-radius:12px;padding:16px;text-align:center;margin-bottom:20px;">
        <p style="margin:0 0 4px;color:#666;font-size:11px;text-transform:uppercase;letter-spacing:1px;font-weight:700;">Your Ambassador Code</p>
        <p style="margin:0;color:#64ac37;font-size:20px;font-weight:900;font-family:monospace;">${ambCode}</p>
      </div>` : ''}
      <p style="color:#888;font-size:13px;margin:0;">We're excited to have you on the team. Keep this code handy — it's your identifier on your Ambassador Card and Letter.</p>
      <br><p style="color:#888;font-size:13px;margin:0;">— MEDWEB Team</p>
    `),
  })
}

// Ambassador points updated
export async function sendAmbassadorPointsUpdateEmail({ name, email, points }) {
  return sendEmail({
    to_name: name,
    to_email: email,
    subject: `Your MEDWEB Ambassador Points Have Been Updated`,
    htmlContent: wrapHtml(`
      <h2 style="margin:0 0 8px;color:#1a1a1a;">Points Updated 🏅</h2>
      <p style="color:#555;margin:0 0 20px;">Hi <strong>${name}</strong>, your ambassador points have been updated.</p>
      <div style="background:#eff6ff;border-radius:12px;padding:20px;text-align:center;margin-bottom:20px;">
        <p style="margin:0 0 4px;color:#666;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Your Total Points</p>
        <p style="margin:0;color:#1655c3;font-size:32px;font-weight:900;">${Number(points).toLocaleString()}</p>
      </div>
      <p style="color:#888;font-size:13px;margin:0;">Every referral and activity you put in adds up. Keep up the great work!</p>
      <br><p style="color:#888;font-size:13px;margin:0;">— MEDWEB Team</p>
    `),
  })
}

// Ambassador removed
export async function sendAmbassadorRemovedEmail({ name, email }) {
  return sendEmail({
    to_name: name,
    to_email: email,
    subject: `An Update on Your MEDWEB Ambassador Status`,
    htmlContent: wrapHtml(`
      <h2 style="margin:0 0 8px;color:#1a1a1a;">Ambassador Status Update</h2>
      <p style="color:#555;margin:0 0 16px;line-height:1.7;">Hi <strong>${name}</strong>,</p>
      <p style="color:#555;margin:0 0 16px;line-height:1.7;">
        We're writing to let you know that your status as a MEDWEB-PK Ambassador has been deactivated as of today.
      </p>
      <p style="color:#555;margin:0 0 16px;line-height:1.7;">
        We genuinely appreciate the time, effort, and enthusiasm you brought to representing MEDWEB, and we're grateful for everything you contributed. If you believe this was a mistake, please don't hesitate to reach out.
      </p>
      <br><p style="color:#888;font-size:13px;margin:0;">— MEDWEB Team</p>
    `),
  })
}

// Ambassador profile edited
export async function sendAmbassadorUpdatedEmail({ name, email, changes }) {
  return sendEmail({
    to_name: name,
    to_email: email,
    subject: `Your MEDWEB Ambassador Profile Has Been Updated`,
    htmlContent: wrapHtml(`
      <h2 style="margin:0 0 8px;color:#1a1a1a;">Profile Updated</h2>
      <p style="color:#555;margin:0 0 16px;">Hi <strong>${name}</strong>, your ambassador profile was just updated:</p>
      <ul style="color:#555;margin:0 0 16px;padding-left:20px;line-height:2;">
        ${(changes || []).map(c => `<li>${c}</li>`).join('')}
      </ul>
      <p style="color:#888;font-size:13px;margin:0;">If anything looks unexpected, feel free to reach out to the MEDWEB team.</p>
      <br><p style="color:#888;font-size:13px;margin:0;">— MEDWEB Team</p>
    `),
  })
}

// Test email from admin Email Settings page
export async function sendTestEmail(toEmail) {
  cachedConfig = null // force reload latest saved config
  return sendEmail({
    to_name: 'MEDWEB Admin',
    to_email: toEmail,
    subject: 'MEDWEB Test Email ✅',
    htmlContent: wrapHtml(`
      <h2 style="margin:0 0 8px;color:#1a1a1a;">Email is Working! ✅</h2>
      <p style="color:#555;margin:0 0 16px;">This is a test email from your MEDWEB admin panel.</p>
      <p style="color:#555;margin:0;">If you received this, your Brevo email integration is configured correctly and all automated emails (certificates, confirmations, newsletters) will be sent successfully.</p>
      <br><p style="color:#888;font-size:13px;margin:0;">— MEDWEB Team</p>
    `),
  })
}
