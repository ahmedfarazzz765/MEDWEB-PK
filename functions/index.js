// ── MEDWEB Cloud Functions ───────────────────────────────────────────────────
// Runs server-side via the Firebase Admin SDK / Node runtime — things that
// can't safely happen in the browser (creating other users' Auth accounts,
// compositing + emailing certificate images).

const functions = require('firebase-functions')
const admin = require('firebase-admin')
const sharp = require('sharp')
const nodemailer = require('nodemailer')

admin.initializeApp()

const CLOUDINARY_CLOUD_NAME = 'dxsrucrpg'
const CLOUDINARY_UPLOAD_PRESET = 'medweb' // same unsigned preset the client already uses

// Matches the actual deployed callable's URL observed in testing — default
// Firebase Functions v1 region (us-central1) for this project.
const FUNCTIONS_BASE_URL = 'https://us-central1-medwebadmin.cloudfunctions.net'

// Used to build each post's dedicated /blog/:slug URL (BlogPostPage.jsx).
// Override via functions/.env if the live domain differs.
const SITE_URL = process.env.SITE_URL || 'https://medweb.pk'

// ─── ADMIN USER CREATION ───────────────────────────────────────────────────────
// This is the ONLY place a new admin's Firebase Auth account gets created —
// doing it client-side with createUserWithEmailAndPassword() would sign the
// browser into the new account, kicking the Super Admin out of their own
// session. A callable Cloud Function has no such side effect: it runs on
// Google's servers, not in the caller's browser.

// Same bootstrapping rule used client-side in useAdminPermissions.js: a
// signed-in admin with no `adminUsers` doc is a Super Admin. Re-checked here
// server-side because a client-side flag can always be spoofed — this is
// the actual authorization gate, not the UI's hiding of the button.
async function callerIsSuperAdmin(email) {
  const doc = await admin.firestore().collection('adminUsers').doc(email).get()
  if (!doc.exists) return true
  const data = doc.data()
  return data.role === 'superadmin'
}

exports.createAdminUser = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be signed in.')
  }
  const callerEmail = (context.auth.token.email || '').trim().toLowerCase()
  if (!callerEmail) {
    throw new functions.https.HttpsError('unauthenticated', 'No email on your account.')
  }

  const isSuperAdmin = await callerIsSuperAdmin(callerEmail)
  if (!isSuperAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Only the Super Admin can add admin users.')
  }

  const { name, email, password, allowedSections } = data || {}
  if (!name || !email || !password) {
    throw new functions.https.HttpsError('invalid-argument', 'Name, email, and password are required.')
  }
  if (password.length < 6) {
    throw new functions.https.HttpsError('invalid-argument', 'Password must be at least 6 characters.')
  }

  const normalizedEmail = email.trim().toLowerCase()

  let userRecord
  try {
    userRecord = await admin.auth().createUser({
      email: normalizedEmail,
      password,
      displayName: name,
    })
  } catch (err) {
    if (err.code === 'auth/email-already-exists') {
      throw new functions.https.HttpsError('already-exists', 'An account with this email already exists.')
    }
    throw new functions.https.HttpsError('internal', err.message || 'Could not create the account.')
  }

  await admin.firestore().collection('adminUsers').doc(normalizedEmail).set({
    name,
    email: normalizedEmail,
    role: 'admin',
    allowedSections: Array.isArray(allowedSections) ? allowedSections : [],
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  })

  return { uid: userRecord.uid, email: normalizedEmail }
})

// ─── WEBINAR FEEDBACK → AUTO CERTIFICATE ───────────────────────────────────────
// Fires on every new Form-Builder submission. Most submissions aren't webinar
// feedback at all (registrations go to a separate `webinarRegistrations`
// collection; other Form-Builder forms have nothing to do with webinars) —
// this only proceeds if the submitted form's id matches some webinar's
// `feedbackFormId` AND that webinar has a certificate template configured.
// Anything else is a silent, cheap no-op.

const DEFAULT_NAME_POS = { xPct: 50, yPct: 28, fontSize: 48, color: '#1a1a1a' }
const DEFAULT_ID_POS   = { xPct: 10, yPct: 90, fontSize: 26, color: '#1a1a1a' }

