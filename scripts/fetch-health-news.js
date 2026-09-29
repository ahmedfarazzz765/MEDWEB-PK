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

// Up to 20 most recently published news items, for optional internal
// linking below (see rewriteWithGemini). Same try/catch-fallback shape as
// newsService.getPublished() in src/firebase/services.js, in case the
// status+createdAt composite index doesn't exist in this Firestore project.
async function getRecentPublishedNews(max = 20) {
  try {
    const snap = await db.collection('news')
      .where('status', '==', 'Published')
      .orderBy('createdAt', 'desc')
      .limit(max)
      .get()
    return snap.docs.map(d => d.data())
  } catch (e) {
    console.warn(`Composite index missing for news query, falling back to client-side filter: ${e.message}`)
    const snap = await db.collection('news').orderBy('createdAt', 'desc').limit(50).get()
    return snap.docs.map(d => d.data()).filter(n => n.status === 'Published').slice(0, max)
  }
}

// A small curated set of health topics to match an article against for a
// stock-photo keyword. No Unsplash/Pexels API key exists anywhere in this
// codebase (checked src/ for any stock-image integration before adding
// this — only hardcoded direct Unsplash photo URLs in a few constants
// files, not a real API), so there's nothing to reuse.
const IMAGE_KEYWORDS = [
  'vaccine', 'vaccination', 'cancer', 'diabetes', 'mental health', 'hospital',
  'pharmacy', 'surgery', 'nutrition', 'diet', 'fitness', 'exercise', 'covid',
  'coronavirus', 'medicine', 'doctor', 'nurse', 'research', 'virus', 'heart',
  'cardiac', 'brain', 'child health', 'pregnancy', 'elderly', 'obesity',
  'sleep', 'stress', 'flu', 'infection', 'antibiotic', 'clinical trial',
  'disease', 'laboratory', 'dna', 'blood',
]

function pickImageKeyword(article, rewrittenTitle) {
  const haystack = `${rewrittenTitle} ${article.title} ${article.description || ''}`.toLowerCase()
  return IMAGE_KEYWORDS.find(k => haystack.includes(k)) || 'medicine'
}

// Unsplash Source (source.unsplash.com) — the free, no-API-key endpoint the
// original spec suggested — was discontinued by Unsplash in 2023 and no
// longer resolves. LoremFlickr is the closest still-working equivalent:
// free, keyless, and keyword-matched. Same idea either way — a reasonable
// topical placeholder, not a final image; the admin can freely swap it
// before publishing, same as they'd have had to do with a blank thumbnail.
function buildImageUrl(keyword) {
  const q = encodeURIComponent(keyword.replace(/\s+/g, ''))
  return `https://loremflickr.com/1200/630/${q},health`
}

// Strips out any internal /news/{slug} link Gemini produced whose slug
// ISN'T one of the real candidates it was given — cheap, reliable defense
// against a hallucinated or malformed slug turning into a dead link,
// regardless of how well the prompt is followed. The anchor text itself is
// kept (just unwrapped to plain text) so the sentence still reads fine.
function sanitizeInternalLinks(html, validSlugs) {
  return html.replace(
    /<a\s+href="\/news\/([a-z0-9-]+)"[^>]*>(.*?)<\/a>/gi,
    (match, slug, text) => (validSlugs.has(slug) ? match : text)
  )
}

