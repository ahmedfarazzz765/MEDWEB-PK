// Shared "shrink text to fit its box" logic — used by both the live admin
// preview (CertPositionEditor.jsx, so what the admin sees while positioning/
// typing matches reality) and the real canvas compositing step
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
// shrinks into illegibility. Returns the configured size unchanged
// whenever it already fits — this only ever shrinks, never grows.
export function fitFontSize({ text, fontFamily, bold, startSize, maxWidthPx, minSize = 16, ctx }) {
  const context = ctx || getMeasureCtx()
  const floor = Math.min(minSize, startSize)
  let size = startSize
  while (size > floor) {
    context.font = `${bold ? 'bold ' : ''}${size}px ${fontFamily}`
    if (context.measureText(text).width <= maxWidthPx) return size
    size -= 2
  }
  return floor
}

// The name box has no admin-configured width (it's just a center point),
// so the "available width" is derived from its position instead: since text
// is centered on xPct, the box can grow symmetrically until it hits
// whichever edge of the image is nearer, minus a small margin.
export function maxNameWidthPx(xPct, totalWidthPx, marginPct = 5) {
  return Math.max(50, (2 * Math.min(xPct, 100 - xPct) - marginPct) / 100 * totalWidthPx)
}
