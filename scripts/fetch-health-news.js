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
// gemini-2.0-flash was retired by Google and 404s on every call — confirmed
// from a real workflow run (18 headlines fetched fine, all 3 rewrite
// attempts failed with "This model ... is no longer available ... use
// models/gemini-3.8-flash"). Updated to the model name Google's own error
// pointed at.
const GEMINI_MODEL = 'gemini-3.8-flash'
// Lowered from 3 to 2 — two of three articles exhausted every retry and
// still hit 503 in a real run, meaning the free-tier endpoint was under
// sustained load, not just a brief spike. Fewer candidates per run means
// fewer near-simultaneous requests piling onto the same overloaded endpoint.
const MAX_ARTICLES_PER_RUN = 2
// Backoff schedule for a transient Gemini overload (503) or rate limit
// (429). Extended with a 4th, longer attempt (60s) after a real run saw
// persistent 503s survive all three original retries (5s/15s/30s,
// ~50s total) — in case the load spike just outlasts that window.
// Retried per-article, so one persistently overloaded call never blocks
// the others from succeeding.
const GEMINI_RETRY_DELAYS_MS = [5000, 15000, 30000, 60000]

function fail(message) {
  console.error(`❌ ${message}`)
  process.exit(1)
}

// Thrown specifically when Gemini 404s on the model itself — see
// rewriteWithGemini() below. Kept distinct from a generic Error so main()
// can react differently: retrying the same invalid model against the next
// candidate would just 404 again, so the whole run stops after the first
// one instead of burning through every candidate for an identical failure.
class GeminiModelError extends Error {}

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
// longer resolves (verified: HTTP 503). LoremFlickr, used here previously,
// turned out to ALSO no longer work at runtime — verified directly with a
// plain curl request: it now returns HTTP 401 Unauthorized instead of an
// image, which is exactly why the first real draft got no thumbnail.
// Picsum Photos' seeded endpoint was verified working with a direct
// request (HTTP 200, image/jpeg) and needs no key either. It isn't
// keyword-SEARCHED the way a real stock-photo API would be — the keyword
// only seeds which photo comes back — but it's deterministic per keyword
// (the same topic always gets the same photo) and, critically, actually
// resolves to a real image instead of silently failing. Still just a
// placeholder either way; the admin swaps it before publishing.
function buildImageUrl(keyword) {
  const seed = encodeURIComponent(keyword.replace(/\s+/g, '-'))
  return `https://picsum.photos/seed/${seed}/1200/630`
}

