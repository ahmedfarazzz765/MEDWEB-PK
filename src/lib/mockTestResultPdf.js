// "Download Result (PDF)" — a plain text/vector PDF built directly with
// jsPDF (not a html2canvas screenshot: a 100-question review needs real
// page breaks, and a canvas screenshot of that much scrolled content would
// be either illegibly small or enormous). Same data shape the result screen
// already renders (see result.php's response / mockTestReview.js).
import jsPDF from 'jspdf'

const PAGE_W = 595.28 // A4, pt
const PAGE_H = 841.89
const MARGIN = 42
const CONTENT_W = PAGE_W - MARGIN * 2

function wrap(doc, text, maxWidth) {
  return doc.splitTextToSize(String(text ?? ''), maxWidth)
}

export function generateMockTestResultPdf(result) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  let y = 0

  function newPage() {
    doc.addPage()
    y = MARGIN
  }
  function ensureSpace(h) {
    if (y + h > PAGE_H - MARGIN) newPage()
  }

  // ── Branded header ───────────────────────────────────────────────────
  doc.setFillColor(22, 85, 195) // #1655c3
  doc.rect(0, 0, PAGE_W, 64, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('MEDWEB-PK', MARGIN, 32)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text("Pakistan's Medical Education Platform — Mock Test Result", MARGIN, 48)
  doc.setTextColor(0, 0, 0)
  y = 90

  // ── Summary ──────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(String(result.testTitle || 'Mock Test'), MARGIN, y)
  y += 20
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  const infoLines = [
    `Name: ${result.studentName || ''}`,
    `Registration ID: ${result.enrollmentId || ''}`,
    result.courseTitle ? `Course: ${result.courseTitle}` : null,
  ].filter(Boolean)
  for (const line of infoLines) { doc.text(line, MARGIN, y); y += 14 }
  y += 6

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text(`Score: ${result.correctCount}/${result.totalQuestions} (${result.percent}%)`, MARGIN, y)
  y += 18
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`Correct: ${result.correctCount}   Incorrect: ${result.incorrectCount}   Unanswered: ${result.unansweredCount}`, MARGIN, y)
  y += 16

  doc.setFont('helvetica', 'bold')
  if (result.eligible) {
    doc.setTextColor(22, 163, 74)
    doc.text(`ELIGIBLE for certificate (pass mark: ${result.passPercent}%)`, MARGIN, y)
  } else {
    doc.setTextColor(220, 38, 38)
    doc.text(`NOT ELIGIBLE for certificate (pass mark: ${result.passPercent}%)`, MARGIN, y)
  }
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'normal')
  y += 26

  // ── Full question review ────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text('Question Review', MARGIN, y)
  y += 18
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)

  const review = result.review || []
  for (const r of review) {
    const qLines = wrap(doc, `${r.position + 1}. ${r.questionText}`, CONTENT_W)
    const yourAnswer = r.selectedIndex != null ? (r.options?.[r.selectedIndex] ?? '') : 'Not answered'
    const yourLines = wrap(doc, `Your answer: ${yourAnswer}`, CONTENT_W - 10)
    const correctLines = !r.correct ? wrap(doc, `Correct answer: ${r.options?.[r.correctIndex] ?? ''}`, CONTENT_W - 10) : []
    const explanationLines = r.explanation ? wrap(doc, r.explanation, CONTENT_W - 10) : []

    const blockHeight = (qLines.length * 13) + (yourLines.length * 12) + (correctLines.length * 12) + (explanationLines.length * 11) + 20
    ensureSpace(Math.min(blockHeight, PAGE_H - MARGIN * 2))

    doc.setFont('helvetica', 'bold')
    for (const line of qLines) { ensureSpace(13); doc.text(line, MARGIN, y); y += 13 }
    doc.setFont('helvetica', 'normal')

    doc.setTextColor(r.unanswered ? 120 : (r.correct ? 22 : 220), r.unanswered ? 120 : (r.correct ? 163 : 38), r.unanswered ? 120 : (r.correct ? 74 : 38))
    for (const line of yourLines) { ensureSpace(12); doc.text(line, MARGIN + 10, y); y += 12 }
    doc.setTextColor(22, 163, 74)
    for (const line of correctLines) { ensureSpace(12); doc.text(line, MARGIN + 10, y); y += 12 }
    doc.setTextColor(100, 100, 100)
    doc.setFontSize(9)
    for (const line of explanationLines) { ensureSpace(11); doc.text(line, MARGIN + 10, y); y += 11 }
    doc.setFontSize(10)
    doc.setTextColor(0, 0, 0)
    y += 10
  }

  // ── CTA box ──────────────────────────────────────────────────────────
  ensureSpace(90)
  doc.setFillColor(22, 85, 195)
  doc.roundedRect(MARGIN, y, CONTENT_W, 78, 6, 6, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Want in-depth AMR clinical case studies?', PAGE_W / 2, y + 20, { align: 'center' })
  doc.setFontSize(10)
  doc.text('Join our ONE-WEEK course on Antimicrobial Resistance with clinical case studies.', PAGE_W / 2, y + 36, { align: 'center' })
  doc.setFontSize(9)
  doc.textWithLink('Call / WhatsApp: 0329 169 2899', PAGE_W / 2 - 150, y + 58, { url: 'https://wa.me/923291692899', align: 'left' })
  doc.textWithLink('Email: medwebpk@gmail.com', PAGE_W / 2 + 20, y + 58, { url: 'mailto:medwebpk@gmail.com', align: 'left' })
  doc.setTextColor(0, 0, 0)

  // ── Page numbers ─────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages()
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text(`Page ${p} of ${pageCount}`, PAGE_W - MARGIN, PAGE_H - 18, { align: 'right' })
  }

  doc.save(`MEDWEB-${(result.testTitle || 'MockTest').replace(/[^a-z0-9]+/gi, '-')}-Result.pdf`)
}
