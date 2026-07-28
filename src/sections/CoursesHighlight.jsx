import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, Star, Clock } from 'lucide-react'
import { coursesService } from '../firebase/services'
import { useSiteSettings } from '../hooks/useSiteSettings'
import SectionHeading from '../components/SectionHeading'
import InfiniteMarquee from '../components/InfiniteMarquee'
import CardRowSkeleton from '../components/CardRowSkeleton'
import SectionEmptyState from '../components/SectionEmptyState'
import BrandWatermark from '../components/BrandWatermark'
import CoverImage from '../components/CoverImage'

const HEADING_DEFAULTS = {
  coursesHeading1: 'Featured',
  coursesHeading2: 'Courses',
  coursesSubtitle: 'Expert-designed programs to elevate your clinical knowledge and professional skills.',
}

const COLORS  = ['#d97706','#1655c3','#64ac37','#7c3aed']
const BGS     = ['linear-gradient(135deg,#fffbeb,#fef3c7)','linear-gradient(135deg,#eff6ff,#dbeafe)','linear-gradient(135deg,#f0fdf4,#dcfce7)','linear-gradient(135deg,#f5f3ff,#ede9fe)']

export function CourseCard({ c, i }) {
  const color = COLORS[i % COLORS.length]
  const bg    = BGS[i % BGS.length]
  const poster = c.posterImage || c.imageUrl
  return (
    <div className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 flex flex-col group relative overflow-hidden h-full">
      <div className="relative aspect-video w-full">
        {poster
          ? <CoverImage src={poster} className="w-full h-full" alt={c.title} />
          : <div className="w-full h-full flex items-center justify-center" style={{ background: bg }}>
              <BookOpen size={32} style={{ color }} className="opacity-50" />
            </div>
        }
        {c.type && <span className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background:color }}>{c.type}</span>}
      </div>
      <div className="p-5 sm:p-6 flex flex-col flex-1">
        <h3 className="font-bold text-[#1a1a1a] text-sm sm:text-base mb-2 leading-snug group-hover:text-[#1655c3] transition-colors">{c.title}</h3>
        <p className="text-gray-500 text-sm leading-relaxed line-clamp-2">{c.shortDescription || c.description || 'Expert-designed course for healthcare students.'}</p>
        <div className="flex items-center gap-3 mt-3 flex-wrap">
          {c.rating > 0 && (
            <div className="flex items-center gap-1 text-xs font-bold text-amber-500">
              <Star size={13} fill="currentColor" /> {c.rating}
            </div>
          )}
          {(c.students > 0) && (
            <div className="text-xs text-gray-400">
              <span className="font-bold" style={{ color }}>{Number(c.students).toLocaleString()}</span> students
            </div>
          )}
          {c.courseDuration && (
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Clock size={12} /> {c.courseDuration}
            </div>
          )}
        </div>
        {Array.isArray(c.tags) && c.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {c.tags.slice(0, 3).map((tag, i) => (
              <span key={i} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{tag}</span>
            ))}
          </div>
        )}
        {c.id ? (
          <Link to={`/courses/${c.id}`} className="inline-flex items-center gap-1.5 text-sm font-semibold mt-5 group-hover:gap-3 transition-all duration-200" style={{ color }}>
            Explore Course <ArrowRight size={15} />
          </Link>
        ) : (
          <Link to="/courses" className="inline-flex items-center gap-1.5 text-sm font-semibold mt-5 group-hover:gap-3 transition-all duration-200" style={{ color }}>
            Explore Course <ArrowRight size={15} />
          </Link>
        )}
      </div>
    </div>
  )
}

export default function CoursesHighlight() {
  const [courses, setCourses] = useState(null) // null = still loading; [] = confirmed empty
  const h = useSiteSettings(HEADING_DEFAULTS)

  useEffect(() => {
    const unsub = coursesService.listen(rows => {
      // Prefer courses that aren't explicitly inactive/draft/archived; if every
      // course happens to be in that state, fall back to showing them anyway
      // rather than hiding real admin-entered courses outright.
      const visible = rows.filter(r => !['Inactive', 'Draft', 'Hidden', 'Archived'].includes(r.status))
      const eligible = visible.length > 0 ? visible : rows
      // This is the "Featured Courses" section — show only courses marked
      // featured; if none are marked yet, fall back to all eligible courses
      // so the section doesn't go blank before any admin sets the flag.
      const featured = eligible.filter(r => r.featured === true)
      setCourses(featured.length > 0 ? featured : eligible)
    })
    return () => unsub()
  }, [])

  return (
    <section id="courses-highlight" className="py-10 sm:py-12 px-4 bg-[#f7f9fc] relative overflow-hidden">
      <BrandWatermark seed={5} />
      <div className="max-w-7xl mx-auto relative z-10">
        <SectionHeading word1={h.coursesHeading1} word2={h.coursesHeading2}
          subtitle={h.coursesSubtitle}
          className="mb-4" />
        <div className="text-center mb-6 sm:mb-8">
          <Link to="/courses" className="inline-flex items-center gap-2 text-[#1655c3] font-semibold text-sm hover:gap-3 transition-all duration-200">
            See All <ArrowRight size={15} />
          </Link>
        </div>

        {courses === null ? (
          <CardRowSkeleton count={4} cardWidth={280} cardHeight={320} />
        ) : courses.length === 0 ? (
          <SectionEmptyState message="Courses will appear here once added in the admin panel." />
        ) : (
          <InfiniteMarquee
            items={courses}
            pauseOnHover
            showNav
            gap={20}
            itemClassName="w-[260px] sm:w-[300px]"
            keyFn={(c, i) => c.id || i}
            renderItem={(c, i) => <CourseCard c={c} i={i} />}
          />
        )}
      </div>
    </section>
  )
}