function toTitleCase(str) {
  return String(str)
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase())
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Composites the student name + certificate ID onto the template image using
// an SVG text overlay — avoids needing native canvas bindings, which don't
// run reliably in the Cloud Functions environment.
async function compositeCertificate({ templateUrl, studentName, certCode, namePos, idPos }) {
  const res = await fetch(templateUrl)
  if (!res.ok) throw new Error('Failed to fetch the certificate template image')
  const templateBuffer = Buffer.from(await res.arrayBuffer())

  const base = sharp(templateBuffer)
  const meta = await base.metadata()
  const width = meta.width || 1200
  const height = meta.height || 850

  const name = { ...DEFAULT_NAME_POS, ...(namePos || {}) }
  const id = { ...DEFAULT_ID_POS, ...(idPos || {}) }

  // Name box is centered on its drag point (text-anchor: middle); the ID box
  // is left-anchored at its drag point (text-anchor: start) — this must
  // match CertPositionEditor.jsx's CSS alignment exactly, or what the admin
  // saw while dragging won't match the generated image.
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <text x="${(name.xPct / 100) * width}" y="${(name.yPct / 100) * height}"
        font-family="Helvetica, Arial, sans-serif" font-weight="bold"
        font-size="${name.fontSize}" fill="${name.color}" text-anchor="middle">${escapeXml(studentName)}</text>
      <text x="${(id.xPct / 100) * width}" y="${(id.yPct / 100) * height}"
        font-family="Helvetica, Arial, sans-serif" font-weight="bold"
        font-size="${id.fontSize}" fill="${id.color}" text-anchor="start">ID: ${escapeXml(certCode)}</text>
    </svg>`

  return base.composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).png().toBuffer()
}

// Same unsigned upload_preset the client already uses for every other image
// in this app — no Cloudinary API secret needs to be provisioned for this.
async function uploadBufferToCloudinary(buffer, folder) {
  const form = new FormData()
  form.append('file', new Blob([buffer], { type: 'image/png' }), 'certificate.png')
  form.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
  form.append('folder', folder)

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: form,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || 'Cloudinary upload failed')
  }
  const data = await res.json()
  return data.secure_url
}

function getMailTransporter() {
  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD
  if (!user || !pass) {
    throw new Error('GMAIL_USER / GMAIL_APP_PASSWORD are not configured (functions/.env)')
  }
  return nodemailer.createTransport({ service: 'gmail', auth: { user, pass } })
}

// A plain, professional subject/body reads less "spammy" to filters than
// ALL-CAPS/exclamation-heavy copy — and a short HTML email with a
// reasonably-sized attachment is materially less likely to be flagged than a
// heavy one. This is a single transactional send (one recipient, triggered
// per submission) — no batching needed, unlike the newsletter blast.
function buildCertificateEmailHtml({ studentName, certCode, webinarTitle, verifyUrl }) {
  return `
  <div style="font-family: Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; color: #1a1a1a;">
    <div style="background: linear-gradient(135deg, #1655c3, #64ac37); padding: 28px 32px; border-radius: 16px 16px 0 0;">
      <div style="color: #fff; font-weight: 900; font-size: 20px;">MED<span style="color:#c9f2a0;">WEB</span></div>
      <div style="color: rgba(255,255,255,0.85); font-size: 12px; margin-top: 2px;">Certificate of Completion</div>
    </div>
    <div style="border: 1px solid #eef0f3; border-top: none; border-radius: 0 0 16px 16px; padding: 32px;">
      <p style="font-size: 15px; margin: 0 0 12px;">Hi ${escapeXml(studentName)},</p>
      <p style="font-size: 14px; line-height: 1.6; color: #4b5563; margin: 0 0 22px;">
        Congratulations on completing "${escapeXml(webinarTitle || 'the webinar')}". Your certificate is attached to this email.
      </p>
      <p style="font-size: 12px; color: #6b7280; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.5px;">Certificate ID</p>
      <p style="font-size: 17px; font-weight: 700; color: #1655c3; margin: 0 0 24px; user-select: all;">${escapeXml(certCode)}</p>
      <a href="${verifyUrl}" style="display: inline-block; background: #1655c3; color: #fff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 999px;">Verify Certificate</a>
      <p style="font-size: 12px; color: #9ca3af; margin-top: 32px; border-top: 1px solid #eef0f3; padding-top: 16px;">— MEDWEB Team</p>
    </div>
  </div>`
}

// The PNG composited for Cloudinary/the verify page stays full quality —
// this is a separate, smaller copy made only for the email attachment, kept
// well under 2MB so it sends fast and doesn't read as a spam signal.
async function compressForEmailAttachment(pngBuffer) {
  let quality = 82
  let out = await sharp(pngBuffer).jpeg({ quality, mozjpeg: true }).toBuffer()
  while (out.length > 2 * 1024 * 1024 && quality > 35) {
    quality -= 15
    out = await sharp(pngBuffer).jpeg({ quality, mozjpeg: true }).toBuffer()
  }
  return out
}

async function sendCertificateEmail({ toEmail, studentName, certCode, webinarTitle, imageBuffer }) {
  const transporter = getMailTransporter()
  const attachmentBuffer = await compressForEmailAttachment(imageBuffer)
  const verifyUrl = `${SITE_URL}/certificate/${encodeURIComponent(certCode)}`
  await transporter.sendMail({
    from: `"MEDWEB" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: `Your Certificate for ${webinarTitle || 'MEDWEB Webinar'} — MEDWEB-PK`,
    html: buildCertificateEmailHtml({ studentName, certCode, webinarTitle, verifyUrl }),
    attachments: [{ filename: `${certCode}.jpg`, content: attachmentBuffer }],
  })
}

