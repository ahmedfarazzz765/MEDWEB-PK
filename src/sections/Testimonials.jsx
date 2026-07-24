import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import { testimonialsService } from '../firebase/services'
import { useSiteSettings } from '../hooks/useSiteSettings'
import SectionHeading from '../components/SectionHeading'
import InfiniteMarquee from '../components/InfiniteMarquee'
import BrandWatermark from '../components/BrandWatermark'
import Skeleton from '../components/Skeleton'
import SectionEmptyState from '../components/SectionEmptyState'

const HEADING_DEFAULTS = {
  testimonialsHeading1: 'What Our Students',
  testimonialsHeading2: 'Say',
  testimonialsSubtitle: 'Thousands of students across Pakistan trust MEDWEB for their medical education journey.',
}

// Real Firestore Timestamp on every doc (added by services.js's generic add()).
function timeAgo(ts) {
  if (!ts) return null
  const date = ts.toDate ? ts.toDate() : ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts)
  if (isNaN(date.getTime())) return null
  const days = Math.floor((Date.now() - date.getTime()) / 86400000)
  if (days < 1) return 'Today'
  if (days === 1) return '1 day ago'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} month${months > 1 ? 's' : ''} ago`
  const years = Math.floor(months / 12)
  return `${years} year${years > 1 ? 's' : ''} ago`
}

function ReviewCard({ t }) {
  const ago = timeAgo(t.createdAt)
  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-1">
          {[...Array(t.stars || 5)].map((_, j) => (
            <Star key={j} size={13} className="text-yellow-400 fill-yellow-400" />
          ))}
        </div>
        {(t.category || t.uni) && (
          <span className="text-[10px] font-bold text-[#1655c3] bg-blue-50 px-2.5 py-1 rounded-full whitespace-nowrap truncate max-w-[140px]">
            {t.category || 'Student Review'}
          </span>
        )}
      </div>
      <p className="text-gray-600 text-sm leading-relaxed mb-5 italic">"{t.text}"</p>
      <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
        {t.img || t.imageUrl
          ? <img src={t.img || t.imageUrl} alt={t.name} className="w-10 h-10 rounded-full object-cover ring-2 ring-blue-100 flex-shrink-0" />
          : <div className="w-10 h-10 rounded-full bg-[#1655c3] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">{t.name?.charAt(0)}</div>
        }
        <div className="min-w-0 flex-1">
          <div className="font-bold text-[#1a1a1a] text-sm truncate">{t.name}</div>
          <div className="text-xs text-gray-400 leading-tight truncate">{t.uni || t.university}</div>
        </div>
        {ago && <div className="text-[10px] text-gray-400 whitespace-nowrap flex-shrink-0">{ago}</div>}
      </div>
    </div>
  )
}

export default function Testimonials() {
  const [testimonials, setTestimonials] = useState(null) // null = still loading; [] = confirmed empty
  const h = useSiteSettings(HEADING_DEFAULTS)

  useEffect(() => {
    const unsub = testimonialsService.listen(rows => {
      const approved = rows.filter(r => (r.status || 'Approved') === 'Approved')
      setTestimonials(approved)
    })
    return () => unsub && unsub()
  }, [])

  const loading = testimonials === null
  const empty = testimonials !== null && testimonials.length === 0

  // Split into up to 3 columns for the desktop marquee
  const colCount = loading || empty ? 3 : Math.min(3, testimonials.length) || 1
  const columns = loading || empty ? [] : Array.from({ length: colCount }, (_, col) => testimonials.filter((_, i) => i % colCount === col))

  return (
    <section className="py-10 sm:py-12 px-4 bg-white overflow-hidden relative">
      <BrandWatermark seed={2} />
      <div className="max-w-7xl mx-auto relative z-10">
        <SectionHeading word1={h.testimonialsHeading1} word2={h.testimonialsHeading2}
          subtitle={h.testimonialsSubtitle}
          className="mb-6 sm:mb-8" />

        {loading ? (
          <>
            <div className="hidden sm:grid grid-cols-3 gap-5" style={{ height: 560 }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-5">
                  <Skeleton className="h-40" />
                  <Skeleton className="h-40" />
                  <Skeleton className="h-40" />
                </div>
              ))}
            </div>
            <div className="sm:hidden flex gap-4 overflow-hidden">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="flex-shrink-0 w-[300px] h-52" />
              ))}
            </div>
          </>
        ) : empty ? (
          <SectionEmptyState message="Student reviews will appear here once submitted." />
        ) : (
          <>
            {/* Desktop/tablet — vertical marquee, columns drifting upward at slightly different speeds.
                Wrapped together in one marquee-pause-hover so hovering anywhere pauses all columns,
                matching the original single-wrapper hover behavior. */}
            <div className={`hidden sm:grid gap-5 marquee-pause-hover ${colCount === 3 ? 'grid-cols-3' : colCount === 2 ? 'grid-cols-2' : 'grid-cols-1'}`} style={{ height: 560 }}>
              {columns.map((col, ci) => (
                <InfiniteMarquee
                  key={ci}
                  items={col}
                  direction="y"
                  reverse={ci === 1}
                  pxPerSecond={22}
                  gap={20}
                  className="h-full"
                  itemClassName="w-full"
                  keyFn={(t, i) => t.id || i}
                  renderItem={t => <ReviewCard t={t} />}
                />
              ))}
            </div>

            {/* Mobile — same continuous technique, horizontal */}
            <div className="sm:hidden">
              <InfiniteMarquee
                items={testimonials}
                direction="x"
                pauseOnHover
                pxPerSecond={50}
                gap={16}
                itemClassName="w-[300px]"
                keyFn={(t, i) => t.id || i}
                renderItem={t => <ReviewCard t={t} />}
              />
            </div>
          </>
        )}
      </div>
    </section>
  )
}
