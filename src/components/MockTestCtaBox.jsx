import { Phone, MessageCircle, Mail } from 'lucide-react'

// Bottom CTA shown on every mock-test result screen — same copy as the
// branded result email's CTA block (see mocktest_cta_box_html() in
// public/api/mocktest/_lib/email.php) and the PDF export
// (src/lib/mockTestResultPdf.js) — keep all three in sync by hand.
export default function MockTestCtaBox() {
  return (
    <div className="rounded-2xl p-5 sm:p-6 text-center" style={{ background: 'linear-gradient(135deg, #1655c3, #64ac37)' }}>
      <p className="text-white font-black text-base sm:text-lg leading-snug mb-1">Want in-depth AMR clinical case studies?</p>
      <p className="text-white/95 font-bold text-sm sm:text-base leading-snug mb-4">
        Join our ONE-WEEK course on Antimicrobial Resistance with clinical case studies.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2.5 text-xs sm:text-sm font-bold">
        <a href="tel:+923291692899" className="inline-flex items-center gap-1.5 bg-white/20 text-white px-3.5 py-2 rounded-xl hover:bg-white/30 transition-colors">
          <Phone size={14} /> Call
        </a>
        <a href="https://wa.me/923291692899" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 bg-white/20 text-white px-3.5 py-2 rounded-xl hover:bg-white/30 transition-colors">
          <MessageCircle size={14} /> WhatsApp: 0329 169 2899
        </a>
        <a href="mailto:medwebpk@gmail.com" className="inline-flex items-center gap-1.5 bg-white/20 text-white px-3.5 py-2 rounded-xl hover:bg-white/30 transition-colors">
          <Mail size={14} /> medwebpk@gmail.com
        </a>
      </div>
    </div>
  )
}