async function rewriteWithGemini(article, linkCandidates) {
  const internalLinksBlock = linkCandidates.length === 0 ? '' : `

INTERNAL LINKING (optional): below are existing MEDWEB-PK Medical News articles. If — and ONLY if — one or two are genuinely topically relevant to this story, naturally weave an inline link to it into a body paragraph using exactly this format: <a href="/news/SLUG">anchor text</a>. Use ONLY the exact slugs listed below, verbatim — never invent a slug, never link to an external URL this way. If nothing listed is genuinely relevant, add no links at all; do not force it.

EXISTING ARTICLES:
${linkCandidates.map(n => `- "${n.title}" → slug: ${n.slug}`).join('\n')}`

  const prompt = `You are a health/medical news editor for MEDWEB-PK, a Pakistani medical education platform for pharmacy/medical students and healthcare professionals.

Rewrite the following news story into an ORIGINAL, well-structured article in your own words. Do not copy sentences from the source — genuinely reword it — but stay strictly factually consistent with the source content given below. Tone: clear, informative, professional, encouraging.

Respond with STRICT JSON only — no markdown code fences, no commentary before or after — in exactly this shape:
{"title": "...", "metaTitle": "...", "metaDescription": "...", "bodyHtml": "..."}

Rules:
- "title": a fresh, original headline (do not copy the source headline verbatim)
- "metaTitle": a concise, keyword-relevant SEO title, 60 characters or fewer (can match "title" if it already fits)
- "metaDescription": a natural 1-2 sentence summary of the article, 155 characters or fewer, written as a search-engine snippet — no clickbait, no quotation marks
- "bodyHtml": the full article body as semantic HTML, structured like a real article, not one block of text:
  - One intro <p> paragraph
  - Then 2 to 4 <h2> subheadings, each followed by one or two short <p> paragraphs under it
  - A <ul> of <li> items ONLY if the content genuinely has a list (e.g. symptoms, steps, tips) — never force one in
  - One closing <p> paragraph
  - Allowed tags ONLY: <p>, <h2>, <ul>, <li>, <strong>, <em>, and (only per the internal-linking rule below) <a href="/news/...">. No other tags, no inline styles, no class attributes.${internalLinksBlock}

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

  const validSlugs = new Set(linkCandidates.map(n => n.slug))
  parsed.bodyHtml = sanitizeInternalLinks(parsed.bodyHtml.trim(), validSlugs)
  return parsed
}

async function main() {
  console.log('🩺 MEDWEB daily health-news draft fetcher starting…')

  const [headlines, existingUrls, linkCandidatesAll] = await Promise.all([
    fetchHealthHeadlines(),
    getExistingSourceUrls(),
    getRecentPublishedNews(20),
  ])
  console.log(`Fetched ${headlines.length} recent health headline(s) from NewsAPI.`)
  console.log(`${linkCandidatesAll.length} existing published article(s) available for internal linking.`)

  const fresh = headlines.filter(a => !existingUrls.has(a.url))
  const candidates = fresh.slice(0, MAX_ARTICLES_PER_RUN)
  console.log(`${fresh.length} are new (not already drafted); processing up to ${MAX_ARTICLES_PER_RUN}: ${candidates.length} this run.`)

  if (candidates.length === 0) {
    console.log('Nothing new to draft today. Done.')
    return
  }

  // Same small set of up to 5 most-recent published articles offered as
  // link candidates to every story in this run — deliberately not
  // re-picked per article (the whole pool is small and recency-sorted
  // already), and Gemini is instructed to only use one if it's genuinely
  // relevant, so an unrelated candidate list just means no link gets added.
  const linkCandidates = linkCandidatesAll
    .map(n => ({ title: n.title, slug: n.slug }))
    .filter(n => n.title && n.slug)
    .slice(0, 5)

  let created = 0
  let failed = 0
  for (const article of candidates) {
    try {
      console.log(`→ Rewriting: "${article.title}" (${article.source?.name || 'unknown source'})`)
      const rewritten = await rewriteWithGemini(article, linkCandidates)
      const slug = await uniqueSlug(slugify(rewritten.title))
      const imageUrl = buildImageUrl(pickImageKeyword(article, rewritten.title))

      await db.collection('news').add({
        title: rewritten.title.trim(),
        slug,
        imageUrl,
        references: [{ label: article.source?.name || 'Source', url: article.url }],
        sourceUrl: article.url,
        content: rewritten.bodyHtml,
        metaTitle: (rewritten.metaTitle || rewritten.title).trim().slice(0, 60),
        metaDescription: (rewritten.metaDescription || rewritten.title).trim().slice(0, 155),
        status: 'Draft',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
      created++
      console.log(`  ✓ Draft created: "${rewritten.title}" (slug: ${slug}, image keyword applied, ${linkCandidates.length ? 'internal links offered' : 'no link candidates yet'})`)
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
