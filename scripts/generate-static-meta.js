// Build-time static-meta "prerendering" — run AFTER `vite build` (see
// package.json's "build" script) so it starts from the real dist/index.html
// (correct hashed asset filenames) as a template, then writes a copy per
// public route to dist/<route>/index.html with that route's own real
// title/description/canonical/OG/Twitter tags already in the raw HTML.
//
// This is deliberately NOT full DOM prerendering (no headless
// Chrome/Puppeteer — that needs a Chromium binary in CI, is slow, and is
// a much heavier, more fragile addition than this actually needs). A real
// visitor's browser still loads the same JS bundle and renders the full
// interactive app normally (react-helmet-async then updates these same
// tags client-side, in sync). The point of this script specifically is
// crawlers that DON'T execute JavaScript — WhatsApp, LinkedIn, Twitter,
// Facebook's link-preview bots — which only ever read the raw HTML
// response. Previously every single route served the exact same
// site-wide index.html tags, so sharing a webinar/blog/news link always
// showed the generic MEDWEB-PK preview, never that item's own title/image.
//
// Hostinger's public/.htaccess only rewrites/ErrorDocuments a path when
// Apache's own file lookup fails — so a path that has a real
// dist/<route>/index.html generated here is served directly with a real
// 200, no rewrite involved at all.
//
// Gracefully degrades: without FIREBASE_SERVICE_ACCOUNT set, this still
// generates every STATIC route (title/description are hardcoded here, no
// Firestore needed) but skips the per-item dynamic routes (webinar/course/
// blog/news/announcement detail pages) rather than failing the build.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = join(ROOT, 'dist')
const SITE_URL = 'https://medwebpk.com'
const DEFAULT_IMAGE = `${SITE_URL}/favicon.png`

const escapeAttr = s => String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
const escapeHtml = s => escapeAttr(s)

// Mirrors the title/description each page passes to <SEO> client-side
// (src/components/SEO.jsx) — kept in sync by hand since this script can't
// import JSX. If a page's <SEO title=.../description=.../> props change,
// update the matching entry here too.
const STATIC_PAGES = [
  { path: '/about', title: 'About Us', description: "MEDWEB is Pakistan's premier medical education platform dedicated to pharmacy, biotech, psychology, and allied health sciences students." },
  { path: '/webinars', title: 'All Webinars', description: 'Every MEDWEB-PK webinar — live, upcoming, and recorded sessions for medical and pharmacy students.' },
  { path: '/courses', title: 'All Courses', description: "Browse MEDWEB-PK's full catalog of structured courses for medical and pharmacy students." },
  { path: '/team', title: 'Our Team', description: "Meet the team behind MEDWEB-PK, Pakistan's medical education platform." },
  { path: '/speakers', title: 'Speakers', description: 'Expert speakers who have presented at MEDWEB-PK webinars.' },
  { path: '/ambassadors', title: 'Ambassador Program', description: "Meet MEDWEB-PK's nationwide student ambassador network." },
  { path: '/advisory-board', title: 'Advisory Board', description: "Meet MEDWEB-PK's advisory board of healthcare and education experts." },
  { path: '/blog', title: 'Blog', description: 'Articles and insights from MEDWEB-PK for medical and pharmacy students across Pakistan.' },
  { path: '/events', title: 'Events & News', description: "MEDWEB-PK's conferences, seminars, workshops, medical camps and curated medical news." },
  { path: '/announcements', title: 'Announcements', description: 'Every event, program, and update MEDWEB-PK has promoted — past and present.' },
  { path: '/privacy-policy', title: 'Privacy Policy', description: "MEDWEB-PK's privacy policy." },
  { path: '/terms-of-service', title: 'Terms of Service', description: "MEDWEB-PK's terms of service." },
  { path: '/refund-policy', title: 'Refund Policy', description: "MEDWEB-PK's refund policy." },
]

function injectMeta(template, { title, description, path, image }) {
  const fullTitle = `${title} | MEDWEB-PK`
  const canonical = `${SITE_URL}${path}`
  const img = image || DEFAULT_IMAGE
  let out = template
  out = out.replace(/<title>.*?<\/title>/s, `<title>${escapeHtml(fullTitle)}</title>`)
  out = out.replace(/<meta name="description" content=".*?"\s*\/?>/s, `<meta name="description" content="${escapeAttr(description)}" />`)
  out = out.replace(/<meta property="og:title" content=".*?"\s*\/?>/s, `<meta property="og:title" content="${escapeAttr(fullTitle)}" />`)
  out = out.replace(/<meta property="og:description" content=".*?"\s*\/?>/s, `<meta property="og:description" content="${escapeAttr(description)}" />`)
  out = out.replace(/<meta property="og:image" content=".*?"\s*\/?>/s, `<meta property="og:image" content="${escapeAttr(img)}" />`)
  const extraTags = [
    `<link rel="canonical" href="${canonical}" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeAttr(fullTitle)}" />`,
    `<meta name="twitter:description" content="${escapeAttr(description)}" />`,
    `<meta name="twitter:image" content="${escapeAttr(img)}" />`,
  ].join('\n    ')
  out = out.replace('</head>', `    ${extraTags}\n  </head>`)
  return out
}

