import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Users, Linkedin, ShieldCheck, Award, Star } from 'lucide-react'
import { teamService } from '../firebase/services'
import { useSiteSettings } from '../hooks/useSiteSettings'
import SectionHeading from '../components/SectionHeading'
import InfiniteMarquee from '../components/InfiniteMarquee'
import CardRowSkeleton from '../components/CardRowSkeleton'
import BrandWatermark from '../components/BrandWatermark'

const HEADING_DEFAULTS = {
  teamHeading1: 'Our',
  teamHeading2: 'Team',
  teamSubtitle: 'Meet the experts behind the MEDWEB platform',
}

function Initials({ name }) {
  const initials = name?.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'
  return (
    <div className="w-full h-full flex items-center justify-center text-white font-bold text-2xl bg-[#1655c3]">
      {initials}
    </div>
  )
}

// ─── MEMBER CARD (Used on the dedicated /team page) ────────────────────────
export function MemberCard({ member }) {
  const [imgError, setImgError] = useState(false)
  const showImage = member.imageUrl && !imgError
  const linkedin = member.linkedinUrl || member.linkedin

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col items-center text-center group h-full relative w-full">
      {/* Top Tilted Dual Color Accent (Green #64ac37 + Blue #1655c3) */}
      <div className="w-full h-2.5 relative overflow-hidden bg-[#64ac37]">
        <div
          className="absolute inset-0 bg-[#1655c3]"
          style={{ clipPath: 'polygon(45% 0, 100% 0, 100% 100%, 55% 100%)' }}
        />
      </div>

      <div className="p-6 w-full flex flex-col items-center flex-1 justify-between">
        <div className="w-full flex flex-col items-center">
          {/* Circular Profile Image */}
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-white shadow-md mx-auto mb-4 relative bg-gray-50 shrink-0">
            {showImage ? (
              <img
                src={member.imageUrl}
                alt={member.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={() => setImgError(true)}
              />
            ) : (
              <Initials name={member.name} />
            )}
          </div>

          {/* Name */}
          <h3 className="text-lg font-bold text-[#1a1a1a] group-hover:text-[#1655c3] transition-colors">
            {member.name}
          </h3>

          {/* Designation / Role */}
          {member.role && (
            <p className="mt-1 text-sm font-semibold text-[#64ac37]">
              {member.role}
            </p>
          )}

          {/* Short Bio / Description / Qualification */}
          {member.bio && (
            <p className="mt-3 text-xs text-gray-500 max-w-xs leading-relaxed line-clamp-3 font-normal">
              {member.bio}
            </p>
          )}
        </div>

        {/* LinkedIn Link at Bottom */}
        <div className="mt-5 pt-3 border-t border-gray-50 w-full flex justify-center">
          {linkedin ? (
            <a
              href={linkedin.startsWith('http') ? linkedin : `https://${linkedin}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-[#0a66c2] transition-colors"
            >
              <Linkedin size={14} className="text-[#0a66c2]" />
              <span>LinkedIn</span>
            </a>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-300">
              <Linkedin size={14} className="text-gray-300" />
              <span>LinkedIn</span>
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── CATEGORY CARD (Displayed on Homepage Slider) ───────────────────────────
export function CategoryCard({ category, count, onSelect }) {
  const isEven = category.length % 2 === 0
  const textColor = isEven ? '#64ac37' : '#1655c3'
  const bgColor = isEven ? '#f0fdf4' : '#eff6ff'

  return (
    <div
      onClick={() => onSelect(category)}
      className="bg-white rounded-3xl border border-gray-100 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col justify-between cursor-pointer group h-full p-6 relative text-left w-[270px] sm:w-[310px]"
    >
      {/* Top Tilted Accent Line */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-[#64ac37]">
        <div
          className="absolute inset-0 bg-[#1655c3]"
          style={{ clipPath: 'polygon(45% 0, 100% 0, 100% 100%, 55% 100%)' }}
        />
      </div>

      <div>
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 shadow-sm"
          style={{ background: bgColor }}
        >
          <Users size={22} style={{ color: textColor }} />
        </div>

        <h3 className="text-lg font-black text-[#0f172a] group-hover:text-[#1655c3] transition-colors mb-1.5">
          {category}
        </h3>

        <span className="inline-block text-xs font-bold px-3 py-1 rounded-full mb-3" style={{ background: bgColor, color: textColor }}>
          {count} {count === 1 ? 'Member' : 'Members'}
        </span>

        <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">
          Click to view all dedicated {category} team members behind MEDWEB.
        </p>
      </div>

      <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between text-xs font-bold" style={{ color: textColor }}>
        <span>Explore Category</span>
        <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
      </div>
    </div>
  )
}

// ─── HOMEPAGE "OUR TEAM" SECTION ───────────────────────────────────────────
export default function Team() {
  const [team, setTeam] = useState(null) // null = loading
  const h = useSiteSettings(HEADING_DEFAULTS)
  const navigate = useNavigate()

  useEffect(() => {
    // Real-time listener — updates instantly when admin adds/edits team members
    const unsub = teamService.listen(rows => {
      const active = rows.filter(r => r.status !== 'Inactive')
      setTeam(active)
    })
    return () => unsub()
  }, [])

  // Derive unique categories with member counts from active team members
  const categoryStats = useMemo(() => {
    if (!team) return []
    const map = new Map()
    team.forEach(m => {
      const cat = m.category?.trim() || 'Chief Executive'
      map.set(cat, (map.get(cat) || 0) + 1)
    })
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }))
  }, [team])

  const handleCategorySelect = catName => {
    navigate(`/team?category=${encodeURIComponent(catName)}`)
  }

  // If section confirmed empty, hide the entire section (heading, watermark, container)
  if (team !== null && team.length === 0) return null

  return (
    <section id="team" className="py-12 sm:py-16 px-4 bg-white relative overflow-hidden">
      <BrandWatermark seed={6} />
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Original Heading Treatment restored */}
        <SectionHeading
          word1={h.teamHeading1}
          word2={h.teamHeading2}
          subtitle={h.teamSubtitle}
          className="mb-4"
        />

        <div className="text-center mb-8 sm:mb-10">
          <Link
            to="/team"
            className="inline-flex items-center gap-2 text-[#1655c3] font-semibold text-sm hover:gap-3 transition-all duration-200"
          >
            See All Members <ArrowRight size={15} />
          </Link>
        </div>

        {team === null ? (
          <CardRowSkeleton count={4} cardWidth={280} cardHeight={260} />
        ) : categoryStats.length === 0 ? (
          <div className="text-center text-gray-400 text-sm py-8">
            Team categories will appear here once added in the admin panel.
          </div>
        ) : (
          /* Smooth Marquee Slider of Category Cards */
          <InfiniteMarquee
            items={categoryStats}
            pauseOnHover
            showNav
            gap={24}
            itemClassName="w-[270px] sm:w-[310px]"
            keyFn={(item, i) => item.name || i}
            renderItem={item => (
              <CategoryCard
                category={item.name}
                count={item.count}
                onSelect={handleCategorySelect}
              />
            )}
          />
        )}
      </div>
    </section>
  )
}
