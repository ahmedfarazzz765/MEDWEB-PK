// ── MEDWEB Firestore Service ──────────────────────────────────────────────────
// All database operations live here. Import what you need in any page.

import {
  collection, doc, addDoc, setDoc, updateDoc, deleteDoc,
  getDocs, getDoc, query, where, orderBy, limit, startAfter,
  serverTimestamp, increment, onSnapshot, runTransaction, getCountFromServer, Timestamp,
} from 'firebase/firestore'
import { db, auth } from './config'

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

// ─── PUBLIC SITE DATA (read-quota optimization) ──────────────────────────────
// Firestore's Spark plan has a 50k-reads/day quota; before this, almost
// every public page/section mounted its own getDocs/onSnapshot against the
// full `courses`/`webinars`/`blogPosts`/`announcements`/`settings` collections
// — and several sections on the SAME page (Hero, WebinarsSlider, CoursePopup,
// WebinarAnnouncementPopup all separately listen to the whole `webinars`
// collection, for example) duplicated the same read. One home page load
// could cost 10+ full-collection reads per visitor.
//
// `public/siteData` is a single doc rebuilt here after every admin
// create/update/delete/publish/reorder on those five collections — NOT on
// public-facing counter bumps (webinars.register, blogService.incrementView,
// certificatesService.verify, ambassadorsService.addReferralPoint), which
// stay cheap single-field writes with no rebuild. Most public pages now
// read this ONE doc instead (see src/hooks/useSiteData.js for the shared,
// localStorage-cached client-side fetch).
//
// courses/webinars/announcements keep their full doc shape (nothing here is
// large enough to matter) — blogPosts is the one collection explicitly
// trimmed: latest 20 Published posts, with `content` (the Tiptap body)
// stripped out, since that's genuinely heavy and only the single post page
// ever needs it (fetched separately, by slug, same as before).
// setDoc() rejects `undefined` anywhere in the payload outright — even
// nested inside an array/object — which is exactly what a course/webinar/
// etc. doc can have plenty of (an admin form field that was simply never
// filled in, or a service helper's own optional-field spread). Recursively
// strips every `undefined` (dropping the key/array slot entirely, same as
// Firestore's own `ignoreUndefinedProperties` would for a top-level field),
// and normalizes Firestore Timestamp / JS Date values to plain epoch-ms
// numbers so nothing downstream has to special-case either type.
function deepCleanForFirestore(value) {
  if (value === undefined) return undefined
  if (value === null) return null
  if (value instanceof Timestamp) return value.toMillis()
  if (value instanceof Date) return value.getTime()
  if (Array.isArray(value)) {
    return value.map(deepCleanForFirestore).filter(v => v !== undefined)
  }
  if (typeof value === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(value)) {
      const cleaned = deepCleanForFirestore(v)
      if (cleaned !== undefined) out[k] = cleaned
    }
    return out
  }
  return value
}

// Last-resort trim when the whole payload is pushing Firestore's 1 MiB
// document limit — truncates long text fields on every item of a list
// rather than dropping whole items, which would be a much more visible
// behavior change for a comparatively small size win.
const LONG_FIELD_KEYS = ['description', 'content', 'body', 'bio', 'fullDescription', 'shortDescription']
const LONG_FIELD_THRESHOLD = 500
const LONG_FIELD_TRUNCATE_TO = 300
function truncateLongFields(rows) {
  if (!Array.isArray(rows)) return rows
  return rows.map(row => {
    if (!row || typeof row !== 'object') return row
    const next = { ...row }
    for (const key of LONG_FIELD_KEYS) {
      const val = next[key]
      if (typeof val === 'string' && val.length > LONG_FIELD_THRESHOLD) {
        next[key] = val.slice(0, LONG_FIELD_TRUNCATE_TO) + '…'
      }
    }
    return next
  })
}
const SITE_DATA_LIST_KEYS = ['courses', 'webinars', 'blogs', 'announcements', 'ambassadors', 'testimonials', 'team', 'teamCategories', 'advisory', 'blogCategories', 'news']

function rebuildSiteData() {
  // `public/siteData` itself is readable by anyone (see the rules file) —
  // unlike every other read here, this one is NOT gated per-document by
  // Firestore rules afterward, so each collection must be pre-filtered to
  // exactly what a public (non-admin) visitor could already read directly,
  // or a Draft course/disabled announcement would leak into the public
  // cache. webinars/blogPosts keep the same "no status gate"/"Published
  // only" rule the collection itself already enforces.
  // ambassadors/testimonials/news are fetched WITHOUT a `where()` filter
  // and filtered here in JS instead — rebuildSiteData runs as an admin
  // (full read access), so there's no permission reason to filter at the
  // query level, and filtering in JS also means a doc with a MISSING
  // status field (e.g. a legacy testimonial with no `status` at all,
  // which the per-doc rule treats as Approved) is handled correctly
  // instead of silently excluded the way a `where('status','==',...)`
  // query would exclude it.
  return Promise.all([
    getAll(COLS.courses, where('status', '==', 'Active'), orderBy('createdAt', 'desc')).then(applyManualOrder),
    getAll(COLS.webinars, orderBy('createdAt', 'desc')).then(rows => rows.map(normalizeWebinarSpeakers)),
    getAll(COLS.blog, where('status', '==', 'Published'), orderBy('createdAt', 'desc'), limit(20)),
    getAll(ANNOUNCEMENTS_COL, orderBy('createdAt', 'desc')).then(applyManualOrder).then(rows => rows.filter(r => r.enabled !== false)),
    getOne('settings', 'site'),
    getAll(COLS.ambassadors, orderBy('createdAt', 'desc')).then(applyManualOrder).then(rows => rows
      .filter(r => r.status === 'Active')
      // Public FIELDS only — excludes cnic/email/phone/authUid/
      // referralCode/hasLogin (personal/internal, never meant to reach a
      // public read; AmbassadorProfilePage.jsx's own single-doc getOne()
      // is untouched by this and still has the full doc for its own use).
      .map(({ id, name, university, city, gender, rank, ranking, status, students, points, imageUrl, cardImageUrl, ambCode, degreeProgram, semester, socialLinks, order }) =>
        ({ id, name, university, city, gender, rank, ranking, status, students, points, imageUrl, cardImageUrl, ambCode, degreeProgram, semester, socialLinks, order }))),
    getAll('testimonials', orderBy('createdAt', 'desc')).then(rows => rows.filter(r => (r.status || 'Approved') === 'Approved')),
    getAll(COLS.team, orderBy('createdAt', 'desc')).then(applyManualOrder),
    getAll('teamCategories', orderBy('createdAt', 'desc')).then(applyManualOrder),
    getAll(COLS.advisory, orderBy('createdAt', 'desc')),
    getAll('blogCategories', orderBy('createdAt', 'desc')),
    getOne('settings', 'sectionVisibility'),
    getAll('news', orderBy('createdAt', 'desc')).then(rows => rows.filter(r => r.status === 'Published' || r.status === 'published')),
  ]).then(([
    courses, webinars, blogs, announcements, site,
    ambassadors, testimonials, team, teamCategories, advisory, blogCategories, sectionVisibility, news,
  ]) => {
    const data = {
      courses,
      webinars,
      blogs: blogs.map(({ content, ...rest }) => rest),
      announcements,
      site: site || {},
      ambassadors,
      testimonials,
      team,
      teamCategories,
      advisory,
      blogCategories,
      sectionVisibility: sectionVisibility || {},
      news,
      updatedAt: Date.now(),
    }

    let cleaned = deepCleanForFirestore(data)
    let byteSize = new TextEncoder().encode(JSON.stringify(cleaned)).length
    console.log(`siteData payload size: ${(byteSize / 1024).toFixed(1)} KB`)

    // 900 KB, not Firestore's real 1 MiB (1048576 bytes) limit — leaves
    // headroom for the fields set outside this object (Firestore's own
    // per-document overhead, plus whatever setDoc's own encoding adds).
    if (byteSize > 900 * 1024) {
      console.warn(`siteData payload is ${(byteSize / 1024).toFixed(1)} KB (over 900 KB) — truncating long text fields on list items.`)
      for (const key of SITE_DATA_LIST_KEYS) {
        if (Array.isArray(cleaned[key])) cleaned[key] = truncateLongFields(cleaned[key])
      }
      byteSize = new TextEncoder().encode(JSON.stringify(cleaned)).length
      console.log(`siteData payload size after truncation: ${(byteSize / 1024).toFixed(1)} KB`)
    }

    return setDoc(doc(db, 'public', 'siteData'), cleaned).then(() => cleaned)
  })
}
// Fire-and-forget wrapper — an admin save shouldn't wait on (or fail over)
// the cache rebuild; errors are logged, never thrown back at the caller.
function triggerSiteDataRebuild() {
  rebuildSiteData().catch(err => console.error('siteData rebuild failed:', err))
}

