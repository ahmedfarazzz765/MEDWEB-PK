import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Newspaper } from 'lucide-react'
import { newsService } from '../firebase/services'

const DISMISS_KEY_PREFIX = 'medweb_news_badge_dismissed_'

// Small bottom-right badge teasing the latest published Medical News item.
// Desktop only (hidden below 768px — a full-screen-width visitor doesn't
// need a floating teaser competing with the rest of a small layout).
// Dismissal is saved in localStorage per-item (keyed by the item's own id),
// so closing it stays closed across refreshes/future visits — but a NEW
// news item published later still gets its own first showing.
export default function NewsPopup() {
  const navigate = useNavigate()
  const [item, setItem] = useState(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    newsService.getLatest(1)
      .then(rows => setItem(rows[0] || null))
      .catch(err => console.error('NewsPopup: failed to load latest news:', err))
  }, [])

  useEffect(() => {
    if (!item) return
    if (typeof window !== 'undefined' && window.innerWidth < 768) return
    let dismissed = false
    try { dismissed = localStorage.getItem(DISMISS_KEY_PREFIX + item.id) === '1' } catch {}
    if (dismissed) return
    const t = setTimeout(() => setShow(true), 2200)
    return () => clearTimeout(t)
  }, [item])

  const dismiss = () => {
    setShow(false)
    try { localStorage.setItem(DISMISS_KEY_PREFIX + item.id, '1') } catch {}
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
          className="hidden md:block fixed bottom-4 right-4 z-[65]"
          initial={{ opacity: 0, x: 40, y: 10 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, x: 40, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        >
          <div className="relative flex items-center gap-2 bg-white rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.18)] border border-gray-100 pl-1 pr-3 py-1">
            <button
              onClick={handleClick}
              className="flex items-center gap-2 group"
            >
              <span className="w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0"
                style={{ background: 'linear-gradient(135deg, #1655c3, #64ac37)' }}>
                <Newspaper size={14} />
              </span>
              <span className="text-xs font-bold text-[#1a1a1a] max-w-[180px] truncate group-hover:text-[#1655c3] transition-colors">
                {item.title}
              </span>
            </button>
            <button
              onClick={dismiss}
              aria-label="Close"
              className="w-5 h-5 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-gray-50 transition-colors shrink-0"
            >
              <X size={12} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
