// ── MEDWEB Firestore Service ──────────────────────────────────────────────────
// All database operations live here. Import what you need in any page.

import {
  collection, doc, addDoc, setDoc, updateDoc, deleteDoc,
  getDocs, getDoc, query, where, orderBy, limit,
  serverTimestamp, increment, onSnapshot, runTransaction,
} from 'firebase/firestore'
import { db } from './config'

// ─── Collection names ────────────────────────────────────────────────────────
const COLS = {
  webinars: 'webinars',
  courses: 'courses',
  certificates: 'certificates',
  ambassadors: 'ambassadors',
  blog: 'blogPosts',
  team: 'team',
  advisory: 'advisory',
}

// ─── Generic helpers ─────────────────────────────────────────────────────────
const col = name => collection(db, name)
const ref = (name, id) => doc(db, name, id)

async function getAll(colName, ...queryConstraints) {
  const q = queryConstraints.length
    ? query(col(colName), ...queryConstraints)
    : col(colName)
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

async function getOne(colName, id) {
  const snap = await getDoc(ref(colName, id))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

async function add(colName, data) {
  const docRef = await addDoc(col(colName), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return docRef.id
}

async function update(colName, id, data) {
  await updateDoc(ref(colName, id), { ...data, updatedAt: serverTimestamp() })
}

async function remove(colName, id) {
  await deleteDoc(ref(colName, id))
}

// ─── MANUAL DRAG-REORDER (Courses, Team, Ambassadors) ────────────────────────
// Sorts by the numeric `order` field ascending. Any doc missing it (created
// before drag-reorder existed) falls back to its position in the array as
// already fetched (createdAt desc) — same visual order as before this
// feature ever existed, until an admin actually drags it somewhere else.
function applyManualOrder(rows) {
  return rows
    .map((r, i) => ({ r, fallback: i }))
    .sort((a, b) => (a.r.order ?? a.fallback) - (b.r.order ?? b.fallback))
    .map(x => x.r)
}

// Persists a full drag-and-drop reorder: writes sequential 0,1,2… `order`
// values for every item in its new position. `items` is the reordered array
// (each needs an `id`); doubles as the self-heal backfill call for any doc
// still missing `order` (see the admin pages' backfill effects).
function reorderCollection(colName, items) {
  return Promise.all(items.map((item, i) => update(colName, item.id, { order: i })))
}

// ─── WEBINARS ────────────────────────────────────────────────────────────────
export const webinarsService = {
  getAll: () => getAll(COLS.webinars, orderBy('createdAt', 'desc')),
  getUpcoming: () => getAll(COLS.webinars, where('status', '==', 'Upcoming'), orderBy('date')),
  getLive: () => getAll(COLS.webinars, where('status', '==', 'Live')),
  getOne: id => getOne(COLS.webinars, id),
  add: data => add(COLS.webinars, { ...data, registered: 0, attended: 0 }),
  update: (id, data) => update(COLS.webinars, id, data),
  delete: id => remove(COLS.webinars, id),
  register: id => update(COLS.webinars, id, { registered: increment(1) }),
  markAttended: id => update(COLS.webinars, id, { attended: increment(1) }),
  // Save a user registration / join application
  addRegistration: data => add('webinarRegistrations', data),
  getRegistrations: webinarId => getAll('webinarRegistrations', where('webinarId', '==', webinarId), orderBy('createdAt', 'desc')),
  getAllRegistrations: () => getAll('webinarRegistrations', orderBy('createdAt', 'desc')),
  // Used by the client-side certificate generator (src/lib/certificateGenerator.js)
  // to find which webinar a just-submitted feedback form belongs to.
  getByFeedbackFormId: async formId => {
    const rows = await getAll(COLS.webinars, where('feedbackFormId', '==', formId), limit(1))
    return rows[0] || null
  },
  listen: cb => onSnapshot(
    query(col(COLS.webinars), orderBy('createdAt', 'desc')),
    snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    err => console.error("Firebase listen error:", err)
  ),
}

// ─── COURSES ─────────────────────────────────────────────────────────────────
export const coursesService = {
  getAll: () => getAll(COLS.courses, orderBy('createdAt', 'desc')).then(applyManualOrder),
  getActive: () => getAll(COLS.courses, where('status', '==', 'Active')).then(applyManualOrder),
  getOne: id => getOne(COLS.courses, id),
  add: data => add(COLS.courses, { ...data, students: 0, rating: 0 }),
  update: (id, data) => update(COLS.courses, id, data),
  delete: id => remove(COLS.courses, id),
  reorder: items => reorderCollection(COLS.courses, items),
  listen: cb => onSnapshot(
    query(col(COLS.courses), orderBy('createdAt', 'desc')),
    snap => cb(applyManualOrder(snap.docs.map(d => ({ id: d.id, ...d.data() })))),
    err => console.error("Firebase listen error:", err)
  ),
}

// ─── CERTIFICATES ────────────────────────────────────────────────────────────
export const certificatesService = {
  getAll: () => getAll(COLS.certificates, orderBy('createdAt', 'desc')),
  getOne: id => getOne(COLS.certificates, id),
  // Verify by certificate code
  verify: async certId => {
    const results = await getAll(COLS.certificates, where('certCode', '==', certId))
    if (results.length > 0) {
      // Increment verifications
      await update(COLS.certificates, results[0].id, {
        verifications: increment(1),
      })
      return results[0]
    }
    return null
  },
  add: data => add(COLS.certificates, { ...data, verifications: 0, status: 'Valid' }),
  // Read-only lookup by code (does NOT increment) — used by the public certificate page
  getByCode: async certId => {
    const results = await getAll(COLS.certificates, where('certCode', '==', certId))
    return results.length > 0 ? results[0] : null
  },
  // Fully random certificate ID — deliberately carries no relationship to
  // the webinar/course title or to any other certificate (unlike the old
  // MEDWEB-{shortCode}-{seq} scheme). Also sidesteps a real permission
  // problem the old scheme had: it needed a shared per-webinar counter
  // document that anonymous students' browsers had to both create AND
  // repeatedly update, but Firestore rules only allow anonymous `create` on
  // this collection (update/delete are admin-only) — so only the first
  // certificate for any given webinar ever succeeded. A random code needs
  // no shared state at all: just generate, check for a collision (a plain
  // read, already allowed), and create — no update ever required.
  generateUniqueCode: async () => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    for (let attempt = 0; attempt < 5; attempt++) {
      const bytes = new Uint8Array(10)
      crypto.getRandomValues(bytes)
      let suffix = ''
      for (let i = 0; i < bytes.length; i++) suffix += alphabet[bytes[i] % alphabet.length]
      const code = `MEDWEB-${suffix}`
      const collision = await certificatesService.getByCode(code)
      if (!collision) return code
    }
    throw new Error('Could not generate a unique certificate code — please try again.')
  },
  update: (id, data) => update(COLS.certificates, id, data),
  revoke: id => update(COLS.certificates, id, { status: 'Revoked' }),
  delete: id => remove(COLS.certificates, id),
  listen: cb => onSnapshot(
    query(col(COLS.certificates), orderBy('createdAt', 'desc')),
    snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    err => console.error("Firebase listen error:", err)
  ),
}

// ─── AMBASSADORS ─────────────────────────────────────────────────────────────
export const ambassadorsService = {
  getAll: () => getAll(COLS.ambassadors, orderBy('createdAt', 'desc')).then(applyManualOrder),
  getActive: () => getAll(COLS.ambassadors, where('status', '==', 'Active')).then(applyManualOrder),
  getOne: id => getOne(COLS.ambassadors, id),
  add: data => add(COLS.ambassadors, { ...data, students: 0 }),
  update: (id, data) => update(COLS.ambassadors, id, data),
  delete: id => remove(COLS.ambassadors, id),
  reorder: items => reorderCollection(COLS.ambassadors, items),
  listen: cb => onSnapshot(
    query(col(COLS.ambassadors), orderBy('createdAt', 'desc')),
    snap => cb(applyManualOrder(snap.docs.map(d => ({ id: d.id, ...d.data() })))),
    err => console.error("Firebase listen error:", err)
  ),
}

// ─── ANNOUNCEMENTS (general-purpose homepage promo banner) ───────────────────
// Separate from the existing webinar-specific announcement popup
// (WebinarAnnouncementPopup.jsx / webinarsService) — this is for ANY
// event/course/conference, including links out to entirely separate
// external sites. `order` uses the same manual-reorder pattern as Courses/
// Team/Ambassadors (see applyManualOrder/reorderCollection above).
const ANNOUNCEMENTS_COL = 'announcements'

export const announcementsService = {
  getAll: () => getAll(ANNOUNCEMENTS_COL, orderBy('createdAt', 'desc')).then(applyManualOrder),
  getOne: id => getOne(ANNOUNCEMENTS_COL, id),
  getBySlug: async slug => {
    const rows = await getAll(ANNOUNCEMENTS_COL, where('slug', '==', slug), limit(1))
    return rows[0] || null
  },
  add: data => add(ANNOUNCEMENTS_COL, data),
  update: (id, data) => update(ANNOUNCEMENTS_COL, id, data),
  delete: id => remove(ANNOUNCEMENTS_COL, id),
  reorder: items => reorderCollection(ANNOUNCEMENTS_COL, items),
  listen: cb => onSnapshot(
    query(col(ANNOUNCEMENTS_COL), orderBy('createdAt', 'desc')),
    snap => cb(applyManualOrder(snap.docs.map(d => ({ id: d.id, ...d.data() })))),
    err => console.error("Firebase listen error:", err)
  ),
}

// ─── STUDENT DATABASE (aggregated, deduped-by-email) ─────────────────────────
// One doc per unique email, doc ID = the email itself (URL-encoded so it's a
// valid Firestore doc ID). Fed from 3 places only — webinar registrations,
// webinar feedback submissions, and ambassador registrations — never
// overwritten wholesale, always merged via a transaction so concurrent
// upserts (e.g. two webinars registering the same email at once) can't
// clobber each other's registrations/certificates arrays.
const STUDENT_DB_COL = 'studentDatabase'
const studentDocId = email => encodeURIComponent(String(email).trim().toLowerCase())

async function upsertStudent(email, patch) {
  if (!email?.trim()) return
  const ref = doc(db, STUDENT_DB_COL, studentDocId(email))
  await runTransaction(db, async tx => {
    const snap = await tx.get(ref)
    const base = snap.exists() ? snap.data() : {
      name: '', email: email.trim().toLowerCase(), phone: '', university: '', degree: '',
      registrations: [], certificates: [],
      createdAt: serverTimestamp(),
    }
    tx.set(ref, { ...patch(base), updatedAt: serverTimestamp() }, { merge: true })
  })
}

export const studentsDbService = {
  getAll: () => getAll(STUDENT_DB_COL, orderBy('updatedAt', 'desc')),
  listen: cb => onSnapshot(
    query(col(STUDENT_DB_COL), orderBy('updatedAt', 'desc')),
    snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    err => console.error('Firebase studentDatabase listen error:', err)
  ),

  // Webinar Registration submission — one entry per distinct webinarId.
  upsertFromRegistration: ({ email, name, phone, university, degree, webinarId, webinarTitle, registeredAt }) =>
    upsertStudent(email, base => {
      const already = (base.registrations || []).some(r => r.webinarId === webinarId)
      return {
        ...base,
        name: name?.trim() || base.name,
        phone: phone?.trim() || base.phone,
        university: university?.trim() || base.university,
        degree: degree?.trim() || base.degree,
        registrations: already ? base.registrations : [
          ...(base.registrations || []),
          { webinarId: webinarId || '', webinarTitle: webinarTitle || '', registeredAt: registeredAt || new Date().toISOString() },
        ],
      }
    }),

  // Webinar Feedback submission — doesn't add a registration/certificate,
  // just ensures the student record exists and enriches contact details.
  upsertFromFeedback: ({ email, name, phone }) =>
    upsertStudent(email, base => ({
      ...base,
      name: name?.trim() || base.name,
      phone: phone?.trim() || base.phone,
    })),

  // Certificate issuance — one entry per distinct certCode.
  upsertFromCertificate: ({ email, name, webinarId, webinarTitle, certCode, issuedAt }) =>
    upsertStudent(email, base => {
      const already = (base.certificates || []).some(c => c.certCode === certCode)
      return {
        ...base,
        name: name?.trim() || base.name,
        certificates: already ? base.certificates : [
          ...(base.certificates || []),
          { webinarId: webinarId || '', webinarTitle: webinarTitle || '', certCode: certCode || '', issuedAt: issuedAt || new Date().toISOString() },
        ],
      }
    }),

  // Ambassador registration (public application form, or an admin manually
  // adding an ambassador) — enriches contact/university/degree only.
  upsertFromAmbassador: ({ email, name, phone, university, degree }) =>
    upsertStudent(email, base => ({
      ...base,
      name: name?.trim() || base.name,
      phone: phone?.trim() || base.phone,
      university: university?.trim() || base.university,
      degree: degree?.trim() || base.degree,
    })),
}

// ─── BLOG POSTS ──────────────────────────────────────────────────────────────
export const blogService = {
  getAll: () => getAll(COLS.blog, orderBy('createdAt', 'desc')),
  getPublished: () => getAll(COLS.blog, where('status', '==', 'Published'), orderBy('createdAt', 'desc')),
  getLatest: n => getAll(COLS.blog, where('status', '==', 'Published'), orderBy('createdAt', 'desc'), limit(n || 3)),
  getOne: id => getOne(COLS.blog, id),
  // Public lookup for the dedicated post page (BlogPostPage.jsx) — only
  // ever called with a slug typed/clicked by a visitor, same trust level
  // as getOne(id) elsewhere.
  getBySlug: async slug => {
    const rows = await getAll(COLS.blog, where('slug', '==', slug), limit(1))
    return rows[0] || null
  },
  add: data => add(COLS.blog, { ...data, views: 0 }),
  update: (id, data) => update(COLS.blog, id, data),
  publish: id => update(COLS.blog, id, { status: 'Published', published: new Date().toISOString().split('T')[0] }),
  delete: id => remove(COLS.blog, id),
  incrementView: id => update(COLS.blog, id, { views: increment(1) }),
  listen: cb => onSnapshot(
    query(col(COLS.blog), orderBy('createdAt', 'desc')),
    snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    err => console.error("Firebase listen error:", err)
  ),
}

export const blogCategoriesService = {
  getAll: () => getAll('blogCategories', orderBy('createdAt', 'desc')),
  add: data => add('blogCategories', data),
  update: (id, data) => update('blogCategories', id, data),
  delete: id => remove('blogCategories', id),
  listen: cb => onSnapshot(
    query(collection(db, 'blogCategories'), orderBy('createdAt', 'desc')),
    snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    err => console.error("Firebase blogCategories listen error:", err)
  ),
}

// ─── TEAM ────────────────────────────────────────────────────────────────────
export const teamService = {
  getAll: () => getAll(COLS.team, orderBy('createdAt', 'desc')).then(applyManualOrder),
  getOne: id => getOne(COLS.team, id),
  add: data => add(COLS.team, data),
  update: (id, data) => update(COLS.team, id, data),
  delete: id => remove(COLS.team, id),
  reorder: items => reorderCollection(COLS.team, items),
  listen: cb => onSnapshot(
    query(col(COLS.team), orderBy('createdAt', 'desc')),
    snap => cb(applyManualOrder(snap.docs.map(d => ({ id: d.id, ...d.data() })))),
    err => console.error("Firebase listen error:", err)
  ),
}

export const teamCategoriesService = {
  getAll: () => getAll('teamCategories', orderBy('createdAt', 'desc')).then(applyManualOrder),
  add: data => add('teamCategories', data),
  update: (id, data) => update('teamCategories', id, data),
  delete: id => remove('teamCategories', id),
  reorder: items => reorderCollection('teamCategories', items),
  listen: cb => onSnapshot(
    query(collection(db, 'teamCategories'), orderBy('createdAt', 'desc')),
    snap => cb(applyManualOrder(snap.docs.map(d => ({ id: d.id, ...d.data() })))),
    err => console.error("Firebase teamCategories listen error:", err)
  ),
}


// ─── ADVISORY BOARD ──────────────────────────────────────────────────────────
export const advisoryService = {
  getAll: () => getAll(COLS.advisory, orderBy('createdAt', 'desc')),
  getOne: id => getOne(COLS.advisory, id),
  add: data => add(COLS.advisory, data),
  update: (id, data) => update(COLS.advisory, id, data),
  delete: id => remove(COLS.advisory, id),
  listen: cb => onSnapshot(
    query(col(COLS.advisory), orderBy('createdAt', 'desc')),
    snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    err => console.error("Firebase listen error:", err)
  ),
}

// ─── DASHBOARD STATS ─────────────────────────────────────────────────────────
export async function getDashboardStats() {
  const [students, webinars, courses, certs, ambassadors] = await Promise.all([
    getDocs(col(STUDENT_DB_COL)),
    getDocs(col(COLS.webinars)),
    getDocs(col(COLS.courses)),
    getDocs(col(COLS.certificates)),
    getDocs(col(COLS.ambassadors)),
  ])
  return {
    totalStudents: students.size,
    activeStudents: students.size, // studentDatabase has no Active/Inactive concept — every aggregated record counts
    totalWebinars: webinars.size,
    upcomingWebinars: webinars.docs.filter(d => d.data().status === 'Upcoming').length,
    activeCourses: courses.docs.filter(d => d.data().status === 'Active').length,
    validCerts: certs.docs.filter(d => d.data().status === 'Valid').length,
    activeAmbassadors: ambassadors.docs.filter(d => d.data().status === 'Active').length,
  }
}

// ─── TESTIMONIALS ─────────────────────────────────────────────────────────────
export const testimonialsService = {
  getAll: () => getAll('testimonials', orderBy('createdAt', 'desc')),
  getApproved: () => getAll('testimonials', where('status', '==', 'Approved'), orderBy('createdAt', 'desc')),
  add: data => add('testimonials', { ...data, status: 'Approved' }),
  update: (id, data) => update('testimonials', id, data),
  delete: id => remove('testimonials', id),
  listen: cb => onSnapshot(
    query(collection(db, 'testimonials'), orderBy('createdAt', 'desc')),
    snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    err => console.error("Firebase listen error:", err)
  ),
}

// ─── PENDING TESTIMONIALS (auto-fetched Google Reviews + YouTube videos) ──────
// Queue that both auto-fetch sources land in before anything goes public.
// A doc's `status` moves Pending -> Approved | Rejected and is NEVER deleted
// (even after Approve) — the doc itself doubles as the permanent dedupe
// ledger, so an approved/rejected review or video is never re-queued by a
// later fetch. Only `status === 'Pending'` docs should be shown in the
// admin queue UI; Approve additionally copies the matching fields into
// `testimonialsService.add()` so the public "What Our Students Say" section
// needs no separate rendering logic for auto-fetched vs. manual entries.
export const pendingTestimonialsService = {
  listen: cb => onSnapshot(
    query(collection(db, 'pendingTestimonials'), orderBy('createdAt', 'desc')),
    snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    err => console.error('Firebase listen error:', err)
  ),
  // Every doc ever fetched (any status) — used to dedupe a new fetch run
  // against everything already seen, so approved/rejected items don't
  // reappear in the queue.
  getAllDedupeKeys: async () => {
    const snap = await getDocs(collection(db, 'pendingTestimonials'))
    return new Set(snap.docs.map(d => d.data().dedupeKey))
  },
  add: data => add('pendingTestimonials', { ...data, status: 'Pending' }),
  reject: id => update('pendingTestimonials', id, { status: 'Rejected' }),
  approve: async pending => {
    await testimonialsService.add({
      name: pending.name,
      uni: pending.uni || '',
      role: '',
      text: pending.text,
      img: pending.img || '',
      stars: pending.stars || 5,
      category: pending.category || (pending.source === 'Google' ? 'Google Review' : 'YouTube Review'),
    })
    await update('pendingTestimonials', pending.id, { status: 'Approved' })
  },
}

// ─── YOUTUBE REVIEW FETCH STATE ────────────────────────────────────────────────
// Tracks the last successful "Fetch New Reviews" run so re-fetching only walks
// channel comments newer than that, instead of re-scanning full comment
// history on every video on every click.
export const youtubeFetchStateService = {
  get: () => getOne('settings', 'youtubeReviewFetch'),
  markFetched: () => setDoc(doc(db, 'settings', 'youtubeReviewFetch'), { lastFetchedAt: serverTimestamp() }, { merge: true }),
}

// ─── SITE SETTINGS (stats, hero text, etc.) ───────────────────────────────────
export const settingsService = {
  get: () => getOne('settings', 'site'),
  update: data => setDoc(doc(db, 'settings', 'site'), { ...data, updatedAt: serverTimestamp() }, { merge: true }),
  // Real-time listener for the single site settings doc
  listen: cb => onSnapshot(doc(db, 'settings', 'site'), snap => cb(snap.exists() ? { id: snap.id, ...snap.data() } : null), err => console.error('Firebase settings listen error:', err)),
}

// ─── EMAILJS USAGE TRACKING ────────────────────────────────────────────────────
// EmailJS's free plan shares one 200-sends/month quota across every feature
// that calls sendEmail() (webinar confirmations, certificates, newsletter) —
// there's no official API to ask EmailJS how much quota is left, so this is
// a self-tracked counter, incremented once per attempted send (success or
// failure both count against the real quota), reset whenever the month
// rolls over. Good enough to warn an admin before a large newsletter blast
// clearly would blow through what's left.
export const emailUsageService = {
  get: () => getOne('settings', 'emailUsage'),
  increment: async () => {
    const monthKey = new Date().toISOString().slice(0, 7) // 'YYYY-MM'
    const usageRef = doc(db, 'settings', 'emailUsage')
    const snap = await getDoc(usageRef)
    const data = snap.exists() ? snap.data() : null
    if (data && data.month === monthKey) {
      await updateDoc(usageRef, { count: increment(1) })
    } else {
      await setDoc(usageRef, { month: monthKey, count: 1 })
    }
  },
}

// ─── SECTION VISIBILITY (Round 17) ─────────────────────────────────────────────
// One boolean per homepage section, in its own doc so HomePage.jsx doesn't need
// to subscribe to the full (much larger) settings/site doc just to read these.
// Missing doc/field = treated as visible (true) — see HomePage.jsx — so nothing
// disappears for sites that existed before this shipped.
export const sectionVisibilityService = {
  get: () => getOne('settings', 'sectionVisibility'),
  update: data => setDoc(doc(db, 'settings', 'sectionVisibility'), { ...data, updatedAt: serverTimestamp() }, { merge: true }),
  listen: cb => onSnapshot(doc(db, 'settings', 'sectionVisibility'), snap => cb(snap.exists() ? snap.data() : null), err => console.error('Firebase sectionVisibility listen error:', err)),
}

// ─── NEWSLETTER SUBSCRIBERS (Round 17) ──────────────────────────────────────────
export const newsletterService = {
  // Doc ID = the email itself, so dedup needs no public read/query (which would
  // otherwise require exposing a way to list subscriber emails). A repeat signup
  // lands on an existing doc ID, which Firestore treats as an "update" — and the
  // security rules only allow "create" — so it comes back permission-denied,
  // which we recognize here as "already subscribed" instead of a real failure.
  subscribe: async email => {
    const normalized = email.trim().toLowerCase()
    const docId = normalized.replace(/\//g, '_')
    try {
      await setDoc(doc(db, 'newsletterSubscribers', docId), {
        email: normalized,
        // Every newsletter send filters out unsubscribed === true — set
        // explicitly here, not left implicit, so that filter never has to
        // guess about a missing field.
        unsubscribed: false,
        subscribedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    } catch (err) {
      if (err.code === 'permission-denied') {
        const dupErr = new Error('This email is already subscribed.')
        dupErr.code = 'already-subscribed'
        throw dupErr
      }
      console.error('Firebase newsletter subscribe error:', err)
      throw err
    }
  },
  // Called from the public /unsubscribe page (NewsletterUnsubscribe.jsx),
  // unauthenticated. There's no Cloud Function to do this with elevated
  // privileges anymore, so it relies on a narrowly-scoped Firestore rule
  // allowing an unauthenticated update of ONLY the unsubscribed/
  // unsubscribedAt fields on newsletterSubscribers — see that page for the
  // exact rule text this needs.
  unsubscribe: async email => {
    const normalized = email.trim().toLowerCase()
    const docId = normalized.replace(/\//g, '_')
    await updateDoc(doc(db, 'newsletterSubscribers', docId), {
      unsubscribed: true,
      unsubscribedAt: serverTimestamp(),
    })
  },
  getAll: () => getAll('newsletterSubscribers', orderBy('createdAt', 'desc')),
  listen: cb => onSnapshot(
    query(col('newsletterSubscribers'), orderBy('createdAt', 'desc')),
    snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    err => console.error('Firebase newsletter listen error:', err)
  ),
}

// ─── ADMIN USERS (sub-admin permissions) ──────────────────────────────────────
// Doc ID = normalized email (same convention as newsletterSubscribers), so a
// signed-in admin's permissions can be looked up directly by their Firebase
// Auth email with no query needed. IMPORTANT bootstrapping rule: a signed-in
// admin with NO doc here is treated as a Super Admin with full access — this
// is what preserves today's behavior for every admin account that already
// exists (created directly in the Firebase Console, same as always) without
// any migration. Only admins explicitly added via the "Admin Users" page get
// a doc, and therefore get restricted to `allowedSections`.
//
// `create` is deliberately only ever called from AcceptInvite.jsx, right
// after that invitee's OWN browser creates their OWN Firebase Auth account
// (createUserWithEmailAndPassword). It must never be called from
// AdminUsers.jsx directly — doing the Auth creation there, in the Super
// Admin's own tab, would sign the Super Admin's browser into the new
// account and end their session. See adminInvitesService below for the
// invite-link mechanism that keeps the two sessions separate.
export const adminUsersService = {
  getByEmail: email => getOne('adminUsers', email.trim().toLowerCase()),
  listen: cb => onSnapshot(
    query(col('adminUsers'), orderBy('createdAt', 'desc')),
    snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    err => console.error('Firebase adminUsers listen error:', err)
  ),
  create: (email, data) => {
    const normalized = email.trim().toLowerCase()
    return setDoc(doc(db, 'adminUsers', normalized), {
      ...data,
      email: normalized,
      role: 'admin',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  },
  update: (email, data) => update('adminUsers', email.trim().toLowerCase(), data),
  delete: email => remove('adminUsers', email.trim().toLowerCase()),
}

// ─── ADMIN INVITES (client-side replacement for the old createAdminUser
// Cloud Function) ───────────────────────────────────────────────────────────
// Doc ID = the random token itself (not the email) — the token IS the
// capability: anyone holding the link can read this doc (needed so the
// unauthenticated invitee's browser can look it up before they have an
// account) and claim it exactly once. `claimed` flips to true the moment
// AcceptInvite.jsx finishes, so a link can't be reused if it leaks.
export const adminInvitesService = {
  create: async ({ name, email, allowedSections }) => {
    const token = crypto.randomUUID().replace(/-/g, '')
    await setDoc(doc(db, 'adminInvites', token), {
      name,
      email: email.trim().toLowerCase(),
      allowedSections,
      claimed: false,
      createdAt: serverTimestamp(),
    })
    return token
  },
  getByToken: token => getOne('adminInvites', token),
  listen: cb => onSnapshot(
    query(col('adminInvites'), orderBy('createdAt', 'desc')),
    snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    err => console.error('Firebase adminInvites listen error:', err)
  ),
  claim: token => update('adminInvites', token, { claimed: true, claimedAt: serverTimestamp() }),
  delete: token => remove('adminInvites', token),
}

// ─── DYNAMIC FORM BUILDER ─────────────────────────────────────────────────────
// A "form" is an admin-built schema (collection: forms). Each form has a list of
// fields. User submissions are stored in formSubmissions, keyed by formId.
export const formsService = {
  getAll: () => getAll('forms', orderBy('createdAt', 'desc')),
  getActive: () => getAll('forms', where('status', '==', 'Active')),
  getOne: id => getOne('forms', id),
  add: data => add('forms', { fields: [], status: 'Active', ...data }),
  update: (id, data) => update('forms', id, data),
  delete: id => remove('forms', id),
  listen: cb => onSnapshot(
    query(col('forms'), orderBy('createdAt', 'desc')),
    snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    err => console.error("Firebase listen error:", err)
  ),
  // ── Submissions ──
  addSubmission: data => add('formSubmissions', data),
  // Used by the client-side certificate generator to record success/failure
  // (certificateStatus/certificateError) on the submission that triggered it.
  updateSubmission: (id, data) => update('formSubmissions', id, data),
  getSubmissions: formId => getAll('formSubmissions', where('formId', '==', formId), orderBy('createdAt', 'desc')),
  getAllSubmissions: () => getAll('formSubmissions', orderBy('createdAt', 'desc')),
  deleteSubmission: id => remove('formSubmissions', id),
  listenSubmissions: cb => onSnapshot(
    query(col('formSubmissions'), orderBy('createdAt', 'desc')),
    snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    err => console.error("Firebase listen error:", err)
  ),
}

// The 7 fields required by the spec for webinar registration, expressed in the
// same {key, type, label, placeholder, required, options} shape AdminForms.jsx
// builds — so this form is fully editable there like any other.
export const DEFAULT_WEBINAR_FORM_FIELDS = [
  { key: 'name', type: 'text', label: 'Full Name', placeholder: 'Your full name', required: true, options: [] },
  { key: 'email', type: 'email', label: 'Email', placeholder: 'you@email.com', required: true, options: [] },
  { key: 'whatsapp', type: 'phone', label: 'WhatsApp Number', placeholder: '03XX-XXXXXXX', required: true, options: [] },
  { key: 'qualification', type: 'qualification', label: 'Qualification', placeholder: '', required: true, options: [] },
  { key: 'semester', type: 'semester', label: 'Semester / Year', placeholder: '', required: false, options: [] },
  { key: 'question', type: 'textarea', label: 'Question related to this webinar', placeholder: "Anything you'd like the speaker to address?", required: false, options: [] },
  { key: 'joinGroup', type: 'checkbox', label: 'Join WhatsApp Group', placeholder: 'Join our WhatsApp group for updates & resources', required: false, options: [] },
]

// Idempotently creates the default "Webinar Registration" form in the Form
// Builder on first run so the registration page has a real, admin-editable
// form to render instead of hardcoded fields. Safe to call repeatedly.
export async function ensureDefaultWebinarForm() {
  const existing = await getAll('forms', where('isDefaultWebinarForm', '==', true))
  if (existing.length) return existing[0].id
  return add('forms', {
    title: 'Webinar Registration',
    description: 'Default registration form used by every webinar unless a webinar has its own form attached.',
    status: 'Active',
    isDefaultWebinarForm: true,
    fields: DEFAULT_WEBINAR_FORM_FIELDS,
  })
}

// Helper to safely convert Firestore Timestamps, Date objects, or string values to ISO strings
export function toIsoString(val) {
  if (!val) return ''
  if (typeof val === 'string') return val
  if (typeof val.toDate === 'function') {
    try { return val.toDate().toISOString() } catch (e) { return '' }
  }
  if (typeof val.seconds === 'number') {
    try { return new Date(val.seconds * 1000).toISOString() } catch (e) { return '' }
  }
  if (val instanceof Date) {
    try { return val.toISOString() } catch (e) { return '' }
  }
  return String(val ?? '')
}

// ─── UNIFIED SUBMISSIONS (webinar registrations + custom form submissions) ─────
// The admin "Submissions" page wants ONE feed of everything. This merges the two
// collections and normalizes them into { type, refName, name, email, whatsapp, date }.
export const submissionsService = {
  listen: cb => {
    let regs = [], forms = [], newsletter = []
    const emit = () => {
      const merged = [
        ...regs.map(r => ({
          id: 'reg_' + r.id, type: 'Webinar', refName: r.webinarTopic || r.webinarTitle || '-',
          name: r.name || '-', email: r.email || '-', whatsapp: r.whatsapp || '-',
          date: toIsoString(r.registeredAt || r.createdAt), raw: r,
        })),
        ...forms.map(f => ({
          id: 'form_' + f.id, type: 'Form', refName: f.formTitle || '-',
          name: f.values?.name || f.values?.fullName || '-',
          email: f.values?.email || '-',
          whatsapp: f.values?.whatsapp || f.values?.phone || '-',
          date: toIsoString(f.submittedAt || f.createdAt), raw: f,
        })),
        ...newsletter.map(n => ({
          id: 'news_' + n.id, type: 'Newsletter', refName: 'Newsletter Signup',
          name: '-', email: n.email || '-', whatsapp: '-',
          date: toIsoString(n.subscribedAt || n.createdAt), raw: n,
        })),
      ].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
      cb(merged)
    }
    const u1 = onSnapshot(query(col('webinarRegistrations'), orderBy('createdAt', 'desc')),
      snap => { regs = snap.docs.map(d => ({ id: d.id, ...d.data() })); emit() },
      err => { console.error('webinarRegistrations snapshot error:', err); emit() })
    const u2 = onSnapshot(query(col('formSubmissions'), orderBy('createdAt', 'desc')),
      snap => { forms = snap.docs.map(d => ({ id: d.id, ...d.data() })); emit() },
      err => { console.error('formSubmissions snapshot error:', err); emit() })
    const u3 = onSnapshot(query(col('newsletterSubscribers'), orderBy('createdAt', 'desc')),
      snap => { newsletter = snap.docs.map(d => ({ id: d.id, ...d.data() })); emit() },
      err => { console.error('newsletterSubscribers snapshot error:', err); emit() })
    return () => { u1(); u2(); u3() }
  },
}
