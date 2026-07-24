// ── MEDWEB Auto-Email Service (EmailJS) ──────────────────────────────────────
// Frontend email sending — no backend required.
//
// SETUP (one time):
//   1. Create a free account at https://www.emailjs.com
//   2. Add an Email Service (Gmail/Outlook/etc.)  → copy the SERVICE ID
//   3. Create an Email Template with these variables:
//        {{to_name}} {{to_email}} {{subject}} {{message}}
//        {{webinar_topic}} {{webinar_date}} {{webinar_time}} {{speaker}}
//      → copy the TEMPLATE ID
//   4. Account → API Keys → copy your PUBLIC KEY
//   5. Paste all three into Admin Panel → Email Settings (saved in Firestore).
//
// Once configured, registration confirmations, certificate emails, and
// newsletter sends all go through this same one configured Service/Template
// — there's no separate email pathway per feature.

import emailjs from '@emailjs/browser'
import { settingsService, emailUsageService } from './services'

let cachedConfig = null

// Load EmailJS config (publicKey / serviceId / templateId) from Firestore settings.
export async function loadEmailConfig(force = false) {
  if (cachedConfig && !force) return cachedConfig
  const settings = await settingsService.get().catch(() => null)
  cachedConfig = settings?.email || null
  return cachedConfig
}

export function isEmailEnabled(cfg) {
  return !!(cfg && cfg.enabled && cfg.publicKey && cfg.serviceId && cfg.templateId)
}

// EmailJS's free-plan quota (shared across every feature using this one
// account) — see emailUsageService in services.js for how usage is tracked,
// since EmailJS itself exposes no "remaining quota" API.
export const EMAILJS_MONTHLY_QUOTA = 200

export async function getRemainingEmailQuota() {
  const usage = await emailUsageService.get().catch(() => null)
  const monthKey = new Date().toISOString().slice(0, 7)
  const used = (usage && usage.month === monthKey) ? (usage.count || 0) : 0
  return Math.max(0, EMAILJS_MONTHLY_QUOTA - used)
}

/**
 * Send an automated email through EmailJS.
 * Silently no-ops (returns {skipped:true}) if email is not configured,
 * so registration never fails just because email isn't set up yet.
 */
export async function sendEmail(params) {
  try {
    const cfg = await loadEmailConfig()
    if (!isEmailEnabled(cfg)) {
      return { skipped: true, reason: 'Email not configured' }
    }
    emailjs.init({ publicKey: cfg.publicKey })
    const res = await emailjs.send(cfg.serviceId, cfg.templateId, {
      from_name: cfg.fromName || 'MEDWEB',
      reply_to:  cfg.replyTo  || '',
      ...params,
    })
    // Counts against the shared quota whether or not the send actually
    // reached the inbox — matches how EmailJS itself meters requests.
    emailUsageService.increment().catch(() => {})
    return { sent: true, res }
  } catch (err) {
    console.error('sendEmail error:', err)
    emailUsageService.increment().catch(() => {})
    return { sent: false, error: err?.message || String(err) }
  }
}

// Convenience: webinar registration confirmation email.
export async function sendWebinarConfirmation({ name, email, webinar }) {
  return sendEmail({
    to_name:  name,
    to_email: email,
    subject:  `Registration Confirmed — ${webinar?.topic || webinar?.title || 'MEDWEB Webinar'}`,
    message:  `Hi ${name}, your seat for "${webinar?.topic || webinar?.title || 'the webinar'}" is confirmed. We look forward to seeing you!`,
    webinar_topic: webinar?.topic || webinar?.title || '',
    webinar_date:  webinar?.date  || '',
    webinar_time:  webinar?.time  || '',
    speaker:       webinar?.speaker || '',
  })
}

// Convenience: certificate email after a webinar feedback submission
// (client-side generated — see src/lib/certificateGenerator.js). Plain,
// professional subject/body — no ALL-CAPS or spam-trigger wording. The
// Certificate ID is included as plain selectable text (not only baked into
// the attached/linked image) so the student can copy it for verification.
export async function sendCertificateEmail({ name, email, certCode, webinarTitle, certificateImageUrl }) {
  const verifyUrl = `${window.location.origin}/certificate/${encodeURIComponent(certCode)}`
  return sendEmail({
    to_name:  name,
    to_email: email,
    subject:  `Your Certificate for ${webinarTitle || 'MEDWEB Webinar'} — MEDWEB-PK`,
    message:
      `Hi ${name},\n\n` +
      `Congratulations on completing "${webinarTitle || 'the webinar'}". Your certificate is ready.\n\n` +
      `Certificate ID: ${certCode}\n\n` +
      `Verify your certificate: ${verifyUrl}\n` +
      `Download your certificate image: ${certificateImageUrl}\n\n` +
      `— MEDWEB Team`,
    webinar_topic: webinarTitle || '',
    webinar_date: '', webinar_time: '', speaker: '',
  })
}

