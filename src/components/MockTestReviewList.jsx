import { useState } from 'react'
import { CheckCircle2, XCircle, MinusCircle } from 'lucide-react'

// Shared full-question review — used by the student result screen
// (MockTestPage.jsx, fed from result.php's server-computed `review`) and the
// admin Results detail view (MockTestResults.jsx, fed from
// buildMockTestReview() computed locally from the admin's own full doc
// access). Same `review` item shape either way — see mockTestReview.js.
// `printMode` forces the full, unfiltered list (no tab UI) and is used by
// MockTestResultPrintLayout.jsx for the PDF export — html2canvas captures
// real DOM, so these same lucide SVG icons render crisply in the PDF
// instead of the Unicode glyphs the old jsPDF-text export struggled with.
export default function MockTestReviewList({ review, printMode = false }) {
  const [filter, setFilter] = useState('all') // all | incorrect | correct
  const effectiveFilter = printMode ? 'all' : filter

  const filtered = review.filter(r => {
    if (effectiveFilter === 'incorrect') return !r.correct
    if (effectiveFilter === 'correct') return r.correct
    return true
  })

  return (
    <div className="space-y-4">
      {!printMode && (
        <div className="flex gap-2">
          {[['all', 'All'], ['incorrect', 'Incorrect'], ['correct', 'Correct']].map(([key, label]) => (
            <button key={key} onClick={() => setFilter(key)}
              className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${filter === key ? 'bg-[#1655c3] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
              {label}
            </button>
          ))}
        </div>
      )}
      <div className="space-y-3">
        {filtered.map(r => {
          const Icon = r.unanswered ? MinusCircle : r.correct ? CheckCircle2 : XCircle
          const color = r.unanswered ? 'text-gray-400' : r.correct ? 'text-green-500' : 'text-red-500'
          const chip = r.unanswered ? 'Unanswered' : r.correct ? 'Correct' : 'Incorrect'
          const chipCls = r.unanswered ? 'bg-gray-100 text-gray-500' : r.correct ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'
          return (
            <div key={r.position} className="q-card rounded-xl border border-gray-100 p-4 space-y-1.5">
              <div className="flex items-start gap-2">
                <Icon size={18} className={`${color} shrink-0 mt-0.5`} />
                <p className="font-semibold text-[#1a1a1a] text-sm leading-snug flex-1">{r.position + 1}. {r.questionText}</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${chipCls}`}>{chip}</span>
              </div>
              <div className="pl-7 text-sm space-y-1">
                <p className="text-gray-600">
                  <span className="font-bold text-gray-400">Your answer: </span>
                  {r.selectedIndex != null ? r.options[r.selectedIndex] : <span className="italic text-gray-400">Not answered</span>}
                </p>
                {!r.correct && (
                  <p className="text-green-600">
                    <span className="font-bold text-gray-400">Correct answer: </span>{r.options[r.correctIndex]}
                  </p>
                )}
                {r.explanation && (
                  <div className="mt-2 bg-gray-50 rounded-lg p-3 text-xs text-gray-600 whitespace-pre-line">{r.explanation}</div>
                )}
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && <p className="text-sm text-gray-400 text-center py-6">No questions in this filter.</p>}
      </div>
    </div>
  )
}
