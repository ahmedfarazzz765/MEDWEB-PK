// Daily health-news draft fetcher — run by
// .github/workflows/daily-health-news.yml (schedule + workflow_dispatch).
//
// Fetches top health headlines via NewsAPI, skips ones already drafted
// (matched by `sourceUrl`), rewrites each into an original MEDWEB-PK-toned
// article via Gemini, and writes it into the SAME `news` Firestore
// collection/schema the Medical News admin page
// (src/admin/pages/AdminNews.jsx / newsService in src/firebase/services.js)
// already reads — as a Draft, no thumbnail, for a human to review, add an
// image to, and publish from the existing admin UI. Nothing here
// auto-publishes.
//
// Runs with firebase-admin (a service-account, server-side client) — NOT
// the app's own client Firebase SDK — so this needs no Firestore
// security-rule changes and no Cloud Functions / Blaze upgrade; it's a
// plain Node script invoked by GitHub Actions.
//
// Required environment variables (set as GitHub repo secrets, see the
// workflow file):
//   NEWS_API_KEY              - https://newsapi.org account API key
//   GEMINI_API_KEY            - https://aistudio.google.com/apikey
//   FIREBASE_SERVICE_ACCOUNT  - a Firebase service-account JSON key,
//                                pasted as a single-line string secret
//
// Uses Node's built-in fetch (Node 18+) — no extra HTTP dependency.

import admin from 'firebase-admin'

const NEWS_API_KEY = process.env.NEWS_API_KEY
const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const SERVICE_ACCOUNT_JSON = process.env.FIREBASE_SERVICE_ACCOUNT
const GEMINI_MODEL = 'gemini-2.0-flash'
const MAX_ARTICLES_PER_RUN = 3 // keep the daily draft queue small and reviewable, not a flood

function fail(message) {
  console.error(`❌ ${message}`)
  process.exit(1)
}

if (!NEWS_API_KEY) fail('Missing NEWS_API_KEY environment variable')
if (!GEMINI_API_KEY) fail('Missing GEMINI_API_KEY environment variable')
if (!SERVICE_ACCOUNT_JSON) fail('Missing FIREBASE_SERVICE_ACCOUNT environment variable')

