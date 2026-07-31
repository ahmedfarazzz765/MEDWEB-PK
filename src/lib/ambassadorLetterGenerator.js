// Client-side Ambassador Letter generation — the admin writes the entire
// letter body themselves (AmbassadorLetterSettings.jsx) in a Tiptap rich-text
// editor, using single curly-brace placeholders like {name}/{code}/{university}.
// This composites that HTML — every placeholder substituted for the real
// ambassador's data, with bold/highlight/italic/lists/alignment/line-spacing
// intact — onto the admin-uploaded letterhead template on an HTML5 canvas,
// then wraps that image into a downloadable PDF via jsPDF. No server needed.

import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load the letterhead template image'))
    img.src = url
  })
}

// Every placeholder available to the admin's letter template — keep this in
// sync with LETTER_PLACEHOLDERS in AmbassadorLetterSettings.jsx, which lists
// this same set for the admin to see while writing.
function fillTokens(text, ambassador) {
  const values = {
    name: ambassador.name || '',
    code: ambassador.ambCode || '',
    university: ambassador.university || '',
    role: ambassador.rank || 'Ambassador',
    rank: ambassador.rank || 'Ambassador',
    degreeProgram: ambassador.degreeProgram || '',
    semester: ambassador.semester || '',
    city: ambassador.city || '',
    status: ambassador.status || '',
    points: ambassador.points != null ? String(ambassador.points) : '0',
    date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
  }
  // Matches both the new {name} convention and the old {{name}} one some
  // admins may already have saved from before letters supported a full
  // admin-authored body — without this, {{name}} would only have its inner
  // {name} replaced, leaving stray outer braces like "{Ahmed Raza}" behind.
  return String(text || '').replace(/\{\{?(\w+)\}?\}/g, (match, key) => (key in values ? values[key] : match))
}

// Rasterizes the letter body's rich HTML (bold/highlight/italic/lists/
// alignment/line-spacing all included, via real browser layout+paint rather
// than reimplementing rich-text layout on a 2D canvas context) at exactly
// `widthPx` x `heightPx`, matching the box the admin sized in the live
// preview 1:1. html2canvas needs the node actually laid out in the document,
// so it's rendered off-screen (fixed position, far outside the viewport)
// and removed again once captured.
async function rasterizeBodyHtml(html, { widthPx, heightPx, fontSize, color }) {
  const holder = document.createElement('div')
  holder.className = 'letter-body'
  Object.assign(holder.style, {
    position: 'fixed',
    left: '-99999px',
    top: '0',
    width: `${widthPx}px`,
    height: `${heightPx}px`,
    overflow: 'hidden',
    fontSize: `${fontSize}px`,
    color,
    fontFamily: 'Helvetica, Arial, sans-serif',
    background: 'transparent',
  })
  holder.innerHTML = html
  document.body.appendChild(holder)
  try {
    return await html2canvas(holder, { backgroundColor: null, scale: 1 })
  } finally {
    document.body.removeChild(holder)
  }
}

async function compositeLetterCanvas({ ambassador, letterCfg }) {
  const img = await loadImage(letterCfg.templateUrl)
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0)

  const body = { ...letterCfg.bodyPos }
  const date = { ...letterCfg.datePos }

  // Body — real rich HTML, placeholders substituted by simple regex over the
  // HTML string (safe: {name}/{{name}} tokens only ever appear as literal
  // text content between tags, never inside a tag/attribute), then
  // rasterized and drawn onto the letterhead at the box's exact position/size.
  const bodyHtml = fillTokens(letterCfg.bodyText, ambassador)
  const boxWidth = (body.widthPct / 100) * canvas.width
  const boxHeight = ((body.heightPct ?? 40) / 100) * canvas.height
  const boxX = (body.xPct / 100) * canvas.width
  const boxY = (body.yPct / 100) * canvas.height
  const bodyCanvas = await rasterizeBodyHtml(bodyHtml, {
    widthPx: boxWidth,
    heightPx: boxHeight,
    fontSize: body.fontSize,
    color: body.color,
  })
  ctx.drawImage(bodyCanvas, boxX, boxY, boxWidth, boxHeight)

  // Date — single point, left-anchored, unchanged (never became rich text)
  ctx.fillStyle = date.color
  ctx.font = `bold ${date.fontSize}px Helvetica, Arial, sans-serif`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
  ctx.fillText(today, (date.xPct / 100) * canvas.width, (date.yPct / 100) * canvas.height)

  return canvas
}

export async function downloadAmbassadorLetter(ambassador, letterCfg) {
  if (!letterCfg?.templateUrl) throw new Error('No letterhead template configured yet — ask an admin to upload one.')

  const canvas = await compositeLetterCanvas({ ambassador, letterCfg })
  const dataUrl = canvas.toDataURL('image/png')

  const pdf = new jsPDF({
    orientation: canvas.width >= canvas.height ? 'landscape' : 'portrait',
    unit: 'px',
    format: [canvas.width, canvas.height],
  })
  pdf.addImage(dataUrl, 'PNG', 0, 0, canvas.width, canvas.height)
  pdf.save(`MEDWEB-Ambassador-Letter-${(ambassador.name || 'ambassador').replace(/\s+/g, '-')}.pdf`)
}
