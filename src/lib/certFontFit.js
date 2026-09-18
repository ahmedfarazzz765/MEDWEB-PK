// Shared "shrink text to fit its box" + "draw text on canvas" logic — used
// by BOTH the live admin preview (CertPositionEditor.jsx) and the real canvas
// compositing step (certificateGenerator.js). Kept in ONE place so the two
// can NEVER drift apart — this was the root cause of the preview-vs-output
// mismatch: the preview used CSS/DOM rendering (flexbox centering, CSS
// font-size) while the generator used Canvas 2D (ctx.fillText, textBaseline
// 'middle'), and these two engines position/size text differently.
//
// Now both render onto an actual <canvas> via `drawTextField()` below —
// the preview's canvas is drawn at the template's full natural resolution
// and then scaled down for display exactly like the template <img> is
// (CSS width: 100%), so it is pixel-identical to the generated certificate,
// not just visually similar.

import { getAllCertFontEntries } from './customCertFonts'

// The Google Fonts <link> in index.html (and, for admin-uploaded fonts, the
// @font-face rule customCertFonts.js injects) only guarantees the font is
// REQUESTABLE, not that the file has finished downloading by the time
// ctx.fillText runs — without waiting on this, the first draw of a given
// font after a fresh page load can silently use the fallback font instead.
// Safe to call for the plain system stack too (no-ops harmlessly).
export async function ensureFontLoaded(fontFamily, fontSize, bold, italic) {
  if (typeof document === 'undefined' || !document.fonts) return
  try {
    await document.fonts.load(`${italic ? 'italic ' : ''}${bold ? 'bold ' : ''}${fontSize}px ${fontFamily}`)
    await document.fonts.ready
  } catch {
    // Font failed to load — fillText just falls back to the next family in
    // the stack rather than throwing, so this is safe to swallow.
  }
}

let measureCanvasCtx
function getMeasureCtx() {
  if (!measureCanvasCtx) measureCanvasCtx = document.createElement('canvas').getContext('2d')
  return measureCanvasCtx
}

// Steps `startSize` down by 2px at a time until `text` fits within
// `maxWidthPx` at the given font, stopping at `minSize` so it never
// shrinks into illegibility. `maxHeightPx`, when given, first clamps the
// starting size so an admin-set fontSize taller than a short box doesn't
// spill over vertically either — text is never actually clipped, just fit
// to both dimensions of its box. Returns the configured size unchanged
// whenever it already fits — this only ever shrinks, never grows past the
// admin's configured size.
export function fitFontSize({ text, fontFamily, bold, italic, startSize, maxWidthPx, maxHeightPx, minSize = 16, ctx }) {
  const context = ctx || getMeasureCtx()
  const heightCapped = maxHeightPx ? Math.min(startSize, Math.floor(maxHeightPx * 0.75)) : startSize
  const floor = Math.min(minSize, heightCapped)
  let size = heightCapped
  while (size > floor) {
    context.font = `${italic ? 'italic ' : ''}${bold ? 'bold ' : ''}${size}px ${fontFamily}`
    if (context.measureText(text).width <= maxWidthPx) return size
    size -= 2
  }
  return floor
}

// A box with no saved widthPct/heightPct yet (every position saved before
// resizable boxes existed) needs SOME size. Measured from the ACTUAL text at
// its actual font — not a flat "fontSize × widthFactor" guess. That guess
// badly overestimates width for large font sizes on short text (e.g. a
// 106px name could compute to 90% of the image width), and since the drag
// box is bounds-clamped to stay inside the image, an oversized box leaves
// almost no room to drag it away from center — it LOOKS draggable but barely
// moves, which reads as "positioning is ignored" even though xPct/yPct are
// saved and used correctly. widthFactor/ctx-less fallback (30%) only kicks
// in before the template image has loaded, when there's nothing to measure
// yet and no canvas context to measure with.
function defaultBoxSizePct(pos, text, naturalWidth, naturalHeight, widthFactor, ctx, fontFamily, bold, italic) {
  if (text && naturalWidth > 1) {
    const context = ctx || getMeasureCtx()
    context.font = `${italic ? 'italic ' : ''}${bold ? 'bold ' : ''}${pos.fontSize}px ${fontFamily || pos.fontFamily || 'Helvetica, Arial, sans-serif'}`
    const measuredWidthPx = context.measureText(text).width
    return {
      widthPct: Math.min(95, Math.max(4, (measuredWidthPx * 1.15 / naturalWidth) * 100)),
      heightPct: naturalHeight ? Math.max(4, (pos.fontSize * 1.7 / naturalHeight) * 100) : 8,
    }
  }
  return {
    widthPct: naturalWidth ? Math.min(90, (pos.fontSize * widthFactor / naturalWidth) * 100) : 30,
    heightPct: naturalHeight ? Math.max(4, (pos.fontSize * 1.7 / naturalHeight) * 100) : 8,
  }
}

// THE single place "does this box have an explicit size, or do we need a
// fallback" gets decided. Both CertPositionEditor.jsx (live preview) and
// certificateGenerator.js/drawTextField() (real generation) call this with
// the same arguments before doing anything else with a position — never
// boxWidthPx/boxHeightPx directly on a raw, unresolved position. `text` is
// optional (older/other call sites without it get the coarser fontSize-only
// fallback) but every current caller passes the real text being drawn.
export function resolveBoxSize(pos, naturalWidth, naturalHeight, widthFactor = 12, text, ctx, fontFamily, bold, italic) {
  const fallback = defaultBoxSizePct(pos, text, naturalWidth, naturalHeight, widthFactor, ctx, fontFamily, bold, italic)
  return {
    widthPct: pos.widthPct ?? fallback.widthPct,
    heightPct: pos.heightPct ?? fallback.heightPct,
  }
}

