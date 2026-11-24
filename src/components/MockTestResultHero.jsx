import { useEffect, useState } from 'react'
import { ClipboardCheck, Trophy, CheckCircle2, XCircle, MinusCircle, Clock, Download, ListChecks } from 'lucide-react'
import { formatMockTestDuration, shortMockTestResultId } from '../lib/mockTestFormat'

const R = 70
const CIRCUMFERENCE = 2 * Math.PI * R

// The "result issued" hero card — shared by the on-screen result phase in
// MockTestPage.jsx (animate=true, with action buttons) and the hidden
// print layout used for the PDF export (animate=false, buttons omitted via
// no onDownloadPdf/onViewReview props — html2canvas just captures whatever
// is in the DOM, so there's nothing to click there anyway).
export default function MockTestResultHero({ result, animate = true, onDownloadPdf, onViewReview }) {
  const target = Number(result.percent) || 0
  const [pct, setPct] = useState(animate ? 0 : target)

  useEffect(() => {
    if (!animate) return
    const t = setTimeout(() => setPct(target), 80)
    return () => clearTimeout(t)
  }, [animate, target])

  const color = result.eligible ? '#64ac37' : '#d97706'
  const offset = CIRCUMFERENCE - (pct / 100) * CIRCUMFERENCE

  const stats = [
    { icon: Trophy, label: 'Marks Obtained', value: `${result.correctCount}/${result.totalQuestions}`, color: '#1655c3' },
    { icon: CheckCircle2, label: 'Correct', value: result.correctCount, color: '#16a34a' },
    { icon: XCircle, label: 'Incorrect', value: result.incorrectCount, color: '#dc2626' },
    { icon: MinusCircle, label: 'Unanswered', value: result.unansweredCount, color: '#9ca3af' },
    { icon: Clock, label: 'Time Taken', value: formatMockTestDuration(result.startedAt, result.finishedAt), color: '#7c3aed' },
  ]

  return (
    <div className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.08)] overflow-hidden">
      <div className="px-6 sm:px-10 pt-8 pb-6 text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <span className="h-px w-10 sm:w-16" style={{ background: 'linear-gradient(90deg, transparent, #64ac37)' }} />
          <div className="w-14 h-14 rounded-full flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #1655c3, #64ac37)' }}>
            <ClipboardCheck size={24} className="text-white" />
          </div>
          <span className="h-px w-10 sm:w-16" style={{ background: 'linear-gradient(90deg, #64ac37, transparent)' }} />
        </div>
        <h1 className="font-black text-xl sm:text-2xl text-[#1a1a1a]">Mock Test Completed!</h1>
        <p className="text-gray-500 text-sm mt-1">Here is your result for <span className="font-semibold text-[#1a1a1a]">{result.testTitle}</span></p>
      </div>

      <div className="px-6 sm:px-10 pb-6 flex flex-col sm:flex-row items-center gap-8">
        <div className="relative shrink-0" style={{ width: 160, height: 160 }}>
          <svg width="160" height="160" viewBox="0 0 160 160">
            <circle cx="80" cy="80" r={R} fill="none" stroke="#eef2f7" strokeWidth="12" />
            <circle cx="80" cy="80" r={R} fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE} strokeDashoffset={offset}
              style={{ transition: animate ? 'stroke-dashoffset 1s ease-out' : 'none' }}
              transform="rotate(-90 80 80)" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-black" style={{ color }}>{result.percent}%</span>
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Your Score</span>
          </div>
        </div>

        <div className="hidden sm:block w-px self-stretch bg-gray-100" />

        <div className="grid grid-cols-2 sm:grid-cols-1 gap-3 w-full flex-1">
          {stats.map(s => (
            <div key={s.label} className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${s.color}1A` }}>
                <s.icon size={15} style={{ color: s.color }} />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-sm text-[#1a1a1a] leading-tight">{s.value}</div>
                <div className="text-[11px] text-gray-400 font-semibold leading-tight">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-6 sm:px-10 pb-5">
        <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-gray-500 border-t border-gray-100 pt-4">
          <span><span className="font-semibold text-gray-400">Name:</span> {result.studentName}</span>
          <span><span className="font-semibold text-gray-400">Registration ID:</span> {result.enrollmentId}</span>
          {result.courseTitle && <span><span className="font-semibold text-gray-400">Course:</span> {result.courseTitle}</span>}
          <span><span className="font-semibold text-gray-400">Date Issued:</span> {result.finishedAt ? new Date(result.finishedAt).toLocaleDateString() : '—'}</span>
          <span><span className="font-semibold text-gray-400">Result ID:</span> {shortMockTestResultId(result.attemptId)}</span>
        </div>
      </div>

      <div className="px-6 sm:px-10 pb-6">
        {result.eligible ? (
          <div className="rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-semibold px-4 py-3 text-center">
            🎉 Congratulations! You are eligible for the certificate (pass mark {result.passPercent}%).
          </div>
        ) : (
          <div className="rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm font-semibold px-4 py-3 text-center">
            Not eligible yet — required {result.passPercent}%. Review your answers below.
          </div>
        )}
      </div>

      {(onDownloadPdf || onViewReview) && (
        <div className="px-6 sm:px-10 pb-6 flex flex-wrap gap-3">
          {onDownloadPdf && (
            <button onClick={onDownloadPdf} className="flex-1 min-w-[180px] flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #1655c3, #64ac37)' }}>
              <Download size={15} /> Download Result (PDF)
            </button>
          )}
          {onViewReview && (
            <button onClick={onViewReview} className="flex-1 min-w-[180px] flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-[#1655c3] border border-[#1655c3]">
              <ListChecks size={15} /> View Detailed Review
            </button>
          )}
        </div>
      )}

      <div className="py-3 text-center text-[11px] font-bold tracking-widest uppercase text-white" style={{ background: 'linear-gradient(135deg, #1655c3, #64ac37)' }}>
        Learn &bull; Practice &bull; Excel
      </div>
    </div>
  )
}