let serviceAccount
try {
  serviceAccount = JSON.parse(SERVICE_ACCOUNT_JSON)
} catch (e) {
  fail(`FIREBASE_SERVICE_ACCOUNT is not valid JSON: ${e.message}`)
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
const db = admin.firestore()

// Same slugify() as AdminNews.jsx, kept in sync deliberately — the slug
// scheme is a public URL contract (/news/:slug), not just cosmetic.
function slugify(str) {
  return String(str || '').toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'news'
}

async function uniqueSlug(base) {
  let slug = base
  let n = 2
  // Small, low-frequency collection — a few sequential existence checks
  // per run is negligible, and avoids needing to load every slug up front.
  while (true) {
    const snap = await db.collection('news').where('slug', '==', slug).limit(1).get()
    if (snap.empty) return slug
    slug = `${base}-${n}`
    n++
  }
}

async function fetchHealthHeadlines() {
  const url = new URL('https://newsapi.org/v2/top-headlines')
  url.searchParams.set('category', 'health')
  url.searchParams.set('language', 'en')
  url.searchParams.set('pageSize', '20')

  const res = await fetch(url, { headers: { 'X-Api-Key': NEWS_API_KEY } })
  if (!res.ok) throw new Error(`NewsAPI request failed: HTTP ${res.status} — ${await res.text()}`)
  const data = await res.json()
  if (data.status !== 'ok') throw new Error(`NewsAPI error: ${data.message || data.code || 'unknown error'}`)

  // top-headlines has no explicit date-range parameter (that's /v2/everything,
  // which doesn't support `category`) — filter to the last 48h ourselves as a
  // safety net against a quiet news day surfacing stale evergreen items.
  const cutoffMs = Date.now() - 48 * 60 * 60 * 1000
  return (data.articles || []).filter(a =>
    a.url && a.title && a.title !== '[Removed]' &&
    (!a.publishedAt || new Date(a.publishedAt).getTime() >= cutoffMs)
  )
}

// Existing drafts/published items are matched by `sourceUrl` — a flat field
// added specifically for this cheap duplicate check (news items don't
// otherwise have a single canonical source URL field; `references` is a
// free-form array of {label, url} pairs an admin edits by hand, not
// reliable to query against).
async function getExistingSourceUrls() {
  const snap = await db.collection('news').select('sourceUrl').get()
  return new Set(snap.docs.map(d => d.data().sourceUrl).filter(Boolean))
}

async function rewriteWithGemini(article) {
  const prompt = `You are a health/medical news editor for MEDWEB-PK, a Pakistani medical education platform for pharmacy/medical students and healthcare professionals.

Rewrite the following news story into an ORIGINAL article in your own words. Do not copy sentences from the source — genuinely reword it — but stay strictly factually consistent with the source content given below. Tone: clear, informative, professional, encouraging.

Respond with STRICT JSON only — no markdown code fences, no commentary before or after — in exactly this shape:
{"title": "...", "summary": "...", "bodyHtml": "<p>...</p><p>...</p>"}

Rules:
- "title": a fresh, original headline (do not copy the source headline verbatim)
- "summary": one or two sentences that stand alone as an opening paragraph
- "bodyHtml": 3 to 5 short paragraphs of original body content as HTML, each wrapped in a single <p>...</p> tag and nothing else (no headings, lists, scripts, or other tags)

SOURCE ARTICLE
Title: ${article.title}
Description: ${article.description || '(none provided)'}
Content snippet: ${article.content || '(none provided)'}
Source publication: ${article.source?.name || 'Unknown'}`

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    }
  )
  if (!res.ok) throw new Error(`Gemini request failed: HTTP ${res.status} — ${await res.text()}`)
  const data = await res.json()
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  // Gemini sometimes wraps JSON in ```json fences despite instructions — strip them defensively.
  const cleaned = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()

  let parsed
  try {
    parsed = JSON.parse(cleaned)
  } catch (e) {
    throw new Error(`Gemini returned non-JSON output: ${cleaned.slice(0, 300)}`)
  }
  if (!parsed.title?.trim() || !parsed.bodyHtml?.trim()) {
    throw new Error('Gemini output is missing title or bodyHtml')
  }
  return parsed
}

async function main() {
  console.log('🩺 MEDWEB daily health-news draft fetcher starting…')

  const [headlines, existingUrls] = await Promise.all([
    fetchHealthHeadlines(),
    getExistingSourceUrls(),
  ])
  console.log(`Fetched ${headlines.length} recent health headline(s) from NewsAPI.`)

  const fresh = headlines.filter(a => !existingUrls.has(a.url))
  const candidates = fresh.slice(0, MAX_ARTICLES_PER_RUN)
  console.log(`${fresh.length} are new (not already drafted); processing up to ${MAX_ARTICLES_PER_RUN}: ${candidates.length} this run.`)

  if (candidates.length === 0) {
    console.log('Nothing new to draft today. Done.')
    return
  }

  let created = 0
  let failed = 0
  for (const article of candidates) {
    try {
      console.log(`→ Rewriting: "${article.title}" (${article.source?.name || 'unknown source'})`)
      const rewritten = await rewriteWithGemini(article)
      const slug = await uniqueSlug(slugify(rewritten.title))
      const bodyHtml = `<p>${rewritten.summary.trim()}</p>${rewritten.bodyHtml.trim()}`

      await db.collection('news').add({
        title: rewritten.title.trim(),
        slug,
        imageUrl: '', // intentionally blank — thumbnail stays a manual admin step
        references: [{ label: article.source?.name || 'Source', url: article.url }],
        sourceUrl: article.url,
        content: bodyHtml,
        status: 'Draft',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
      created++
      console.log(`  ✓ Draft created: "${rewritten.title}" (slug: ${slug})`)
    } catch (e) {
      failed++
      console.error(`  ✗ Skipped "${article.title}": ${e.message}`)
    }
  }

  console.log(
    `\nDone. Created ${created} draft(s), ${failed} failed, out of ${candidates.length} candidate(s) ` +
    `(${headlines.length} fetched, ${headlines.length - fresh.length} already existed as drafts/published).`
  )
}

main().catch(e => {
  console.error('Fatal error:', e)
  process.exit(1)
})
