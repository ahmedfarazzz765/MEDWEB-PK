import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'

const ACCENT_COLORS = {
  green: '#64ac37',
  blue: '#1655c3',
}

/**
 * The "WHY MEDWEB?" heading treatment (Round 9), reused site-wide (Round 11)
 * so every section heading matches instead of each building its own variant.
 * `dark` flips word1/subtitle to white for use on colored/dark backgrounds
 * (e.g. CertificateVerification's solid blue card) where black text would
 * be unreadable — the doodle/stacked-word structure stays identical either way.
 */
export default function SectionHeading({ word1, word2, accent = 'green', subtitle, dark = false, className = '' }) {
  const accentColor = ACCENT_COLORS[accent] || ACCENT_COLORS.green

  return (
    <motion.div className={`text-center relative ${className}`}
      initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
      <Sparkles className={`hidden sm:block absolute -top-2 left-[30%] w-6 h-6 opacity-60 ${dark ? 'text-white' : 'text-[#1655c3]'}`} />
      <Sparkles className="hidden sm:block absolute top-6 right-[28%] w-4 h-4 opacity-60" style={{ color: accentColor }} />
      <svg className={`hidden sm:block absolute top-0 right-[22%] w-14 h-14 opacity-50 ${dark ? 'text-white' : 'text-[#1655c3]'}`} viewBox="0 0 60 60" fill="none">
        <path d="M8 40 Q20 5 50 15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M40 10 L50 15 L44 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>

      <h2 className="font-black leading-[0.95] mb-4">
        <span className={`block text-5xl sm:text-7xl -rotate-1 ${dark ? 'text-white' : 'text-[#0f172a]'}`}>{word1}</span>
        <span className="block text-5xl sm:text-7xl rotate-1 -mt-1 sm:-mt-2" style={{ color: accentColor }}>{word2}</span>
      </h2>

      {subtitle && (
        <p className={`max-w-xl mx-auto text-sm sm:text-[15px] ${dark ? 'text-white/70' : 'text-gray-500'}`}>{subtitle}</p>
      )}
    </motion.div>
  )
}
