import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Link2, ExternalLink, PlayCircle } from 'lucide-react'
import DOMPurify from 'dompurify'
import { motion } from 'framer-motion'
import { newsService } from '../firebase/services'
import { useSiteData } from '../hooks/useSiteData'
import SEO, { SITE_URL } from '../components/SEO'
import Navbar from '../components/Navbar'
import Footer from '../sections/Footer'
import CoverImage from '../components/CoverImage'
import EventCard, { CATEGORY_COLORS } from '../components/events/EventCard'
import EventGallery from '../components/events/EventGallery'
import ShareButtons from '../components/events/ShareButtons'

function fallbackDescription(html, max = 155) {
  const text = String(html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  return text.length > max ? text.slice(0, max).trim() + '…' : text
}
function readingTime(html) {
  const words = String(html || '').replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 200))
}
function youtubeEmbedUrl(url) {
  const m = String(url || '').match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{6,})/)
  return m ? `https://www.youtube.com/embed/${m[1]}` : null
}

export default function EventPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { news, loading: siteDataLoading } = useSiteData()
  const [item, setItem] = useState(undefined) // undefined = loading, null = not found

  useEffect(() => {
    window.scrollTo(0, 0)
    if (siteDataLoading) return
    // siteData.news is already Published-only and carries the full doc
    // (not trimmed, unlike blogs) — a cache hit means zero extra reads.
    // Only an item not yet in the cache falls back to a live fetch.
    const cached = news.find(n => n.slug === slug)
    if (cached) { setItem(cached); return }
    setItem(undefined)
    newsService.getBySlug(slug)
      .then(p => setItem(p && p.status === 'Published' ? p : null))
      .catch(() => setItem(null))
  }, [slug, news, siteDataLoading])

  const related = (() => {
    if (!item) return []
    const sameCategory = news.filter(r => r.id !== item.id && (r.category || 'News') === (item.category || 'News'))
    const pool = sameCategory.length >= 3 ? sameCategory : news.filter(r => r.id !== item.id)
    return pool.slice(0, 3)
  })()

  if (item === undefined) {
    return (
      <div className="font-poppins bg-[#f7f9fc] min-h-screen">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-24 text-center text-gray-400">Loading article…</div>
        <Footer />
      </div>
    )
  }

  if (!item) {
    return (
      <div className="font-poppins bg-[#f7f9fc] min-h-screen">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-24 text-center">
          <h1 className="text-2xl font-black text-[#1a1a1a] mb-3">Not Found</h1>
          <p className="text-gray-500 mb-6">This event/news item may have been removed, unpublished, or the link is incorrect.</p>
          <Link to="/events" className="inline-flex items-center gap-2 text-white font-semibold px-6 py-3 rounded-full bg-[#1655c3] hover:bg-[#123f8f] transition-colors">
            <ArrowLeft size={16} /> Back to Events & News
          </Link>
        </div>
        <Footer />
      </div>
    )
  }

  const category = item.category || 'News'
  const color = CATEGORY_COLORS[category] || '#1655c3'
  const poster = item.coverImage || item.imageUrl
  const references = (item.references || []).filter(r => r.url?.trim())
  const gallery = (item.gallery || []).filter(g => g.url)
  const videos = (item.videos || []).filter(v => v.url?.trim())
  const partners = (item.partners || []).filter(p => p.name?.trim())
  const highlights = (item.highlights || []).filter(h => h.label?.trim())
  const organisers = item.organisers || []
  const chiefGuests = item.chiefGuests || []
  const speakers = (item.speakers || []).filter(s => s.name?.trim())
  const when = item.startDate ? `${item.startDate}${item.endDate && item.endDate !== item.startDate ? ` – ${item.endDate}` : ''}` : item.published
  const canonicalPath = `/events/${slug}`
  const shareUrl = `${SITE_URL}${canonicalPath}`

  const eventJsonLd = item.startDate ? {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: item.title,
    startDate: item.startDate,
    ...(item.endDate ? { endDate: item.endDate } : {}),
    description: item.seoDescription || item.summary || fallbackDescription(item.content),
    ...(poster ? { image: [poster] } : {}),
    location: item.venue || item.city ? { '@type': 'Place', name: item.venue || item.city, address: item.city } : undefined,
    organizer: { '@type': 'Organization', name: 'MEDWEB-PK', url: SITE_URL },
  } : undefined

  return (
    <div className="font-poppins bg-[#f7f9fc] min-h-screen">
      <SEO
        title={item.seoTitle || item.title}
        description={item.seoDescription || item.summary || fallbackDescription(item.content)}
        path={canonicalPath}
        image={item.shareImage || poster}
        type="article"
        jsonLd={eventJsonLd}
      />
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 pt-8 pb-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#1655c3] mb-6 transition-colors">
          <ArrowLeft size={16} /> Back
        </button>
        {/* Breadcrumb */}
        <div className="text-xs text-gray-400 mb-3">
          <Link to="/" className="hover:text-[#1655c3]">Home</Link> <span className="mx-1">/</span>
          <Link to="/events" className="hover:text-[#1655c3]">Events & News</Link> <span className="mx-1">/</span>
          <span className="text-gray-500">{category}</span>
        </div>
        {/* Green kicker */}
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#64ac37' }}>{category}</span>
        {/* Serif headline */}
        <h1 className="font-black text-3xl sm:text-4xl lg:text-5xl leading-tight mt-2 text-[#1a1a1a]" style={{ fontFamily: "'Playfair Display', serif" }}>
          {item.title}
        </h1>
        {item.summary && (
          <p className="italic text-gray-500 text-lg sm:text-xl mt-3 leading-snug" style={{ fontFamily: "'Playfair Display', serif" }}>
            {item.summary}
          </p>
        )}
        {/* Byline */}
        <div className="flex items-center justify-between flex-wrap gap-3 mt-5 pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            <span className="font-semibold text-[#1a1a1a]">MEDWEB-PK News Desk</span>
            {item.city && <> {' '}| {item.city.toUpperCase()}</>}
            {when && <> , {when}</>}
            {' '}| {readingTime(item.content)} min read
          </div>
          <ShareButtons url={shareUrl} title={item.title} />
        </div>
      </div>

      {/* Framed lead image */}
      {poster && (
        <div className="max-w-4xl mx-auto px-4 mb-10">
          <div className="bg-white rounded-sm p-2" style={{ border: '1px solid #d4d4d8', boxShadow: '0 12px 32px rgba(0,0,0,0.1)' }}>
            <CoverImage src={poster} alt={item.title} className="w-full max-h-[480px]" />
          </div>
          {(item.venue || item.city) && (
            <p className="text-xs text-gray-400 text-center mt-2">{[item.venue, item.city].filter(Boolean).join(', ')}</p>
          )}
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 pb-8">
        <div className="grid lg:grid-cols-[1fr_280px] gap-8 items-start">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            {references.length > 0 && (
              <div className="mb-6 p-4 rounded-2xl bg-blue-50/60 border border-blue-100">
                <p className="text-xs font-bold text-[#1655c3] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Link2 size={13} /> Source{references.length > 1 ? 's' : ''}
                </p>
                <ul className="space-y-1.5">
                  {references.map((r, i) => (
                    <li key={i}>
                      <a href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-[#1655c3] hover:underline break-all">
                        {r.label?.trim() || r.url} <ExternalLink size={12} className="shrink-0" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div
              className="event-body blog-content text-gray-700 text-[15px] sm:text-base leading-[1.85]"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(item.content || '') }}
            />
          </motion.div>

          {/* Sticky Key Facts sidebar */}
          {(highlights.length > 0 || organisers.length > 0 || chiefGuests.length > 0 || speakers.length > 0) && (
            <aside className="bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.06)] p-6 lg:sticky lg:top-24">
              <h3 className="font-bold text-[#1a1a1a] text-sm mb-4 pb-3 border-b border-gray-100">Key Facts</h3>
              <div className="space-y-3">
                {highlights.map((h, i) => (
                  <div key={i}>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{h.label}</div>
                    <div className="text-sm font-semibold text-[#1a1a1a]">{h.value}</div>
                  </div>
                ))}
                {organisers.length > 0 && (
                  <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Organisers</div>
                    <div className="text-sm text-[#1a1a1a]">{organisers.join(', ')}</div>
                  </div>
                )}
                {chiefGuests.length > 0 && (
                  <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Chief Guests</div>
                    <div className="text-sm text-[#1a1a1a]">{chiefGuests.join(', ')}</div>
                  </div>
                )}
                {speakers.length > 0 && (
                  <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Speakers</div>
                    <ul className="space-y-1">
                      {speakers.map((s, i) => (
                        <li key={i} className="text-sm text-[#1a1a1a]">{s.name}{s.title && <span className="text-gray-400"> — {s.title}</span>}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </aside>
          )}
        </div>
      </div>

      {/* Gallery */}
      {gallery.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 pb-12">
          <h3 className="font-bold text-[#1a1a1a] text-lg mb-5" style={{ fontFamily: "'Playfair Display', serif" }}>Gallery</h3>
          <EventGallery items={gallery} />
        </div>
      )}

      {/* Videos */}
      {videos.length > 0 && (
        <div className="max-w-5xl mx-auto px-4 pb-12">
          <h3 className="font-bold text-[#1a1a1a] text-lg mb-5" style={{ fontFamily: "'Playfair Display', serif" }}>Videos</h3>
          <div className="grid sm:grid-cols-2 gap-5">
            {videos.map((v, i) => {
              const embed = v.type === 'youtube' ? youtubeEmbedUrl(v.url) : null
              return (
                <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                  <div className="aspect-video bg-black">
                    {embed ? (
                      <iframe src={embed} title={v.title || 'Video'} className="w-full h-full" allowFullScreen loading="lazy" />
                    ) : (
                      <video src={v.url} controls className="w-full h-full" />
                    )}
                  </div>
                  {v.title && <p className="text-sm font-semibold text-[#1a1a1a] p-3 flex items-center gap-2"><PlayCircle size={14} className="text-[#1655c3]" /> {v.title}</p>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Partners */}
      {partners.length > 0 && (
        <div className="max-w-5xl mx-auto px-4 pb-12">
          <h3 className="font-bold text-[#1a1a1a] text-lg mb-5" style={{ fontFamily: "'Playfair Display', serif" }}>Partners</h3>
          <div className="flex flex-wrap items-center gap-6">
            {partners.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                {p.logoUrl ? <img src={p.logoUrl} alt={p.name} className="h-10 object-contain" /> : null}
                <span className="text-sm font-semibold text-gray-600">{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Related */}
      {related.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 pb-16">
          <h3 className="font-bold text-[#1a1a1a] text-lg mb-5" style={{ fontFamily: "'Playfair Display', serif" }}>Related</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {related.map((r, i) => <EventCard key={r.id} item={r} index={i} />)}
          </div>
        </div>
      )}

      <Footer />
    </div>
  )
}
