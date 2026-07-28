import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { advisoryService } from '../firebase/services'
import { useSiteSettings } from '../hooks/useSiteSettings'
import SectionHeading from '../components/SectionHeading'
import InfiniteMarquee from '../components/InfiniteMarquee'
import CardRowSkeleton from '../components/CardRowSkeleton'
import BrandWatermark from '../components/BrandWatermark'
import CoverImage from '../components/CoverImage'

const HEADING_DEFAULTS = {
  advisoryHeading1: 'Advisory',
  advisoryHeading2: 'Board',
  advisorySubtitle: "Distinguished advisors guiding MEDWEB's vision",
}

function Initials({ name }) {
  const initials = name?.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'
  return (
    <div className="w-full h-full flex items-center justify-center text-white font-bold text-2xl bg-[#1655c3]">
      {initials}
    </div>
  )
}

export function AdvisorCard({ member }) {
  const [imgError, setImgError] = useState(false)
  const showImage = member.imageUrl && !imgError
  return (
    <div className="flex flex-col items-center text-center bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden">
      <div className="w-full aspect-square overflow-hidden">
        {showImage
          ? <CoverImage
              src={member.imageUrl}
              alt={member.name}
              bias="center 25%"
              className="w-full h-full hover:scale-105 transition-transform duration-300"
              onError={() => setImgError(true)}
            />
          : <Initials name={member.name} />}
      </div>
      <div className="p-4">
        <h3 className="text-base font-bold text-[#1a1a1a]">{member.name}</h3>
        <p className="text-sm text-gray-500 mt-1">{member.role}</p>
        {member.qualification && (
          <span className="mt-1.5 inline-block text-[11px] font-semibold text-[#1655c3] bg-blue-50 px-3 py-1 rounded-full">{member.qualification}</span>
        )}
      </div>
    </div>
  )
}

export default function AdvisoryBoard() {
  const [board, setBoard] = useState(null) // null = loading
  const h = useSiteSettings(HEADING_DEFAULTS)

  useEffect(() => {
    const unsub = advisoryService.listen(rows => {
      const active = rows.filter(r => r.status !== 'Inactive')
      setBoard(active)
    })
    return () => unsub()
  }, [])

  // If section confirmed empty, hide the entire section (heading, watermark, container)
  if (board !== null && board.length === 0) return null

  return (
    <section id="advisory" className="py-10 sm:py-12 px-4 bg-[#f7f9fc] relative overflow-hidden">
      <BrandWatermark seed={7} />
      <div className="max-w-7xl mx-auto relative z-10">
        <SectionHeading word1={h.advisoryHeading1} word2={h.advisoryHeading2}
          subtitle={h.advisorySubtitle}
          className="mb-4" />
        <div className="text-center mb-6 sm:mb-8">
          <Link to="/advisory-board" className="inline-flex items-center gap-2 text-[#1655c3] font-semibold text-sm hover:gap-3 transition-all duration-200">
            See All <ArrowRight size={15} />
          </Link>
        </div>

        {board === null ? (
          <CardRowSkeleton count={4} cardWidth={260} cardHeight={340} />
        ) : (
          <InfiniteMarquee
            items={board}
            pauseOnHover
            showNav
            gap={20}
            itemClassName="w-[240px] sm:w-[280px]"
            keyFn={(member, i) => member.id || i}
            renderItem={member => <AdvisorCard member={member} />}
          />
        )}
      </div>
    </section>
  )
}
