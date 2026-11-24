// "Download Result (PDF)" — renders the real MockTestResultPrintLayout DOM
// off-screen (same technique as src/lib/certificateDownload.js's
// rasterizeTemplate) and screenshots it with html2pdf.js (html2canvas +
// jsPDF under the hood). A PREVIOUS version built the PDF with jsPDF's text
// API directly — that broke on Unicode (✗, –, ’, °, ≥ rendered as junk) and
// mis-wrapped/overlapped text because jsPDF's built-in fonts don't cover
// those glyphs. Screenshotting real DOM sidesteps that entirely: whatever
// renders correctly on screen renders correctly in the PDF.
import html2pdf from 'html2pdf.js'
import { createRoot } from 'react-dom/client'
import { createElement } from 'react'
import MockTestResultPrintLayout from '../components/MockTestResultPrintLayout'

function waitForImages(container) {
  const imgs = Array.from(container.querySelectorAll('img'))
  return Promise.all(imgs.map(img => (img.complete ? Promise.resolve() : new Promise(res => { img.onload = res; img.onerror = res }))))
}

function sanitize(s) {
  return String(s || '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'MockTest'
}

export async function generateMockTestResultPdf(result) {
  const holder = document.createElement('div')
  Object.assign(holder.style, { position: 'fixed', left: '-99999px', top: '0', zIndex: '-1' })
  document.body.appendChild(holder)
  const root = createRoot(holder)

  try {
    await new Promise(resolve => {
      root.render(createElement(MockTestResultPrintLayout, { result }))
      // Two rAFs so layout/paint has actually happened before we touch it.
      requestAnimationFrame(() => requestAnimationFrame(resolve))
    })
    await waitForImages(holder)
    if (document.fonts?.ready) await document.fonts.ready

    const filename = `MEDWEB_${sanitize(result.enrollmentId)}_${sanitize(result.testTitle)}_Result.pdf`

    await html2pdf()
      .set({
        margin: 10,
        filename,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'], avoid: '.q-card' },
      })
      .from(holder)
      .toPdf()
      .get('pdf')
      .then(pdf => {
        const pageCount = pdf.internal.getNumberOfPages()
        const w = pdf.internal.pageSize.getWidth()
        const h = pdf.internal.pageSize.getHeight()
        for (let p = 1; p <= pageCount; p++) {
          pdf.setPage(p)
          pdf.setFont('helvetica', 'normal')
          pdf.setFontSize(8)
          pdf.setTextColor(150, 150, 150)
          pdf.text(`MEDWEB-PK · Connecting Medical Minds · medwebpk.com · Page ${p} of ${pageCount}`, w / 2, h - 6, { align: 'center' })
        }
      })
      .save()
  } finally {
    root.unmount()
    document.body.removeChild(holder)
  }
}
