// Client-side certificate generation — runs entirely in the submitting
// student's own browser, triggered right after a webinar feedback form
// submission succeeds (see src/pages/DynamicForm.jsx). Replaces the old
// Cloud Function version (functions/index.js's onFeedbackSubmission,
// left in place unused) since Cloud Functions require the Blaze plan.
//
// Position/style conventions (namePos/idPos: {xPct, yPct, fontSize, color})
// must match src/admin/components/CertPositionEditor.jsx exactly — the name
// box is centered on its point (canvas textAlign 'center'), the ID box is
// left-anchored at its point (textAlign 'left'), same as the admin preview.

import { certificatesService, formsService, studentsDbService } from '../firebase/services'
import { uploadToCloudinary } from '../firebase/cloudinary'
import { sendCertificateEmail } from '../firebase/email'
import { CERTIFICATE_FONTS, DEFAULT_CERT_FONT } from '../constants/certificateFonts'

const DEFAULT_NAME_POS = { xPct: 50, yPct: 28, fontSize: 48, color: '#1a1a1a', fontFamily: DEFAULT_CERT_FONT }
const DEFAULT_ID_POS   = { xPct: 10, yPct: 90, fontSize: 26, color: '#1a1a1a' }

// The Google Fonts <link> in index.html only guarantees the stylesheet is
// requested, not that the font file has finished downloading by the time
// canvas.fillText runs — without waiting on this, the very first certificate
// generated after a fresh page load can silently draw in the fallback font.
async function ensureFontLoaded(fontFamily, fontSize) {
  const entry = CERTIFICATE_FONTS.find(f => f.css === fontFamily)
  if (!entry?.google || typeof document === 'undefined' || !document.fonts) return
  try {
    await document.fonts.load(`${entry.bold ? 'bold ' : ''}${fontSize}px "${entry.google}"`)
    await document.fonts.ready
  } catch {
    // Font failed to load — fillText will just fall back to the next family
    // in the stack rather than throwing, so this is safe to swallow.
  }
}

function toTitleCase(str) {
  return String(str).trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous' // Cloudinary serves public CORS headers — needed to export the canvas afterward
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load the certificate template image'))
    img.src = url
  })
}

async function compositeCertificateCanvas({ templateUrl, studentName, certCode, namePos, idPos, customFields }) {
  const img = await loadImage(templateUrl)
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0)

  const name = { ...DEFAULT_NAME_POS, ...(namePos || {}) }
  const id = { ...DEFAULT_ID_POS, ...(idPos || {}) }
  const nameFont = CERTIFICATE_FONTS.find(f => f.css === name.fontFamily) || CERTIFICATE_FONTS[0]

  await ensureFontLoaded(name.fontFamily, name.fontSize)

  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = name.color
  ctx.font = `${nameFont.bold ? 'bold ' : ''}${name.fontSize}px ${name.fontFamily || DEFAULT_CERT_FONT}`
  ctx.textAlign = 'center'
  ctx.fillText(studentName, (name.xPct / 100) * canvas.width, (name.yPct / 100) * canvas.height)

  ctx.fillStyle = id.color
  ctx.font = `bold ${id.fontSize}px Helvetica, Arial, sans-serif`
  ctx.textAlign = 'left'
  ctx.fillText(`ID: ${certCode}`, (id.xPct / 100) * canvas.width, (id.yPct / 100) * canvas.height)

  // Optional dynamic fields (manual "Issue Certificate" flow only — the
  // automatic webinar flow never passes these). Centered on their point,
  // same convention as the Name box — must match CertPositionEditor.jsx's
  // preview exactly (translate(-50%,-50%) there, textAlign 'center' here).
  for (const field of customFields || []) {
    const value = field.value?.trim()
    if (!value) continue
    const font = CERTIFICATE_FONTS.find(f => f.css === field.fontFamily) || CERTIFICATE_FONTS[0]
    await ensureFontLoaded(field.fontFamily, field.fontSize)
    ctx.fillStyle = field.color || '#1a1a1a'
    ctx.font = `${font.bold ? 'bold ' : ''}${field.fontSize || 28}px ${field.fontFamily || DEFAULT_CERT_FONT}`
    ctx.textAlign = 'center'
    ctx.fillText(value, ((field.xPct ?? 50) / 100) * canvas.width, ((field.yPct ?? 50) / 100) * canvas.height)
  }

  return canvas
}

// Steps JPEG quality down until the file is comfortably under EmailJS's
// 500KB attachment ceiling — a certificate doesn't need to be huge, so this
// targets ~350KB to leave headroom.
function canvasToCompressedBlob(canvas, targetBytes = 350 * 1024) {
  return new Promise((resolve, reject) => {
    const tryQuality = quality => {
      canvas.toBlob(blob => {
        if (!blob) { reject(new Error('Canvas export failed')); return }
        if (blob.size <= targetBytes || quality <= 0.35) resolve(blob)
        else tryQuality(quality - 0.15)
      }, 'image/jpeg', quality)
    }
    tryQuality(0.85)
  })
}

/**
 * Shared core: composite → compress → upload → save the certificates
 * record → enrich the Student Database → email the recipient. Every
 * certificate-issuing entry point in the app (the automatic
 * webinar-feedback flow below, and the admin's manual "Issue Certificate"
 * flow in AdminCertificates.jsx) funnels through this single
 * implementation — nothing about the compositing/upload/email pipeline is
 * duplicated between them, only how each entry point resolves its inputs
 * and reports success/failure differs.
 *
 * Throws on failure (network, canvas, upload, etc.) — callers decide how
 * to surface that: the webinar flow records it on the submission doc, the
 * manual admin flow shows an alert.
 */
