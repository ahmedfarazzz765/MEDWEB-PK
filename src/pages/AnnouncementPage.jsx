import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, CalendarClock } from 'lucide-react'
import { announcementsService } from '../firebase/services'
import { isAnnouncementActive } from '../lib/announcements'
import Navbar from '../components/Navbar'
import Footer from '../sections/Footer'
import CoverImage from '../components/CoverImage'

export default function AnnouncementPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [item, setItem] = useState(undefined) // undefined = loading, null = not found, object = found

  useEffect(() => {
    window.scrollTo(0, 0)
    setItem(undefined)
    announcementsService.getBySlug(slug)
      .then(a => setItem(a || null))
      .catch(() => setItem(null))
  }, [slug])

  if (item === undefined) {
    return (
      <div className="font-poppins bg-[#f7f9fc] min-h-screen">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-24 text-center text-gray-400">Loading announcement…</div>
        <Footer />
      </div>
    )
  }

  if (!item) {
    return (
      <div className="font-poppins bg-[#f7f9fc] min-h-screen">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-24 text-center">
          <h1 className="text-2xl font-black text-[#1a1a1a] mb-3">Announcement Not Found</h1>
          <p className="text-gray-500 mb-6">This announcement may have been removed or the link is incorrect.</p>
          <Link to="/" className="inline-flex items-center gap-2 text-white font-semibold px-6 py-3 rounded-full bg-[#1655c3] hover:bg-[#123f8f] transition-colors">
            <ArrowLeft size={16} /> Back to Home
          </Link>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="font-poppins bg-[#f7f9fc] min-h-screen">
      <Navbar />

      {/* Hero band */}
      <div className="px-4 pt-10 pb-20 sm:pt-14 sm:pb-28" style={{ background: 'linear-gradient(135deg, #1655c3, #64ac37)' }}>
        <div className="max-w-3xl mx-auto">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-white/80 hover:text-white mb-6 transition-colors">
            <ArrowLeft size={16} /> Back
          </button>
          {!isAnnouncementActive(item) && (
            <span className="inline-block text-[11px] font-bold text-white bg-white/20 px-3 py-1 rounded-full mb-4">No longer active</span>
          )}
          <h1 className="text-white font-black text-3xl sm:text-4xl lg:text-5xl leading-tight">{item.title}</h1>
          {item.autoHideDate && (
            <div className="flex items-center gap-1.5 mt-4 text-white/85 text-sm">
              <CalendarClock size={14} /> Available until {item.autoHideDate}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 -mt-12 sm:-mt-16 pb-16">
        <motion.div
          className="bg-white rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.06)] overflow-hidden"
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
        >
          {item.imageUrl && (
            <div className="w-full h-56 sm:h-80 overflow-hidden">
              <CoverImage src={item.imageUrl} alt={item.title} className="w-full h-full" onError={e => { e.target.style.display = 'none' }} />
            </div>
          )}

          <div className="p-6 sm:p-10">
            {item.shortDescription && (
              <p className="text-gray-500 text-base sm:text-lg mb-6 font-medium">{item.shortDescription}</p>
            )}
            <div className="text-gray-700 text-[15px] sm:text-base leading-[1.85] whitespace-pre-line">
              {item.content}
            </div>
          </div>
        </motion.div>
      </div>

      <Footer />
    </div>
  )
}