// Atomically computes this webinar's next certificate number + short code in
// a transaction, so two feedback submissions arriving at the same moment
// can never collide on the same sequence number.
async function getNextCertCode(webinarRef) {
  return admin.firestore().runTransaction(async tx => {
    const snap = await tx.get(webinarRef)
    const data = snap.data() || {}
    let shortCode = data.certShortCode
    if (!shortCode) {
      shortCode = (data.topic || data.title || 'WEBINAR')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 8) || 'WEBINAR'
    }
    const nextSeq = (data.certSequence || 0) + 1
    tx.update(webinarRef, { certSequence: nextSeq, certShortCode: shortCode })
    return `MEDWEB-${shortCode}-${String(nextSeq).padStart(4, '0')}`
  })
}

exports.onFeedbackSubmission = functions.firestore
  .document('formSubmissions/{submissionId}')
  .onCreate(async (snap, context) => {
    const submission = snap.data() || {}
    const { formId, values } = submission
    if (!formId || !values) return null

    const webinarsSnap = await admin.firestore().collection('webinars')
      .where('feedbackFormId', '==', formId)
      .limit(1)
      .get()
    if (webinarsSnap.empty) return null // not a webinar feedback submission at all

    const webinarDoc = webinarsSnap.docs[0]
    const webinar = webinarDoc.data()

    const certTemplate = webinar.certTemplate
    if (!certTemplate?.imageUrl) return null // no template configured — skip issuance entirely, by design

    const rawName = values.name || values.fullName || values.Name || ''
    const email = values.email || values.Email || ''
    if (!rawName.trim() || !email.trim()) {
      console.error(`Certificate skipped for submission ${context.params.submissionId}: missing name or email`)
      await snap.ref.update({ certificateStatus: 'failed', certificateError: 'Missing name or email in submission' })
      return null
    }

    const studentName = toTitleCase(rawName)

    let certCode
    try {
      certCode = await getNextCertCode(webinarDoc.ref)

      const imageBuffer = await compositeCertificate({
        templateUrl: certTemplate.imageUrl,
        studentName,
        certCode,
        namePos: certTemplate.namePos,
        idPos: certTemplate.idPos,
      })

      const certificateImageUrl = await uploadBufferToCloudinary(imageBuffer, 'medweb/certificates/generated')

      const webinarTitle = webinar.topic || webinar.title || ''

      await admin.firestore().collection('certificates').add({
        certCode,
        // Field names matching the existing manual-certificate schema, so
        // the admin Certificates table and public verify page need no changes:
        recipient: studentName,
        recipientEmail: email,
        title: webinarTitle,
        sourceType: 'webinar',
        sourceId: webinarDoc.id,
        body: 'has successfully attended and submitted feedback for this webinar.',
        issued: new Date().toISOString().split('T')[0],
        status: 'Valid',
        verifications: 0,
        // Explicit fields for this feature, additive and unused by the
        // existing DOM-rendered certificate template:
        studentName,
        email,
        webinarId: webinarDoc.id,
        webinarTitle,
        certificateImageUrl,
        issuedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })

      await snap.ref.update({ certificateStatus: 'issued', certCode })

      try {
        await sendCertificateEmail({ toEmail: email, studentName, certCode, webinarTitle, imageBuffer })
      } catch (emailErr) {
        console.error(`Certificate email failed for submission ${context.params.submissionId}:`, emailErr)
        await snap.ref.update({ certificateStatus: 'issued_email_failed', certificateEmailError: emailErr.message })
      }
    } catch (err) {
      console.error(`Certificate generation failed for submission ${context.params.submissionId}:`, err)
      await snap.ref.update({ certificateStatus: 'failed', certificateError: err.message })
    }

    return null
  })

