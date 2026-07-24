import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Calendar, Clock, Play, MessageCircle, Video, ArrowRight } from 'lucide-react'
import { webinarsService } from '../firebase/services'
import { useSiteSettings } from '../hooks/useSiteSettings'
import SectionHeading from '../components/SectionHeading'
import InfiniteMarquee from '../components/InfiniteMarquee'
import CardRowSkeleton from '../components/CardRowSkeleton'
import SectionEmptyState from '../components/SectionEmptyState'
import BrandWatermark from '../components/BrandWatermark'

const HEADING_DEFAULTS = {
  webinarsHeading1: 'Upcoming',
  webinarsHeading2: 'Webinars',
  webinarsSubtitle: 'Join expert-led live sessions and earn verified certificates. Seats fill fast!',
}

// Reuses the exact status colors already established in AdminWebinars.jsx's
// table so the public badge and the admin badge always agree.
const STATUS_STYLES = {
  Completed: { bg: '#f0fdf4', text: '#16a34a', label: 'Completed' },
  Upcoming:  { bg: '#eff6ff', text: '#1655c3', label: 'Upcoming' },
}

// Shows every webinar (past + future), grouped so the most relevant ones lead:
// Live first, then upcoming soonest-first, then completed most-recent-first.
// `date` is a free-text field from the admin form (e.g. "June 12, 2026") —
// unparseable dates fall to the end of their group rather than breaking sort.
export function sortWebinars(rows) {
  const parse = d => { const t = new Date(d).getTime(); return isNaN(t) ? null : t }
  const live      = rows.filter(r => r.status === 'Live')
  const upcoming  = rows.filter(r => r.status !== 'Live' && r.status !== 'Completed')
    .sort((a, b) => { const ta = parse(a.date), tb = parse(b.date); return (ta ?? Infinity) - (tb ?? Infinity) })
  const completed = rows.filter(r => r.status === 'Completed')
    .sort((a, b) => { const ta = parse(a.date), tb = parse(b.date); return (tb ?? -Infinity) - (ta ?? -Infinity) })
  return [...live, ...upcoming, ...completed]
}

function Initials({ name }) {
  const initials = name?.replace(/^Dr\.?\s*/i, '').split(' ').map(n => n[0]).slice(0, 2).join('') || '?'
  return (
    <div className="w-full h-full flex items-center justify-center text-white font-bold text-base bg-[#1655c3]">
      {initials}
    </div>
  )
}

