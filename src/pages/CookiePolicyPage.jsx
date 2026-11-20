import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { settingsService } from '../firebase/services'
import Navbar from '../components/Navbar'
import Footer from '../sections/Footer'
import SEO from '../components/SEO'
import FormattedText from '../components/FormattedText'

const PLACEHOLDER = 'Add your policy content in the admin panel.'

export default function CookiePolicyPage() {
  const navigate = useNavigate()
  const [content, setContent] = useState(PLACEHOLDER)

  useEffect(() => {
    window.scrollTo(0, 0)
    settingsService.get().then(s => {
      if (s?.cookiePolicyContent) setContent(s.cookiePolicyContent)
    }).catch(() => {})
  }, [])

  return (
    <div className="font-poppins bg-[#f7f9fc] min-h-screen">
      <SEO title="Cookie Policy" description="MEDWEB-PK's cookie policy." path="/cookie-policy" />
      <Navbar />
      <div className="px-4 pt-10 pb-20 sm:pt-14 sm:pb-28" style={{ background: 'linear-gradient(135deg, #1655c3, #64ac37)' }}>
        <div className="max-w-4xl mx-auto">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-white/80 hover:text-white mb-6 transition-colors">
            <ArrowLeft size={16} /> Back
          </button>
          <span className="inline-block text-[11px] font-bold text-white bg-white/20 px-3 py-1 rounded-full mb-4">LEGAL</span>
          <h1 className="text-white font-black text-3xl sm:text-4xl lg:text-5xl leading-tight">Cookie Policy</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-12 sm:-mt-16 pb-16">
        <motion.div className="bg-white rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.06)] overflow-hidden"
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
          <div className="p-6 sm:p-10">
            <FormattedText text={content} />
          </div>
        </motion.div>
      </div>
      <Footer />
    </div>
  )
}