// Convenience: one newsletter email for one subscriber, sent when an admin
// publishes a blog post (see AdminBlog.jsx / NewsletterSendModal.jsx) —
// looped per-recipient from the admin's own open tab, no batching needed
// since this isn't a background job.
export async function sendNewsletterEmail({ toEmail, title, excerpt, postUrl, unsubscribeUrl }) {
  return sendEmail({
    to_name:  'Subscriber',
    to_email: toEmail,
    subject:  `New on MEDWEB: ${title}`,
    message:
      `${excerpt}\n\n` +
      `Read more: ${postUrl}\n\n` +
      `— MEDWEB Team\n\n` +
      `Unsubscribe: ${unsubscribeUrl}`,
    webinar_topic: '', webinar_date: '', webinar_time: '', speaker: '',
  })
}

// Ambassador program notifications — sent from the admin's own browser at
// the moment of save/delete (see AdminAmbassadors.jsx), same fire-and-forget
// pattern as the certificate/newsletter emails above. Each covers a
// genuinely different situation with its own copy, rather than one generic
// "your profile changed" email for everything.

// New ambassador added — a warm welcome confirming their role/code/university.
export async function sendAmbassadorWelcomeEmail({ name, email, ambCode, university, rank }) {
  return sendEmail({
    to_name:  name,
    to_email: email,
    subject:  `Welcome to the MEDWEB-PK Ambassador Program!`,
    message:
      `Hi ${name},\n\n` +
      `Congratulations, and welcome aboard! You've officially joined the MEDWEB-PK Ambassador Program` +
      `${rank ? ` as a ${rank}` : ''}${university ? `, representing ${university}` : ''}.\n\n` +
      `Your Ambassador Code: ${ambCode || '(will be shared shortly)'}\n\n` +
      `Keep this code handy — it's your identifier on your Ambassador Card and Letter. We're genuinely excited ` +
      `to have you on the team and can't wait to see the impact you'll make on campus.\n\n` +
      `— MEDWEB Team`,
    webinar_topic: '', webinar_date: '', webinar_time: '', speaker: '',
  })
}

// Points changed — names the exact new total, kept short and encouraging.
export async function sendAmbassadorPointsUpdateEmail({ name, email, points }) {
  return sendEmail({
    to_name:  name,
    to_email: email,
    subject:  `Your MEDWEB Ambassador Points Have Been Updated`,
    message:
      `Hi ${name},\n\n` +
      `Your points have been updated to ${Number(points).toLocaleString()}. Every referral and activity you put in adds up, ` +
      `and it's reflected right here.\n\n` +
      `Keep up the great work!\n\n` +
      `— MEDWEB Team`,
    webinar_topic: '', webinar_date: '', webinar_time: '', speaker: '',
  })
}

// Removed or deactivated — a respectful, professional notice, not a generic update.
export async function sendAmbassadorRemovedEmail({ name, email }) {
  return sendEmail({
    to_name:  name,
    to_email: email,
    subject:  `An Update on Your MEDWEB Ambassador Status`,
    message:
      `Hi ${name},\n\n` +
      `We're writing to let you know that your status as a MEDWEB-PK Ambassador has been deactivated as of today.\n\n` +
      `We genuinely appreciate the time, effort, and enthusiasm you brought to representing MEDWEB, and we're grateful ` +
      `for everything you contributed to the community. If you believe this was a mistake or have any questions, please ` +
      `don't hesitate to reach out to us directly.\n\n` +
      `Thank you again for everything.\n\n` +
      `— MEDWEB Team`,
    webinar_topic: '', webinar_date: '', webinar_time: '', speaker: '',
  })
}

// Any other field edited (rank, university, etc.) — a short notice
// summarizing exactly what changed, not a vague "something was updated".
export async function sendAmbassadorUpdatedEmail({ name, email, changes }) {
  return sendEmail({
    to_name:  name,
    to_email: email,
    subject:  `Your MEDWEB Ambassador Profile Has Been Updated`,
    message:
      `Hi ${name},\n\n` +
      `Your ambassador profile was just updated:\n\n` +
      (changes || []).map(c => `• ${c}`).join('\n') + `\n\n` +
      `If anything here looks unexpected, feel free to reach out to the MEDWEB team.\n\n` +
      `— MEDWEB Team`,
    webinar_topic: '', webinar_date: '', webinar_time: '', speaker: '',
  })
}

// Send a test email (used by the admin Email Settings page).
export async function sendTestEmail(toEmail) {
  cachedConfig = null // force reload latest saved config
  return sendEmail({
    to_name:  'MEDWEB Admin',
    to_email: toEmail,
    subject:  'MEDWEB Test Email ✅',
    message:  'This is a test email from your MEDWEB admin panel. If you received this, auto-email is working correctly!',
    webinar_topic: 'Test',
    webinar_date:  new Date().toLocaleDateString(),
    webinar_time:  new Date().toLocaleTimeString(),
    speaker:       'MEDWEB',
  })
}
