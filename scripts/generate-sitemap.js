// Build-time sitemap generator — run before `vite build` (see package.json's
// "build" script) so public/sitemap.xml exists when Vite copies public/ into
// dist/. Uses firebase-admin with a service-account secret, same pattern as
// scripts/fetch-health-news.js — no Cloud Function, no Blaze plan needed.
//
// Unlike fetch-health-news.js (a scheduled job where a missing secret
// SHOULD fail loudly), this is part of the local/CI build path: a developer
// running `npm run build` without FIREBASE_SERVICE_ACCOUNT set shouldn't
// have their whole build fail over a sitemap. Missing/invalid credentials
// here just log a warning and fall back to a sitemap of the static routes
// only, so the build always succeeds.
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const SITE_URL = 'https://medwebpk.com'
const OUT_PATH = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'sitemap.xml')

// Every static public route (see src/App.jsx) worth a search engine knowing
// about — admin/ambassador/auth/form routes are deliberately excluded.
const STATIC_ROUTES = [
  { path: '/', priority: '1.0' },
  { path: '/about', priority: '0.7' },
  { path: '/contact', priority: '0.6' },
  { path: '/editorial-policy', priority: '0.3' },
  { path: '/founder-message', priority: '0.5' },
  { path: '/webinars', priority: '0.9' },
  { path: '/courses', priority: '0.9' },
  { path: '/team', priority: '0.6' },
  { path: '/speakers', priority: '0.5' },
  { path: '/ambassadors', priority: '0.6' },
  { path: '/advisory-board', priority: '0.5' },
  { path: '/blog', priority: '0.8' },
  { path: '/events', priority: '0.8' },
  { path: '/announcements', priority: '0.6' },
  { path: '/privacy-policy', priority: '0.2' },
  { path: '/terms-of-service', priority: '0.2' },
  { path: '/refund-policy', priority: '0.2' },
]

function urlEntry(loc, priority, lastmod) {
  return `  <url>\n    <loc>${SITE_URL}${loc}</loc>\n${lastmod ? `    <lastmod>${lastmod}</lastmod>\n` : ''}    <priority>${priority}</priority>\n  </url>`
}

// Firestore Admin SDK Timestamp (has .toDate()) -> 'YYYY-MM-DD', or
// undefined if neither field is present/parseable. Prefers updatedAt
// (most recent real edit) over createdAt.
function lastmodOf(data) {
  const raw = data.updatedAt || data.createdAt
  if (!raw) return undefined
  const d = typeof raw?.toDate === 'function' ? raw.toDate() : new Date(raw)
  return isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10)
}

async function getDynamicUrls() {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!serviceAccountJson) {
    console.warn('⚠️  FIREBASE_SERVICE_ACCOUNT not set — sitemap will only include static routes.')
    return []
  }

  let admin
  try {
    admin = (await import('firebase-admin')).default
  } catch (e) {
    console.warn('⚠️  firebase-admin not installed — sitemap will only include static routes.')
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

    const urls = []
    webinars.forEach(d => {
      const w = d.data()
      urls.push(urlEntry(`/webinar/${w.slug || d.id}`, '0.7', lastmodOf(w)))
    })
    courses.forEach(d => {
      const c = d.data()
      if (c.status !== 'Active') return
      urls.push(urlEntry(`/courses/${c.slug || d.id}`, '0.7', lastmodOf(c)))
    })
    blogPosts.forEach(d => {
      const p = d.data()
      if (p.slug) urls.push(urlEntry(`/blog/${p.slug}`, '0.6', lastmodOf(p)))
    })
    news.forEach(d => {
      const n = d.data()
      // `news` collection is also "Events & News" (Round 13) — same
      // Firestore collection, just /events/ as its public path now.
      if (n.slug) urls.push(urlEntry(`/events/${n.slug}`, '0.6', lastmodOf(n)))
    })
    announcements.forEach(d => {
      const a = d.data()
      if (a.slug) urls.push(urlEntry(`/announcements/${a.slug}`, '0.5', lastmodOf(a)))
    })
    return urls
  } catch (e) {
    console.warn(`⚠️  Failed to fetch Firestore data for sitemap (${e.message}) — falling back to static routes only.`)
    return []
  }
}

async function main() {
  const dynamicUrls = await getDynamicUrls()
  const staticUrls = STATIC_ROUTES.map(r => urlEntry(r.path, r.priority))
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...staticUrls, ...dynamicUrls].join('\n')}\n</urlset>\n`
  writeFileSync(OUT_PATH, xml, 'utf8')
  console.log(`✓ Wrote ${staticUrls.length + dynamicUrls.length} URLs to public/sitemap.xml (${staticUrls.length} static, ${dynamicUrls.length} dynamic).`)
}

main().catch(e => {
  console.error('Sitemap generation failed unexpectedly:', e)
  // Never fail the build over this — write static-only sitemap as a last resort.
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${STATIC_ROUTES.map(r => urlEntry(r.path, r.priority)).join('\n')}\n</urlset>\n`
  writeFileSync(OUT_PATH, xml, 'utf8')
})
