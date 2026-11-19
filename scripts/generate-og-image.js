// One-off generator for public/og-default.jpg — the default social-share
// image (og:image/twitter:image) used by SEO.jsx and index.html whenever a
// page doesn't supply its own cover image. Not part of the build pipeline
// (og-default.jpg is a committed static asset, not regenerated on every
// build) — re-run manually with `node scripts/generate-og-image.js` if the
// brand design ever changes.
import sharp from 'sharp'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const LOGO_PATH = join(ROOT, 'src/assets/medweb-logo.png')
const OUT_PATH = join(ROOT, 'public/og-default.jpg')

const W = 1200
const H = 630

async function main() {
  const logoBuf = readFileSync(LOGO_PATH)
  const logoB64 = logoBuf.toString('base64')

  const svg = `
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1655c3" />
      <stop offset="100%" stop-color="#64ac37" />
    </linearGradient>
    <clipPath id="logoClip"><circle cx="210" cy="315" r="120" /></clipPath>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)" />

  <!-- soft decorative circles -->
  <circle cx="1080" cy="80" r="220" fill="#ffffff" opacity="0.06" />
  <circle cx="1150" cy="560" r="160" fill="#ffffff" opacity="0.06" />

  <!-- logo badge -->
  <circle cx="210" cy="315" r="132" fill="#ffffff" opacity="0.15" />
  <circle cx="210" cy="315" r="120" fill="#ffffff" />
  <image x="90" y="195" width="240" height="240" clip-path="url(#logoClip)" href="data:image/png;base64,${logoB64}" />

  <!-- wordmark -->
  <text x="400" y="300" font-family="Arial, Helvetica, sans-serif" font-size="88" font-weight="900" fill="#ffffff">MED<tspan fill="#eafbe0">WEB</tspan><tspan fill="#ffffff" font-size="56" font-weight="800">-PK</tspan></text>
  <text x="400" y="350" font-family="Arial, Helvetica, sans-serif" font-size="32" font-weight="600" fill="#ffffff" opacity="0.92">Connecting Medical Minds</text>
  <text x="400" y="400" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="400" fill="#ffffff" opacity="0.8">Pakistan's Medical Education Platform</text>
</svg>`.trim()

  await sharp(Buffer.from(svg))
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(OUT_PATH)

  const meta = await sharp(OUT_PATH).metadata()
  const stat = (await import('fs')).statSync(OUT_PATH)
  console.log(`✓ Generated ${OUT_PATH} — ${meta.width}x${meta.height}, ${(stat.size / 1024).toFixed(1)}KB`)
}

main().catch(e => { console.error(e); process.exit(1) })