export function WebinarCard({ webinar, onRegister }) {
  const color = webinar.color || '#1655c3'
  const isLive = webinar.status === 'Live'
  const isCompleted = webinar.status === 'Completed'
  const statusStyle = STATUS_STYLES[webinar.status] || STATUS_STYLES.Upcoming
  const youtube = webinar.youtubeLink || webinar.youtube || ''
  const poster = webinar.webinarImage || webinar.poster

  const handleWatch = () => { if (youtube) window.open(youtube, '_blank', 'noopener,noreferrer') }

  const handleFeedback = () => {
    if (webinar.feedbackFormId) {
      onRegister({ ...webinar, _feedbackMode: true })
    } else if (webinar.feedbackLink) {
      window.open(webinar.feedbackLink, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full overflow-hidden hover:shadow-lg transition-shadow duration-300 w-full max-w-[340px] mx-auto ${isCompleted ? 'opacity-80' : ''}`}>
      {/* WEBINAR POSTER (top) — fixed height keeps every card identical */}
      <div className="relative w-full aspect-video bg-gray-100 overflow-hidden">
        {poster ? (
          <img src={poster} alt={webinar.topic || webinar.title} className={`w-full h-full object-cover ${isCompleted ? 'grayscale-[30%]' : ''}`}
            onError={e => { e.target.style.display = 'none' }} />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${color}22, ${color}11)` }}>
            <Video size={40} style={{ color }} className="opacity-40" />
          </div>
        )}
        {/* status badge — Live keeps its pulsing treatment, everything else
            reuses the admin table's exact Upcoming/Completed colors */}
        {isLive ? (
          <span className="absolute top-3 left-3 text-[10px] font-bold px-2.5 py-1 rounded-full text-white flex items-center gap-1.5 animate-pulse shadow"
            style={{ background: '#e11d48' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-white" /> LIVE NOW
          </span>
        ) : (
          <span className="absolute top-3 left-3 text-[10px] font-bold px-2.5 py-1 rounded-full shadow" style={{ background: statusStyle.bg, color: statusStyle.text }}>
            {statusStyle.label}
          </span>
        )}
        {webinar.type && (
          <span className="absolute top-3 right-3 text-[10px] font-bold px-2.5 py-1 rounded-full text-white shadow"
            style={{ background: webinar.type === 'Free' ? '#64ac37' : '#1655c3' }}>
            {webinar.type}
          </span>
        )}
      </div>

      <div className="p-5 flex flex-col gap-3 flex-1">
        {/* WEBINAR NAME */}
        <h3 className="font-bold text-[#1a1a1a] text-[15px] leading-snug line-clamp-2 min-h-[44px]">
          {webinar.topic || webinar.title}
        </h3>

        {/* SPEAKER ROW: picture + name + qualification in front */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-white shadow-sm" style={{ background: '#eef2f7' }}>
            {webinar.speakerImage
              ? <img src={webinar.speakerImage} alt={webinar.speaker} className="w-full h-full object-cover" onError={e => { e.target.replaceWith(Object.assign(document.createElement('div'),{className:'w-full h-full'})); }} />
              : <Initials name={webinar.speaker} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm text-[#1a1a1a] truncate">{webinar.speaker}</div>
            <div className="text-xs text-gray-400 truncate">{webinar.role || webinar.qualification}</div>
          </div>
        </div>

        {/* DATE & TIME */}
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1">
          <div className="flex items-center gap-1.5 text-gray-500 text-xs">
            <Calendar size={13} className="text-[#1655c3] flex-shrink-0" />{webinar.date}
          </div>
          <div className="flex items-center gap-1.5 text-gray-500 text-xs">
            <Clock size={13} className="text-[#64ac37] flex-shrink-0" />{webinar.time}
          </div>
        </div>

        {/* CTA — Live Now (Live) / Register Now (Upcoming) / Watch Now (Completed, recording) */}
        {isLive ? (
          <button onClick={handleWatch} disabled={!youtube}
            className="mt-auto w-full py-2.5 rounded-xl font-bold text-xs text-white transition-all hover:opacity-90 active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50"
            style={{ background: '#e11d48' }}>
            <Play size={13} fill="currentColor" /> Live Now
          </button>
        ) : isCompleted ? (
          <button onClick={handleWatch} disabled={!youtube}
            className="mt-auto w-full py-2.5 rounded-xl font-bold text-xs text-white transition-all hover:opacity-90 active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50"
            style={{ background: color }}>
            <Play size={13} fill="currentColor" /> Watch Now
          </button>
        ) : (
          <button onClick={() => onRegister(webinar)}
            className="mt-auto w-full py-2.5 rounded-xl font-bold text-xs text-white transition-all hover:opacity-90 active:scale-95"
            style={{ background: color }}>
            Register Now →
          </button>
        )}

        {/* FEEDBACK BUTTON — independent per webinar, works regardless of status */}
        {webinar.feedbackEnabled && webinar.feedbackButtonEnabled !== false && (webinar.feedbackLink || webinar.feedbackFormId) && (
          <button onClick={handleFeedback}
            className="w-full py-2 rounded-xl font-bold text-xs text-[#1655c3] border-2 border-[#1655c3] flex items-center justify-center gap-1.5 transition-all hover:bg-[#1655c3] hover:text-white">
            <MessageCircle size={13} /> Give Feedback
          </button>
        )}
      </div>
    </div>
  )
}

export default function WebinarsSlider() {
  const navigate       = useNavigate()
  const [webinars, setWebinars] = useState(null) // null = still loading; [] = confirmed empty
  const h = useSiteSettings(HEADING_DEFAULTS)

  const handleRegister = (webinar) => {
    // feedback custom-form mode — still a page navigation, untouched
    if (webinar._feedbackMode && webinar.feedbackFormId) {
      navigate(`/form/${webinar.feedbackFormId}`)
      return
    }
    // explicit external registration link (e.g. Google Form) overrides the in-app flow
    if (webinar.registrationLink) {
      window.open(webinar.registrationLink, '_blank', 'noopener,noreferrer')
      return
    }
    // Registration always opens the dedicated page now — never a popup.
    // WebinarRegister.jsx resolves the webinar's own form / sitewide default itself.
    if (webinar.isStatic) navigate('/webinar/static/register')
    else navigate(`/webinar/${webinar.id}/register`)
  }

  useEffect(() => {
    const unsub = webinarsService.listen(rows => {
      setWebinars(sortWebinars(rows))
    })
    return () => unsub()
  }, [])

  return (
    <section id="webinars" className="py-10 sm:py-12 px-4 bg-[#f7f9fc] relative overflow-hidden">
      <BrandWatermark seed={4} />
      <div className="max-w-7xl mx-auto relative z-10">
        <SectionHeading word1={h.webinarsHeading1} word2={h.webinarsHeading2}
          subtitle={h.webinarsSubtitle}
          className="mb-4" />
        <div className="text-center mb-6 sm:mb-8">
          <Link to="/webinars" className="inline-flex items-center gap-2 text-[#1655c3] font-semibold text-sm hover:gap-3 transition-all duration-200">
            See All <ArrowRight size={15} />
          </Link>
        </div>

        {webinars === null ? (
          <CardRowSkeleton count={3} cardWidth={300} cardHeight={360} gap={24} />
        ) : webinars.length === 0 ? (
          <SectionEmptyState message="Webinars will appear here once scheduled in the admin panel." />
        ) : (
          <InfiniteMarquee
            items={webinars}
            pauseOnHover
            showNav
            gap={24}
            itemClassName="w-[300px] sm:w-[340px]"
            keyFn={(w, i) => w.id || i}
            renderItem={w => <WebinarCard webinar={w} onRegister={handleRegister} />}
          />
        )}
      </div>
    </section>
  )
}
