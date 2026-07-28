import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, ExternalLink, Megaphone, ChevronLeft, ChevronRight } from 'lucide-react'
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
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0, backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
          transition={{ opacity: { duration: 0.6 }, y: { duration: 0.6 }, backgroundPosition: { duration: 8, repeat: Infinity, ease: 'linear' } }}
        >
          <div className="relative rounded-[calc(1rem-2px)] sm:rounded-[calc(1.5rem-2px)] overflow-hidden bg-white">
            <AnimatePresence mode="wait">
              <motion.button
                key={current.id}
                onClick={() => handleActivate(current)}
                className="flex flex-col sm:flex-row items-stretch w-full text-left group"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.45 }}
              >
                {/* Banner image */}
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

                {/* Copy */}
                <div className="flex-1 min-w-0 p-5 sm:p-6 flex flex-col justify-center gap-2">
                  <h3 className="font-black text-lg sm:text-xl text-[#0f172a] leading-snug group-hover:text-[#1655c3] transition-colors">
                    {current.title}
                  </h3>
                  {current.shortDescription && (
                    <p className="text-gray-500 text-sm leading-relaxed line-clamp-2">{current.shortDescription}</p>
                  )}
                  <span
                    className="inline-flex items-center gap-1.5 mt-2 text-sm font-bold text-white w-fit px-4 py-2 rounded-full shadow-sm group-hover:shadow-md group-hover:gap-2.5 transition-all"
                    style={{ background: 'linear-gradient(135deg, #1655c3, #64ac37)' }}
                  >
                    {current.ctaLabel || 'Learn More'}
                    {current.linkType === 'external' ? <ExternalLink size={14} /> : <ArrowRight size={14} />}
                  </span>
                </div>
              </motion.button>
            </AnimatePresence>

            {/* Carousel controls — only when more than one is active */}
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

                <div className="flex items-center justify-center gap-1.5 pb-3">
                  {items.map((a, i) => (
                    <button
                      key={a.id}
                      onClick={() => setIndex(i)}
                      aria-label={`Show announcement ${i + 1}`}
                      className="p-1"
                    >
                      <span className={`block rounded-full transition-all ${i === index ? 'w-5 h-1.5 bg-[#1655c3]' : 'w-1.5 h-1.5 bg-gray-300'}`} />
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
