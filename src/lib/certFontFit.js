// Shared "shrink text to fit its box" logic — used by both the live admin
// preview (CertPositionEditor.jsx, so what the admin sees while positioning/
// resizing/typing matches reality) and the real canvas compositing step
// (certificateGenerator.js, so every generated certificate — automatic
// webinar flow and manual/bulk flow alike — gets the same treatment). Kept
// in one place so the two can never drift apart.
//
// A prior version had boxWidthPx()/boxHeightPx() each contain their OWN
// fallback formula for "no widthPct/heightPct saved yet" — the editor
// resolved that fallback itself (via a locally-duplicated defaultBoxPct)
// before calling them, while certificateGenerator.js called them directly
// on the raw, unresolved position. Two different formulas for the same
// "not resized yet" case meant the live preview and the actual generated
// image could genuinely disagree on both size AND fit. resolveBoxSize()
// below is now the ONLY place that decision is made, and both call sites
// are required to go through it first — see the docs on each function.

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
export function fitFontSize({ text, fontFamily, bold, startSize, maxWidthPx, maxHeightPx, minSize = 16, ctx }) {
  const context = ctx || getMeasureCtx()
  const heightCapped = maxHeightPx ? Math.min(startSize, Math.floor(maxHeightPx * 0.75)) : startSize
  const floor = Math.min(minSize, heightCapped)
  let size = heightCapped
  while (size > floor) {
    context.font = `${bold ? 'bold ' : ''}${size}px ${fontFamily}`
    if (context.measureText(text).width <= maxWidthPx) return size
    size -= 2
  }
  return floor
}

// A box with no saved widthPct/heightPct yet (every position saved before
// resizable boxes existed) needs SOME size — derived from its own fontSize
// relative to the image, not an arbitrary flat number, so it roughly
// matches the text it already contains.
function defaultBoxSizePct(fontSize, naturalWidth, naturalHeight, widthFactor) {
  return {
    widthPct: naturalWidth ? Math.min(90, (fontSize * widthFactor / naturalWidth) * 100) : 30,
    heightPct: naturalHeight ? Math.max(4, (fontSize * 1.7 / naturalHeight) * 100) : 8,
  }
}

// THE single place "does this box have an explicit size, or do we need a
// fallback" gets decided. Both CertPositionEditor.jsx (live preview) and
// certificateGenerator.js (real generation) call this with the same
// arguments before doing anything else with a position — never boxWidthPx/
// boxHeightPx directly on a raw, unresolved position.
export function resolveBoxSize(pos, naturalWidth, naturalHeight, widthFactor = 12) {
  const fallback = defaultBoxSizePct(pos.fontSize, naturalWidth, naturalHeight, widthFactor)
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
