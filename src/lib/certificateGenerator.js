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

async function compositeCertificateCanvas({ templateUrl, studentName, certCode, namePos, idPos }) {
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

  const studentName = toTitleCase(rawName)
  const webinarTitle = webinar.topic || webinar.title || ''

  try {
    const certCode = await certificatesService.generateUniqueCode()

    const canvas = await compositeCertificateCanvas({
      templateUrl: certTemplate.imageUrl,
      studentName,
      certCode,
      namePos: certTemplate.namePos,
      idPos: certTemplate.idPos,
    })
    const blob = await canvasToCompressedBlob(canvas)
    const certificateImageUrl = await uploadToCloudinary(blob, 'medweb/certificates/generated')

    // Field names match the schema the old Cloud Function wrote (and what
    // the public Certificate Verification page / admin Certificates table
    // already read), so nothing downstream needs to change. `submissionId`
    // is new — it's what lets the admin Certificates view link back to the
    // student's full feedback-form answers.
    await certificatesService.add({
      certCode,
      recipient: studentName,
      recipientEmail: email,
      title: webinarTitle,
      sourceType: 'webinar',
      sourceId: webinar.id,
      body: 'has successfully attended and submitted feedback for this webinar.',
      issued: new Date().toISOString().split('T')[0],
      studentName,
      email,
      webinarId: webinar.id,
      webinarTitle,
      certificateImageUrl,
      issuedAt: new Date().toISOString(),
      submissionId,
    })

    await markStatus({ certificateStatus: 'issued', certCode })

    studentsDbService.upsertFromCertificate({
      email, name: studentName, webinarId: webinar.id, webinarTitle, certCode,
      issuedAt: new Date().toISOString(),
    }).catch(err => console.error('studentsDbService.upsertFromCertificate failed:', err))

    const emailResult = await sendCertificateEmail({ name: studentName, email, certCode, webinarTitle, certificateImageUrl })
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
