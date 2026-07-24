import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, CheckCircle } from 'lucide-react'
import { settingsService } from '../firebase/services'
import Navbar from '../components/Navbar'
import Footer from '../sections/Footer'

export default function AboutPage() {
  const navigate = useNavigate()
  const [d, setD] = useState({
    wwaTitle: "Building Pakistan's Healthcare Future",
    wwaFull: "MEDWEB is Pakistan's premier medical education platform dedicated to pharmacy, biotech, psychology, and allied health sciences students. We bridge the gap between academic knowledge and clinical practice through structured, expert-led programs.",
    wwaImage: '',
  })

  useEffect(() => {
    window.scrollTo(0, 0)
    settingsService.get().then(s => {
      if (!s) return
      setD(prev => ({
        wwaTitle: s.wwaTitle || prev.wwaTitle,
        wwaFull:  s.wwaFull  || prev.wwaFull,
        wwaImage: s.wwaImage ?? prev.wwaImage,
      }))
    }).catch(() => {})
  }, [])

  const paras = (d.wwaFull || '').split('\n').map(p => p.trim()).filter(Boolean)
  const imgSrc = d.wwaImage || 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=900&q=80'

  return (
    <div className="font-poppins bg-[#f7f9fc] min-h-screen">
      <Navbar />
      <div className="px-4 pt-10 pb-20 sm:pt-14 sm:pb-28" style={{ background: 'linear-gradient(135deg, #1655c3, #64ac37)' }}>
        <div className="max-w-4xl mx-auto">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-white/80 hover:text-white mb-6 transition-colors">
            <ArrowLeft size={16} /> Back
          </button>
          <span className="inline-block text-[11px] font-bold text-white bg-white/20 px-3 py-1 rounded-full mb-4">WHO WE ARE</span>
          <h1 className="text-white font-black text-3xl sm:text-4xl lg:text-5xl leading-tight">{d.wwaTitle}</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-12 sm:-mt-16 pb-16">
        <motion.div className="bg-white rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.06)] overflow-hidden"
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
          {imgSrc && (
            <div className="w-full h-56 sm:h-72 overflow-hidden">
              <img src={imgSrc} alt={d.wwaTitle} className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none' }} />
            </div>
          )}
          <div className="p-6 sm:p-10 space-y-4">
            {paras.map((p, i) => <p key={i} className="text-gray-600 text-sm sm:text-[15px] leading-relaxed">{p}</p>)}
            <div className="grid sm:grid-cols-2 gap-3 pt-4">
              {[
                "Pakistan's leading medical education platform for allied health sciences",
                'Evidence-based curriculum by expert pharmacists & physicians',
                'Verified digital certificates recognized across Pakistan',
                'Free & paid programs for every healthcare student',
              ].map((pt, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <CheckCircle size={17} className="text-[#64ac37] mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700 text-sm">{pt}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
      <Footer />
    </div>
  )
}