export const siteDataService = {
  get: async () => {
    const snap = await getDoc(doc(db, 'public', 'siteData'))
    return snap.exists() ? snap.data() : null
  },
  // Manual repair/backfill — wired to the "Rebuild public cache" button in
  // the admin dashboard. Awaited (unlike the automatic triggerSiteDataRebuild
  // above) so the button can show success/failure.
  rebuild: rebuildSiteData,
}

// Old webinar docs stored a single speaker as three flat fields
// (speakerImage/speaker/role). New docs store a `speakers` array of
// { image, name, qualification } so a webinar can have several. Every read
// path below normalizes on the way out so callers can always assume
// `speakers` is an array, without a manual data migration.
function normalizeWebinarSpeakers(w) {
  if (Array.isArray(w.speakers)) return w
  const hasLegacySpeaker = w.speaker || w.speakerImage || w.role
  return {
    ...w,
    speakers: hasLegacySpeaker
      ? [{ image: w.speakerImage || '', name: w.speaker || '', qualification: w.role || '' }]
      : [],
  }
}

// ─── WEBINARS ────────────────────────────────────────────────────────────────
export const webinarsService = {
  getAll: () => getAll(COLS.webinars, orderBy('createdAt', 'desc')).then(rows => rows.map(normalizeWebinarSpeakers)),
  getUpcoming: () => getAll(COLS.webinars, where('status', '==', 'Upcoming'), orderBy('date')).then(rows => rows.map(normalizeWebinarSpeakers)),
  getLive: () => getAll(COLS.webinars, where('status', '==', 'Live')).then(rows => rows.map(normalizeWebinarSpeakers)),
  getOne: id => getOne(COLS.webinars, id).then(w => w ? normalizeWebinarSpeakers(w) : w),
  add: data => add(COLS.webinars, { ...data, registered: 0, attended: 0 }).then(id => { triggerSiteDataRebuild(); return id }),
  update: (id, data) => update(COLS.webinars, id, data).then(() => triggerSiteDataRebuild()),
  delete: id => remove(COLS.webinars, id).then(() => triggerSiteDataRebuild()),
  register: id => update(COLS.webinars, id, { registered: increment(1) }),
  markAttended: id => update(COLS.webinars, id, { attended: increment(1) }),
  // Save a user registration / join application
  addRegistration: data => add('webinarRegistrations', data),
  getRegistrations: webinarId => getAll('webinarRegistrations', where('webinarId', '==', webinarId), orderBy('createdAt', 'desc')),
  getAllRegistrations: () => getAll('webinarRegistrations', orderBy('createdAt', 'desc')),
  // Bounded by `sinceMs` AND a hard limit(2000) safety cap — used for the
  // dashboard's "registrations over time" / "per webinar" charts. A real
  // date-range query, not a full-collection read: even the 365-day toggle
  // only ever reads docs created in that window, never the whole
  // collection's history.
  // No `where()` on a date field and no `orderBy` requirement — Round 15
  // bug: the dashboard's charts and "Registrations This Month" KPI showed
  // 0 despite 195+ real registrations existing. Root cause: a server-side
  // `where('createdAt', '>=', ...)` / `orderBy('createdAt', ...)` silently
  // returns nothing for any doc where that exact field is missing or a
  // different type than Firestore expects for the comparison — and this
  // collection's documents don't uniformly have one shape (some only ever
  // got `registeredAt` as a plain ISO string, not `createdAt` as a real
  // Timestamp, depending on which code path/era wrote them). Fetches up to
  // `limitN` registrations with NO date filtering at all; the caller
  // normalizes every doc's date with toIsoString() (handles Timestamp/ISO
  // string/epoch number alike) and buckets/filters client-side instead.
  // 195 total today — limitN is a safety cap for future growth, not an
  // expected-size assumption.
  getAllRegistrationsCapped: (limitN = 5000) => getAll('webinarRegistrations', limit(limitN)),
  // Live feed of every registration doc, across all webinars — the ground
  // truth for "how many registered" (each webinar's own `registered`
  // counter is a best-effort increment at submit time that can silently
  // fail/skip, see WebinarRegister.jsx's `.catch(() => {})`). Admin pages
  // that need a per-webinar count should derive it from this, not from
  // `w.registered`.
  listenRegistrations: cb => onSnapshot(
    query(col('webinarRegistrations'), orderBy('createdAt', 'desc')),
    snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    err => { console.error('webinarRegistrations listen error:', err); cb([]) }
  ),
  updateRegistration: (id, data) => update('webinarRegistrations', id, data),
  deleteRegistration: id => remove('webinarRegistrations', id),
  // Ambassador dashboard's own restricted read — filtered by the resolved
  // ambassador's Firebase Auth UID (stored as `referredByUid` at
  // registration time, see WebinarRegister.jsx), not by referral code, so
  // the Firestore rule can check `resource.data.referredByUid == auth.uid`
  // without needing a second lookup.
  getRegistrationsByReferrerUid: uid => getAll('webinarRegistrations', where('referredByUid', '==', uid), orderBy('createdAt', 'desc')),
  // Admin's full-detail view of everyone a given ambassador referred.
  getRegistrationsByReferralCode: code => getAll('webinarRegistrations', where('referredBy', '==', code), orderBy('createdAt', 'desc')),
  // Used by the client-side certificate generator (src/lib/certificateGenerator.js)
  // to find which webinar a just-submitted feedback form belongs to.
  getByFeedbackFormId: async formId => {
    const rows = await getAll(COLS.webinars, where('feedbackFormId', '==', formId), limit(1))
    return rows[0] ? normalizeWebinarSpeakers(rows[0]) : null
  },
  listen: cb => onSnapshot(
    query(col(COLS.webinars), orderBy('createdAt', 'desc')),
    snap => cb(snap.docs.map(d => normalizeWebinarSpeakers({ id: d.id, ...d.data() }))),
    err => console.error("Firebase listen error:", err)
  ),
}

// ─── COURSES ─────────────────────────────────────────────────────────────────
export const coursesService = {
  getAll: () => getAll(COLS.courses, orderBy('createdAt', 'desc')).then(applyManualOrder),
  getActive: () => getAll(COLS.courses, where('status', '==', 'Active')).then(applyManualOrder),
  getOne: id => getOne(COLS.courses, id),
  // The public course page is reached by slug when one is set (shareable,
  // human-readable link) — falls back to null so the caller can try
  // getOne(id) next, keeping every link shared before slugs existed
  // (/courses/<doc-id>) working exactly as before.
  getBySlug: async slug => {
    if (!slug) return null
    const rows = await getAll(COLS.courses, where('slug', '==', slug), limit(1))
    return rows[0] || null
  },
  add: data => add(COLS.courses, { ...data, students: 0, rating: 0 }).then(id => { triggerSiteDataRebuild(); return id }),
  update: (id, data) => update(COLS.courses, id, data).then(() => triggerSiteDataRebuild()),
  delete: id => remove(COLS.courses, id).then(() => triggerSiteDataRebuild()),
  reorder: items => reorderCollection(COLS.courses, items).then(() => triggerSiteDataRebuild()),
  listen: cb => onSnapshot(
    query(col(COLS.courses), orderBy('createdAt', 'desc')),
    snap => cb(applyManualOrder(snap.docs.map(d => ({ id: d.id, ...d.data() })))),
    err => console.error("Firebase listen error:", err)
  ),
}

