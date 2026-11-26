import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { toOptimizedUrl } from '../../firebase/cloudinary'

// Framed masonry gallery (CSS columns — a real masonry layout without a
// layout library) with a fullscreen lightbox; swipe-to-navigate on touch
// devices via simple touch deltas (no gesture library needed for a
// single-axis swipe).
export default function EventGallery({ items = [] }) {
  const [openIndex, setOpenIndex] = useState(null)
  const [touchStartX, setTouchStartX] = useState(null)

  const close = () => setOpenIndex(null)
  const prev = () => setOpenIndex(i => (i - 1 + items.length) % items.length)
  const next = () => setOpenIndex(i => (i + 1) % items.length)

  useEffect(() => {
    if (openIndex === null) return
    const onKey = e => {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openIndex, items.length])

  if (!items.length) return null

  const onTouchStart = e => setTouchStartX(e.touches[0].clientX)
  const onTouchEnd = e => {
    if (touchStartX === null) return
    const dx = e.changedTouches[0].clientX - touchStartX
    if (Math.abs(dx) > 50) (dx > 0 ? prev() : next())
    setTouchStartX(null)
  }

  return (
    <>
      <div className="[column-count:2] sm:[column-count:3] gap-3 [column-gap:0.75rem]">
        {items.map((img, i) => (
          <button
            key={img.url + i}
            onClick={() => setOpenIndex(i)}
            className="block w-full mb-3 bg-white rounded-sm p-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.15)] transition-shadow"
            style={{ border: '1px solid #d4d4d8' }}
          >
            <img src={toOptimizedUrl(img.url)} alt={img.caption || ''} loading="lazy" className="w-full rounded-[1px]" />
            {img.caption && <p className="text-[11px] text-gray-500 mt-1.5 px-0.5 text-left">{img.caption}</p>}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {openIndex !== null && (
          <motion.div
            className="fixed inset-0 z-[80] bg-black/90 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={close}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <button onClick={close} className="absolute top-4 right-4 text-white/80 hover:text-white z-10"><X size={28} /></button>
            {items.length > 1 && (
              <>
                <button onClick={e => { e.stopPropagation(); prev() }} className="absolute left-2 sm:left-6 text-white/70 hover:text-white z-10 p-2"><ChevronLeft size={32} /></button>
                <button onClick={e => { e.stopPropagation(); next() }} className="absolute right-2 sm:right-6 text-white/70 hover:text-white z-10 p-2"><ChevronRight size={32} /></button>
              </>
            )}
            <motion.div
              key={openIndex}
              initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
              className="max-w-4xl max-h-[85vh] flex flex-col items-center"
              onClick={e => e.stopPropagation()}
            >
              <img src={toOptimizedUrl(items[openIndex].url)} alt={items[openIndex].caption || ''} loading="lazy" className="max-w-full max-h-[75vh] object-contain rounded" />
              {items[openIndex].caption && <p className="text-white/80 text-sm mt-3 text-center">{items[openIndex].caption}</p>}
              <p className="text-white/40 text-xs mt-1">{openIndex + 1} / {items.length}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
