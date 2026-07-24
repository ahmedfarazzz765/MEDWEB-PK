import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
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
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col items-center text-center">
      <div className="w-full aspect-square overflow-hidden">
        {showImage
          ? <img
              src={member.imageUrl}
              alt={member.name}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              onError={() => setImgError(true)}
            />
          : <Initials name={member.name} />}
      </div>
      <div className="p-4">
        <h3 className="text-base font-bold text-[#1a1a1a]">{member.name}</h3>
        <span className="mt-1.5 inline-block text-[11px] font-semibold text-[#1655c3] bg-blue-50 px-3 py-1 rounded-full">{member.role}</span>
      </div>
    </div>
  )
}

export default function Team() {
  const [team, setTeam] = useState(null) // null = still loading; [] = confirmed empty
  const h = useSiteSettings(HEADING_DEFAULTS)

  useEffect(() => {
    // Real-time listener — updates instantly when admin adds/edits team members
    const unsub = teamService.listen(rows => {
      // Match every other list section's convention: only show Active members
      const active = rows.filter(r => r.status !== 'Inactive')
      setTeam(active)
    })
    return () => unsub()
  }, [])

  return (
    <section id="team" className="py-10 sm:py-12 px-4 bg-white relative overflow-hidden">
      <BrandWatermark seed={6} />
      <div className="max-w-7xl mx-auto relative z-10">
        <SectionHeading word1={h.teamHeading1} word2={h.teamHeading2}
          subtitle={h.teamSubtitle}
          className="mb-4" />
        <div className="text-center mb-6 sm:mb-8">
          <Link to="/team" className="inline-flex items-center gap-2 text-[#1655c3] font-semibold text-sm hover:gap-3 transition-all duration-200">
            See All <ArrowRight size={15} />
          </Link>
        </div>

        {team === null ? (
          <CardRowSkeleton count={4} cardWidth={260} cardHeight={340} />
        ) : team.length === 0 ? (
          <SectionEmptyState message="Team members will appear here once added in the admin panel." />
        ) : (
          <InfiniteMarquee
            items={team}
            pauseOnHover
            showNav
            gap={20}
            itemClassName="w-[240px] sm:w-[280px]"
            keyFn={(member, i) => member.id || i}
            renderItem={member => <MemberCard member={member} />}
          />
        )}
      </div>
    </section>
  )
}
