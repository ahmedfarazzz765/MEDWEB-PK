import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle, ArrowRight } from 'lucide-react'
import { settingsService } from '../firebase/services'
import CoverImage from '../components/CoverImage'

const points = [
  "Pakistan's leading medical education platform for allied health sciences",
  'Evidence-based curriculum designed by expert pharmacists & physicians',
  'Verified digital certificates recognized across Pakistan',
  'Free & paid programs accessible to every healthcare student',
]

const DEFAULTS = {
  wwaTitle: "Building Pakistan's Healthcare Future",
  wwaShort: "MEDWEB is Pakistan's premier medical education platform dedicated to pharmacy, biotech, psychology, and allied health sciences students. We bridge the gap between academic knowledge and clinical practice through structured, expert-led programs.",
  wwaImage: '',
}

export default function WhoWeAre() {
  const navigate = useNavigate()
  const [d, setD] = useState(DEFAULTS)

  useEffect(() => {
    const unsub = settingsService.listen(s => {
      if (!s) return
      setD(prev => ({
        wwaTitle: s.wwaTitle || prev.wwaTitle,
        wwaShort: s.wwaShort || prev.wwaShort,
        wwaImage: s.wwaImage ?? prev.wwaImage,
      }))
    })
    return () => unsub && unsub()
  }, [])

  // Split the title so the last two words get the gradient (keeps the look)
  const words = (d.wwaTitle || '').trim().split(' ')
  const head = words.slice(0, Math.max(1, words.length - 2)).join(' ')
  const tail = words.slice(Math.max(1, words.length - 2)).join(' ')
  const imgSrc = d.wwaImage || 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&q=80'

  return (
    <section id="about" className="py-10 sm:py-12 px-4 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <motion.div
            initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
            <h2 className="text-4xl font-black text-[#1a1a1a] leading-tight mb-5">
              {head} <span className="text-[#1655c3]">{tail}</span>
            </h2>
            <p className="text-gray-600 leading-relaxed mb-7 text-[15px]">{d.wwaShort}</p>
            <div className="space-y-3 mb-8">
              {points.map((point, i) => (
                <div key={i} className="flex items-start gap-3">
                  <CheckCircle size={18} className="text-[#64ac37] mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700 text-sm leading-relaxed">{point}</span>
                </div>
              ))}
            </div>
            <button onClick={() => navigate('/about')}
              className="inline-flex items-center gap-2 text-white font-semibold px-7 py-3.5 rounded-full bg-[#1655c3] hover:bg-[#123f8f] transition-all duration-300 hover:-translate-y-1"
              style={{ boxShadow: '0 6px 20px rgba(22,85,195,0.3)' }}>
              Learn More <ArrowRight size={16} />
            </button>
          </motion.div>

          <motion.div className="relative"
            initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
            <div className="relative h-[440px] rounded-3xl overflow-hidden shadow-2xl">
              <CoverImage src={imgSrc} alt="Medical professionals" className="w-full h-full"
                onError={e => { e.target.style.display = 'none' }} />
              <div className="absolute inset-0 bg-[#1655c3]/10" />
            </div>
            <div className="absolute -top-5 -right-5 w-24 h-24 rounded-2xl flex flex-col items-center justify-center shadow-xl text-white font-bold text-xs text-center bg-[#1655c3]">
              <div className="text-2xl font-black">★★★★★</div>
              <div>Top Rated</div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