// Defense-in-depth against Gemini not actually returning real HTML tags
// despite being asked to — either HTML-entity-escaping them inside the JSON
// string (e.g. "&lt;h2&gt;...&lt;/h2&gt;", which DOMPurify/the browser then
// renders as literal text, not a heading) or just writing markdown-style
// **bold**/## headings, or plain blank-line-separated paragraphs. Never
// ships a single untagged text blob.
function ensureHtmlStructure(raw) {
  let html = raw.trim()

  // Case 1: real tags are there, just HTML-entity-escaped — decode only
  // the specific escapes a tag would use, not a full entity decode, so a
  // genuine "&" in body text (e.g. "R&D") isn't touched.
  if (!/<[a-z][\s\S]*>/i.test(html) && /&lt;\/?[a-z]+&gt;/i.test(html)) {
    html = html.replace(/&lt;(\/?[a-z0-9]+)&gt;/gi, '<$1>')
  }

  // Case 2: still no real <p>/<h2>/<ul> tags at all — Gemini returned plain
  // text (possibly with markdown-style ## / **bold** markers). Split into
  // blank-line-separated blocks and wrap each in <p>, stripping markdown
  // markers so they don't render as literal characters.
  if (!/<(p|h2|ul|li)[\s>]/i.test(html)) {
    html = html
      .split(/\n{2,}/)
      .map(block => block.trim())
      .filter(Boolean)
      .map(block => `<p>${block.replace(/^#{1,6}\s*/, '').replace(/\*\*(.*?)\*\*/g, '$1')}</p>`)
      .join('')
  }

  return html
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

// Guarantees a working, correct link back to the original source article
// exists — the same class of risk as internal links (an LLM can still
// mistype or drop a URL despite being told to copy it verbatim), except
// here there's no candidate list to validate against, so instead of
// stripping a bad link, this checks whether the real article.url already
// appears anywhere in the body and, if not, appends the exact attribution
// line itself. Either way the final draft always has a real clickable
// link to the original reporting, never something the LLM had to get
// right unsupervised.
function ensureSourceAttribution(html, article) {
  if (!article.url) return html
  if (html.includes(article.url)) return html
  const sourceName = article.source?.name?.trim() || 'original source'
  return `${html}<p>Source: <a href="${article.url}" target="_blank" rel="noopener noreferrer">${sourceName}</a></p>`
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Parses Gemini's raw text response into the expected
// {title, metaTitle, metaDescription, bodyHtml} object, tolerating the
// ways that response has actually failed to be clean JSON in real runs:
// markdown code fences around it, or extra text before/after the object.
// Tries progressively looser extraction before giving up, and — critically
// — logs enough of the raw response (length + first/last 200 chars, not
// the whole thing) to diagnose a future failure without guessing, per a
// real run where "non-JSON output" alone wasn't enough information.
function extractJsonResponse(raw, finishReason) {
  const trimmed = raw.trim()
  // Strip ```json ... ``` or ``` ... ``` fences if present.
  const unfenced = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()

  const attempts = [unfenced]
  // Fallback: the object between the first { and the last } — tolerates
  // stray commentary Gemini added outside the JSON despite instructions.
  const first = unfenced.indexOf('{')
  const last = unfenced.lastIndexOf('}')
  if (first !== -1 && last > first) attempts.push(unfenced.slice(first, last + 1))

  for (const candidate of attempts) {
    try {
      return JSON.parse(candidate)
    } catch (e) { /* try the next candidate */ }
  }

  const diagnostic =
    `length=${raw.length} chars, finishReason=${finishReason || 'unknown'}, ` +
    `starts: "${raw.slice(0, 200)}", ends: "${raw.slice(-200)}"`

  // finishReason === 'MAX_TOKENS' means Gemini's own response says it was
  // cut off by the output-token cap — surface that as the actual cause
  // instead of a generic parse error that just looks like a formatting fluke.
  if (finishReason === 'MAX_TOKENS') {
    throw new Error(`Gemini's response was cut off at the maxOutputTokens limit before finishing valid JSON. ${diagnostic}`)
  }
  throw new Error(`Gemini returned non-JSON output. ${diagnostic}`)
}

// Calls the Gemini API, retrying a transient 503 (overloaded) or 429
// (rate-limited) response with exponential-ish backoff (GEMINI_RETRY_DELAYS_MS)
// before giving up on this specific article — the rest of the run's
// candidates are unaffected either way (see the per-article try/catch in
// main()). A 404 (invalid model) is NOT retried — that's a config problem,
// not a transient one, so it fails immediately as GeminiModelError exactly
// as before. Any other non-ok status also fails immediately.
async function callGeminiWithRetry(requestBody) {
  const maxRetries = GEMINI_RETRY_DELAYS_MS.length
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      }
    )
    if (res.ok) return res

    const bodyText = await res.text()

    // A 404 here means the model itself is invalid/retired (as opposed to a
    // transient/rate-limit/auth failure) — Google's own error body says so
    // explicitly (e.g. "model ... is no longer available"). Distinguished
    // with a dedicated error type so main() can stop the whole run after
    // the first failure instead of repeating the same doomed request against
    // every remaining candidate and creating zero drafts with three
    // identical, easy-to-miss log lines.
    if (res.status === 404) {
      throw new GeminiModelError(
        `Gemini model "${GEMINI_MODEL}" was rejected as not found (HTTP 404). ` +
        `It's likely been retired/renamed by Google — update GEMINI_MODEL in ` +
        `scripts/fetch-health-news.js to a currently valid model id. Google's response: ${bodyText}`
      )
    }

    if ((res.status === 503 || res.status === 429) && attempt < maxRetries) {
      const delayMs = GEMINI_RETRY_DELAYS_MS[attempt]
      console.warn(`  ⏳ Gemini overloaded (HTTP ${res.status}), retrying in ${delayMs / 1000}s... (attempt ${attempt + 1}/${maxRetries})`)
      await sleep(delayMs)
      continue
    }

    throw new Error(`Gemini request failed: HTTP ${res.status} — ${bodyText}`)
  }
}

