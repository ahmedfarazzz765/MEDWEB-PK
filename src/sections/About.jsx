import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Users, Linkedin, Star, Award, ShieldCheck, UserCheck, Radio, BookOpen } from 'lucide-react'
import { teamService, teamCategoriesService } from '../firebase/services'
import { useSiteSettings } from '../hooks/useSiteSettings'
import { DEFAULT_TEAM_CATEGORIES } from '../constants/teamCategories'
import SectionHeading from '../components/SectionHeading'
import InfiniteMarquee from '../components/InfiniteMarquee'
import CardRowSkeleton from '../components/CardRowSkeleton'
import BrandWatermark from '../components/BrandWatermark'
import CoverImage from '../components/CoverImage'
import logo from '../assets/medweb.png'

const HEADING_DEFAULTS = {
  teamHeading1: 'Our',
  teamHeading2: 'Team',
  teamSubtitle: 'Meet the experts behind the MEDWEB platform',
}

export const DEFAULT_CATEGORY_TEMPLATES = DEFAULT_TEAM_CATEGORIES

const ICONS = { Award, Star, ShieldCheck, UserCheck, Radio, BookOpen, Users }

function splitLabel(title) {
  const words = (title || '').trim().split(' ')
  if (words.length <= 1) return [title || '', '']
  return [words.slice(0, -1).join(' '), words.slice(-1).join(' ')]
}

function Initials({ name }) {
  const initials = name?.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'
  return (
    <div className="w-full h-full flex items-center justify-center text-white font-bold text-2xl bg-[#1655c3]">
      {initials}
    </div>
  )
}