// ─── COURSE/WORKSHOP ENROLLMENTS (paid, manually verified) ───────────────────
// A public visitor can only ever create one of these (and read nothing back
// but their own success screen — the write itself returns the new doc's
// data straight from this call, never a read of the collection). Only an
// admin can list/read/approve/reject — same split CERTIFICATE_RULES.md-style
// reasoning as webinarRegistrations already follows. See CHANGES_ROUND12.md
// for the exact Firestore rule this collection needs (no local rules file
// exists in this repo — see Prompt 1's note on blogCategories for why).
export const courseEnrollmentsService = {
  // `MW-<SLUG PREFIX>-0001` — the prefix is just the course's own slug's
  // first hyphen-segment, uppercased (e.g. slug "amr-revolution-workshop"
  // → "AMR"), so no separate admin-typed "code prefix" field is needed.
  // The sequence itself lives on the course doc (`enrollmentSeq`) and is
  // incremented inside the same transaction that reads it, so two
  // simultaneous enrollments can never collide on the same number.
  add: async (courseId, data) => {
    const normEmail = String(data.email || '').trim().toLowerCase()
    // Duplicate block without letting the public read courseEnrollments:
    // a data-free marker doc `courseEnrollmentKeys/<courseId>__<email>` is
    // checked and created in the SAME transaction as the enrollment, so a
    // second submit with the same email + course is rejected atomically.
    const keyId = `${courseId}__${normEmail.replace(/[^a-z0-9@._+-]/g, '_')}`
    const keyRef = doc(db, 'courseEnrollmentKeys', keyId)
    const courseRef = doc(db, COLS.courses, courseId)
    const enrollRef = doc(col('courseEnrollments'))
    const enrollmentId = await runTransaction(db, async tx => {
      const keySnap = await tx.get(keyRef)
      if (keySnap.exists()) throw new Error('This email has already been used to enroll in this course.')
      const snap = await tx.get(courseRef)
      if (!snap.exists()) throw new Error('Course not found.')
      const course = snap.data()
      const seq = (course.enrollmentSeq || 0) + 1
      const prefix = (course.slug || course.title || 'MW').split(/[-\s]+/)[0].toUpperCase().slice(0, 6) || 'MW'
      const eid = `MW-${prefix}-${String(seq).padStart(4, '0')}`
      tx.update(courseRef, { enrollmentSeq: seq })
      tx.set(keyRef, { courseId, createdAt: serverTimestamp() })
      tx.set(enrollRef, {
        ...data, email: normEmail, courseId, courseTitle: course.title || '', courseSlug: course.slug || '',
        enrollmentId: eid, status: 'Pending', createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      })
      return eid
    })
    return { id: enrollRef.id, enrollmentId }
  },
  getByCourse: courseId => getAll('courseEnrollments', where('courseId', '==', courseId), orderBy('createdAt', 'desc')),
  // Capped by `limitN` (default 50) — a popular course's enrollment list
  // used to be an UNBOUNDED live listener (every doc, every time any one
  // of them changed). AdminCourseEnrollments.jsx's own "Load more" bumps
  // this and re-subscribes only when an admin actually asks for more.
  listenByCourse: (courseId, cb, limitN = 50) => onSnapshot(
    query(col('courseEnrollments'), where('courseId', '==', courseId), orderBy('createdAt', 'desc'), limit(limitN)),
    snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    err => console.error('Firebase courseEnrollments listen error:', err)
  ),
  // Cheap aggregation counts for the Pending/Approved/Rejected StatCards —
  // independent of how many rows are actually loaded/paginated above, so
  // the counts stay accurate even when the admin hasn't clicked "Load
  // more" yet.
  getStatusCountsByCourse: async courseId => {
    const countOf = status => getCountFromServer(query(col('courseEnrollments'), where('courseId', '==', courseId), where('status', '==', status))).then(s => s.data().count)
    const [Pending, Approved, Rejected] = await Promise.all([countOf('Pending'), countOf('Approved'), countOf('Rejected')])
    return { Pending, Approved, Rejected }
  },
  // Across every course — used for the sidebar's "Courses" badge.
  getPendingCountAll: () => getCountFromServer(query(col('courseEnrollments'), where('status', '==', 'Pending'))).then(s => s.data().count),
  // Across every course — used for the dashboard's "Enrollment Status" donut.
  getStatusCountsAll: async () => {
    const countOf = status => getCountFromServer(query(col('courseEnrollments'), where('status', '==', status))).then(s => s.data().count)
    const [Pending, Approved, Rejected] = await Promise.all([countOf('Pending'), countOf('Approved'), countOf('Rejected')])
    return { Pending, Approved, Rejected }
  },
  updateStatus: (id, status, extra = {}) => update('courseEnrollments', id, { status, ...extra }),
  // Set after a successful (or retried) Google Contacts save — see
  // src/lib/googleContacts.js and AdminCourseEnrollments.jsx's
  // saveContactForEnrollment(). Never blocks/retries the approval flow
  // itself if this fails.
  saveContactInfo: (id, { contactResourceName }) => update('courseEnrollments', id, {
    contactSaved: true, contactResourceName, contactSavedAt: serverTimestamp(),
  }),
}

// ─── COURSE JOINING LINKS (kept out of the public `courses` doc) ─────────────
// A Google Meet link must never reach a public visitor's browser. It isn't
// rendered anywhere in the public UI, but that alone isn't enough —
// `coursesService.getOne`/`getBySlug` sends the WHOLE course document to
// any client that reads it (the public course page has to, to show
// title/date/fee/etc.), so a plain `joiningLink` field on that same doc
// would still be sitting in the browser's memory/devtools/Network tab for
// anyone who looks. Stored as its own doc instead, under a collection this
// repo's Firestore rules need to lock to admin-only read (see
// CHANGES_ROUND12.md / the session report for the exact rule) — nothing in
// the public course-detail code path ever calls `.get()` here.
export const courseJoiningLinksService = {
  get: courseId => getOne('courseJoiningLinks', courseId),
  set: (courseId, joiningLink) => setDoc(doc(db, 'courseJoiningLinks', courseId), { joiningLink, updatedAt: serverTimestamp() }, { merge: true }),
}

