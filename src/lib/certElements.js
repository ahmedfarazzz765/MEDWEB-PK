// Shared "decorative element" drawing — rectangles, circles, lines, and a
// couple of curated icon-ish shapes (star, ribbon) an admin can drop onto a
// certificate template (e.g. a divider line, a small seal). Deliberately
// small: this is not an illustration library, just enough for minor
// decorative touches. Drawn via the SAME drawElement() function from both
// CertPositionEditor.jsx's live-preview canvas and certificateGenerator.js's
// real composite canvas, for the same WYSIWYG reason drawTextField() exists —
// one function, so the two can never disagree.
//
// An element is { id, type, xPct, yPct, widthPct, heightPct, color,
// rotation? }, positioned/sized exactly like a text field's box — xPct/yPct
// is its CENTER point (draggable/resizable via the same Rnd pattern).

export const ELEMENT_TYPES = [
  { type: 'rectangle', label: 'Rectangle' },
  { type: 'circle', label: 'Circle' },
  { type: 'line', label: 'Line' },
  { type: 'star', label: 'Star' },
  { type: 'ribbon', label: 'Ribbon Seal' },
]

export function defaultElement(type) {
  return {
    id: crypto.randomUUID(),
    type,
    xPct: 50,
    yPct: 50,
    widthPct: type === 'line' ? 30 : 12,
    heightPct: type === 'line' ? 1.2 : 12,
    color: '#1655c3',
  }
}

function drawStar(ctx, cx, cy, outerR, innerR, points = 5) {
  ctx.beginPath()
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR
    const angle = (Math.PI / points) * i - Math.PI / 2
    const x = cx + r * Math.cos(angle)
    const y = cy + r * Math.sin(angle)
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
}

function drawRibbon(ctx, cx, cy, w, h, color) {
  const r = Math.min(w, h) / 2
  // Seal circle
  ctx.beginPath()
  ctx.arc(cx, cy - h * 0.12, r * 0.8, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()
  // Two ribbon tails below the seal
  ctx.beginPath()
  ctx.moveTo(cx - r * 0.5, cy + h * 0.1)
  ctx.lineTo(cx - r * 0.9, cy + h * 0.5)
  ctx.lineTo(cx - r * 0.15, cy + h * 0.32)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(cx + r * 0.5, cy + h * 0.1)
  ctx.lineTo(cx + r * 0.9, cy + h * 0.5)
  ctx.lineTo(cx + r * 0.15, cy + h * 0.32)
  ctx.closePath()
  ctx.fill()
}

// Draws one element onto ctx at the template's full natural resolution — the
// same convention drawTextField() uses, so preview and generation match.
export function drawElement(ctx, el, naturalWidth, naturalHeight) {
  const cx = (el.xPct / 100) * naturalWidth
  const cy = (el.yPct / 100) * naturalHeight
  const w = ((el.widthPct ?? 12) / 100) * naturalWidth
  const h = ((el.heightPct ?? 12) / 100) * naturalHeight
  const color = el.color || '#1655c3'

  ctx.save()
  ctx.fillStyle = color
  ctx.strokeStyle = color

  switch (el.type) {
    case 'rectangle':
      ctx.lineWidth = Math.max(2, Math.min(w, h) * 0.04)
      ctx.strokeRect(cx - w / 2, cy - h / 2, w, h)
      break
    case 'circle':
      ctx.lineWidth = Math.max(2, Math.min(w, h) * 0.04)
      ctx.beginPath()
      ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2)
      ctx.stroke()
      break
    case 'line':
      ctx.lineWidth = Math.max(2, h)
      ctx.beginPath()
      ctx.moveTo(cx - w / 2, cy)
      ctx.lineTo(cx + w / 2, cy)
      ctx.stroke()
      break
    case 'star':
      drawStar(ctx, cx, cy, Math.min(w, h) / 2, Math.min(w, h) / 4.5)
      ctx.fill()
      break
    case 'ribbon':
      drawRibbon(ctx, cx, cy, w, h, color)
      break
    default:
      break
  }

  ctx.restore()
}
