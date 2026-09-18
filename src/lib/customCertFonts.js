// Admin-uploaded custom certificate fonts (.ttf/.otf, stored on Cloudinary,
// tracked in the `customFonts` Firestore collection) — merged into the same
// font list the curated CERTIFICATE_FONTS live in, so a custom font shows up
// in the Name/ID/custom-field font dropdown and is usable exactly like Alex
// Brush or any other curated font, everywhere certificates are drawn.
//
// Two things a real @font-face needs that Google Fonts gets for free from
// index.html's <link>: the @font-face rule itself, and a document.fonts.load()
// before the first ctx.fillText() (fonts are lazy-fetched by the browser).
// Both are handled here — certFontFit.js's drawTextField()/ensureFontLoaded()
// call getAllCertFontEntries() before drawing, which guarantees the
// @font-face rule exists before the font-load is even requested. This matters
// on the PUBLIC site too, not just in admin — the automatic webinar-feedback
// flow composites certificates in the SUBMITTING STUDENT's browser
// (certificateGenerator.js), which has never visited /admin and has no other
// reason to know a custom font exists.

import { customFontsService } from '../firebase/services'
import { CERTIFICATE_FONTS } from '../constants/certificateFonts'

let cache = null
let loadingPromise = null

function injectFontFaces(rows) {
  if (typeof document === 'undefined') return
  let styleEl = document.getElementById('medweb-custom-cert-fonts')
  if (!styleEl) {
    styleEl = document.createElement('style')
    styleEl.id = 'medweb-custom-cert-fonts'
    document.head.appendChild(styleEl)
  }
  styleEl.textContent = rows.map(f => `
@font-face {
  font-family: "${f.fontFamily}";
  src: url("${f.fileUrl}") format("${f.format || 'truetype'}");
  font-display: swap;
}`).join('\n')
}

// Fetches once per page load, caches after — a fresh upload from another
// admin session is picked up on next reload, same as any other Firestore
// read in this app that isn't behind a listener.
export async function loadCustomFonts() {
  if (cache) return cache
  if (!loadingPromise) {
    loadingPromise = customFontsService.getAll()
      .catch(() => [])
      .then(rows => {
        cache = rows
        injectFontFaces(rows)
        return rows
      })
  }
  return loadingPromise
}

// Invalidates the cache and re-injects — called right after a new upload so
// it's selectable immediately in the SAME session, not just on next reload.
export async function refreshCustomFonts() {
  cache = null
  loadingPromise = null
  return loadCustomFonts()
}

function toCertFontEntry(f) {
  return { label: f.name, css: `"${f.fontFamily}"`, google: null, bold: false, custom: true, id: f.id }
}

// The list every font dropdown and the drawing code should use — curated
// fonts first (unchanged order/positions), custom ones appended after.
export async function getAllCertFontEntries() {
  const customs = await loadCustomFonts()
  return [...CERTIFICATE_FONTS, ...customs.map(toCertFontEntry)]
}

// Sync variant for render paths that can't await (e.g. a <select>'s options
// on first paint, before loadCustomFonts() has resolved) — returns whatever
// is cached so far, curated-only until the first fetch completes.
export function getCachedCertFontEntries() {
  return [...CERTIFICATE_FONTS, ...(cache || []).map(toCertFontEntry)]
}

// CSS-safe font-family generated from the admin-typed display name — kept
// distinct from the display name itself (which can have spaces/punctuation)
// since this becomes both the @font-face name and part of ctx.font strings.
export function slugifyFontFamily(name) {
  const base = String(name).trim().replace(/[^a-zA-Z0-9]+/g, '') || 'CustomFont'
  return `MedwebCustom_${base}_${Date.now().toString(36)}`
}