async function rewriteWithGemini(article, linkCandidates) {
  const internalLinksBlock = linkCandidates.length === 0 ? '' : `

INTERNAL LINKING (optional): below are existing MEDWEB-PK Medical News articles. If — and ONLY if — one or two are genuinely topically relevant to this story, naturally weave an inline link to it into a body paragraph using exactly this format: <a href="/news/SLUG">anchor text</a>. Use ONLY the exact slugs listed below, verbatim — never invent a slug, never link to an external URL this way. If nothing listed is genuinely relevant, add no links at all; do not force it.

EXISTING ARTICLES:
${linkCandidates.map(n => `- "${n.title}" → slug: ${n.slug}`).join('\n')}`

  const prompt = `You are a health news editor for MEDWEB-PK, a Pakistani medical education platform. You cover general global health and medical news for anyone interested in health — disease outbreaks, medical research breakthroughs, drug approvals and recalls, public health policy, and similar stories — written as straightforward journalism, the way a real health-news outlet would, NOT as a classroom lesson.

Rewrite the following news story into an ORIGINAL article in your own words. Do not copy sentences from the source — genuinely reword it — but stay strictly factually consistent with the source content given below.

Tone: match the actual story. An outbreak update should read like an outbreak update, a research breakthrough like a research story, a drug recall like a recall notice. Do NOT force a "what this means for medical/pharmacy students" or "public health lessons" angle onto every article by default — only include that kind of framing if THIS specific story genuinely calls for it. The closing paragraph should read like a natural end to this particular story, not a template reused across every article.

Respond with STRICT JSON only — no markdown code fences, no commentary before or after — in exactly this shape:
{"title": "...", "metaTitle": "...", "metaDescription": "...", "bodyHtml": "..."}

Rules:
- "title": a fresh, original headline (do not copy the source headline verbatim)
- "metaTitle": a concise, keyword-relevant SEO title, 60 characters or fewer (can match "title" if it already fits)
- "metaDescription": a natural 1-2 sentence summary of the article, 155 characters or fewer, written as a search-engine snippet — no clickbait, no quotation marks
- "bodyHtml": the full article body as semantic HTML, structured like a real, substantial article, not a few short paragraphs restating the headline:
  - Target length: roughly 500 to 700 words of genuine, substantial content — real depth, not padding or repetition. Add real context where it earns its place: brief background on the disease/topic/research area, a relevant statistic or detail from the source material, and the implications or what plausibly happens next — but stay concise and readable at this length, not stretched.
  - One intro <p> paragraph, then 2 to 4 <h2> subheadings, each followed by one or two short <p> paragraphs under it, then one closing <p> paragraph.
  - A <ul> of <li> items where a list genuinely fits (e.g. symptoms, steps, key facts, timeline of events) — never force one in.
  - Near the end, ONE clearly-marked source-attribution line in this exact pattern: <p>Source: <a href="${article.url}" target="_blank" rel="noopener noreferrer">${article.source?.name || 'original source'}</a></p> — use that exact URL and that exact source name, verbatim, nothing else. You may also naturally reference the source by name earlier in the prose (e.g. "according to ${article.source?.name || 'the original report'}") without a link there — only this one closing line needs the actual <a href>.
  - Allowed tags ONLY: <p>, <h2>, <ul>, <li>, <strong>, <em>, and <a href="..."> (only for the source-attribution line above and, per the internal-linking rule below, MEDWEB's own /news/ links). No other tags, no inline styles, no class attributes.
  - Output REAL HTML tags exactly as characters like <h2> and <p> — do NOT escape them (never write &lt;h2&gt;), and do NOT use markdown (never write ## for a heading or **text** for bold).
  - Example of the exact bodyHtml shape expected (structure only — write fresh content, don't reuse this wording): "<p>Intro paragraph summarizing the story.</p><h2>First subheading</h2><p>Paragraph.</p><h2>Second subheading</h2><p>Paragraph.</p><p>Closing paragraph.</p><p>Source: <a href=\"https://example.com/article\" target=\"_blank\" rel=\"noopener noreferrer\">Example News</a></p>"${internalLinksBlock}

SOURCE ARTICLE
Title: ${article.title}
Description: ${article.description || '(none provided)'}
Content snippet: ${article.content || '(none provided)'}
Source publication: ${article.source?.name || 'Unknown'}
Source URL: ${article.url}`

  // 500-700 words of body content is roughly 700-950 tokens (English
  // averages ~0.75 words/token); 4096 leaves generous headroom for that
  // plus the JSON wrapper, HTML tags, and metaTitle/metaDescription without
  // relying on an unusually high value that may exceed what this model
  // actually supports (the previous 32768 — sized for a since-abandoned
  // 5000-7000 word target — plausibly contributed to the truncation seen
  // in a real run, if the model's real ceiling is lower than that).
  // Transient 503/429s are retried inside callGeminiWithRetry(); anything
  // else (incl. 404) throws.
  const res = await callGeminiWithRetry({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 4096 },
  })
  const data = await res.json()
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  const parsed = extractJsonResponse(raw, data.candidates?.[0]?.finishReason)
  if (!parsed.title?.trim() || !parsed.bodyHtml?.trim()) {
    throw new Error('Gemini output is missing title or bodyHtml')
  }

  parsed.bodyHtml = ensureHtmlStructure(parsed.bodyHtml)
  const validSlugs = new Set(linkCandidates.map(n => n.slug))
  parsed.bodyHtml = sanitizeInternalLinks(parsed.bodyHtml, validSlugs)
  parsed.bodyHtml = ensureSourceAttribution(parsed.bodyHtml, article)
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
  let modelInvalid = false
  for (const article of candidates) {
    try {
      console.log(`→ Rewriting: "${article.title}" (${article.source?.name || 'unknown source'})`)
      const rewritten = await rewriteWithGemini(article, linkCandidates)
      const slug = await uniqueSlug(slugify(rewritten.title))
      const keyword = pickImageKeyword(article, rewritten.title)
      const imageUrl = buildImageUrl(keyword)

      // Printed so a workflow run's log is enough to catch a regression
      // like the last ones (image URL silently failing, bodyHtml being
      // JSON-escaped/plain text, too-short output, or a missing source
      // link) without needing to open Firestore.
      const wordCount = rewritten.bodyHtml.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean).length
      const hasSourceLink = rewritten.bodyHtml.includes(article.url)
      console.log(`  image: keyword="${keyword}" → ${imageUrl}`)
      console.log(`  body: ~${wordCount} words, source link present: ${hasSourceLink}`)
      console.log(`  bodyHtml (first 300 chars): ${rewritten.bodyHtml.slice(0, 300)}${rewritten.bodyHtml.length > 300 ? '…' : ''}`)

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
      if (e instanceof GeminiModelError) {
        // Every remaining candidate would fail identically — stop here
        // instead of repeating the same 404 for each one and burying the
        // one actionable line in duplicate noise.
        modelInvalid = true
        console.error(`\n❌ Gemini model "${GEMINI_MODEL}" is invalid — stopping this run early instead of retrying it against every remaining candidate.`)
        break
      }
    }
  }

  console.log(
    `\nDone. Created ${created} draft(s), ${failed} failed, out of ${candidates.length} candidate(s) ` +
    `(${headlines.length} fetched, ${headlines.length - fresh.length} already existed as drafts/published).`
  )

  // A bad model config (or every candidate failing outright) must surface
  // as a failed Actions run, not a quiet green checkmark with zero drafts —
  // that silent-3x-failure was exactly the reported bug.
  if (modelInvalid) fail(`Gemini model "${GEMINI_MODEL}" is not available — update GEMINI_MODEL in scripts/fetch-health-news.js.`)
  if (created === 0) fail('No drafts were created this run — see the errors above.')
}

main().catch(e => {
  console.error('Fatal error:', e)
  process.exit(1)
})
