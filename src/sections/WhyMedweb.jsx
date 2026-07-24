import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Award, UserCheck, DollarSign, Headphones, BookOpen, GraduationCap,
  Shield, Heart, Star, Users, Video, CheckCircle, Radio, ShieldCheck, GraduationCap as CapIcon,
} from 'lucide-react'
import { settingsService } from '../firebase/services'
import { STATS } from '../data/statsConfig'
import SectionHeading from '../components/SectionHeading'
import webinarsImg from '../assets/hero_doctors.jpeg'
import coursesImg from '../assets/doctors.png'

const ICONS = { Award, UserCheck, DollarSign, Headphones, BookOpen, GraduationCap, Shield, Heart, Star, Users, Video, CheckCircle, Radio, ShieldCheck }

// These 4 map directly to real, already-live sections of the site (Webinars,
// Courses, Certificate Verification, Ambassadors) rather than inventing new claims.
// Webinars/Courses reuse existing local assets (src/assets — no identity-safe
// generic photo was available for the other two; see Round 6/9 notes). Ambassador
// Program uses a generic Unsplash stock photo (same convention already used for
// WebinarsSlider's fallback posters and AboutPage's fallback photo) — flagged here
// for the user to swap for real MEDWEB photography later. Certificate Verification
// stays a clean icon placeholder: a matching generic "certificate" stock photo
// wasn't reliably sourceable here, and a mismatched photo (tried a hospital-bed
// scene) is worse than no photo — better to leave it flagged than show something
// confusing or wrong.
const DEFAULT_CARDS = [
  { icon: 'Radio',       label1: 'Live Webinars &', label2: 'Masterclasses',  accent: 'green', desc: 'Learn from top healthcare professionals through interactive webinars.', image: webinarsImg, enabled: true },
  { icon: 'BookOpen',    label1: 'Professional',    label2: 'Courses',        accent: 'blue',  desc: 'Structured courses designed to strengthen your clinical knowledge.', image: coursesImg,  enabled: true },
  { icon: 'ShieldCheck', label1: 'Certificate',      label2: 'Verification',   accent: 'green', desc: 'Earn verified digital certificates recognized by institutions.', image: null, enabled: true },
  { icon: 'Users',       label1: 'Ambassador',       label2: 'Program',        accent: 'blue',  desc: 'Represent MEDWEB, build leadership skills nationwide.', image: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=500&q=80', enabled: true },
]

const ACCENTS = {
  green: { text: '#64ac37', bg: '#f0fdf4', ring: '#bbf7d0' },
  blue:  { text: '#1655c3', bg: '#eff6ff', ring: '#bfdbfe' },
}

// Fallback split for any admin-entered card that doesn't have label1/label2 set —
// last word becomes the accent-colored line.
function splitLabel(title) {
  const words = (title || '').trim().split(' ')
  if (words.length <= 1) return [title || '', '']
  return [words.slice(0, -1).join(' '), words.slice(-1).join(' ')]
}

const STAT_INDEXES = [0, 1, 4, 5] // Students, Webinars, Certificates, Courses — same source as Stats.jsx

export default function WhyMedweb() {
  const [title, setTitle] = useState('Why MEDWEB?')
  const [subtitle, setSubtitle] = useState("We're committed to delivering world-class medical education for every Pakistani healthcare student.")
  const [whyHeading1, setWhyHeading1] = useState('WHY')
  const [whyHeading2, setWhyHeading2] = useState('MEDWEB?')
  const [cards, setCards] = useState(DEFAULT_CARDS)
  const [statVals, setStatVals] = useState({})

  useEffect(() => {
    const unsub = settingsService.listen(s => {
      if (!s) return
      if (s.whyTitle) setTitle(s.whyTitle)
      if (s.whySubtitle) setSubtitle(s.whySubtitle)
      if (s.whyHeading1) setWhyHeading1(s.whyHeading1)
      if (s.whyHeading2) setWhyHeading2(s.whyHeading2)
      if (Array.isArray(s.whyCards) && s.whyCards.length) setCards(s.whyCards)
      setStatVals(s)
    })
    return () => unsub && unsub()
  }, [])

  const visible = cards.filter(c => c.enabled !== false)

  return (
    <section className="py-14 sm:py-16 px-4 relative overflow-hidden"
      style={{ background: 'radial-gradient(ellipse 60% 50% at 10% 0%, #eafbf1 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 90% 0%, #eaf2ff 0%, transparent 60%), #ffffff' }}>
      <div className="max-w-7xl mx-auto relative">

        {/* Stylized heading — shared SectionHeading component (Round 11) */}
        <div className="mb-10">
          <SectionHeading word1={whyHeading1} word2={whyHeading2} />
          <p className="text-base sm:text-lg font-bold text-gray-800 text-center mb-2">
            Learn. Connect. Grow. Achieve More with <span className="text-[#64ac37]">MEDWEB</span>.
          </p>
          <p className="text-gray-500 max-w-xl mx-auto text-sm sm:text-[15px] text-center">{subtitle}</p>
        </div>

        {/* 4 cards — 2x2 mobile, row of 4 desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-10">
          {visible.map((c, i) => {
            const Icon = ICONS[c.icon] || Star
            const [line1, line2] = c.label1 && c.label2 ? [c.label1, c.label2] : splitLabel(c.title)
            const accent = ACCENTS[c.accent] || ACCENTS[i % 2 === 0 ? 'green' : 'blue']
            return (
              <motion.div key={i}
                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden">
                <div className="relative aspect-video" style={{ background: accent.bg }}>
                  {c.image
                    ? <img src={c.image} alt={`${line1} ${line2}`} className="w-full h-full object-cover"
                        onError={e => { e.target.style.display = 'none' }} />
                    : <div className="w-full h-full flex items-center justify-center">
                        <Icon size={32} style={{ color: accent.text }} className="opacity-40" />
                      </div>
                  }
                </div>
                <div className="px-4 pb-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center -mt-5 mb-2 shadow-md border-2 border-white"
                    style={{ background: accent.bg }}>
                    <Icon size={17} style={{ color: accent.text }} />
                  </div>
                  <h3 className="font-black text-sm sm:text-base leading-tight mb-1.5">
                    <span className="text-[#0f172a]">{line1} </span>
                    <span style={{ color: accent.text }}>{line2}</span>
                  </h3>
                  <p className="text-gray-500 text-xs leading-relaxed mb-2">{c.desc}</p>
                  <svg width="32" height="6" viewBox="0 0 32 6" fill="none">
                    <path d="M2 4 Q8 1 14 4 T30 4" stroke={accent.text} strokeWidth="2" strokeLinecap="round" fill="none" />
                  </svg>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Summary pill strip */}
        <motion.div className="flex items-center gap-3 border border-gray-200 rounded-full px-5 sm:px-7 py-4 mb-10 bg-white/70"
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <div className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
            <CapIcon size={16} className="text-[#64ac37]" />
          </div>
          <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">
            MEDWEB empowers future healthcare professionals through{' '}
            <span className="text-[#64ac37] font-semibold">evidence-based education</span>,{' '}
            <span className="text-[#1655c3] font-semibold">verified certification</span>,{' '}
            <span className="text-[#64ac37] font-semibold">expert mentorship</span>, and a{' '}
            <span className="text-[#1655c3] font-semibold">nationwide student community</span>.
          </p>
        </motion.div>

        {/* Stat row — same source as Stats.jsx, no second hardcoded copy */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STAT_INDEXES.map(idx => {
            const { icon: Icon, label, fallback, color, bg, key } = STATS[idx]
            return (
              <div key={key} className="flex items-center gap-3 justify-center sm:justify-start bg-white rounded-xl p-3 shadow-sm">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
                  <Icon size={20} style={{ color }} />
                </div>
                <div>
                  <div className="text-[#0f172a] font-black text-lg sm:text-xl leading-none">{statVals[key] || fallback}</div>
                  <div className="text-gray-500 text-xs mt-1">{label}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
