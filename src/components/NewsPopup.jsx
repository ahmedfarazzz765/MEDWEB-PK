import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Newspaper } from 'lucide-react'
import { newsService } from '../firebase/services'

// Bottom-right teaser for the latest published Medical News item — shows the
// full (uncropped) thumbnail + title, after a short delay, sliding/fading in.
// Shows on every fresh page load/refresh (matching WebinarAnnouncementPopup).
export default function NewsPopup() {
  const navigate = useNavigate()
  const [item, setItem] = useState(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    // Clear legacy dismissal flag so refresh always displays the popup
    try { sessionStorage.removeItem('medweb_news_popup_dismissed') } catch {}
    newsService.getLatest(1)
      .then(rows => setItem(rows[0] || null))
      .catch(err => console.error('NewsPopup: failed to load latest news:', err))
  }, [])

  useEffect(() => {
    if (!item) return
    const t = setTimeout(() => setShow(true), 2200)
    return () => clearTimeout(t)
  }, [item])

  const dismiss = () => {
    setShow(false)
  }

  const handleClick = () => {
    dismiss()
    navigate(`/news/${item.slug}`)
  }

  if (!item) return null

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed bottom-4 right-4 z-[65] w-[280px] sm:w-[320px]"
          initial={{ opacity: 0, x: 60, y: 10 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, x: 60, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        >
          <div className="relative bg-white rounded-2xl shadow-[0_16px_40px_rgba(0,0,0,0.22)] border border-gray-100 overflow-hidden">
            <button
              onClick={dismiss}
              aria-label="Close"
              className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-white/90 shadow-md flex items-center justify-center text-gray-500 hover:text-red-500 transition-colors"
            >
              <X size={13} />
            </button>

            <button onClick={handleClick} className="block w-full text-left group">
              {item.imageUrl && (
                <div className="w-full bg-blue-50 flex items-center justify-center">
                  {/* object-contain, not cropped — the FULL thumbnail */}
                  <img src={item.imageUrl} alt={item.title} className="w-full max-h-[160px] object-contain" />
                </div>
              )}
              <div className="p-3.5">
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-[#1655c3] uppercase tracking-wider mb-1.5">
                  <Newspaper size={11} /> Medical News
                </span>
                <p className="text-sm font-bold text-[#1a1a1a] leading-snug line-clamp-2 group-hover:text-[#1655c3] transition-colors">
                  {item.title}
                </p>
              </div>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