// ─── MEMBER PROFILE CARD (Used on the dedicated /team page) ────────────────
export function MemberCard({ member }) {
  const [imgError, setImgError] = useState(false)
  const showImage = member.imageUrl && !imgError
  const linkedin = member.linkedinUrl || member.linkedin

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col items-center text-center group h-full relative w-full p-6">
      
      {/* Tiled Diagonal MEDWEB Logo Watermark: small repeated logos from top-left corner to bottom-right corner */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
        <div
          className="absolute opacity-[0.07]"
          style={{
            inset: '-60%',
            backgroundImage: `url(${logo})`,
            backgroundRepeat: 'repeat',
            backgroundSize: '44px 44px',
            transform: 'rotate(-45deg)',
          }}
        />
      </div>

      {/* Top Tilted Dual Color Accent (Green #64ac37 + Blue #1655c3) */}
      <div className="absolute top-0 left-0 right-0 h-2.5 overflow-hidden bg-[#64ac37] z-10">
        <div
          className="absolute inset-0 bg-[#1655c3]"
          style={{ clipPath: 'polygon(45% 0, 100% 0, 100% 100%, 55% 100%)' }}
        />
      </div>

      <div className="w-full flex flex-col items-center flex-1 justify-between pt-2 relative z-10">
        <div className="w-full flex flex-col items-center">
          
          {/* Circular Profile Image Frame with Green & Blue Dual Gradient Ring */}
          <div className="p-[3px] bg-gradient-to-tr from-[#64ac37] via-[#1655c3] to-[#64ac37] rounded-full shadow-md mb-4 shrink-0 relative">
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden border-2 border-white bg-gray-50 flex items-center justify-center">
              {showImage ? (
                <CoverImage
                  src={member.imageUrl}
                  alt={member.name}
                  bias="center 25%"
                  className="w-full h-full group-hover:scale-105 transition-transform duration-300"
                  onError={() => setImgError(true)}
                />
              ) : (
                <Initials name={member.name} />
              )}
            </div>
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
        <div className="mt-5 pt-3 border-t border-gray-100 w-full flex justify-center">
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

// ─── WHY MEDWEB STYLE CATEGORY CARD (Displayed on Homepage Slider) ───────────
export function WhyMedwebCategoryCard({ category, memberCount, onSelect }) {
  const [line1, line2] = category.label1 && category.label2
    ? [category.label1, category.label2]
    : splitLabel(category.name)

  const isGreen = category.accent === 'green' || (category.name?.length % 2 === 0)
  const accent = isGreen
    ? { text: '#64ac37', bg: '#f0fdf4' }
    : { text: '#1655c3', bg: '#eff6ff' }

  const Icon = ICONS[category.icon] || Users

  return (
    <div
      onClick={() => onSelect(category.name)}
      className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col justify-between cursor-pointer group h-full w-[260px] sm:w-[300px] shrink-0 text-left border border-gray-100"
    >
      {/* Thumbnail Header — fixed pixel height (not aspect-ratio) so every
          card's thumbnail is identically sized no matter the source image */}
      <div className="relative h-[146px] sm:h-[169px] shrink-0 overflow-hidden" style={{ background: accent.bg }}>
        {category.imageUrl ? (
          <CoverImage
            src={category.imageUrl}
            alt={category.name}
            className="w-full h-full group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Icon size={36} style={{ color: accent.text }} className="opacity-30" />
          </div>
        )}
      </div>

      <div className="px-5 pb-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Overlapping Icon Badge */}
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center -mt-5 mb-2 shadow-md border-2 border-white"
            style={{ background: accent.bg }}
          >
            <Icon size={18} style={{ color: accent.text }} />
          </div>

          {/* Dual-Color Title */}
          <h3 className="font-black text-base leading-tight mb-1.5">
            <span className="text-[#0f172a]">{line1} </span>
            <span style={{ color: accent.text }}>{line2}</span>
          </h3>

          {/* Member Count Pill */}
          <span className="inline-block text-[11px] font-extrabold px-2.5 py-0.5 rounded-full mb-2" style={{ background: accent.bg, color: accent.text }}>
            {memberCount} {memberCount === 1 ? 'Member' : 'Members'}
          </span>

          <p className="text-gray-500 text-xs leading-relaxed line-clamp-2">
            {category.desc || `Explore dedicated team members under ${category.name}.`}
          </p>
        </div>

        {/* Bottom Button Action */}
        <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between text-xs font-bold" style={{ color: accent.text }}>
          <span>See Members</span>
          <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </div>
  )
}

// ─── HOMEPAGE "OUR TEAM" SECTION ───────────────────────────────────────────
export default function Team() {
  const [team, setTeam] = useState(null) // null = loading
  const [dbCategories, setDbCategories] = useState([])
  const h = useSiteSettings(HEADING_DEFAULTS)
  const navigate = useNavigate()

  useEffect(() => {
    const unsubTeam = teamService.listen(rows => {
      const active = rows.filter(r => r.status !== 'Inactive')
      setTeam(active)
    })
    const unsubCats = teamCategoriesService.listen(cats => {
      setDbCategories(cats)
    })
    return () => {
      unsubTeam()
      unsubCats()
    }
  }, [])

  // Combine DB categories with default templates so there's always rich WhyMedweb cards
  const categoryCards = useMemo(() => {
    const list = [...dbCategories]
    // Add default templates if not present in DB
    DEFAULT_CATEGORY_TEMPLATES.forEach(tpl => {
      if (!list.some(c => c.name.toLowerCase() === tpl.name.toLowerCase())) {
        list.push(tpl)
      }
    })
    return list
  }, [dbCategories])

  const handleCategorySelect = catName => {
    navigate(`/team?category=${encodeURIComponent(catName)}`)
  }

  // If section confirmed empty, hide the entire section
  if (team !== null && team.length === 0) return null

  return (
    <section id="team" className="py-12 sm:py-16 px-4 bg-white relative overflow-hidden">
      <BrandWatermark seed={6} />
      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Large Prominent Section Heading */}
        <SectionHeading
          word1={h.teamHeading1}
          word2={h.teamHeading2}
          subtitle={h.teamSubtitle}
          className="mb-4"
        />

        {/* See All Categories Link */}
        <div className="text-center mb-8 sm:mb-10">
          <Link
            to="/team"
            className="inline-flex items-center gap-2 text-[#1655c3] font-semibold text-sm hover:gap-3 transition-all duration-200"
          >
            See All Categories <ArrowRight size={15} />
          </Link>
        </div>

        {team === null ? (
          <CardRowSkeleton count={4} cardWidth={280} cardHeight={280} />
        ) : (
          /* Continuous Moving Marquee Slider of Why Medweb Style Category Cards */
          <InfiniteMarquee
            items={categoryCards}
            pauseOnHover
            showNav
            gap={24}
            itemClassName="w-[260px] sm:w-[300px]"
            keyFn={(cat, i) => cat.id || cat.name || i}
            renderItem={cat => {
              const count = team.filter(m => (m.category || 'Chief Executive').toLowerCase() === cat.name.toLowerCase()).length
              return (
                <WhyMedwebCategoryCard
                  category={cat}
                  memberCount={count}
                  onSelect={handleCategorySelect}
                />
              )
            }}
          />
        )}
      </div>
    </section>
  )
}