// ─── NEWSLETTER: EMAIL SUBSCRIBERS WHEN A BLOG POST PUBLISHES ──────────────────
// Gmail's practical cap is ~500 sends/day on a regular account. Stay well
// under it so retries/other mail from this same account never risk it.
const GMAIL_DAILY_LIMIT = 450

function truncateExcerpt(content, max = 200) {
  const text = String(content || '').trim()
  return text.length > max ? text.slice(0, max).trim() + '…' : text
}

function buildNewsletterHtml({ title, excerpt, postUrl, unsubscribeUrl }) {
  return `
  <div style="font-family: Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
    <div style="background: linear-gradient(135deg, #1655c3, #64ac37); padding: 28px 32px; border-radius: 16px 16px 0 0;">
      <div style="color: #fff; font-weight: 900; font-size: 20px;">MED<span style="color:#c9f2a0;">WEB</span></div>
      <div style="color: rgba(255,255,255,0.85); font-size: 12px; margin-top: 2px;">New on the Blog</div>
    </div>
    <div style="border: 1px solid #eef0f3; border-top: none; border-radius: 0 0 16px 16px; padding: 32px;">
      <h1 style="font-size: 20px; margin: 0 0 12px;">${title}</h1>
      <p style="font-size: 14px; line-height: 1.6; color: #4b5563; margin: 0 0 24px;">${excerpt}</p>
      <a href="${postUrl}" style="display: inline-block; background: #1655c3; color: #fff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 999px;">Read More →</a>
      <p style="font-size: 12px; color: #9ca3af; margin-top: 36px; border-top: 1px solid #eef0f3; padding-top: 16px;">
        You're receiving this because you subscribed to the MEDWEB newsletter.
        <a href="${unsubscribeUrl}" style="color: #9ca3af;">Unsubscribe</a> at any time.
      </p>
    </div>
  </div>`
}

function renderUnsubscribePage(message, success) {
  return `
  <div style="font-family: Helvetica, Arial, sans-serif; max-width: 480px; margin: 80px auto; text-align: center; color: #1a1a1a;">
    <div style="font-weight: 900; font-size: 22px; margin-bottom: 24px;">MED<span style="color:#64ac37;">WEB</span></div>
    <div style="border: 1px solid #eef0f3; border-radius: 16px; padding: 32px; box-shadow: 0 8px 30px rgba(0,0,0,0.06);">
      <p style="font-size: 15px; color: ${success ? '#16a34a' : '#dc2626'}; font-weight: 600;">${message}</p>
    </div>
  </div>`
}

