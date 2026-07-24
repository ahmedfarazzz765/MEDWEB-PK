import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Play, Activity, Dna, Building2 } from 'lucide-react'
import { useSiteSettings } from '../hooks/useSiteSettings'
import { webinarsService } from '../firebase/services'
import heroBanner from '../assets/hero_clean.jpeg'

const DEFAULTS = {
  heroBadge: "Pakistan's Leading Platform for Medical Education",
  heroHeadingPart1: 'Transforming',
  heroHeadingHighlight: 'Medical',
  heroHeadingPart2: 'Education in Pakistan',
  heroSubtext: 'Evidence-based courses, expert-led webinars, and certified programs for medical & healthcare students.',
  heroPrimaryBtnLabel: 'Explore Courses',
  heroSecondaryBtnLabel: 'Join Webinar',
  heroImage: '',
}

export default function Hero() {
  const d = useSiteSettings(DEFAULTS)
  const [liveWebinar, setLiveWebinar] = useState(null)

  useEffect(() => {
    // webinarsService.listen already orders by createdAt desc, so the first
    // Live match is the most recently created one if more than one is Live.
    const unsub = webinarsService.listen(rows => {
      setLiveWebinar(rows.find(r => r.status === 'Live') || null)
    })
    return () => unsub()
  }, [])

  return (
    <section
      id="home"
      className="relative overflow-hidden bg-cover bg-center"
      style={{ backgroundImage: `url(${d.heroImage || heroBanner})` }}
    >
      {/* Light mask — photo dissolves into the page's white/light background on the left,
          stays fully bright and untouched on the right. No dark tint over the photo. */}
      <div className="absolute inset-0 bg-gradient-to-r from-white via-white/85 sm:via-white/70 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#eef8f2] via-transparent to-transparent opacity-60" />

      {/* Faint decorative texture in the light area — subtle, not a focal point */}
      <Activity className="hidden sm:block absolute top-16 left-[8%] w-16 h-16 text-[#1655c3] opacity-[0.08] pointer-events-none" />
      <Dna className="hidden sm:block absolute bottom-24 left-[4%] w-20 h-20 text-[#64ac37] opacity-[0.08] pointer-events-none" />
      <Building2 className="hidden sm:block absolute bottom-10 left-[28%] w-24 h-24 text-[#1655c3] opacity-[0.06] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-12 lg:px-16 xl:px-24 py-20 sm:py-28 min-h-[520px] sm:min-h-[560px] flex items-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="max-w-xl"
        >
          <span className="inline-block text-xs font-semibold text-[#1655c3] bg-blue-50 px-4 py-2 rounded-full mb-5 shadow-sm">
            {d.heroBadge}
          </span>

          <h1 className="text-4xl sm:text-5xl lg:text-[3.4rem] font-black leading-[1.1] text-gray-900 mb-5 tracking-tight">
            {d.heroHeadingPart1} <span className="text-[#64ac37]">{d.heroHeadingHighlight}</span> {d.heroHeadingPart2}
          </h1>

          <p className="text-gray-600 text-[1.05rem] leading-relaxed mb-8 max-w-md">
            {d.heroSubtext}
          </p>

          <div className="flex flex-wrap gap-4">
            <motion.a
              href="#courses-highlight"
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 text-white font-bold px-7 py-3.5 rounded-full text-sm bg-[#1655c3] hover:bg-[#123f8f] transition-colors duration-200 shadow-[0_8px_24px_rgba(22,85,195,0.3)]"
            >
              {d.heroPrimaryBtnLabel} <ArrowRight size={17} />
            </motion.a>

            <motion.a
              href="#webinars"
              onClick={e => {
                if (liveWebinar?.youtubeLink) {
                  e.preventDefault()
                  window.open(liveWebinar.youtubeLink, '_blank', 'noopener,noreferrer')
                }
              }}
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              className={`inline-flex items-center gap-2 text-white font-bold px-7 py-3.5 rounded-full text-sm transition-colors duration-200 ${
                liveWebinar
                  ? 'bg-[#e11d48] hover:bg-[#be123c] shadow-[0_8px_24px_rgba(225,29,72,0.35)]'
                  : 'bg-[#64ac37] hover:bg-[#4f8c29] shadow-[0_8px_24px_rgba(100,172,55,0.3)]'
              }`}
            >
              <Play size={15} fill="white" /> {liveWebinar ? 'Live Now' : d.heroSecondaryBtnLabel}
            </motion.a>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
