import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Linkedin } from 'lucide-react'
import { teamService } from '../firebase/services'
import { useSiteSettings } from '../hooks/useSiteSettings'
import SectionHeading from '../components/SectionHeading'
import InfiniteMarquee from '../components/InfiniteMarquee'
import CardRowSkeleton from '../components/CardRowSkeleton'
import SectionEmptyState from '../components/SectionEmptyState'
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

export default function Team() {
  const [team, setTeam] = useState(null) // null = loading
  const [activeCategory, setActiveCategory] = useState('All')
  const h = useSiteSettings(HEADING_DEFAULTS)

  useEffect(() => {
    // Real-time listener — updates instantly when admin adds/edits team members
    const unsub = teamService.listen(rows => {
      const active = rows.filter(r => r.status !== 'Inactive')
      setTeam(active)
    })
    return () => unsub()
  }, [])

  // Derive unique categories from active team members
  const categories = useMemo(() => {
    if (!team) return []
    const catSet = new Set()
    team.forEach(m => {
      if (m.category?.trim()) catSet.add(m.category.trim())
    })
    return Array.from(catSet)
  }, [team])

  // Filtered members list
  const filteredMembers = useMemo(() => {
    if (!team) return []
    if (activeCategory === 'All') return team
    return team.filter(m => (m.category || 'Executive') === activeCategory)
  }, [team, activeCategory])

  return (
    <section id="team" className="py-10 sm:py-14 px-4 bg-white relative overflow-hidden">
      <BrandWatermark seed={6} />
      <div className="max-w-7xl mx-auto relative z-10">
        <SectionHeading
          word1={h.teamHeading1}
          word2={h.teamHeading2}
          subtitle={h.teamSubtitle}
          className="mb-4"
        />

        {/* Category Filter Tabs */}
        {team && team.length > 0 && categories.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
            <button
              onClick={() => setActiveCategory('All')}
              className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all duration-300 shadow-sm ${
                activeCategory === 'All'
                  ? 'bg-[#64ac37] text-white shadow-green-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All ({team.length})
            </button>
            {categories.map(cat => {
              const count = team.filter(m => (m.category || 'Executive') === cat).length
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all duration-300 shadow-sm ${
                    activeCategory === cat
                      ? 'bg-[#64ac37] text-white shadow-green-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat} ({count})
                </button>
              )
            })}
          </div>
        )}

        <div className="text-center mb-6 sm:mb-8">
          <Link
            to="/team"
            className="inline-flex items-center gap-2 text-[#1655c3] font-semibold text-sm hover:gap-3 transition-all duration-200"
          >
            See All Members <ArrowRight size={15} />
          </Link>
        </div>

        {team === null ? (
          <CardRowSkeleton count={4} cardWidth={280} cardHeight={360} />
        ) : team.length === 0 ? (
          <SectionEmptyState message="Team members will appear here once added in the admin panel." />
        ) : filteredMembers.length === 0 ? (
          <SectionEmptyState message={`No team members found under '${activeCategory}'.`} />
        ) : activeCategory === 'All' && team.length > 4 ? (
          <InfiniteMarquee
            items={team}
            pauseOnHover
            showNav
            gap={20}
            itemClassName="w-[260px] sm:w-[300px]"
            keyFn={(member, i) => member.id || i}
            renderItem={member => <MemberCard member={member} />}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {filteredMembers.map((member, i) => (
              <MemberCard key={member.id || i} member={member} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
