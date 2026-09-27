// Shared certificate download logic — PDF/JPG/PNG — reused by both
// PortfolioPage.jsx's certificate cards and CertificatePage.jsx's detail
// view, rather than re-implementing image export in each place.
//
// Same approach already established for Ambassador Letters
// (src/lib/ambassadorLetterGenerator.js): rasterize onto a canvas, then
// either force-download the image directly or wrap it in a PDF via jsPDF.
// For a certificate that has a real composited image (certificateImageUrl —
// true for every certificate issued since the template rebuild), that
// image IS the canvas source. For the rare older record that only has live
// CertificateTemplate design data, this renders that same component
// off-screen (same html2canvas technique ambassadorLetterGenerator.js uses
// for the letter body) purely to capture it — never a second reimplementation
// of the certificate's visual design.
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { createRoot } from 'react-dom/client'
import { createElement } from 'react'
import CertificateTemplate from '../components/CertificateTemplate'

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous' // Cloudinary serves public CORS headers
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load the certificate image'))
    img.src = url
  })
}

// Renders the real <CertificateTemplate> off-screen (fixed position, far
// outside the viewport, at its true 1000x707 size regardless of how small
// any on-screen preview is scaled to) just long enough to capture it.
async function rasterizeTemplate(cert) {
  const holder = document.createElement('div')
  Object.assign(holder.style, { position: 'fixed', left: '-99999px', top: '0', width: '1000px', height: '707px' })
  document.body.appendChild(holder)
  const root = createRoot(holder)
  try {
    await new Promise(resolve => {
      root.render(createElement(CertificateTemplate, cert))
      // Two rAFs so the browser has actually painted before capture.
      requestAnimationFrame(() => requestAnimationFrame(resolve))
    })
    return await html2canvas(holder, { backgroundColor: '#ffffff', scale: 2, width: 1000, height: 707 })
  } finally {
    root.unmount()
    document.body.removeChild(holder)
  }
}

async function getCertificateCanvas(cert) {
  if (cert.certificateImageUrl) {
    const img = await loadImage(cert.certificateImageUrl)
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    canvas.getContext('2d').drawImage(img, 0, 0)
    return canvas
  }
  return rasterizeTemplate(cert)
}

function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const filenameFor = (cert, ext) => `MEDWEB-Certificate-${(cert.certCode || 'certificate')}.${ext}`

// format: 'jpg' | 'png'
export async function downloadCertificateImage(cert, format) {
  const canvas = await getCertificateCanvas(cert)
  const mime = format === 'png' ? 'image/png' : 'image/jpeg'
  const blob = await new Promise(resolve => canvas.toBlob(resolve, mime, 0.92))
  triggerBlobDownload(blob, filenameFor(cert, format === 'png' ? 'png' : 'jpg'))
}

export async function downloadCertificatePdf(cert) {
  const canvas = await getCertificateCanvas(cert)
  const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
  const pdf = new jsPDF({
    orientation: canvas.width >= canvas.height ? 'landscape' : 'portrait',
    unit: 'px',
    format: [canvas.width, canvas.height],
  })
  pdf.addImage(dataUrl, 'JPEG', 0, 0, canvas.width, canvas.height)
  pdf.save(filenameFor(cert, 'pdf'))
}
