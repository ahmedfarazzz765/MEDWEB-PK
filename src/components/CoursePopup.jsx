import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Calendar } from 'lucide-react'
import { coursesService } from '../firebase/services'
import CoursePriceTag from './CoursePriceTag'

const DISMISS_KEY = 'medweb_course_popup_dismissed_at'
const DISMISS_HOURS = 24

function isWithinWindow(course) {
  if (!course.popupEnabled) return false
  const now = Date.now()
  if (course.popupStartDate && now < new Date(course.popupStartDate).getTime()) return false
  // End-of-day on the end date, not midnight at its start, so a course
  // popup doesn't silently disappear at 12:00 AM on its own last day.
  if (course.popupEndDate) {
    const end = new Date(course.popupEndDate)
    end.setHours(23, 59, 59, 999)
    if (now > end.getTime()) return false
  }
  return true
}

// Homepage-entry popup for a paid course/workshop with its popup toggle on
// and today within its configured window — same localStorage-dismissal
// idea as NewsPopup.jsx, but a single sitewide key (not per-item) since
// only one course popup is ever shown at a time (the most recent
// qualifying one), not a feed of several.
export default function CoursePopup() {
  const [course, setCourse] = useState(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    const unsub = coursesService.listen(rows => {
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
    const t = setTimeout(() => setShow(true), 1500)
    return () => clearTimeout(t)
  }, [course])

  const dismiss = () => {
    setShow(false)
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())) } catch { /* ignore */ }
  }

  if (!course) return null
  // Always the full poster, uncropped — imageUrl (the card thumbnail) is
  // a different, 16:9-cropped image and isn't a substitute here.
  const poster = course.posterImage

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
            className="relative w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.3)]"
            initial={{ opacity: 0, scale: 0.9, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 16 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            onMouseDown={e => e.stopPropagation()}
          >
            <button
              onClick={dismiss}
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/90 shadow-md flex items-center justify-center text-gray-500 hover:text-red-500 transition-colors"
            >
              <X size={16} />
            </button>
            {poster && (
              <img src={poster} alt={course.title} loading="lazy" className="block w-full h-auto object-contain" />
            )}
            <div className="p-5 sm:p-6">
              {course.category === 'Workshop' && (
                <span className="inline-block text-[10px] font-bold text-white bg-amber-500 px-2.5 py-1 rounded-full mb-2">Workshop</span>
              )}
              <h3 className="font-black text-[#1a1a1a] text-lg leading-snug mb-2">{course.title}</h3>
              {course.eventDate && (
                <div className="flex items-center gap-1.5 text-gray-500 text-sm mb-2">
                  <Calendar size={14} /> {course.eventDate}
                </div>
              )}
              <CoursePriceTag course={course} className="mb-4" />
              <Link
                to={`/courses/${course.slug || course.id}`}
                onClick={dismiss}
                className="block w-full text-center py-3 rounded-xl font-bold text-sm text-white"
                style={{ background: 'linear-gradient(135deg, #1655c3, #64ac37)' }}
              >
                Register Now
              </Link>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
