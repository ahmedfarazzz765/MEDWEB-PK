// Shared "shrink text to fit its box" logic — used by both the live admin
// preview (CertPositionEditor.jsx, so what the admin sees while positioning/
// resizing/typing matches reality) and the real canvas compositing step
// (certificateGenerator.js, so every generated certificate — automatic
// webinar flow and manual/bulk flow alike — gets the same treatment). Kept
// in one place so the two can never drift apart.

let measureCanvasCtx
function getMeasureCtx() {
  if (!measureCanvasCtx) measureCanvasCtx = document.createElement('canvas').getContext('2d')
  return measureCanvasCtx
}

// Steps `startSize` down by 2px at a time until `text` fits within
// `maxWidthPx` at the given font, stopping at `minSize` so it never
// shrinks into illegibility. `maxHeightPx`, when given (a box the admin has
// explicitly resized), first clamps the starting size so an admin-set
// fontSize taller than a short box doesn't spill over vertically either —
// text is never actually clipped, just fit to both dimensions of its box.
// Returns the configured size unchanged whenever it already fits — this
// only ever shrinks, never grows past the admin's configured size.
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

// Legacy fallback for a box with no admin-configured width (just a center
// point): since text is centered on xPct, the box can grow symmetrically
// until it hits whichever edge of the image is nearer, minus a small margin.
export function maxNameWidthPx(xPct, totalWidthPx, marginPct = 5) {
  return Math.max(50, (2 * Math.min(xPct, 100 - xPct) - marginPct) / 100 * totalWidthPx)
}

// Prefers the box's own explicit widthPct (set by dragging a resize handle)
// over the position-derived fallback above — once an admin has resized a
// box, that becomes the real constraint driving auto-shrink.
export function boxWidthPx(pos, totalWidthPx, marginPct = 5) {
  if (pos.widthPct != null) return (pos.widthPct / 100) * totalWidthPx
  return maxNameWidthPx(pos.xPct, totalWidthPx, marginPct)
}

export function boxHeightPx(pos, totalHeightPx) {
  return pos.heightPct != null ? (pos.heightPct / 100) * totalHeightPx : null
}