async function sendNewsletterBatch(emails, content) {
  const transporter = getMailTransporter()
  for (const email of emails) {
    const unsubscribeUrl = `${FUNCTIONS_BASE_URL}/unsubscribeNewsletter?email=${encodeURIComponent(email)}`
    try {
      await transporter.sendMail({
        from: `"MEDWEB" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: `New on MEDWEB: ${content.title}`,
        html: buildNewsletterHtml({ ...content, unsubscribeUrl }),
      })
    } catch (err) {
      // One bad address must not abort the rest of the batch.
      console.error(`Newsletter send failed for ${email}:`, err.message)
    }
  }
}

async function getActiveSubscriberEmails() {
  const snap = await admin.firestore().collection('newsletterSubscribers').get()
  return snap.docs
    .map(d => d.data())
    .filter(s => s.email && s.unsubscribed !== true)
    .map(s => s.email)
}

async function sendNewsletterForPost(postId, post) {
  const emails = await getActiveSubscriberEmails()
  if (emails.length === 0) return

  const content = {
    title: post.title || 'New post on MEDWEB',
    excerpt: post.excerpt?.trim() || truncateExcerpt(post.content),
    // Every post gets a slug on save now (AdminBlog.jsx), so this should
    // always be present by the time a post is published — the #blog
    // fallback only matters for a pre-existing post published before that
    // shipped and somehow not yet backfilled.
    postUrl: post.slug ? `${SITE_URL}/blog/${post.slug}` : `${SITE_URL}/#blog`,
  }

  const toSend = emails.slice(0, GMAIL_DAILY_LIMIT)
  const remaining = emails.slice(GMAIL_DAILY_LIMIT)

  await sendNewsletterBatch(toSend, content)
  console.log(`Newsletter for post "${content.title}" (${postId}): sent to ${toSend.length} of ${emails.length} subscribers.`)

  if (remaining.length > 0) {
    console.warn(`Newsletter for post ${postId}: ${remaining.length} subscribers exceed the ${GMAIL_DAILY_LIMIT}/day Gmail-safe limit — queued for the next scheduled run.`)
    await admin.firestore().collection('newsletterBlasts').doc(postId).set({
      postId,
      ...content,
      remainingEmails: remaining,
      sentCount: toSend.length,
      totalCount: emails.length,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })
  }
}

// Fires only on the transition INTO "Published" — not on every save of an
// already-published post (fixing a typo later must not re-blast everyone).
exports.onBlogPublished = functions.firestore
  .document('blogPosts/{postId}')
  .onWrite(async (change, context) => {
    if (!change.after.exists) return null // deleted, nothing to send

    const before = change.before.exists ? change.before.data() : null
    const after = change.after.data()
    const wasPublished = before?.status === 'Published'
    const isPublished = after?.status === 'Published'
    if (wasPublished || !isPublished) return null

    try {
      await sendNewsletterForPost(context.params.postId, after)
    } catch (err) {
      console.error(`Newsletter dispatch failed for post ${context.params.postId}:`, err)
    }
    return null
  })

// Continues any newsletter blast that had leftover subscribers beyond the
// daily Gmail-safe limit — runs once a day, sends the next chunk, and
// cleans up the queue doc once everyone's been reached.
exports.sendQueuedNewsletters = functions.pubsub.schedule('every 24 hours').onRun(async () => {
  const blastsSnap = await admin.firestore().collection('newsletterBlasts').get()
  for (const blastDoc of blastsSnap.docs) {
    const blast = blastDoc.data()
    const remaining = blast.remainingEmails || []
    if (remaining.length === 0) { await blastDoc.ref.delete(); continue }

    const toSend = remaining.slice(0, GMAIL_DAILY_LIMIT)
    const stillRemaining = remaining.slice(GMAIL_DAILY_LIMIT)

    await sendNewsletterBatch(toSend, { title: blast.title, excerpt: blast.excerpt, postUrl: blast.postUrl })
    console.log(`Queued newsletter ${blastDoc.id}: sent ${toSend.length} more, ${stillRemaining.length} remaining.`)

    if (stillRemaining.length > 0) {
      console.warn(`Newsletter blast ${blastDoc.id}: still ${stillRemaining.length} subscribers pending after today's batch.`)
      await blastDoc.ref.update({
        remainingEmails: stillRemaining,
        sentCount: admin.firestore.FieldValue.increment(toSend.length),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
    } else {
      await blastDoc.ref.delete()
    }
  }
  return null
})

// Plain HTTPS endpoint so an unsubscribe link works directly from an email
// client with no app/JS involved. Uses the Admin SDK so it can write
// regardless of the client-facing Firestore rules (which intentionally only
// allow "create" on this collection, not "update", from the browser).
exports.unsubscribeNewsletter = functions.https.onRequest(async (req, res) => {
  const email = String(req.query.email || '').trim().toLowerCase()
  if (!email) {
    res.status(400).send(renderUnsubscribePage('Missing email address.', false))
    return
  }
  const docId = email.replace(/\//g, '_')
  try {
    await admin.firestore().collection('newsletterSubscribers').doc(docId).set(
      { unsubscribed: true, unsubscribedAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    )
    res.status(200).send(renderUnsubscribePage(`${email} has been unsubscribed from the MEDWEB newsletter.`, true))
  } catch (err) {
    console.error('Unsubscribe failed:', err)
    res.status(500).send(renderUnsubscribePage('Something went wrong. Please try again later.', false))
  }
})
