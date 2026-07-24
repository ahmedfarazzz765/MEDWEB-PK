// Client-side Ambassador Letter generation — the admin writes the entire
// letter body themselves (AmbassadorLetterSettings.jsx), using single
// curly-brace placeholders like {name}/{code}/{university}. This composites
// that text, with every placeholder substituted for the real ambassador's
// data, onto the admin-uploaded letterhead template on an HTML5 canvas, then
// wraps that image into a downloadable PDF via jsPDF. No server needed.

import jsPDF from 'jspdf'

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

// Basic canvas word-wrap: splits `text` into lines that each fit within
// `maxWidth` at the context's currently-set font.
function wrapText(ctx, text, maxWidth) {
  const words = text.split(/\s+/)
  const lines = []
  let line = ''
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines
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

  // Body paragraph — centered, word-wrapped to its configured width
  const bodyText = fillTokens(letterCfg.bodyText, ambassador)
  ctx.fillStyle = body.color
  ctx.font = `${body.fontSize}px Helvetica, Arial, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  const boxWidth = (body.widthPct / 100) * canvas.width
  const boxX = (body.xPct / 100) * canvas.width
  const startY = (body.yPct / 100) * canvas.height
  const lineHeight = body.fontSize * 1.5
  const lines = wrapText(ctx, bodyText, boxWidth)
  lines.forEach((line, i) => ctx.fillText(line, boxX, startY + i * lineHeight))

  // Date — single point, left-anchored
  ctx.fillStyle = date.color
  ctx.font = `bold ${date.fontSize}px Helvetica, Arial, sans-serif`
  ctx.textAlign = 'left'
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
