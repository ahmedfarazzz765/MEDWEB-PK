import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, ExternalLink, Megaphone } from 'lucide-react'
import { announcementsService } from '../firebase/services'
import { isAnnouncementActive } from '../lib/announcements'
import Navbar from '../components/Navbar'
import Footer from '../sections/Footer'
import SectionHeading from '../components/SectionHeading'
import CardRowSkeleton from '../components/CardRowSkeleton'
import SectionEmptyState from '../components/SectionEmptyState'
import CoverImage from '../components/CoverImage'

function AnnouncementCard({ a }) {
  const navigate = useNavigate()
  const active = isAnnouncementActive(a)

  // Every announcement gets a slug regardless of linkType (AdminAnnouncements.jsx
  // always assigns one on save), so /announcements/:slug works as a universal
  // detail page — clicking the card body always goes there first. The CTA
  // button below is a separate, faster shortcut straight to the destination
  // (external tab, or the same detail page for 'internal' since that page IS
  // the destination) — kept working exactly as before via stopPropagation so
  // it doesn't also trigger the card's own navigation.
  const goToDetail = () => { if (a.slug) navigate(`/announcements/${a.slug}`) }
  const handleCtaClick = e => {
    e.stopPropagation()
    if (a.linkType === 'external' && a.externalUrl) {
      window.open(a.externalUrl, '_blank', 'noopener,noreferrer')
    } else if (a.slug) {
      navigate(`/announcements/${a.slug}`)
    }
  }

  return (
    <article
      onClick={goToDetail}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter') goToDetail() }}
      className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 flex flex-col h-full cursor-pointer"
    >
      <div className="relative aspect-video overflow-hidden" style={{ background: 'linear-gradient(135deg,#eff6ff,#f0fdf4)' }}>
        {a.imageUrl ? (
          <CoverImage src={a.imageUrl} alt={a.title} className="w-full h-full hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Megaphone size={36} className="text-[#1655c3] opacity-30" />
          </div>
        )}
        <span className={`absolute top-3 left-3 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-sm ${active ? 'bg-[#64ac37] text-white' : 'bg-gray-700/80 text-white'}`}>
          {active ? 'Active' : 'Past'}
        </span>
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <h3 className="font-black text-base text-[#0f172a] leading-snug mb-2 line-clamp-2">{a.title}</h3>
        {a.shortDescription && (
          <p className="text-gray-500 text-sm leading-relaxed line-clamp-3 mb-4 flex-1">{a.shortDescription}</p>
        )}

        {Array.isArray(a.highlights) && a.highlights.filter(Boolean).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {a.highlights.filter(Boolean).slice(0, 3).map((h, i) => (
              <span key={i} className="text-[10px] font-bold text-[#1655c3] bg-blue-50 px-2.5 py-1 rounded-full">{h}</span>
            ))}
          </div>
        )}

        <button
          onClick={handleCtaClick}
          className="inline-flex items-center justify-center gap-2 mt-auto text-sm font-bold text-white px-4 py-2.5 rounded-xl hover:gap-3 transition-all w-fit"
          style={{ background: 'linear-gradient(135deg, #1655c3, #64ac37)' }}
        >
          {a.ctaLabel || 'Learn More'}
          {a.linkType === 'external' ? <ExternalLink size={14} /> : <ArrowRight size={14} />}
        </button>
      </div>
    </article>
  )
}

// Full archive — every announcement (active AND past/disabled), unlike the
// homepage ticker which only shows currently-active ones.
export default function AnnouncementsListPage() {
  const [items, setItems] = useState(null) // null = loading

  useEffect(() => {
    window.scrollTo(0, 0)
    const unsub = announcementsService.listen(setItems)
    return unsub
  }, [])

  return (
    <div className="font-poppins bg-[#f7f9fc] min-h-screen">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 pt-10 pb-16">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#1655c3] mb-6 transition-colors">
          <ArrowLeft size={16} /> Back to Home
        </Link>

        <SectionHeading word1="All" word2="Announcements" subtitle="Every event, program, and update MEDWEB has promoted — past and present." className="mb-10" />

        {items === null ? (
          <CardRowSkeleton count={6} cardWidth={320} cardHeight={340} gap={24} />
        ) : items.length === 0 ? (
          <SectionEmptyState message="Announcements will appear here once published in the admin panel." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map(a => <AnnouncementCard key={a.id} a={a} />)}
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}
