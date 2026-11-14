import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { newsService } from '../firebase/services'
import SectionHeading from '../components/SectionHeading'
import CardRowSkeleton from '../components/CardRowSkeleton'
import SectionEmptyState from '../components/SectionEmptyState'
import EventCard from '../components/events/EventCard'

// "Latest from MEDWEB Events" — 3 most recent published cards.
export default function LatestEvents() {
  const [items, setItems] = useState(null)

  useEffect(() => {
    newsService.getPublished().then(rows => setItems(rows.slice(0, 3))).catch(() => setItems([]))
  }, [])

  return (
    <section id="events" className="py-10 sm:py-12 px-4 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto relative z-10">
        <SectionHeading word1="Latest from" word2="MEDWEB Events" subtitle="Conferences, seminars, workshops and medical camps we've hosted." className="mb-4" />
        <div className="text-center mb-6 sm:mb-8">
          <Link to="/events" className="inline-flex items-center gap-2 text-[#1655c3] font-semibold text-sm hover:gap-3 transition-all duration-200">
            See All <ArrowRight size={15} />
          </Link>
        </div>

        {items === null ? (
          <CardRowSkeleton count={3} cardWidth={320} cardHeight={300} />
        ) : items.length === 0 ? (
          <SectionEmptyState message="Events will appear here once published in the admin panel." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {items.map((item, i) => <EventCard key={item.id} item={item} index={i} />)}
          </div>
        )}
      </div>
    </section>
  )
}
