import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Pin } from 'lucide-react'
import { webinarsService } from '../firebase/services'
import { WebinarCard } from '../sections/WebinarsSlider'

// Picks the single most relevant webinar to announce: a Live one first
// (happening right now), otherwise the soonest Upcoming one with a
// parseable future date. Returns null if nothing qualifies.
function pickAnnouncementWebinar(rows) {
  const parse = d => { const t = new Date(d).getTime(); return isNaN(t) ? null : t }
  const now = Date.now()

  const live = rows.filter(r => r.status === 'Live')
  if (live.length) return live[0]

  const upcoming = rows
    .filter(r => r.status === 'Upcoming')
    .map(r => ({ r, t: parse(r.date) }))
    .filter(x => x.t !== null && x.t > now)
    .sort((a, b) => a.t - b.t)

  return upcoming.length ? upcoming[0].r : null
}

// Site-entry popup announcing the soonest upcoming/live webinar. Reuses the
// exact WebinarCard used in the Webinars section — no duplicated markup —
// framed and hung from a pin, gently swaying like a physical card pinned
// to a board. Shows on every fresh load (no dismissal persistence), after
// a short delay so it isn't jarring.
export default function WebinarAnnouncementPopup() {
  const navigate = useNavigate()
  const [webinar, setWebinar] = useState(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    const unsub = webinarsService.listen(rows => {
      setWebinar(pickAnnouncementWebinar(rows))
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    if (!webinar) return
    const t = setTimeout(() => setShow(true), 1500)
    return () => clearTimeout(t)
  }, [webinar])

  const handleRegister = (w) => {
    setShow(false)
    if (w.registrationLink) {
      window.open(w.registrationLink, '_blank', 'noopener,noreferrer')
      return
    }
    navigate(w.isStatic ? '/webinar/static/register' : `/webinar/${w.id}/register`)
  }

  if (!webinar) return null

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          style={{ background: 'rgba(11,18,32,0.6)', backdropFilter: 'blur(6px)' }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onMouseDown={e => { if (e.target === e.currentTarget) setShow(false) }}
        >
          <motion.div
            className="w-full max-w-[340px]"
            initial={{ opacity: 0, scale: 0.85, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 16 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            onMouseDown={e => e.stopPropagation()}
          >
            {/* hanging sway — pivots from the top center, where the pin sits */}
            <motion.div
              className="relative pt-3"
              style={{ transformOrigin: 'top center' }}
              animate={{ rotate: [-2, 2, -2] }}
              transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
              whileHover={{ rotate: 0 }}
            >
              {/* pin — a small shadow beneath suggests it's physically holding the card */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center">
                <div className="w-7 h-7 rounded-full flex items-center justify-center shadow-md ring-2 ring-white" style={{ background: 'linear-gradient(180deg, #2b6fe0, #123f8f)' }}>
                  <Pin size={13} className="text-white" fill="currentColor" style={{ transform: 'rotate(-45deg)' }} />
                </div>
                <div className="w-5 h-1.5 rounded-full bg-black/20 blur-[2px] -mt-0.5" />
              </div>

              {/* close button — top-right corner of the frame */}
              <button
                onClick={() => setShow(false)}
                className="absolute top-1 -right-2 z-20 w-7 h-7 rounded-full bg-white shadow-lg border border-gray-100 flex items-center justify-center text-gray-500 hover:text-red-500 transition-colors"
              >
                <X size={14} />
              </button>

              {/* the frame — a mat of white space + soft shadow around the card, like a physical picture frame */}
              <div className="rounded-[26px] bg-white p-2 shadow-[0_20px_45px_rgba(0,0,0,0.35)]">
                <WebinarCard webinar={webinar} onRegister={handleRegister} />
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