// Plain unit conversion, nothing else — takes the already-resolved
// widthPct/heightPct from resolveBoxSize() above.
export function boxWidthPx(widthPct, totalWidthPx) {
  return (widthPct / 100) * totalWidthPx
}
export function boxHeightPx(heightPct, totalHeightPx) {
  return (heightPct / 100) * totalHeightPx
}

// ────────────────────────────────────────────────────────────────────────────
// drawTextField — THE single function that draws text onto a canvas for both
// the live preview AND the actual generated certificate. By using the exact
// same Canvas 2D code path in both places, what the admin sees while
// positioning IS what gets generated — pixel-accurate WYSIWYG. Also the one
// place bold/italic/alignment/color and custom-font loading are resolved, so
// every generation path (automatic webinar flow, manual single/bulk issue)
// and the live preview treat a saved position identically.
//
// Parameters:
//   ctx           : CanvasRenderingContext2D to draw on
//   text          : string to render
//   pos           : { xPct, yPct, fontSize, color, fontFamily, widthPct?,
//                     heightPct?, bold?, italic?, align? }
//                   bold/italic: explicit true/false toggle from the admin's
//                   Bold/Italic buttons — undefined falls back to the font's
//                   own default weight (true for the system font, false for
//                   every curated/custom webfont).
//                   align: 'left' | 'center' | 'right' — where the text sits
//                   WITHIN its box, independent of the box's own position on
//                   the certificate (still driven by xPct/yPct + `centered`
//                   below). Defaults to 'center' for Name/custom fields and
//                   'left' for the ID field, i.e. unchanged from before this
//                   existed, so old saved positions render exactly the same.
//   naturalWidth  : image natural width (px) — canvas.width for generation,
//                   or the template image's naturalWidth for preview
//   naturalHeight : image natural height (px)
//   options:
//     centered    : true = Name/custom field (the box's own anchor point is
//                   its CENTER); false = ID (the box's own anchor point is
//                   its LEFT EDGE) — this is about box placement, not text
//                   alignment within it (see `align` above). Kept exactly as
//                   before so existing saved xPct/yPct values don't shift.
//     bold/italic : hard override, rarely used (pos.bold/pos.italic above is
//                   the normal per-field control) — options wins if given.
//     fontFamily  : override for pos.fontFamily (used for ID which always
//                   uses Helvetica)
//     widthFactor : passed to resolveBoxSize (12 for Name/custom, 10 for ID)
//
// Returns: { fittedSize, boxWidthPct, boxHeightPct } so callers can use the
//          resolved box dimensions (e.g. CertPositionEditor needs them for
//          the Rnd box size).
// ────────────────────────────────────────────────────────────────────────────
export async function drawTextField(ctx, text, pos, naturalWidth, naturalHeight, options = {}) {
  const {
    centered = true,
    bold: boldOverride,
    italic: italicOverride,
    fontFamily: fontFamilyOverride,
    widthFactor = 12,
  } = options

  const fontFamily = fontFamilyOverride || pos.fontFamily || 'Helvetica, Arial, sans-serif'
  const fontEntries = await getAllCertFontEntries()
  const entry = fontEntries.find(f => f.css === fontFamily) || fontEntries[0]
  const bold = boldOverride ?? pos.bold ?? entry.bold
  const italic = italicOverride ?? pos.italic ?? false

  await ensureFontLoaded(fontFamily, pos.fontSize, bold, italic)
  const boxSize = resolveBoxSize(pos, naturalWidth, naturalHeight, widthFactor, text, ctx, fontFamily, bold, italic)
  const maxW = boxWidthPx(boxSize.widthPct, naturalWidth)
  const maxH = boxHeightPx(boxSize.heightPct, naturalHeight)

  const fittedSize = fitFontSize({
    text,
    fontFamily,
    bold,
    italic,
    startSize: pos.fontSize,
    maxWidthPx: maxW,
    maxHeightPx: maxH,
    ctx,
  })

  // These must match EXACTLY between preview and generation — that's the
  // whole point of this shared function.
  ctx.textBaseline = 'middle'
  ctx.fillStyle = pos.color || '#1a1a1a'
  ctx.font = `${italic ? 'italic ' : ''}${bold ? 'bold ' : ''}${fittedSize}px ${fontFamily}`

  // The box's own anchor point (`centered`) says where xPct sits relative to
  // the box — its center, or its left edge. From that we get the box's own
  // left/right edges, and THEN `align` picks where inside those edges the
  // text actually lands. Two independent decisions, as designed.
  const anchorX = (pos.xPct / 100) * naturalWidth
  const boxLeftX = centered ? anchorX - maxW / 2 : anchorX
  const boxRightX = boxLeftX + maxW
  const align = pos.align || (centered ? 'center' : 'left')

  if (align === 'left') {
    ctx.textAlign = 'left'
    ctx.fillText(text, boxLeftX, (pos.yPct / 100) * naturalHeight)
  } else if (align === 'right') {
    ctx.textAlign = 'right'
    ctx.fillText(text, boxRightX, (pos.yPct / 100) * naturalHeight)
  } else {
    ctx.textAlign = 'center'
    ctx.fillText(text, (boxLeftX + boxRightX) / 2, (pos.yPct / 100) * naturalHeight)
  }

  return {
    fittedSize,
    boxWidthPct: boxSize.widthPct,
    boxHeightPct: boxSize.heightPct,
  }
}
