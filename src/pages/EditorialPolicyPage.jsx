import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../sections/Footer'
import SEO from '../components/SEO'

// Placeholder content throughout — written to be replaced/edited by the
// MEDWEB-PK team, not published as-is. Same static-page pattern as
// AboutPage.jsx/ContactPage.jsx (no Firestore-backed content yet; wire up
// an admin-editable settings doc later if this needs to change often).
export default function EditorialPolicyPage() {
  const navigate = useNavigate()

  useEffect(() => { window.scrollTo(0, 0) }, [])

  return (
    <div className="font-poppins bg-[#f7f9fc] min-h-screen">
      <SEO title="Editorial Policy" description="How MEDWEB-PK creates, reviews, and maintains the accuracy of its articles and educational content." path="/editorial-policy" />
      <Navbar />

      <div className="px-4 pt-10 pb-20 sm:pt-14 sm:pb-28" style={{ background: 'linear-gradient(135deg, #1655c3, #64ac37)' }}>
        <div className="max-w-4xl mx-auto">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-white/80 hover:text-white mb-6 transition-colors">
            <ArrowLeft size={16} /> Back
          </button>
          <span className="inline-block text-[11px] font-bold text-white bg-white/20 px-3 py-1 rounded-full mb-4">TRUST & ACCURACY</span>
          <h1 className="text-white font-black text-3xl sm:text-4xl lg:text-5xl leading-tight">Editorial Policy</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-12 sm:-mt-16 pb-16">
        <div className="bg-white rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.06)] p-8 sm:p-12 space-y-8 text-gray-700 leading-relaxed">
          <p className="text-sm text-gray-400 italic">
            [Placeholder — replace every bracketed section below before publishing. This page exists mainly to give search engines and
            readers a clear, linkable statement of how MEDWEB-PK's content is produced and checked.]
          </p>

          <section>
            <h2 className="text-xl font-black text-[#1a1a1a] mb-3">Our Mission</h2>
            <p>[Describe, in 2-3 sentences, why MEDWEB-PK publishes educational medical content and who it's written for.]</p>
          </section>

          <section>
            <h2 className="text-xl font-black text-[#1a1a1a] mb-3">How We Create Content</h2>
            <p>[Describe who writes articles — in-house team, invited contributors, students — and the general process from draft to publish.]</p>
          </section>

          <section>
            <h2 className="text-xl font-black text-[#1a1a1a] mb-3">Medical Review Process</h2>
            <p>[Describe when and how an article is medically reviewed, who is qualified to review, and what "Medically reviewed by" on an article means in practice.]</p>
          </section>

          <section>
            <h2 className="text-xl font-black text-[#1a1a1a] mb-3">Sources & Accuracy</h2>
            <p>[Describe the kinds of sources used — e.g. peer-reviewed journals, clinical guidelines, textbooks — and how outdated or inaccurate content is corrected.]</p>
          </section>

          <section>
            <h2 className="text-xl font-black text-[#1a1a1a] mb-3">Corrections</h2>
            <p>[Describe how a reader can report an error, and how corrections are handled/disclosed once published.]</p>
          </section>

          <section>
            <h2 className="text-xl font-black text-[#1a1a1a] mb-3">Advertising & Sponsorship</h2>
            <p>[State whether articles are ever sponsored/paid, and how that's disclosed if so — or state plainly that none currently are.]</p>
          </section>

          <section>
            <h2 className="text-xl font-black text-[#1a1a1a] mb-3">Contact</h2>
            <p>Questions about this policy or a specific article can be sent via our <a href="/contact" className="text-[#1655c3] font-semibold hover:underline">Contact page</a>.</p>
          </section>
        </div>
      </div>

      <Footer />
    </div>
  )
}
