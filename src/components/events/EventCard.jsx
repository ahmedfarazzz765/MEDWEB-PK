import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Calendar, Image as ImageIcon, Video } from 'lucide-react'
import CoverImage from '../CoverImage'

const CATEGORY_COLORS = {
  Conference: '#1655c3', Seminar: '#64ac37', Webinar: '#7c3aed',
  'Medical Camp': '#dc2626', Workshop: '#d97706', Awareness: '#0891b2', News: '#1655c3',
}

// Framed card — thin silver border, soft shadow, slight tilt, staggered
// fade-up on scroll, tilt+zoom on hover. prefers-reduced-motion drops the
// entrance animation to a plain fade and disables the hover tilt.
export default function EventCard({ item, index = 0, reduceMotion = false }) {
  const color = CATEGORY_COLORS[item.category] || '#1655c3'
  const photoCount = (item.gallery || []).length
  const videoCount = (item.videos || []).length

  return (
    <motion.div
      initial={{ opacity: 0, y: reduceMotion ? 0 : 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay: reduceMotion ? 0 : Math.min(index * 0.06, 0.4) }}
    >
      <Link to={`/events/${item.slug}`} className="block group">
        <motion.div
          className="relative bg-white rounded-sm p-2 shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
          style={{ border: '1px solid #d4d4d8', rotate: reduceMotion ? 0 : -0.6 }}
          whileHover={reduceMotion ? {} : { rotate: 0, scale: 1.02, transition: { duration: 0.3 } }}
        >
          <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
            {item.coverImage || item.imageUrl ? (
              <motion.div className="w-full h-full" whileHover={reduceMotion ? {} : { scale: 1.08 }} transition={{ duration: 0.5 }}>
                <CoverImage src={item.coverImage || item.imageUrl} alt={item.title} className="w-full h-full" />
              </motion.div>
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${color}22, ${color}11)` }}>
                <ImageIcon size={32} style={{ color }} className="opacity-40" />
              </div>
            )}
            <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full text-white shadow" style={{ background: color }}>
              {item.category || 'News'}
            </span>
            {(photoCount > 0 || videoCount > 0) && (
              <span className="absolute bottom-2 right-2 text-[10px] font-semibold px-2 py-1 rounded-full bg-black/60 text-white backdrop-blur-sm">
                {photoCount > 0 && `${photoCount} photo${photoCount > 1 ? 's' : ''}`}
                {photoCount > 0 && videoCount > 0 && ' | '}
                {videoCount > 0 && `${videoCount} video${videoCount > 1 ? 's' : ''}`}
              </span>
            )}
          </div>
          <div className="p-3">
            {(item.startDate || item.published) && (
              <div className="flex items-center gap-1.5 text-gray-400 text-[11px] mb-1.5">
                <Calendar size={11} /> {item.startDate || item.published}
                {item.city && <span>· {item.city}</span>}
              </div>
            )}
            <h3 className="font-bold text-[#1a1a1a] text-sm leading-snug line-clamp-2 group-hover:text-[#1655c3] transition-colors">{item.title}</h3>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  )
}

export { CATEGORY_COLORS }
