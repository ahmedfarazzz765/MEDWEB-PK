import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import DOMPurify from 'dompurify'
import { Calendar, Clock, Play, MessageCircle, Users, ArrowLeft, Video } from 'lucide-react'
import { webinarsService } from '../firebase/services'
import Navbar from '../components/Navbar'
import Footer from '../sections/Footer'
import CoverImage from '../components/CoverImage'

// Reuses the exact status colors already established in AdminWebinars.jsx's
// table / WebinarsSlider.jsx's card, so every surface agrees.
const STATUS_STYLES = {
  Completed: { bg: '#f0fdf4', text: '#16a34a', label: 'Completed' },
  Upcoming:  { bg: '#eff6ff', text: '#1655c3', label: 'Upcoming' },
}

function Initials({ name }) {
  const initials = name?.replace(/^Dr\.?\s*/i, '').split(' ').map(n => n[0]).slice(0, 2).join('') || '?'
  return (
    <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg bg-[#1655c3]">
      {initials}
    </div>
  )
}

export default function WebinarDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [webinar, setWebinar] = useState(undefined) // undefined = loading, null = not found

  useEffect(() => {
    window.scrollTo(0, 0)
    webinarsService.getOne(id)
      .then(w => setWebinar(w || null))
      .catch(() => setWebinar(null))
  }, [id])

  if (webinar === undefined) {
    return (
      <div className="font-poppins bg-[#f7f9fc] min-h-screen">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-24 text-center text-gray-400">Loading webinar…</div>
        <Footer />
      </div>
    )
  }

  if (!webinar) {
    return (
      <div className="font-poppins bg-[#f7f9fc] min-h-screen">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-24 text-center">
          <h1 className="text-2xl font-black text-[#1a1a1a] mb-3">Webinar Not Found</h1>
          <p className="text-gray-500 mb-6">This webinar may have been removed or the link is incorrect.</p>
          <Link to="/webinars" className="inline-flex items-center gap-2 text-white font-semibold px-6 py-3 rounded-full bg-[#1655c3] hover:bg-[#123f8f] transition-colors">
            <ArrowLeft size={16} /> Back to Webinars
          </Link>
        </div>
        <Footer />
      </div>
    )
  }

  const color = webinar.color || '#1655c3'
  const isLive = webinar.status === 'Live'
  const isCompleted = webinar.status === 'Completed'
  const statusStyle = STATUS_STYLES[webinar.status] || STATUS_STYLES.Upcoming
  const youtube = webinar.youtubeLink || webinar.youtube || ''
  const poster = webinar.webinarImage || webinar.poster
  const speakers = Array.isArray(webinar.speakers) ? webinar.speakers : []
  const joinedCount = Number(webinar.registered) || 0

  const handleWatch = () => { if (youtube) window.open(youtube, '_blank', 'noopener,noreferrer') }
  const handleRegister = () => navigate(`/webinar/${id}/register`)
  const handleFeedback = () => {
    if (webinar.feedbackFormId) navigate(`/form/${webinar.feedbackFormId}`)
    else if (webinar.feedbackLink) window.open(webinar.feedbackLink, '_blank', 'noopener,noreferrer')
  }
  const showFeedbackButton = webinar.feedbackEnabled && webinar.feedbackButtonEnabled !== false && (webinar.feedbackLink || webinar.feedbackFormId)

  return (
    <div className="font-poppins bg-[#f7f9fc] min-h-screen">
      <Navbar />

      {/* Hero band — same template as BlogPostPage/CourseDetailPage/etc */}
      <div className="px-4 pt-10 pb-20 sm:pt-14 sm:pb-28" style={{ background: 'linear-gradient(135deg, #1655c3, #64ac37)' }}>
        <div className="max-w-4xl mx-auto">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-white/80 hover:text-white mb-6 transition-colors">
            <ArrowLeft size={16} /> Back
          </button>
          <div className="flex items-center gap-2 flex-wrap mb-4">
            {isLive ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white bg-[#e11d48] px-3 py-1 rounded-full animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-white" /> LIVE NOW
              </span>
            ) : (
              <span className="inline-block text-[11px] font-bold px-3 py-1 rounded-full" style={{ background: statusStyle.bg, color: statusStyle.text }}>
                {statusStyle.label}
              </span>
            )}
            {webinar.type && (
              <span className="inline-block text-[11px] font-bold text-white bg-white/20 px-3 py-1 rounded-full">{webinar.type}</span>
            )}
          </div>
          <h1 className="text-white font-black text-3xl sm:text-4xl lg:text-5xl leading-tight">{webinar.topic || webinar.title}</h1>
          <div className="flex items-center gap-5 mt-4 text-white/85 text-sm flex-wrap">
            {webinar.date && <span className="flex items-center gap-1.5"><Calendar size={14} /> {webinar.date}</span>}
            {webinar.time && <span className="flex items-center gap-1.5"><Clock size={14} /> {webinar.time}</span>}
            {joinedCount > 0 && <span className="flex items-center gap-1.5"><Users size={14} /> {joinedCount.toLocaleString()} student{joinedCount === 1 ? '' : 's'} joined</span>}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-12 sm:-mt-16 pb-16">
        <motion.div
          className="bg-white rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.06)] overflow-hidden"
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
        >
          {/* Poster */}
          <div className="relative w-full h-56 sm:h-80 bg-gray-100 overflow-hidden">
            {poster ? (
              <CoverImage src={poster} alt={webinar.topic || webinar.title} className={`w-full h-full ${isCompleted ? 'grayscale-[30%]' : ''}`}
                onError={e => { e.target.style.display = 'none' }} />
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${color}22, ${color}11)` }}>
                <Video size={48} style={{ color }} className="opacity-40" />
              </div>
            )}
          </div>

          <div className="p-6 sm:p-10 space-y-8">
            {/* Description / highlights — rich text if the admin used the
                editor, otherwise the short plain-text description */}
            {webinar.highlights ? (
              <div
                className="blog-content text-gray-700 text-[15px] sm:text-base leading-[1.85]"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(webinar.highlights) }}
              />
            ) : webinar.description ? (
              <p className="text-gray-600 text-sm sm:text-[15px] leading-relaxed whitespace-pre-line">{webinar.description}</p>
            ) : null}

            {/* Speakers — full roster, one card per speaker (same pattern as WebinarRegister.jsx) */}
            {speakers.length > 0 && (
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                  {speakers.length > 1 ? 'Speakers' : 'Speaker'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {speakers.map((s, i) => (
                    <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                      <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-white shadow-sm" style={{ background: '#eef2f7' }}>
                        {s.image
                          ? <CoverImage src={s.image} alt={s.name} bias="center 25%" className="w-full h-full" />
                          : <Initials name={s.name} />}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-[#1a1a1a] truncate">{s.name}</div>
                        <div className="text-xs text-gray-400 truncate">{s.qualification}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CTAs — same status logic as WebinarCard, both an action button
                and an independent feedback button can show together */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              {isLive ? (
                <button onClick={handleWatch} disabled={!youtube}
                  className="flex-1 py-3.5 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: '#e11d48' }}>
                  <Play size={16} fill="currentColor" /> Live Now
                </button>
              ) : isCompleted ? (
                <button onClick={handleWatch} disabled={!youtube}
                  className="flex-1 py-3.5 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: color }}>
                  <Play size={16} fill="currentColor" /> Watch Now
                </button>
              ) : webinar.registrationEnabled === false ? (
                <button disabled
                  className="flex-1 py-3.5 rounded-xl font-bold text-sm text-gray-400 bg-gray-100 cursor-not-allowed">
                  Registration Closed
                </button>
              ) : (
                <button onClick={handleRegister}
                  className="flex-1 py-3.5 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90 active:scale-95"
                  style={{ background: color }}>
                  Register Now →
                </button>
              )}

              {showFeedbackButton && (
                <button onClick={handleFeedback}
                  className="flex-1 py-3.5 rounded-xl font-bold text-sm text-[#1655c3] border-2 border-[#1655c3] flex items-center justify-center gap-2 transition-all hover:bg-[#1655c3] hover:text-white">
                  <MessageCircle size={16} /> Give Feedback
                </button>
              )}
            </div>

            <div className="text-center pt-2">
              <Link to="/webinars" className="inline-flex items-center gap-2 text-sm font-semibold text-[#1655c3] hover:gap-3 transition-all duration-200">
                <ArrowLeft size={15} /> Back to Webinars
              </Link>
            </div>
          </div>
        </motion.div>
      </div>

      <Footer />
    </div>
  )
}
