import medwebLogo from '../assets/medweb-logo.png'
import MockTestResultHero from './MockTestResultHero'
import MockTestReviewList from './MockTestReviewList'
import MockTestCtaBox from './MockTestCtaBox'

// Hidden, off-screen-rendered layout used ONLY by generateMockTestResultPdf()
// (src/lib/mockTestResultPdf.js) — html2pdf.js screenshots this real DOM
// subtree (html2canvas) rather than drawing text with jsPDF's limited font
// tables, which is what broke on Unicode characters before. Never rendered
// visibly; width is fixed so html2canvas's capture is deterministic
// regardless of viewport.
export default function MockTestResultPrintLayout({ result }) {
  return (
    <div style={{ width: 700, fontFamily: "'Poppins', sans-serif", background: '#f7f9fc', padding: 24 }}>
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
        <img src={medwebLogo} alt="MEDWEB-PK" style={{ height: 36 }} />
        <span className="text-xs font-bold text-gray-400">AS Global Healthcare Academy</span>
      </div>
      <h2 className="text-center font-bold text-xs text-gray-400 uppercase tracking-widest mb-4">Official Mock Test Result</h2>

      <MockTestResultHero result={result} animate={false} />

      <div style={{ marginTop: 24 }}>
        <h3 className="font-bold text-base mb-3 text-[#1a1a1a]">Question Review</h3>
        <MockTestReviewList review={result.review || []} printMode />
      </div>

      <div style={{ marginTop: 20 }}>
        <MockTestCtaBox />
      </div>
    </div>
  )
}
