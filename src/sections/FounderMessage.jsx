import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Quote, ArrowRight } from 'lucide-react'
import { settingsService } from '../firebase/services'
import BrandWatermark from '../components/BrandWatermark'
import founderFallback from '../assets/founder_pic.png'

const DEFAULTS = {
  founderName: 'Dr. Shahroz Abbas',
  founderDesignation: 'Founder & CEO, MEDWEB-PK',
  founderImage: '',
  founderShortMessage:
    'Founder of MEDWEB-PK, on a mission to make evidence-based medical education accessible to every healthcare student in Pakistan.',
  founderQuote:
    'Accessible, evidence-based medical education is the right of every student — not a privilege available to a few.',
  founderHeading1: 'A Vision for',
  founderHeading2: 'Every Student',
}

const PANEL_BG = 'linear-gradient(160deg,#0B1220 0%,#101c33 55%,#123a63 100%)'

// Compact two-line heading, sized to fit inside a narrow half-column at every
// breakpoint (the shared SectionHeading component is tuned for full-width
// sections and is too large to fit here without wrapping/overflowing).
function FounderHeading({ word1, word2 }) {
  return (
    <h2 className="font-black leading-[0.95] mb-2 sm:mb-3">
      <span className="block text-lg sm:text-2xl md:text-4xl lg:text-5xl xl:text-6xl -rotate-1 text-white">{word1}</span>
      <span className="block text-lg sm:text-2xl md:text-4xl lg:text-5xl xl:text-6xl rotate-1 -mt-0.5 sm:-mt-1 text-[#64ac37]">{word2}</span>
    </h2>
  )
}

function FounderCaption({ initials, name, designation }) {
  return (
    <div className="flex items-center gap-2 sm:gap-3 md:gap-4 border-t border-white/15 pt-3 sm:pt-4 md:pt-6 mt-3 sm:mt-4 md:mt-7">
      <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center shrink-0 shadow-md" style={{ background: 'linear-gradient(135deg,#1655c3,#64ac37)' }}>
        <span className="text-white font-black text-xs sm:text-sm md:text-base">{initials}</span>
      </div>
      <div className="min-w-0">
        <div className="font-black text-white text-xs sm:text-sm md:text-base truncate">{name}</div>
        <div className="text-[10px] sm:text-xs md:text-sm text-white/60 truncate">{designation}</div>
      </div>
    </div>
  )
}

function FounderBody({ navigate, d }) {
  return (
    <>
      <FounderHeading word1={d.founderHeading1} word2={d.founderHeading2} />

      <Quote className="w-4 h-4 sm:w-5 sm:h-5 md:w-7 md:h-7 lg:w-9 lg:h-9 text-white/25 mb-1 sm:mb-2 mx-auto" />
      <p className="text-white/90 italic text-[11px] sm:text-sm md:text-base lg:text-lg leading-snug sm:leading-relaxed mb-2 sm:mb-4 text-center">
        {d.founderQuote}
      </p>

      <p className="text-white/60 text-[10px] sm:text-xs md:text-sm leading-snug sm:leading-relaxed mb-3 sm:mb-6 line-clamp-2 text-center">
        {d.founderShortMessage}
      </p>

      <div className="flex justify-center">
        <button
          onClick={() => navigate('/founder-message')}
          className="inline-flex items-center gap-1 sm:gap-1.5 md:gap-2 text-[#0B1220] font-bold px-3 py-1.5 sm:px-5 sm:py-2.5 md:px-7 md:py-3.5 rounded-full text-[10px] sm:text-xs md:text-sm bg-white hover:bg-gray-100 transition-all duration-300"
        >
          Read Full Message <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
        </button>
      </div>
    </>
  )
}

export default function FounderMessage() {
  const navigate = useNavigate()
  const [d, setD] = useState(DEFAULTS)

  useEffect(() => {
    const unsub = settingsService.listen(s => {
      if (!s) return
      setD(prev => ({
        founderName:         s.founderName        || prev.founderName,
        founderDesignation:  s.founderDesignation || prev.founderDesignation,
        founderImage:        s.founderImage        ?? prev.founderImage,
        founderShortMessage: s.founderShortMessage || prev.founderShortMessage,
        founderQuote:        s.founderQuote        || prev.founderQuote,
        founderHeading1:     s.founderHeading1     || prev.founderHeading1,
        founderHeading2:     s.founderHeading2     || prev.founderHeading2,
      }))
    })
    return () => unsub && unsub()
  }, [])

  const img = d.founderImage || founderFallback
  const initials = d.founderName?.replace(/^Dr\.?\s*/i, '').split(' ').map(n => n[0]).slice(0, 2).join('') || 'SA'

  return (
    <section className="py-8 sm:py-10 md:py-12 px-3 sm:px-4 relative overflow-hidden">
      <BrandWatermark seed={1} />
      <div className="max-w-6xl mx-auto relative z-10">
        {/* Two-column layout at every breakpoint — text left, photo right.
            The photo column has no intrinsic height of its own (its only
            content is absolutely-positioned) — it's purely a consequence of
            the grid stretching it to match the text column's height. The
            photo then fills that box exactly via absolute+object-cover, so
            the card's bottom edge is always the box's edge, never wherever
            the uploaded photo's own aspect ratio happens to end. This is
            what keeps it gap-free for ANY future photo, regardless of its
            dimensions or how much dead space is baked into the source file —
            object-cover always crops to fill, it never leaves a remainder. */}
        <motion.div
          className="grid grid-cols-[1fr_1.1fr] rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl"
          style={{ background: PANEL_BG }}
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        >
          <div className="relative z-10 p-3 sm:p-5 md:p-8 lg:p-12 xl:p-16 flex flex-col justify-center min-w-0">
            <FounderBody navigate={navigate} d={d} />
            <FounderCaption initials={initials} name={d.founderName} designation={d.founderDesignation} />
          </div>

          <div className="relative overflow-hidden">
            <img
              src={img}
              alt={d.founderName}
              className="absolute inset-0 w-full h-full object-cover object-top photo-fade-bottom"
              onError={e => { e.target.src = founderFallback }}
            />
            {/* Blends the photo's left edge into the panel — no visible seam */}
            <div className="absolute inset-y-0 left-0 w-1/4 pointer-events-none" style={{ background: 'linear-gradient(to right, #0B1220, transparent)' }} />
          </div>
        </motion.div>
      </div>
    </section>
  )
}