async function compositeAndIssueCertificate({
  templateUrl, namePos, idPos, rawName, email, title, body, sourceType, extra, customFields,
}) {
  const studentName = toTitleCase(rawName)

  const certCode = await certificatesService.generateUniqueCode()

  const canvas = await compositeCertificateCanvas({
    templateUrl, studentName, certCode, namePos, idPos, customFields,
  })
  const blob = await canvasToCompressedBlob(canvas)
  const certificateImageUrl = await uploadToCloudinary(blob, 'medweb/certificates/generated')

  // Field names match the schema the old Cloud Function wrote (and what
  // the public Certificate Verification page / admin Certificates table
  // already read), so nothing downstream needs to change. `customFields`
  // is new and additive — a record with none (every pre-existing
  // certificate, and every automatic webinar-flow one) simply omits it.
  await certificatesService.add({
    certCode,
    recipient: studentName,
    recipientEmail: email,
    title,
    sourceType,
    body,
    issued: new Date().toISOString().split('T')[0],
    studentName,
    email,
    certificateImageUrl,
    issuedAt: new Date().toISOString(),
    ...(customFields?.length ? { customFields } : {}),
    ...extra,
  })

  studentsDbService.upsertFromCertificate({
    email, name: studentName, webinarId: extra?.webinarId, webinarTitle: title, certCode,
    issuedAt: new Date().toISOString(),
  }).catch(err => console.error('studentsDbService.upsertFromCertificate failed:', err))

  const emailResult = await sendCertificateEmail({ name: studentName, email, certCode, webinarTitle: title, certificateImageUrl })

  return { certCode, certificateImageUrl, studentName, emailResult }
}

/**
 * Silently does nothing if the webinar has no certTemplate configured.
 * Never throws into the caller — the feedback form's own success message
 * must not depend on this. Failures are recorded on the submission doc
 * (certificateStatus/certificateError) for an admin to notice later, not
 * surfaced to the student mid-form.
 */
export async function generateAndIssueCertificate({ submissionId, webinar, rawName, email }) {
  const certTemplate = webinar.certTemplate
  if (!certTemplate?.imageUrl) return // no template configured — skip entirely, by design

  const markStatus = data => formsService.updateSubmission(submissionId, data).catch(() => {})

  if (!rawName?.trim() || !email?.trim()) {
    console.error(`Certificate skipped for submission ${submissionId}: missing name or email`)
    await markStatus({ certificateStatus: 'failed', certificateError: 'Missing name or email in submission' })
    return
  }

  const webinarTitle = webinar.topic || webinar.title || ''

  try {
    const { certCode, emailResult } = await compositeAndIssueCertificate({
      templateUrl: certTemplate.imageUrl,
      namePos: certTemplate.namePos,
      idPos: certTemplate.idPos,
      rawName,
      email,
      title: webinarTitle,
      body: 'has successfully attended and submitted feedback for this webinar.',
      sourceType: 'webinar',
      extra: { sourceId: webinar.id, webinarId: webinar.id, webinarTitle, submissionId },
    })

    await markStatus({ certificateStatus: 'issued', certCode })

    if (emailResult?.skipped) {
      // Not a failure — EmailJS just isn't configured/enabled yet. Distinct
      // status so this doesn't read the same as a real send failure, but
      // still surfaced (previously: sent===false was the only checked case,
      // so a skipped send left no trace anywhere).
      console.error(`Certificate email skipped for submission ${submissionId}: ${emailResult.reason}`)
      await markStatus({ certificateStatus: 'issued_email_skipped', certificateEmailError: emailResult.reason })
    } else if (emailResult?.sent === false) {
      console.error(`Certificate email failed for submission ${submissionId}:`, emailResult.error)
      await markStatus({ certificateStatus: 'issued_email_failed', certificateEmailError: emailResult.error })
    }
  } catch (err) {
    console.error(`Certificate generation failed for submission ${submissionId}:`, err)
    await markStatus({ certificateStatus: 'failed', certificateError: err.message })
  }
}

/**
 * Manual admin-issued certificate — Admin > Certificates > "Issue
 * Certificate". Same compositing/upload/record/email pipeline as the
 * automatic webinar-feedback flow above (via the shared
 * compositeAndIssueCertificate core), just triggered directly from a form
 * submit instead of a feedback-form event. Unlike the webinar flow, this
 * throws on failure — there's no submission doc to silently record the
 * error on, so the admin UI needs a real exception to show.
 */
export async function issueManualCertificate({ templateUrl, namePos, idPos, recipientName, recipientEmail, description, customFields }) {
  if (!templateUrl) throw new Error('A certificate template image is required')
  if (!recipientName?.trim()) throw new Error('Recipient name is required')
  if (!recipientEmail?.trim()) throw new Error('Recipient email is required')

  const body = description?.trim() || 'has demonstrated outstanding commitment to medical excellence.'

  return compositeAndIssueCertificate({
    templateUrl,
    namePos,
    idPos,
    rawName: recipientName,
    email: recipientEmail,
    title: body,
    body,
    sourceType: 'manual',
    extra: {},
    // Blank rows (no label typed yet) are dropped here rather than upstream
    // so the admin UI can freely have an in-progress empty row without it
    // ever reaching the canvas or the saved record.
    customFields: (customFields || []).filter(f => f.label?.trim()),
  })
}
