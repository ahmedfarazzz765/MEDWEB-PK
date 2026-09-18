import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Calendar, ExternalLink, Link2 } from 'lucide-react'
import DOMPurify from 'dompurify'
import { motion } from 'framer-motion'
import { newsService } from '../firebase/services'
import Navbar from '../components/Navbar'
import Footer from '../sections/Footer'
import CoverImage from '../components/CoverImage'

// A small "More News" card used in the sidebar (desktop) / below the
// article (mobile) — thumbnail + title only, same idea as a related-posts
// list, since Blog has no existing pattern for this to mirror (checked).
function OtherNewsCard({ item }) {
  return (
    <Link to={`/news/${item.slug}`} className="flex gap-3 items-center group">
      <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-blue-50">
        {item.imageUrl
          ? <CoverImage src={item.imageUrl} alt={item.title} className="w-full h-full" />
          : <div className="w-full h-full flex items-center justify-center text-[#1655c3] font-black opacity-30">N</div>
        }
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[#1a1a1a] group-hover:text-[#1655c3] transition-colors line-clamp-2">{item.title}</p>
        {item.published && <p className="text-[11px] text-gray-400 mt-1">{item.published}</p>}
      </div>
    </Link>
  )
}

export default function NewsPostPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [item, setItem] = useState(undefined) // undefined = loading, null = not found, object = found
  const [others, setOthers] = useState([])

  useEffect(() => {
    window.scrollTo(0, 0)
    setItem(undefined)
    newsService.getBySlug(slug)
      .then(p => setItem(p && p.status === 'Published' ? p : null))
      .catch(() => setItem(null))
  }, [slug])

  useEffect(() => {
    if (!item) return
    newsService.getPublished()
      .then(rows => setOthers(rows.filter(r => r.id !== item.id).slice(0, 6)))
      .catch(() => setOthers([]))
  }, [item])

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
          <h1 className="text-2xl font-black text-[#1a1a1a] mb-3">News Item Not Found</h1>
          <p className="text-gray-500 mb-6">This item may have been removed, unpublished, or the link is incorrect.</p>
          <Link to="/news" className="inline-flex items-center gap-2 text-white font-semibold px-6 py-3 rounded-full bg-[#1655c3] hover:bg-[#123f8f] transition-colors">
            <ArrowLeft size={16} /> Back to News
          </Link>
        </div>
        <Footer />
      </div>
    )
  }

  const references = (item.references || []).filter(r => r.url?.trim())

  return (
    <div className="font-poppins bg-[#f7f9fc] min-h-screen">
      <Navbar />

      <div className="px-4 pt-10 pb-16 sm:pt-14 sm:pb-24" style={{ background: 'linear-gradient(135deg, #1655c3, #64ac37)' }}>
        <div className="max-w-3xl mx-auto">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-white/80 hover:text-white mb-6 transition-colors">
            <ArrowLeft size={16} /> Back
          </button>
          <span className="inline-block text-[11px] font-bold text-white bg-white/20 px-3 py-1 rounded-full mb-4">Medical News</span>
          <h1 className="text-white font-black text-3xl sm:text-4xl lg:text-5xl leading-tight">{item.title}</h1>
          {item.published && (
            <div className="flex items-center gap-2 mt-4 text-white/85 text-sm">
              <Calendar size={14} /> {item.published}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-10 sm:-mt-14 pb-16">
        <div className="grid lg:grid-cols-[1fr_320px] gap-8 items-start">
          <motion.div
            className="bg-white rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.06)] overflow-hidden"
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          >
            {item.imageUrl && (
              <div className="w-full bg-blue-50">
                {/* object-contain, not CoverImage's crop — the full thumbnail, uncropped */}
                <img src={item.imageUrl} alt={item.title} className="w-full max-h-[420px] object-contain mx-auto" />
              </div>
            )}

            <div className="p-6 sm:p-10">
              {references.length > 0 && (
                <div className="mb-8 p-4 rounded-2xl bg-blue-50/60 border border-blue-100">
                  <p className="text-xs font-bold text-[#1655c3] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Link2 size={13} /> Source{references.length > 1 ? 's' : ''}
                  </p>
                  <ul className="space-y-1.5">
                    {references.map((r, i) => (
                      <li key={i}>
                        <a href={r.url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm text-[#1655c3] hover:underline break-all">
                          {r.label?.trim() || r.url} <ExternalLink size={12} className="shrink-0" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div
                className="blog-content text-gray-700 text-[15px] sm:text-base leading-[1.85]"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(item.content || '') }}
              />
            </div>
          </motion.div>

          {others.length > 0 && (
            <aside className="bg-white rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.06)] p-6">
              <h3 className="font-bold text-[#1a1a1a] text-sm mb-5">More News</h3>
              <div className="space-y-4">
                {others.map(o => <OtherNewsCard key={o.id} item={o} />)}
              </div>
            </aside>
          )}
        </div>
      </div>

      <Footer />
    </div>
  )
}
