import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { settingsService } from '../firebase/services'
import Navbar from '../components/Navbar'
import Footer from '../sections/Footer'
import SEO from '../components/SEO'
import FormattedText from '../components/FormattedText'

// Same settings-driven pattern as PrivacyPolicyPage/TermsOfServicePage/etc —
// editable at AdminContent -> Legal Pages (editorialPolicyContent). This
// placeholder (## headings so FormattedText renders them, not the actual
// policy) shows until the team replaces it there.
const PLACEHOLDER = `## Our Mission
[Describe, in 2-3 sentences, why MEDWEB-PK publishes educational medical content and who it's written for.]

## How We Create Content
[Describe who writes articles — in-house team, invited contributors, students — and the general process from draft to publish.]

## Medical Review Process
[Describe when and how an article is medically reviewed, who is qualified to review, and what "Medically reviewed by" on an article means in practice.]

## Sources & Accuracy
[Describe the kinds of sources used — e.g. peer-reviewed journals, clinical guidelines, textbooks — and how outdated or inaccurate content is corrected.]

## Corrections
[Describe how a reader can report an error, and how corrections are handled/disclosed once published.]

## Advertising & Sponsorship
[State whether articles are ever sponsored/paid, and how that's disclosed if so — or state plainly that none currently are.]`

export default function EditorialPolicyPage() {
  const navigate = useNavigate()
  const [content, setContent] = useState(PLACEHOLDER)

  useEffect(() => {
    window.scrollTo(0, 0)
    settingsService.get().then(s => {
      if (s?.editorialPolicyContent) setContent(s.editorialPolicyContent)
    }).catch(() => {})
  }, [])

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
        <motion.div className="bg-white rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.06)] overflow-hidden"
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
          <div className="p-6 sm:p-10">
            <FormattedText text={content} />
            <p className="mt-8 pt-4 border-t border-gray-100 text-sm text-gray-500">
              Questions about this policy or a specific article can be sent via our <a href="/contact" className="text-[#1655c3] font-semibold hover:underline">Contact page</a>.
            </p>
          </div>
        </motion.div>
      </div>

      <Footer />
    </div>
  )
}
