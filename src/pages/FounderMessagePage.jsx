import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Quote } from 'lucide-react'
import { settingsService } from '../firebase/services'
import Navbar from '../components/Navbar'
import Footer from '../sections/Footer'
import founderFallback from '../assets/founder_pic.png'

const DEFAULT_FULL = `As the founder of MEDWEB-PK, I strongly believe that accessible, evidence-based medical education is the right of every student — not a privilege available to a few. Throughout my academic and professional journey, I observed that thousands of talented medical, pharmacy, and allied health students struggle not because they lack ability, but because they lack proper guidance, structured clinical learning, and opportunities for skill development.

This realization became the driving force behind MEDWEB-PK. I envision a Pakistan where every healthcare student, regardless of their financial background or geographical location, can learn from expert instructors, attend high-quality webinars, and earn verified certifications that truly add value to their professional careers.

Through modern digital learning tools, interactive webinars, advanced clinical masterclasses, and a constantly growing library of educational resources, MEDWEB aims to prepare the next generation of healthcare professionals with the knowledge, confidence, and practical insight needed in real-world patient care.

I am deeply committed to ensuring that every program we offer reflects the highest standards of medical integrity, accuracy, and professionalism. With the support of dedicated instructors, ambassadors, and our rapidly expanding student community, MEDWEB-PK continues to evolve into one of Pakistan's most trusted platforms for medical education.`

export default function FounderMessagePage() {
  const navigate = useNavigate()
  const [d, setD] = useState({
    founderName: 'Dr. Shahroz Abbas',
    founderDesignation: 'Founder & CEO, MEDWEB-PK',
    founderImage: '',
    founderFullMessage: DEFAULT_FULL,
    founderQuote: 'Accessible, evidence-based medical education is the right of every student — not a privilege available to a few.',
  })

  useEffect(() => {
    window.scrollTo(0, 0)
    settingsService.get().then(s => {
      if (!s) return
      setD(prev => ({
        founderName:        s.founderName        || prev.founderName,
        founderDesignation: s.founderDesignation || prev.founderDesignation,
        founderImage:       s.founderImage        ?? prev.founderImage,
        founderFullMessage: s.founderFullMessage  || prev.founderFullMessage,
        founderQuote:       s.founderQuote        || prev.founderQuote,
      }))
    }).catch(() => {})
  }, [])

  const img = d.founderImage || founderFallback
  const paras = (d.founderFullMessage || '').split('\n').map(p => p.trim()).filter(Boolean)

  return (
    <div className="font-poppins bg-[#f7f9fc] min-h-screen">
      <Navbar />

      {/* Hero band */}
      <div className="px-4 pt-10 pb-20 sm:pt-14 sm:pb-28" style={{ background: 'linear-gradient(135deg, #1655c3, #64ac37)' }}>
        <div className="max-w-4xl mx-auto">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-white/80 hover:text-white mb-6 transition-colors">
            <ArrowLeft size={16} /> Back
          </button>
          <span className="inline-block text-[11px] font-bold text-white bg-white/20 px-3 py-1 rounded-full mb-4">FOUNDER'S MESSAGE</span>
          <h1 className="text-white font-black text-3xl sm:text-4xl lg:text-5xl leading-tight">A Vision for Every Student</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-12 sm:-mt-16 pb-16">
        <motion.div
          className="bg-white rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.06)] overflow-hidden"
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
        >
          <div className="grid sm:grid-cols-[220px_1fr] gap-0">
            {/* Photo — normal size */}
            <div className="p-6 sm:p-8 flex flex-col items-center justify-start">
              <div className="w-44 sm:w-full rounded-2xl overflow-hidden shadow-lg bg-gray-100" style={{ aspectRatio: '4 / 5' }}>
                <img src={img} alt={d.founderName} className="w-full h-full object-cover object-top"
                  onError={e => { e.target.src = founderFallback }} />
              </div>
              <div className="text-center mt-4">
                <div className="font-black text-[#1a1a1a]">{d.founderName}</div>
                <div className="text-xs text-gray-500">{d.founderDesignation}</div>
              </div>
            </div>

            {/* Message */}
            <div className="p-6 sm:p-8 sm:pl-2">
              <div className="rounded-2xl p-5 mb-6 border border-blue-100" style={{ background: 'linear-gradient(135deg, #eff6ff, #f0fdf4)' }}>
                <Quote size={22} className="text-[#1655c3] opacity-30 mb-2" />
                <p className="text-gray-700 italic text-sm sm:text-base leading-relaxed">"{d.founderQuote}"</p>
              </div>
              <div className="space-y-4">
                {paras.map((p, i) => (
                  <p key={i} className="text-gray-600 text-sm sm:text-[15px] leading-relaxed">{p}</p>
                ))}
              </div>
              <div className="flex items-center gap-4 pt-6 mt-6 border-t border-gray-200">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-md"
                  style={{ background: 'linear-gradient(135deg, #1655c3, #64ac37)' }}>
                  <span className="text-white font-black">{d.founderName?.replace(/^Dr\.?\s*/i,'').split(' ').map(n=>n[0]).slice(0,2).join('')}</span>
                </div>
                <div>
                  <div className="font-black text-[#1a1a1a] text-sm">{d.founderName}</div>
                  <div className="text-xs text-gray-500">{d.founderDesignation}</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <Footer />
    </div>
  )
}
