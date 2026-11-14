import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Pin, Calendar, Clock } from 'lucide-react'
import { coursesService } from '../firebase/services'
import { karachiDateToMs } from '../lib/karachiTime'
import { getWebinarPopupOpen, subscribeWebinarPopupOpen } from '../lib/popupStore'
import CoursePriceTag from './CoursePriceTag'
import CoverImage from './CoverImage'

const DISMISS_KEY = 'medweb_course_popup_dismissed_at'
const DISMISS_HOURS = 24

function isWithinWindow(course) {
  if (!course.popupEnabled) return false
  const now = Date.now()
  const startMs = karachiDateToMs(course.popupStartDate, false)
  if (startMs !== null && now < startMs) return false
  const endMs = karachiDateToMs(course.popupEndDate, true)
  if (endMs !== null && now > endMs) return false
  return true
}

function Initials({ name }) {
  const initials = name?.replace(/^Dr\.?\s*/i, '').split(' ').map(n => n[0]).slice(0, 2).join('') || '?'
  return <div className="w-full h-full flex items-center justify-center text-white font-bold text-base bg-[#1655c3]">{initials}</div>
}

// Homepage-entry popup for a paid course/workshop with its popup toggle on
// and today within its configured window (Asia/Karachi dates) — same
// localStorage-dismissal idea as NewsPopup.jsx, but a single sitewide key
// (not per-item) since only one course popup is ever shown at a time (the
// most recent qualifying one), not a feed of several. Frame/animation
// deliberately mirrors WebinarAnnouncementPopup.jsx (same card size, pin
// badge, sway, entrance/exit) — that file itself is untouched.
export default function CoursePopup() {
  const [course, setCourse] = useState(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    const unsub = coursesService.listenActive(rows => {
      const qualifying = rows.filter(isWithinWindow)
      if (!qualifying.length) { setCourse(null); return }
      qualifying.sort((a, b) => new Date(b.popupStartDate || 0) - new Date(a.popupStartDate || 0))
      setCourse(qualifying[0])
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    if (!course) return
    let dismissedAt = null
    try { dismissedAt = localStorage.getItem(DISMISS_KEY) } catch { /* private window / blocked storage */ }
    if (dismissedAt && Date.now() - Number(dismissedAt) < DISMISS_HOURS * 60 * 60 * 1000) return

    // Never stacked with the webinar announcement popup — read the
    // shared store (src/lib/popupStore.js, written only by
    // WebinarAnnouncementPopup.jsx) rather than guessing from the DOM.
    // If it's already open at the 1.5s mark, wait for it to close; if
    // no webinar ever qualifies, it's always false and this shows
    // immediately, same as before.
    let unsub = null
    const t = setTimeout(() => {
      if (!getWebinarPopupOpen()) { setShow(true); return }
      unsub = subscribeWebinarPopupOpen(open => {
        if (!open) { setShow(true); unsub?.(); unsub = null }
      })
    }, 1500)
    return () => { clearTimeout(t); if (unsub) unsub() }
  }, [course])

  const dismiss = () => {
    setShow(false)
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())) } catch { /* ignore */ }
  }

  if (!course) return null
  // Card thumbnail (imageUrl) — same priority the course cards use;
  // posterImage is a fallback here, not the primary image, now that the
  // two have distinct jobs (thumbnail vs. full uncropped poster shown
  // once on the detail page).
  const thumb = course.imageUrl || course.posterImage

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          style={{ background: 'rgba(11,18,32,0.6)', backdropFilter: 'blur(6px)' }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onMouseDown={e => { if (e.target === e.currentTarget) dismiss() }}
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
                onClick={dismiss}
                className="absolute top-1 -right-2 z-20 w-7 h-7 rounded-full bg-white shadow-lg border border-gray-100 flex items-center justify-center text-gray-500 hover:text-red-500 transition-colors"
              >
                <X size={14} />
              </button>

              {/* the frame — a mat of white space + soft shadow around the card, like a physical picture frame */}
              <div className="rounded-[26px] bg-white p-2 shadow-[0_20px_45px_rgba(0,0,0,0.35)]">
                <div className="w-full max-w-[340px] mx-auto rounded-2xl h-full">
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full overflow-hidden w-full">
                    {/* THUMBNAIL (top) */}
                    <div className="relative w-full aspect-video bg-gray-100 overflow-hidden">
                      {thumb ? (
                        <CoverImage src={thumb} alt={course.title} className="w-full h-full" onError={e => { e.target.style.display = 'none' }} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1655c322, #1655c311)' }} />
                      )}
                      {course.category === 'Workshop' && (
                        <span className="absolute top-3 left-3 text-[10px] font-bold px-2.5 py-1 rounded-full text-white shadow bg-amber-500">Workshop</span>
                      )}
                      <span className="absolute top-3 right-3 text-[10px] font-bold px-2.5 py-1 rounded-full text-white shadow" style={{ background: '#1655c3' }}>Paid</span>
                    </div>

                    <div className="p-5 flex flex-col gap-3 flex-1">
                      <h3 className="font-bold text-[#1a1a1a] text-[15px] leading-snug line-clamp-2 min-h-[44px]">{course.title}</h3>

                      {course.instructor && (
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-white shadow-sm flex-shrink-0" style={{ background: '#eef2f7' }}>
                            {course.instructorImage
                              ? <CoverImage src={course.instructorImage} alt={course.instructor} bias="center 25%" className="w-full h-full" />
                              : <Initials name={course.instructor} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-sm text-[#1a1a1a] truncate">{course.instructor}</div>
                            <div className="text-xs text-gray-400 truncate">{course.qualification}</div>
                          </div>
                        </div>
                      )}

                      {(course.eventDate || course.startTime || course.endTime) && (
                        <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1">
                          {course.eventDate && (
                            <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                              <Calendar size={13} className="text-[#1655c3] flex-shrink-0" />{course.eventDate}
                            </div>
                          )}
                          {(course.startTime || course.endTime) && (
                            <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                              <Clock size={13} className="text-[#64ac37] flex-shrink-0" />{[course.startTime, course.endTime].filter(Boolean).join(' – ')}
                            </div>
                          )}
                        </div>
                      )}

                      <CoursePriceTag course={course} />

                      <Link
                        to={`/courses/${course.slug || course.id}#enroll`}
                        onClick={dismiss}
                        className="mt-auto w-full py-2.5 rounded-xl font-bold text-xs text-white transition-all hover:opacity-90 active:scale-95 text-center"
                        style={{ background: 'linear-gradient(135deg, #1655c3, #64ac37)' }}
                      >
                        Register Now →
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