function writeRoute(template, routePath, meta) {
  const dir = join(DIST, routePath.replace(/^\//, ''))
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'index.html'), injectMeta(template, { ...meta, path: routePath }), 'utf8')
}

async function getDynamicItems() {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!serviceAccountJson) {
    console.warn('⚠️  FIREBASE_SERVICE_ACCOUNT not set — skipping dynamic (webinar/course/blog/news/announcement) static-meta pages.')
    return []
  }
  let admin
  try {
    admin = (await import('firebase-admin')).default
  } catch {
    console.warn('⚠️  firebase-admin not installed — skipping dynamic static-meta pages.')
    return []
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountJson)
    if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
    const db = admin.firestore()

    const [webinars, courses, blogPosts, news, announcements] = await Promise.all([
      db.collection('webinars').get(),
      db.collection('courses').get(),
      db.collection('blogPosts').where('status', '==', 'Published').get(),
      db.collection('news').where('status', '==', 'Published').get(),
      db.collection('announcements').where('enabled', '==', true).get(),
    ])

    const items = []
    webinars.forEach(d => {
      const w = d.data()
      items.push({
        path: `/webinar/${d.id}`,
        title: w.topic || w.title || 'Webinar',
        description: w.description || `Join "${w.topic || w.title || 'this webinar'}" — a live MEDWEB-PK webinar for medical and pharmacy students.`,
        image: w.webinarImage || w.poster,
      })
    })
    courses.forEach(d => {
      const c = d.data()
      if (c.status !== 'Active') return
      items.push({
        path: `/courses/${c.slug || d.id}`,
        title: c.seoTitle || c.title || 'Course',
        description: c.seoDescription || c.fullDescription || c.description || `${c.title || 'This course'} — a MEDWEB-PK course for medical and pharmacy students.`,
        image: c.ogImage || c.posterImage || c.imageUrl,
      })
    })
    blogPosts.forEach(d => {
      const p = d.data()
      if (!p.slug) return
      items.push({ path: `/blog/${p.slug}`, title: p.title, description: p.excerpt, image: p.imageUrl })
    })
    news.forEach(d => {
      const n = d.data()
      if (!n.slug) return
      // Same `news` collection, /events/ path (Round 13's Events & News
      // module) — seoTitle/seoDescription/shareImage are the new fields;
      // metaTitle/metaDescription/imageUrl are what pre-this-round docs
      // (including the automated news-fetch pipeline) still only have.
      items.push({
        path: `/events/${n.slug}`,
        title: n.seoTitle || n.metaTitle || n.title,
        description: n.seoDescription || n.metaDescription || n.summary,
        image: n.shareImage || n.coverImage || n.imageUrl,
      })
    })
    announcements.forEach(d => {
      const a = d.data()
      if (!a.slug) return
      items.push({ path: `/announcements/${a.slug}`, title: a.title, description: a.shortDescription, image: a.imageUrl })
    })
    return items
  } catch (e) {
    console.warn(`⚠️  Failed to fetch Firestore data for static-meta pages (${e.message}) — skipping dynamic pages.`)
    return []
  }
}

async function main() {
  const indexPath = join(DIST, 'index.html')
  if (!existsSync(indexPath)) {
    console.warn('⚠️  dist/index.html not found — did `vite build` run first? Skipping static-meta generation.')
    return
  }
  const template = readFileSync(indexPath, 'utf8')

  // The homepage itself: add canonical/Twitter tags (missing from
  // index.html before this round) while keeping its existing title/og
  // content as-is, rather than overwriting it with a generic "title | MEDWEB-PK".
  const homeCanonical = SITE_URL
  const homeExtra = [
    `<link rel="canonical" href="${homeCanonical}" />`,
    `<meta property="og:url" content="${homeCanonical}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
  ].join('\n    ')
  writeFileSync(indexPath, template.replace('</head>', `    ${homeExtra}\n  </head>`), 'utf8')

  let count = 0
  for (const page of STATIC_PAGES) {
    writeRoute(template, page.path, page)
    count++
  }

  const dynamicItems = await getDynamicItems()
  for (const item of dynamicItems) {
    writeRoute(template, item.path, item)
    count++
  }

  console.log(`✓ Generated static meta for ${count} route(s) (${STATIC_PAGES.length} static, ${dynamicItems.length} dynamic) + updated the homepage's own tags.`)
}

main().catch(e => {
  // Never fail the whole build over this — the SPA still works fine
  // without prerendered meta, just with the generic site-wide tags.
  console.error('Static-meta generation failed unexpectedly (build continues):', e)
})
