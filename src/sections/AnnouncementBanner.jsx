import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, ExternalLink, Megaphone, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { announcementsService } from '../firebase/services'
import { isAnnouncementActive } from '../lib/announcements'
import CoverImage from '../components/CoverImage'

const ROTATE_MS = 6000

// General-purpose homepage promo banner — separate from the webinar-specific
// announcement popup (WebinarAnnouncementPopup.jsx). Admin-managed via
// Admin > Announcements; shows only enabled, not-yet-expired items, one at
// a time (auto-rotating with dots if 2-3 are active simultaneously).
export default function AnnouncementBanner() {
  const [items, setItems] = useState(null) // null = loading
  const [index, setIndex] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    const unsub = announcementsService.listen(rows => {
      setItems(rows.filter(isAnnouncementActive))
    })
    return unsub
  }, [])

  useEffect(() => {
    if (!items || items.length < 2) return
    const t = setInterval(() => setIndex(i => (i + 1) % items.length), ROTATE_MS)
    return () => clearInterval(t)
  }, [items])

  // Keep index in range if the active set shrinks (e.g. one expires/gets disabled)
  useEffect(() => {
    if (items && index >= items.length) setIndex(0)
  }, [items, index])

  if (!items || items.length === 0) return null

  const current = items[index % items.length]
  const highlights = Array.isArray(current.highlights) ? current.highlights.filter(Boolean).slice(0, 4) : []

  const handleActivate = a => {
    if (a.linkType === 'external' && a.externalUrl) {
      window.open(a.externalUrl, '_blank', 'noopener,noreferrer')
    } else if (a.slug) {
      navigate(`/announcements/${a.slug}`)
    }
  }

  return (
    <section className="px-4 pt-4 sm:pt-6 relative z-10">
      <div className="max-w-6xl mx-auto">
        <motion.div
          className="relative rounded-2xl sm:rounded-3xl p-[2px] overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #64ac37, #1655c3, #64ac37)', backgroundSize: '200% 200%' }}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1, backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
          transition={{ opacity: { duration: 0.6 }, scale: { duration: 0.6, ease: 'easeOut' }, backgroundPosition: { duration: 8, repeat: Infinity, ease: 'linear' } }}
        >
          {/* Soft outer glow pulse — reinforces "urgent" without being noisy */}
          <motion.div
            className="absolute -inset-3 rounded-[2rem] pointer-events-none -z-10"
            style={{ background: 'radial-gradient(ellipse at center, rgba(22,85,195,0.35), transparent 70%)' }}
            animate={{ opacity: [0.5, 0.9, 0.5] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
          />

          <div className="relative rounded-[calc(1rem-2px)] sm:rounded-[calc(1.5rem-2px)] overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.button
                key={current.id}
                onClick={() => handleActivate(current)}
                className="flex flex-col sm:flex-row items-stretch w-full text-left group"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
              >
                {/* Banner image — left side, unchanged */}
                <div className="relative w-full sm:w-64 md:w-80 h-40 sm:h-auto shrink-0 overflow-hidden" style={{ background: 'linear-gradient(135deg,#eff6ff,#f0fdf4)' }}>
                  {current.imageUrl ? (
                    <CoverImage src={current.imageUrl} alt={current.title} className="w-full h-full group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Megaphone size={36} className="text-[#1655c3] opacity-30" />
                    </div>
                  )}
                  <span className="absolute top-3 left-3 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-white bg-[#e11d48] px-2.5 py-1 rounded-full shadow-sm animate-pulse">
                    🔥 Don't Miss This
                  </span>
                </div>

                {/* Copy — right side, redesigned: rich brand-gradient background,
                    animated glow blob, description, highlight chips, prominent CTA */}
                <div
                  className="relative flex-1 min-w-0 p-5 sm:p-7 flex flex-col justify-center gap-3 overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, #0c1f45 0%, #123f8f 50%, #145a32 100%)' }}
                >
                  {/* Ambient animated glow blob for visual energy */}
                  <motion.div
                    className="absolute -top-10 -right-10 w-48 h-48 rounded-full pointer-events-none"
                    style={{ background: 'radial-gradient(circle, rgba(100,172,55,0.45), transparent 70%)' }}
                    animate={{ scale: [1, 1.25, 1], opacity: [0.6, 1, 0.6] }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  />

                  <div className="relative z-10 flex flex-col gap-2.5">
                    <h3 className="font-black text-xl sm:text-2xl text-white leading-snug">
                      {current.title}
                    </h3>

                    {current.shortDescription && (
                      <p className="text-white/80 text-sm sm:text-[15px] leading-relaxed line-clamp-3">{current.shortDescription}</p>
                    )}

                    {highlights.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {highlights.map((h, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-white bg-white/10 border border-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full"
                          >
                            <Sparkles size={11} className="text-[#7ee08a] shrink-0" />
                            {h}
                          </span>
                        ))}
                      </div>
                    )}

                    <motion.span
                      className="inline-flex items-center gap-2 mt-3 text-sm sm:text-base font-black text-[#0c1f45] w-fit px-5 sm:px-6 py-3 rounded-full shadow-[0_6px_20px_rgba(0,0,0,0.25)] bg-white group-hover:gap-3 transition-all"
                      animate={{ scale: [1, 1.035, 1] }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      {current.ctaLabel || 'Learn More'}
                      {current.linkType === 'external' ? <ExternalLink size={16} /> : <ArrowRight size={16} />}
                    </motion.span>

                    {/* Rotation indicators — sit under the CTA, in normal flow so they
                        never overlap the poster image on the stacked mobile layout */}
                    {items.length > 1 && (
                      <div className="flex items-center gap-1.5 mt-1">
                        {items.map((a, i) => (
                          <button
                            key={a.id}
                            onClick={e => { e.stopPropagation(); setIndex(i) }}
                            aria-label={`Show announcement ${i + 1}`}
                            className="p-1"
                          >
                            <span className={`block rounded-full transition-all ${i === index ? 'w-5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/40'}`} />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.button>
            </AnimatePresence>

            {/* Prev/Next arrows — only when more than one is active */}
            {items.length > 1 && (
              <>
                <button
                  onClick={e => { e.stopPropagation(); setIndex(i => (i - 1 + items.length) % items.length) }}
                  aria-label="Previous announcement"
                  className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 shadow-md border border-gray-100 items-center justify-center text-gray-500 hover:text-[#1655c3] transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); setIndex(i => (i + 1) % items.length) }}
                  aria-label="Next announcement"
                  className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 shadow-md border border-gray-100 items-center justify-center text-gray-500 hover:text-[#1655c3] transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
