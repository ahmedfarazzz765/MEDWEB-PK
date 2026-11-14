import { useEffect, useState, useMemo } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { newsService } from '../firebase/services'
import Navbar from '../components/Navbar'
import Footer from '../sections/Footer'
import SectionHeading from '../components/SectionHeading'
import CardRowSkeleton from '../components/CardRowSkeleton'
import SectionEmptyState from '../components/SectionEmptyState'
import SEO from '../components/SEO'
import EventCard, { CATEGORY_COLORS } from '../components/events/EventCard'
import FeaturedEvent from '../components/events/FeaturedEvent'

const PAGE_SIZE = 12
const CATEGORIES = ['All', 'Conference', 'Seminar', 'Webinar', 'Medical Camp', 'Workshop', 'Awareness', 'News']

function useReducedMotion() {
  const [reduce, setReduce] = useState(false)
  useEffect(() => {
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
      setReduce(mq.matches)
      const onChange = () => setReduce(mq.matches)
      mq.addEventListener('change', onChange)
      return () => mq.removeEventListener('change', onChange)
    } catch { /* matchMedia unsupported — default to full motion */ }
  }, [])
  return reduce
}

export default function EventsListPage() {
  const [items, setItems] = useState(null)
  const [category, setCategory] = useState('All')
  const [year, setYear] = useState('All')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    const unsub = newsService.listen(rows => setItems(rows.filter(r => r.status === 'Published')))
    return () => unsub()
  }, [])

  const years = useMemo(() => {
    if (!items) return []
    const set = new Set(items.map(i => (i.startDate || i.published || '').slice(0, 4)).filter(Boolean))
    return Array.from(set).sort((a, b) => b - a)
  }, [items])

  const featured = useMemo(() => (items || []).find(i => i.featured) || null, [items])

  const filtered = useMemo(() => {
    if (!items) return []
    return items.filter(i => {
      if (category !== 'All' && (i.category || 'News') !== category) return false
      if (year !== 'All' && !(i.startDate || i.published || '').startsWith(year)) return false
      return true
    })
  }, [items, category, year])

  // The featured card already gets its own large frame above — skip it
  // from the regular grid so it isn't shown twice.
  const gridItems = filtered.filter(i => i.id !== featured?.id)

  return (
    <div className="font-poppins bg-[#f7f9fc] min-h-screen">
      <SEO title="Events & News" description="MEDWEB-PK's conferences, seminars, workshops, medical camps and curated medical news." path="/events" />
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 pt-10 pb-16">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#1655c3] mb-6 transition-colors">
          <ArrowLeft size={16} /> Back to Home
        </Link>

        <SectionHeading word1="Events" word2="& News" subtitle="Conferences, seminars, workshops, medical camps, and curated medical news." className="mb-8" />

        {items === null ? (
          <CardRowSkeleton count={6} cardWidth={320} cardHeight={320} gap={24} />
        ) : items.length === 0 ? (
          <SectionEmptyState message="Events and news will appear here once published in the admin panel." />
        ) : (
          <>
            {featured && category === 'All' && year === 'All' && <FeaturedEvent item={featured} reduceMotion={reduceMotion} />}

            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(c => (
                  <button key={c} onClick={() => setCategory(c)}
                    className="text-xs font-bold px-3 py-1.5 rounded-full border transition-all"
                    style={category === c
                      ? { background: CATEGORY_COLORS[c] || '#1655c3', color: '#fff', borderColor: 'transparent' }
                      : { background: '#fff', color: '#6b7280', borderColor: '#e5e7eb' }}
                  >
                    {c}
                  </button>
                ))}
              </div>
              {years.length > 0 && (
                <select value={year} onChange={e => setYear(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white">
                  <option value="All">All years</option>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              )}
            </div>

            {gridItems.length === 0 ? (
              <SectionEmptyState message="No events match these filters yet." />
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {gridItems.slice(0, visibleCount).map((item, i) => (
                    <EventCard key={item.id} item={item} index={i} reduceMotion={reduceMotion} />
                  ))}
                </div>
                {visibleCount < gridItems.length && (
                  <div className="text-center mt-10">
                    <button onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
                      className="px-7 py-3 rounded-full text-sm font-bold text-[#1655c3] border-2 border-[#1655c3] hover:bg-[#1655c3] hover:text-white transition-all duration-300">
                      Load More
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
      <Footer />
    </div>
  )
}
