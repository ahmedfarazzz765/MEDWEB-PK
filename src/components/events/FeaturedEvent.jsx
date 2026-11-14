import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Calendar, MapPin, ArrowRight } from 'lucide-react'
import { CATEGORY_COLORS } from './EventCard'

// Large framed hero for the single most recent featured event — a slow
// continuous Ken Burns zoom on the photo plus one light-sweep pass across
// it. Both animations are skipped under prefers-reduced-motion (a static
// frame is shown instead).
export default function FeaturedEvent({ item, reduceMotion = false }) {
  const color = CATEGORY_COLORS[item.category] || '#1655c3'
  const poster = item.coverImage || item.imageUrl

  return (
    <Link to={`/events/${item.slug}`} className="block group mb-10">
      <div className="relative bg-white rounded-sm p-2.5 shadow-[0_16px_48px_rgba(0,0,0,0.12)]" style={{ border: '1px solid #d4d4d8' }}>
        <div className="relative w-full h-[320px] sm:h-[420px] lg:h-[480px] overflow-hidden bg-gray-100">
          {poster && (
            <motion.div
              className="absolute inset-0"
              animate={reduceMotion ? {} : { scale: [1, 1.12] }}
              transition={reduceMotion ? {} : { duration: 18, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
            >
              <img src={poster} alt={item.title} className="w-full h-full object-cover" />
            </motion.div>
          )}
          {/* light sweep */}
          {!reduceMotion && (
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{ background: 'linear-gradient(100deg, transparent 20%, rgba(255,255,255,0.35) 50%, transparent 80%)' }}
              initial={{ x: '-120%' }}
              animate={{ x: '120%' }}
              transition={{ duration: 2.2, delay: 0.6, ease: 'easeInOut' }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8">
            <span className="inline-block text-[11px] font-bold text-white px-3 py-1 rounded-full mb-3" style={{ background: color }}>
              Featured · {item.category || 'News'}
            </span>
            <h2 className="text-white font-black text-2xl sm:text-3xl lg:text-4xl leading-tight max-w-3xl" style={{ fontFamily: "'Playfair Display', serif" }}>
              {item.title}
            </h2>
            <div className="flex items-center gap-4 mt-3 text-white/85 text-sm flex-wrap">
              {(item.startDate || item.published) && <span className="flex items-center gap-1.5"><Calendar size={14} /> {item.startDate || item.published}</span>}
              {item.city && <span className="flex items-center gap-1.5"><MapPin size={14} /> {item.city}</span>}
              <span className="flex items-center gap-1.5 font-semibold group-hover:gap-2.5 transition-all">
                Read Full Story <ArrowRight size={14} />
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