// ─── CERTIFICATES ────────────────────────────────────────────────────────────
export const certificatesService = {
  getAll: () => getAll(COLS.certificates, orderBy('createdAt', 'desc')),
  getOne: id => getOne(COLS.certificates, id),
  // Verify by certificate code
  verify: async certId => {
    const results = await getAll(COLS.certificates, where('certCode', '==', certId), limit(1))
    if (results.length > 0) {
      // Increment verifications — best-effort. Firestore rules reasonably
      // restrict writes on this collection to admins (so a public visitor
      // can't tamper with a certificate's data), but the read above just
      // found this exact certificate, so an unauthenticated caller must
      // still get it back. Previously this `update` was awaited, so its
      // permission-denied rejection for a public (non-admin) caller threw
      // out of the whole function — the certificate WAS found, but
      // CertificateVerification.jsx's try/catch couldn't tell that apart
      // from "not found" and reported the wrong thing. The admin's own
      // Verify box never showed this because an authenticated admin's
      // write always succeeds. Not awaited/re-thrown, so this can never
      // again mask a successful lookup as a failed one.
      update(COLS.certificates, results[0].id, { verifications: increment(1) }).catch(() => {})
      return results[0]
    }
    return null
  },
  add: data => add(COLS.certificates, { ...data, verifications: 0, status: 'Valid' }),
  // Read-only lookup by code (does NOT increment) — used by the public certificate page
  // `limit(1)` here (and on `verify` above) isn't just an optimization —
  // Firestore rules (Round 13 security fix) only allow a public `list` on
  // `certificates` when the query itself is capped at a small limit, so an
  // anonymous visitor can never list the whole collection.
  getByCode: async certId => {
    const results = await getAll(COLS.certificates, where('certCode', '==', certId), limit(1))
    return results.length > 0 ? results[0] : null
  },
  // All certificates for one student, keyed by PHONE — the primary lookup
  // for the public Portfolio page (PortfolioPage.jsx) now (see the
  // STUDENT DATABASE section below for why: names collide, email isn't
  // always captured, phone is the one reliable identity field). Certificates
  // issued before phone was captured on the cert doc simply have no `phone`
  // field and won't match here — PortfolioPage.jsx falls back to a
  // case/whitespace-tolerant email scan for those. Capped at 20 (no real
  // student has more) to stay inside the rules' public `list` limit.
  getByPhone: phone => {
    const p = normalizePhone(phone)
    return p ? getAll(COLS.certificates, where('phone', '==', p), orderBy('issuedAt', 'desc'), limit(20)) : Promise.resolve([])
  },
  // Legacy/fallback lookup by exact email match — kept for
  // CertificatePage.jsx's best-effort "View Full Portfolio" discovery link.
  getByEmail: email => getAll(COLS.certificates, where('email', '==', String(email || '').trim().toLowerCase()), orderBy('issuedAt', 'desc'), limit(20)),
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
  // Top N by referred-student count — used by the dashboard's "Top
  // Ambassadors" table instead of listening to the whole collection just
  // to show 5 rows.
  getTop: (limitN = 5) => getAll(COLS.ambassadors, orderBy('students', 'desc'), limit(limitN)),
  getOne: id => getOne(COLS.ambassadors, id),
  add: data => add(COLS.ambassadors, { ...data, students: 0 }).then(id => { triggerSiteDataRebuild(); return id }),
  // Also used by the public self-claim flow (AmbassadorAcceptInvite.jsx) to
  // stamp authUid/hasLogin/referralCode on an existing doc — none of those
  // fields are in siteData's public whitelist above, so the extra rebuild
  // that triggers is a harmless no-op change, not a real inefficiency.
  update: (id, data) => update(COLS.ambassadors, id, data).then(() => triggerSiteDataRebuild()),
  delete: id => remove(COLS.ambassadors, id).then(() => triggerSiteDataRebuild()),
  reorder: items => reorderCollection(COLS.ambassadors, items).then(() => triggerSiteDataRebuild()),
  listen: cb => onSnapshot(
    query(col(COLS.ambassadors), orderBy('createdAt', 'desc')),
    snap => cb(applyManualOrder(snap.docs.map(d => ({ id: d.id, ...d.data() })))),
    err => console.error("Firebase listen error:", err)
  ),
  // ── Ambassador Login / Referral additions ──
  // Cross-reference for PortfolioPage.jsx's "Ambassador" badge — same
  // public-read trust level as getOne/listen, already used unauthenticated
  // by the public Ambassadors section and AmbassadorProfilePage.jsx.
  getByEmail: async email => {
    if (!email) return null
    const rows = await getAll(COLS.ambassadors, where('email', '==', String(email).trim().toLowerCase()), limit(1))
    return rows[0] || null
  },
  getByReferralCode: async code => {
    if (!code) return null
    const rows = await getAll(COLS.ambassadors, where('referralCode', '==', code), limit(1))
    return rows[0] || null
  },
  // Looks up which ambassador doc belongs to the signed-in Firebase Auth
  // user — set once, at AmbassadorAcceptInvite.jsx time. Used by
  // RequireAmbassadorAuth.jsx (dashboard gate) and by RequireAuth.jsx (admin
  // gate) to explicitly exclude ambassador accounts from the admin
  // "no adminUsers doc = Super Admin" bootstrap fallback — see the comment
  // on that rule above adminUsersService.
  getByAuthUid: async uid => {
    if (!uid) return null
    const rows = await getAll(COLS.ambassadors, where('authUid', '==', uid), limit(1))
    return rows[0] || null
  },
  // Assigns a referral code the first time one is needed (when an admin
  // issues a login) — reuses the existing Ambassador Code if it looks
  // usable, otherwise mints a short random slug. Never overwrites an
  // existing referralCode.
  // `extra` lets AmbassadorAcceptInvite.jsx's own unauthenticated-until-now
  // caller pass `{ inviteToken }` along with the write — Firestore rules
  // (Round 13 security fix) verify that token against a matching unclaimed
  // ambassadorInvites doc before allowing this non-admin update.
  ensureReferralCode: async (id, extra = {}) => {
    const row = await getOne(COLS.ambassadors, id)
    if (!row) throw new Error('Ambassador not found')
    if (row.referralCode) return row.referralCode
    const fromCode = String(row.ambCode || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
    const code = fromCode.length >= 4 ? fromCode : Math.random().toString(36).slice(2, 8).toUpperCase()
    await update(COLS.ambassadors, id, { referralCode: code, ...extra })
    return code
  },
  // +1 point and +1 referred-student count per successful referred
  // registration (see WebinarRegister.jsx's ?ref= handling).
  addReferralPoint: id => update(COLS.ambassadors, id, { points: increment(1), students: increment(1) }),
}

// ─── AMBASSADOR INVITES (mirrors adminInvitesService — see the comment
// there for why account creation must happen in the invitee's own browser,
// not the admin's) ────────────────────────────────────────────────────────
// Doc ID = the token. `ambassadorId` ties the claimed Firebase Auth account
// back to a specific existing ambassadors/{id} doc (unlike admin invites,
// which create a brand new adminUsers doc — an ambassador doc already
// exists before the invite is ever issued).
export const ambassadorInvitesService = {
  create: async ({ ambassadorId, name, email }) => {
    const token = crypto.randomUUID().replace(/-/g, '')
    await setDoc(doc(db, 'ambassadorInvites', token), {
      ambassadorId,
      name,
      email: email.trim().toLowerCase(),
      claimed: false,
      createdAt: serverTimestamp(),
    })
    return token
  },
  getByToken: token => getOne('ambassadorInvites', token),
  claim: token => update('ambassadorInvites', token, { claimed: true, claimedAt: serverTimestamp() }),
}

// ─── AMBASSADOR REFERRAL RANK THRESHOLDS (settings/ambassadorRanks) ───────
// Same single-doc-in-the-settings-collection pattern as settingsService
// ('site'), youtubeReviewFetch, etc. Shape: { male: {regional, head},
// female: {regional, head} }. See src/lib/ambassadorRank.js for how these
// are applied. Firestore rule needed: settings/{docId} should already allow
// public read + admin-only write for every doc in this collection — confirm
// that wildcard covers 'ambassadorRanks' too (no per-doc-id rule exists to
// contradict it as of this writing).
export const ambassadorRanksService = {
  get: () => getOne('settings', 'ambassadorRanks'),
  update: data => setDoc(doc(db, 'settings', 'ambassadorRanks'), { ...data, updatedAt: serverTimestamp() }, { merge: true }),
  listen: cb => onSnapshot(doc(db, 'settings', 'ambassadorRanks'), snap => cb(snap.exists() ? snap.data() : null), err => console.error('Firebase ambassadorRanks listen error:', err)),
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
  add: data => add(ANNOUNCEMENTS_COL, data).then(id => { triggerSiteDataRebuild(); return id }),
  update: (id, data) => update(ANNOUNCEMENTS_COL, id, data).then(() => triggerSiteDataRebuild()),
  delete: id => remove(ANNOUNCEMENTS_COL, id).then(() => triggerSiteDataRebuild()),
  reorder: items => reorderCollection(ANNOUNCEMENTS_COL, items).then(() => triggerSiteDataRebuild()),
  listen: cb => onSnapshot(
    query(col(ANNOUNCEMENTS_COL), orderBy('createdAt', 'desc')),
    snap => cb(applyManualOrder(snap.docs.map(d => ({ id: d.id, ...d.data() })))),
    err => console.error("Firebase listen error:", err)
  ),
}

// ─── STUDENT DATABASE (aggregated, deduped-by-PHONE) ──────────────────────────
// One doc per unique person, doc ID = their normalized phone number — NOT
// email or name. Names collide across different students, and email isn't
// captured consistently by every form, but a phone number is collected by
// every registration/feedback/ambassador flow and is genuinely unique per
// person. Falls back to an email-keyed doc (the OLD scheme, unprefixed —
// see studentDocIdFromEmail below) only on the rare upsert that truly has no
// phone at all, so every pre-existing record from before this change stays
// reachable at its same doc ID. Fed from 4 places — webinar registrations,
// webinar feedback submissions, certificate issuance, and ambassador
// registrations — never overwritten wholesale, always merged via a
// transaction so concurrent upserts for the same person can't clobber each
// other's registrations/certificates arrays.
const STUDENT_DB_COL = 'studentDatabase'

// Canonical form: digits only, Pakistani local numbers (leading 0, 11
// digits) normalized to their 92-country-code form so "0329-1692899",
// "+92 329 1692899" and "923291692899" all resolve to the same key.
// Returns '' if nothing usable was given.
// Exported (not just an internal helper) so form pages can validate a
// phone number BEFORE submission — a malformed number (wrong digit count,
// typo) silently fails to fold into the canonical 92-prefixed form here
// and creates its own stray studentDatabase doc instead of joining the
// person's real one. Catching that at entry time is the only reliable
// fix; an already-malformed doc already in Firestore needs a human to
// review and merge it, not an automatic fuzzy-match (which risks
// wrongly merging two different people).
//
// KNOWN EXISTING STRAY DOC (found 2026-10-10, predates this guard, not
// auto-fixed by it): studentDatabase/030443049943 — 12 raw digits starting
// with "0" (a typo'd phone number one digit too long), sitting alongside
// correctly-normalized docs like 923000060665. To be merged by hand in the
// Firebase console into that person's real doc once identified — don't
// delete this note until that's done.
export function normalizePhone(raw) {
  let digits = String(raw || '').replace(/[^0-9]/g, '')
  if (!digits) return ''
  // "00" is the international dialing prefix some people type instead of
  // "+" (e.g. "0092 329 1692899") — strip it the same way a leading "+"
  // is already implicitly stripped by the digits-only regex above, so
  // both forms of the same number normalize to the same key. Without
  // this, two registrations from the same person using different prefix
  // styles would fork into two separate studentDatabase docs.
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (digits.length === 11 && digits.startsWith('0')) digits = '92' + digits.slice(1)
  else if (digits.length === 10 && digits.startsWith('3')) digits = '92' + digits
  return digits
}
// The OLD doc-ID scheme (pre-phone-keying) — kept byte-for-byte identical so
// it still resolves every record created before this change.
const studentDocIdFromEmail = email => encodeURIComponent(String(email || '').trim().toLowerCase())

// URL-safe, random 8-char code for the public /portfolio/:slug route
// (PortfolioPage.jsx) — no collision check (unlike certificatesService's
// code generator): at this app's scale, 36^8 combinations makes a clash
// negligible, and a slug is looked up by query, not relied on as a unique
// key the way a doc ID would be.
function generatePortfolioSlug() {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  let slug = ''
  for (let i = 0; i < bytes.length; i++) slug += alphabet[bytes[i] % alphabet.length]
  return slug
}

async function upsertStudent({ phone, email }, patch) {
  const normPhone = normalizePhone(phone)
  const normEmail = String(email || '').trim().toLowerCase()
  let key = normPhone || ''
  if (!key && normEmail) {
    // No phone on THIS submission (e.g. a webinar feedback form that only
    // asks for name/email) — before falling back to the legacy email-keyed
    // doc ID, check whether this person already has a phone-keyed record
    // from an earlier registration/certificate under the same email. Without
    // this, every phone-less submission would silently fork off a second,
    // near-empty studentDatabase doc for someone who already has a real one
    // (missing phone/university/degree, and looking like a fresh row in the
    // admin Students table even though the real data lives elsewhere).
    const existing = await getAll(STUDENT_DB_COL, where('email', '==', normEmail), limit(1)).catch(() => [])
    key = existing[0]?.id || studentDocIdFromEmail(normEmail)
  }
  if (!key) return
  const ref = doc(db, STUDENT_DB_COL, key)
  await runTransaction(db, async tx => {
    const snap = await tx.get(ref)
    const base = snap.exists() ? snap.data() : {
      name: '', email: normEmail, phone: normPhone, university: '', degree: '', city: '',
      registrations: [], certificates: [], enrollments: [],
      createdAt: serverTimestamp(),
    }
    // Backfills a slug for any record that predates this feature, and
    // assigns one on first-ever aggregation for a brand new record — every
    // upsert path funnels through here, so no individual upsertFrom*
    // method needs its own slug logic. Same for phone/email: an older
    // record upserted again with a phone number it didn't have yet gets it
    // filled in (still at its existing doc ID — this never re-keys a doc).
    if (!base.portfolioSlug) base.portfolioSlug = generatePortfolioSlug()
    if (!base.phone && normPhone) base.phone = normPhone
    if (!base.email && normEmail) base.email = normEmail
    tx.set(ref, { ...patch(base), updatedAt: serverTimestamp() }, { merge: true })
  })
}

export const studentsDbService = {
  getAll: () => getAll(STUDENT_DB_COL, orderBy('updatedAt', 'desc')),
  // Capped by `limitN` (default 200) — the admin Students page used to
  // live-listen to the ENTIRE collection on every load regardless of size.
  // AdminStudents.jsx's own "Load more" bumps this and re-subscribes only
  // when an admin actually asks for more.
  listen: (cb, limitN = 200) => onSnapshot(
    query(col(STUDENT_DB_COL), orderBy('updatedAt', 'desc'), limit(limitN)),
    snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    err => console.error('Firebase studentDatabase listen error:', err)
  ),
  getCount: () => getCountFromServer(col(STUDENT_DB_COL)).then(s => s.data().count),
  // Capped sample (default 500) for the dashboard's "Students by
  // University/City" donut — a representative slice, not an exhaustive
  // scan. Deliberately NO orderBy('updatedAt') here (Round 15 fix):
  // ordering by a field excludes any document that doesn't have it at
  // all, and not every studentDatabase doc across this collection's
  // history is guaranteed to carry `updatedAt` — that silently dropped
  // students from this sample and from the donut, with no error. A bare
  // limit() has no such requirement.
  getSample: (limitN = 500) => getAll(STUDENT_DB_COL, limit(limitN)),
  // Merges `removeId` into `keepId`: unions registrations/certificates/
  // enrollments (deduped by webinarId/certCode/courseId, same rule each
  // upsertFrom* method already uses), fills in any blank name/email/
  // phone/university/degree/city field on `keepId` from `removeId`, sums
  // the *Count fields to match the unioned arrays, then deletes
  // `removeId`. Nothing is ever lost — every array entry from both docs
  // survives in the merged doc. Called only after an admin explicitly
  // confirms a specific pair in AdminStudents.jsx's duplicate-preview UI;
  // never automatic.
  mergeDuplicates: async (keepId, removeId) => {
    const [keep, dupe] = await Promise.all([getOne(STUDENT_DB_COL, keepId), getOne(STUDENT_DB_COL, removeId)])
    if (!keep || !dupe) throw new Error('One of the two records no longer exists.')
    const pick = (a, b) => (a && a !== '-' ? a : (b || ''))
    const unionBy = (listA, listB, keyFn) => {
      const out = [...(listA || [])]
      const seen = new Set(out.map(keyFn))
      for (const item of listB || []) { const k = keyFn(item); if (!seen.has(k)) { out.push(item); seen.add(k) } }
      return out
    }
    const registrations = unionBy(keep.registrations, dupe.registrations, r => r.webinarId)
    const certificates = unionBy(keep.certificates, dupe.certificates, c => c.certCode || c.webinarId)
    const enrollments = unionBy(keep.enrollments, dupe.enrollments, e => e.courseId)
    await update(STUDENT_DB_COL, keepId, {
      name: pick(keep.name, dupe.name), email: pick(keep.email, dupe.email), phone: pick(keep.phone, dupe.phone),
      university: pick(keep.university, dupe.university), degree: pick(keep.degree, dupe.degree), city: pick(keep.city, dupe.city),
      registrations, certificates, enrollments,
      registrationCount: registrations.length, certificateCount: certificates.length, enrollmentCount: enrollments.length,
    })
    await remove(STUDENT_DB_COL, removeId)
  },
  // Primary identity lookup now — doc ID is deterministic from the
  // normalized phone number, so this is a direct get, not a query.
  getByPhone: phone => { const p = normalizePhone(phone); return p ? getOne(STUDENT_DB_COL, p) : Promise.resolve(null) },
  // Legacy/fallback lookup — only ever finds a record that was created
  // before phone-keying (or upserted with no phone at all).
  getByEmail: email => { const e = String(email || '').trim().toLowerCase(); return e ? getOne(STUDENT_DB_COL, studentDocIdFromEmail(e)) : Promise.resolve(null) },
  // Public lookup for PortfolioPage.jsx (/portfolio/:slug) — same trust
  // level as blogService.getBySlug/announcementsService.getBySlug.
  getBySlug: async slug => {
    const rows = await getAll(STUDENT_DB_COL, where('portfolioSlug', '==', slug), limit(1))
    return rows[0] || null
  },

  // Webinar Registration submission — one entry per distinct webinarId.
  // registrationCount is maintained alongside the `registrations` array
  // (incremented only when a genuinely new entry is added, same dedup
  // check) so the Admin Students table can read a plain number straight
  // off the doc instead of deriving it from the array's length on every
  // render. An older doc from before this field existed just has
  // registrationCount start from 0 here rather than backfilling the
  // count of entries already in `registrations` — AdminStudents.jsx
  // falls back to the array length for those until their next upsert.
  upsertFromRegistration: ({ email, name, phone, university, degree, city, webinarId, webinarTitle, registeredAt }) =>
    upsertStudent({ phone, email }, base => {
      const already = (base.registrations || []).some(r => r.webinarId === webinarId)
      return {
        ...base,
        name: name?.trim() || base.name,
        university: university?.trim() || base.university,
        degree: degree?.trim() || base.degree,
        city: city?.trim() || base.city,
        registrations: already ? base.registrations : [
          ...(base.registrations || []),
          { webinarId: webinarId || '', webinarTitle: webinarTitle || '', registeredAt: registeredAt || new Date().toISOString() },
        ],
        registrationCount: already ? (base.registrationCount || 0) : (base.registrationCount || 0) + 1,
      }
    }),

  // Webinar Feedback submission — doesn't add a registration/certificate,
  // just ensures the student record exists and enriches contact details.
  // university/degree/city are optional here (not every feedback form asks
  // for them again) — only overwritten when this submission actually has them.
  upsertFromFeedback: ({ email, name, phone, university, degree, city }) =>
    upsertStudent({ phone, email }, base => ({
      ...base,
      name: name?.trim() || base.name,
      university: university?.trim() || base.university,
      degree: degree?.trim() || base.degree,
      city: city?.trim() || base.city,
    })),

  // Course/workshop enrollment (paid or free, built-in or Form-Builder-
  // linked) — one entry per distinct courseId, same dedupe/count shape as
  // upsertFromRegistration above. Was previously missing entirely: a
  // course enrollment never touched the Student Database at all, so
  // "Events Attended" only ever reflected webinars.
  upsertFromCourseEnrollment: ({ email, name, phone, university, degree, city, courseId, courseTitle, enrolledAt }) =>
    upsertStudent({ phone, email }, base => {
      const already = (base.enrollments || []).some(e => e.courseId === courseId)
      return {
        ...base,
        name: name?.trim() || base.name,
        university: university?.trim() || base.university,
        degree: degree?.trim() || base.degree,
        city: city?.trim() || base.city,
        enrollments: already ? (base.enrollments || []) : [
          ...(base.enrollments || []),
          { courseId: courseId || '', courseTitle: courseTitle || '', enrolledAt: enrolledAt || new Date().toISOString() },
        ],
        enrollmentCount: already ? (base.enrollmentCount || 0) : (base.enrollmentCount || 0) + 1,
      }
    }),

  // Certificate issuance — one entry per distinct certCode. certificateCount
  // maintained the same way registrationCount is above.
  upsertFromCertificate: ({ email, phone, name, webinarId, webinarTitle, certCode, issuedAt }) =>
    upsertStudent({ phone, email }, base => {
      const already = (base.certificates || []).some(c => c.certCode === certCode)
      return {
        ...base,
        name: name?.trim() || base.name,
        certificates: already ? base.certificates : [
          ...(base.certificates || []),
          { webinarId: webinarId || '', webinarTitle: webinarTitle || '', certCode: certCode || '', issuedAt: issuedAt || new Date().toISOString() },
        ],
        certificateCount: already ? (base.certificateCount || 0) : (base.certificateCount || 0) + 1,
      }
    }),

  // Ambassador registration (public application form, or an admin manually
  // adding an ambassador) — enriches contact/university/degree/city only.
  upsertFromAmbassador: ({ email, name, phone, university, degree, city }) =>
    upsertStudent({ phone, email }, base => ({
      ...base,
      name: name?.trim() || base.name,
      university: university?.trim() || base.university,
      degree: degree?.trim() || base.degree,
      city: city?.trim() || base.city,
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
  add: data => add(COLS.blog, { ...data, views: 0 }).then(id => { triggerSiteDataRebuild(); return id }),
  update: (id, data) => update(COLS.blog, id, data).then(() => triggerSiteDataRebuild()),
  publish: id => update(COLS.blog, id, { status: 'Published', published: new Date().toISOString().split('T')[0] }).then(() => triggerSiteDataRebuild()),
  delete: id => remove(COLS.blog, id).then(() => triggerSiteDataRebuild()),
  incrementView: id => update(COLS.blog, id, { views: increment(1) }),
  listen: cb => onSnapshot(
    query(col(COLS.blog), orderBy('createdAt', 'desc')),
    snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    err => console.error("Firebase listen error:", err)
  ),
}

export const blogCategoriesService = {
  getAll: () => getAll('blogCategories', orderBy('createdAt', 'desc')),
  add: data => add('blogCategories', data).then(id => { triggerSiteDataRebuild(); return id }),
  update: (id, data) => update('blogCategories', id, data).then(() => triggerSiteDataRebuild()),
  delete: id => remove('blogCategories', id).then(() => triggerSiteDataRebuild()),
  listen: cb => onSnapshot(
    query(collection(db, 'blogCategories'), orderBy('createdAt', 'desc')),
    snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    err => console.error("Firebase blogCategories listen error:", err)
  ),
}

// ─── MEDICAL NEWS ────────────────────────────────────────────────────────────
// Same shape/lifecycle as blogService (Draft → Published via publish(),
// slug-based public lookup, `published` set to today's date on publish) —
// `getLatest(1)` is what NewsPopup.jsx uses to pick the single item shown in
// the bottom-right teaser. `references` is an array of { label, url } source
// links, required (validated in AdminNews.jsx) since attribution matters for
// medical content.
export const newsService = {
  getAll: () => getAll('news', orderBy('createdAt', 'desc')),
  // Used for AdminEvents.jsx's "Auto News" tab badge and the sidebar's
  // "Events & News" badge.
  getAutoDraftCount: () => getCountFromServer(query(collection(db, 'news'), where('source', '==', 'auto-news'), where('status', '==', 'Draft'))).then(s => s.data().count),
  getPublished: async () => {
    try {
      return await getAll('news', where('status', '==', 'Published'), orderBy('createdAt', 'desc'))
    } catch (err) {
      if (err?.code === 'failed-precondition') {
        console.warn('Composite index missing for news, falling back to client-side filter:', err)
        const all = await getAll('news', orderBy('createdAt', 'desc'))
        return all.filter(r => r.status === 'Published')
      }
      throw err
    }
  },
  getLatest: async n => {
    try {
      return await getAll('news', where('status', '==', 'Published'), orderBy('createdAt', 'desc'), limit(n || 1))
    } catch (err) {
      if (err?.code === 'failed-precondition') {
        console.warn('Composite index missing for news, falling back to client-side filter:', err)
        const all = await getAll('news', orderBy('createdAt', 'desc'))
        return all.filter(r => r.status === 'Published').slice(0, n || 1)
      }
      throw err
    }
  },
  getOne: id => getOne('news', id),
  getBySlug: async slug => {
    const rows = await getAll('news', where('slug', '==', slug), limit(1))
    return rows[0] || null
  },
  add: data => add('news', data).then(id => { triggerSiteDataRebuild(); return id }),
  update: (id, data) => update('news', id, data).then(() => triggerSiteDataRebuild()),
  publish: id => update('news', id, { status: 'Published', published: new Date().toISOString().split('T')[0] }).then(() => triggerSiteDataRebuild()),
  delete: id => remove('news', id).then(() => triggerSiteDataRebuild()),
  listen: cb => onSnapshot(
    query(collection(db, 'news'), orderBy('createdAt', 'desc')),
    snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    err => console.error("Firebase news listen error:", err)
  ),
}

// ─── CUSTOM CERTIFICATE FONTS ─────────────────────────────────────────────────
// Admin-uploaded .ttf/.otf files (see src/lib/customCertFonts.js, which reads
// this collection and injects @font-face rules sitewide) — persisted here so
// an uploaded font stays available to every certificate template, in every
// browser/session, not just the one it was uploaded from.
export const customFontsService = {
  getAll: () => getAll('customFonts', orderBy('createdAt', 'desc')),
  add: data => add('customFonts', data),
  delete: id => remove('customFonts', id),
  listen: cb => onSnapshot(
    query(collection(db, 'customFonts'), orderBy('createdAt', 'desc')),
    snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    err => console.error("Firebase customFonts listen error:", err)
  ),
}

// ─── TEAM ────────────────────────────────────────────────────────────────────
export const teamService = {
  getAll: () => getAll(COLS.team, orderBy('createdAt', 'desc')).then(applyManualOrder),
  getOne: id => getOne(COLS.team, id),
  add: data => add(COLS.team, data).then(id => { triggerSiteDataRebuild(); return id }),
  update: (id, data) => update(COLS.team, id, data).then(() => triggerSiteDataRebuild()),
  delete: id => remove(COLS.team, id).then(() => triggerSiteDataRebuild()),
  reorder: items => reorderCollection(COLS.team, items).then(() => triggerSiteDataRebuild()),
  listen: cb => onSnapshot(
    query(col(COLS.team), orderBy('createdAt', 'desc')),
    snap => cb(applyManualOrder(snap.docs.map(d => ({ id: d.id, ...d.data() })))),
    err => console.error("Firebase listen error:", err)
  ),
}

export const teamCategoriesService = {
  getAll: () => getAll('teamCategories', orderBy('createdAt', 'desc')).then(applyManualOrder),
  add: data => add('teamCategories', data).then(id => { triggerSiteDataRebuild(); return id }),
  update: (id, data) => update('teamCategories', id, data).then(() => triggerSiteDataRebuild()),
  delete: id => remove('teamCategories', id).then(() => triggerSiteDataRebuild()),
  reorder: items => reorderCollection('teamCategories', items).then(() => triggerSiteDataRebuild()),
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
  add: data => add(COLS.advisory, data).then(id => { triggerSiteDataRebuild(); return id }),
  update: (id, data) => update(COLS.advisory, id, data).then(() => triggerSiteDataRebuild()),
  delete: id => remove(COLS.advisory, id).then(() => triggerSiteDataRebuild()),
  listen: cb => onSnapshot(
    query(col(COLS.advisory), orderBy('createdAt', 'desc')),
    snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    err => console.error("Firebase listen error:", err)
  ),
}

// ─── DASHBOARD STATS ─────────────────────────────────────────────────────────
// Uses getCountFromServer() instead of downloading every doc just to
// .length/.filter() them — an aggregation count query is billed far more
// cheaply than fetching N whole documents, and the dashboard never needed
// anything but these counts anyway.
// NOTE: registrationsThisMonth/registrationsLastMonth are NOT computed
// here with a server-side `where('createdAt', ...)` count query anymore —
// that's exactly what caused Round 15's "Registrations This Month shows 0"
// bug (see getAllRegistrationsCapped's comment). AdminDashboard.jsx derives
// both from the same capped, unfiltered registrations fetch the charts
// already use, normalizing dates with toIsoString() client-side instead.
export async function getDashboardStats() {
  const count = snap => snap.data().count
  const [
    students, webinars, upcomingWebinars, courses, activeCourses,
    certs, validCerts, ambassadors, activeAmbassadors,
    totalRegistrations, pendingEnrollments, publishedBlog, publishedEvents,
  ] = await Promise.all([
    getCountFromServer(col(STUDENT_DB_COL)),
    getCountFromServer(col(COLS.webinars)),
    getCountFromServer(query(col(COLS.webinars), where('status', '==', 'Upcoming'))),
    getCountFromServer(col(COLS.courses)),
    getCountFromServer(query(col(COLS.courses), where('status', '==', 'Active'))),
    getCountFromServer(col(COLS.certificates)),
    getCountFromServer(query(col(COLS.certificates), where('status', '==', 'Valid'))),
    getCountFromServer(col(COLS.ambassadors)),
    getCountFromServer(query(col(COLS.ambassadors), where('status', '==', 'Active'))),
    // No where() — a plain count of the whole collection is immune to the
    // field-shape issue and is what AdminDashboard.jsx cross-checks its
    // client-side fetch's row count against (console.warn if they diverge).
    getCountFromServer(col('webinarRegistrations')),
    getCountFromServer(query(col('courseEnrollments'), where('status', '==', 'Pending'))),
    getCountFromServer(query(col(COLS.blog), where('status', '==', 'Published'))),
    getCountFromServer(query(collection(db, 'news'), where('status', '==', 'Published'))),
  ])
  return {
    totalStudents: count(students),
    activeStudents: count(students), // studentDatabase has no Active/Inactive concept — every aggregated record counts
    totalWebinars: count(webinars),
    upcomingWebinars: count(upcomingWebinars),
    activeCourses: count(activeCourses),
    validCerts: count(validCerts),
    activeAmbassadors: count(activeAmbassadors),
    totalRegistrations: count(totalRegistrations),
    pendingEnrollments: count(pendingEnrollments),
    publishedPosts: count(publishedBlog) + count(publishedEvents),
  }
}

// ─── TESTIMONIALS ─────────────────────────────────────────────────────────────
export const testimonialsService = {
  getAll: () => getAll('testimonials', orderBy('createdAt', 'desc')),
  getApproved: () => getAll('testimonials', where('status', '==', 'Approved'), orderBy('createdAt', 'desc')),
  add: data => add('testimonials', { ...data, status: 'Approved' }).then(id => { triggerSiteDataRebuild(); return id }),
  update: (id, data) => update('testimonials', id, data).then(() => triggerSiteDataRebuild()),
  delete: id => remove('testimonials', id).then(() => triggerSiteDataRebuild()),
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
  // Used for the sidebar's "Pending Reviews" badge.
  getPendingCount: () => getCountFromServer(query(collection(db, 'pendingTestimonials'), where('status', '==', 'Pending'))).then(s => s.data().count),
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
  update: data => setDoc(doc(db, 'settings', 'site'), { ...data, updatedAt: serverTimestamp() }, { merge: true }).then(() => triggerSiteDataRebuild()),
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
  update: data => setDoc(doc(db, 'settings', 'sectionVisibility'), { ...data, updatedAt: serverTimestamp() }, { merge: true }).then(() => triggerSiteDataRebuild()),
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
  // `role` is 'editor' (default — full access to their allowedSections,
  // minus delete) or 'viewer' (read-only). 'superadmin' is never passed
  // in here — that marker is reserved for accounts with no doc at all, or
  // a doc hand-added directly in Firestore (see useAdminPermissions.js).
  // Pre-existing docs from before roles shipped have no `role` field, not
  // literally `'editor'` — useAdminPermissions treats that absence the
  // same as 'editor' so nobody's access silently changed.
  create: (email, data) => {
    const normalized = email.trim().toLowerCase()
    return setDoc(doc(db, 'adminUsers', normalized), {
      ...data,
      role: data.role === 'viewer' ? 'viewer' : 'editor',
      email: normalized,
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
  create: async ({ name, email, allowedSections, role }) => {
    const token = crypto.randomUUID().replace(/-/g, '')
    await setDoc(doc(db, 'adminInvites', token), {
      name,
      email: email.trim().toLowerCase(),
      allowedSections,
      role: role === 'viewer' ? 'viewer' : 'editor',
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

// ─── ACTIVITY LOG (who / what / when) ────────────────────────────────────────
// Not instrumented on every single admin write — that would touch nearly
// every admin page for one feature. Covers the actions an audit trail is
// actually for: admin-user management (granting/revoking access is the
// highest-stakes action in the panel) and the two Prompt-5 features that
// introduced it (webinar CRUD, submission edit/merge). Add more `log(...)`
// calls at other write sites the same way if the need comes up.
export const activityLogService = {
  log: (action, details = {}) => add('activityLog', {
    action,
    actorEmail: auth.currentUser?.email || 'unknown',
    details,
  }).catch(err => console.error('activityLog write failed:', err)), // never block the real action on this
  listen: cb => onSnapshot(
    query(col('activityLog'), orderBy('createdAt', 'desc'), limit(200)),
    snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    err => console.error('Firebase activityLog listen error:', err)
  ),
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
  // Capped by `limitN` (default 500) — used to live-listen to the ENTIRE
  // formSubmissions collection, across every form, on every load of the
  // Form Builder admin page. AdminForms.jsx's own "Load more" bumps this.
  listenSubmissions: (cb, limitN = 500) => onSnapshot(
    query(col('formSubmissions'), orderBy('createdAt', 'desc'), limit(limitN)),
    snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    err => console.error("Firebase listen error:", err)
  ),
  getSubmissionsCount: () => getCountFromServer(col('formSubmissions')).then(s => s.data().count),
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

// Helper to safely convert Firestore Timestamps, Date objects, epoch numbers,
// or string values to ISO strings — the ONE place every chart/KPI on the
// admin dashboard reads a date through (Round 15: the dashboard's charts
// and "Registrations This Month" KPI showed 0 despite 195+ real
// registrations existing, traced to date fields that aren't uniformly one
// type across the collection's history — some docs predate a given field,
// some store it differently. Never assume a single shape again here.)
export function toIsoString(val) {
  if (val === null || val === undefined || val === '') return ''
  if (typeof val === 'string') {
    // A bare numeric string (epoch ms, rare but seen in older ad-hoc writes)
    // — only treat it as epoch millis if it parses to a sane recent-ish
    // range, so a genuine ISO string is never misread.
    if (/^\d{10,13}$/.test(val)) return toIsoString(Number(val))
    const d = new Date(val)
    return isNaN(d.getTime()) ? '' : val
  }
  if (typeof val === 'number') {
    // Firestore/JS epoch convention is milliseconds; a 10-digit number is
    // almost certainly seconds (Unix epoch seconds, as some external
    // imports/webhooks use) rather than ms — ms would be 13 digits for any
    // date after 2001.
    const ms = val < 10_000_000_000 ? val * 1000 : val
    try { return new Date(ms).toISOString() } catch { return '' }
  }
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

// ─── UNIFIED SUBMISSIONS (webinar registrations + newsletter signups) ──────────
// The admin "Submissions" page wants ONE feed of everything with no dedicated
// view of its own elsewhere in the admin panel. Custom form submissions used
// to be merged in here too, but that merge read `values.name`/`values.email`
// directly — Form Builder fields carry random uid keys (see
// resolveFormField in lib/formFieldResolve.js), so those columns were always
// blank for real forms. AdminForms.jsx's own "Responses" modal already
// resolves each form's fields correctly, so Form rows were dropped here
// rather than fixed twice.
export const submissionsService = {
  // Capped by `limitN` (default 500) on EACH underlying collection — this
  // used to live-listen to the ENTIRE webinarRegistrations AND
  // newsletterSubscribers collections, unconditionally, on every admin
  // page load. AdminSubmissions.jsx's own "Load more" bumps this and
  // re-subscribes only when an admin actually asks for more; the StatCards
  // there use getCount() below (an aggregate query) for the real totals
  // regardless of how much is actually loaded.
  listen: (cb, limitN = 500) => {
    let regs = [], newsletter = []
    const emit = () => {
      const merged = [
        ...regs.map(r => ({
          id: 'reg_' + r.id, type: 'Webinar', refName: r.webinarTopic || r.webinarTitle || '-',
          name: r.name || '-', email: r.email || '-', whatsapp: r.whatsapp || '-',
          date: toIsoString(r.registeredAt || r.createdAt), raw: r,
        })),
        ...newsletter.map(n => ({
          id: 'news_' + n.id, type: 'Newsletter', refName: 'Newsletter Signup',
          name: '-', email: n.email || '-', whatsapp: '-',
          date: toIsoString(n.subscribedAt || n.createdAt), raw: n,
        })),
      ].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
      cb(merged)
    }
    const u1 = onSnapshot(query(col('webinarRegistrations'), orderBy('createdAt', 'desc'), limit(limitN)),
      snap => { regs = snap.docs.map(d => ({ id: d.id, ...d.data() })); emit() },
      err => { console.error('webinarRegistrations snapshot error:', err); emit() })
    const u3 = onSnapshot(query(col('newsletterSubscribers'), orderBy('createdAt', 'desc'), limit(limitN)),
      snap => { newsletter = snap.docs.map(d => ({ id: d.id, ...d.data() })); emit() },
      err => { console.error('newsletterSubscribers snapshot error:', err); emit() })
    return () => { u1(); u3() }
  },
  getCounts: async () => {
    const [webinarRegs, newsletter] = await Promise.all([
      getCountFromServer(col('webinarRegistrations')).then(s => s.data().count),
      getCountFromServer(col('newsletterSubscribers')).then(s => s.data().count),
    ])
    return { webinarRegs, newsletter }
  },
}
