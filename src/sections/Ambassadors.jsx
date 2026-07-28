import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowRight, Trophy, Users, Star } from 'lucide-react'
import { ambassadorsService, settingsService } from '../firebase/services'
import SectionHeading from '../components/SectionHeading'
import InfiniteMarquee from '../components/InfiniteMarquee'
import CardRowSkeleton from '../components/CardRowSkeleton'
import BrandWatermark from '../components/BrandWatermark'
import Skeleton from '../components/Skeleton'
import CoverImage from '../components/CoverImage'

function pointsToStars(points) {
  const p = Number(points) || 0
  if (p >= 15000) return 5
  if (p >= 10000) return 4
  if (p >= 5000)  return 3
  if (p >= 1000)  return 2
  return 1
}

function StarRating({ count }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} size={14} className={n <= count ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'} />
      ))}
    </div>
  )
}

export function AmbassadorCard({ a }) {
  const navigate = useNavigate()
  const [imgError, setImgError] = useState(false)
  const showImage = a.imageUrl && !imgError
  const stars = a.ranking || pointsToStars(a.points)
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 p-6 pb-8 flex flex-col items-center text-center h-full">
      {showImage
        ? <CoverImage src={a.imageUrl} bias="center 25%" className="w-20 h-20 rounded-full ring-4 ring-white shadow-md" alt={a.name} onError={() => setImgError(true)} />
        : <div className="w-20 h-20 rounded-full bg-[#1655c3] flex items-center justify-center text-white font-bold text-2xl ring-4 ring-white shadow-md">{a.name?.charAt(0)}</div>
      }
      <h3 className="mt-4 text-sm font-bold text-[#1a1a1a]">{a.name}</h3>
      <p className="text-xs text-gray-500 mt-0.5">{a.university || a.rank}</p>
      <div className="mt-3">
        <StarRating count={stars} />
      </div>
      {a.points > 0 && (
        <div className="mt-2 text-sm font-black text-[#1655c3]">
          {Number(a.points).toLocaleString()} <span className="text-xs font-semibold text-gray-400">pts</span>
        </div>
      )}
      <button
        onClick={() => navigate(`/ambassadors/${a.id}`)}
        className="mt-5 w-full text-xs font-semibold py-2 rounded-full border border-gray-200 text-gray-600 hover:border-[#1655c3] hover:text-[#1655c3] transition-colors"
      >
        View Profile
      </button>
    </div>
  )
}

export default function Ambassadors() {
  const navigate = useNavigate()
  const [ambassadors, setAmbassadors] = useState(null)
  const [applyEnabled, setApplyEnabled] = useState(true)
  const [applyFormId, setApplyFormId] = useState('')
  const [applyLink, setApplyLink] = useState('')
  const [heading1, setHeading1] = useState('Ambassadors &')
  const [heading2, setHeading2] = useState('Student Community')
  const [subtitle, setSubtitle] = useState('Join our growing network of student leaders representing MEDWEB across Pakistan.')

  useEffect(() => {
    const unsub = ambassadorsService.listen(rows => {
      const active = rows.filter(r => r.status === 'Active')
      setAmbassadors(active)
    })
    const unsub2 = settingsService.listen(s => {
      if (!s) return
      if (typeof s.ambassadorApplyEnabled === 'boolean') setApplyEnabled(s.ambassadorApplyEnabled)
      setApplyFormId(s.ambassadorApplyFormId || '')
      setApplyLink(s.ambassadorApplyLink || '')
      if (s.ambassadorsHeading1) setHeading1(s.ambassadorsHeading1)
      if (s.ambassadorsHeading2) setHeading2(s.ambassadorsHeading2)
      if (s.ambassadorsSubtitle) setSubtitle(s.ambassadorsSubtitle)
    })
    return () => { unsub(); unsub2 && unsub2() }
  }, [])

  const handleApply = () => {
    if (applyLink) window.open(applyLink, '_blank', 'noopener,noreferrer')
    else if (applyFormId) navigate(`/form/${applyFormId}`)
    else navigate('/form/ambassador')
  }

  const loading = ambassadors === null
  const empty = ambassadors !== null && ambassadors.length === 0

  // Hide section entirely when confirmed empty
  if (empty) return null

  const cities = !loading && !empty ? new Set(ambassadors.map(a => a.city).filter(Boolean)).size : 0
  const universities = !loading && !empty ? new Set(ambassadors.map(a => a.university).filter(Boolean)).size : 0

  return (
    <section id="ambassadors" className="py-10 sm:py-12 px-4 bg-white relative overflow-hidden">
      <BrandWatermark seed={8} />
      <div className="max-w-7xl mx-auto relative z-10">
        <SectionHeading word1={heading1} word2={heading2}
          subtitle={subtitle}
          className="mb-4" />
        <div className="text-center mb-6 sm:mb-8">
          <Link to="/ambassadors" className="inline-flex items-center gap-2 text-[#1655c3] font-semibold text-sm hover:gap-3 transition-all duration-200">
            See All <ArrowRight size={15} />
          </Link>
        </div>

        {loading ? (
          <>
            <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 sm:h-24" />)}
            </div>
            <CardRowSkeleton count={4} cardWidth={260} cardHeight={300} />
          </>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
              {[
                { icon:Users,  label:'Active Ambassadors',  value: `${ambassadors.length}+`, color:'#1655c3', bg:'#eff6ff' },
                { icon:Trophy, label:'Universities Covered', value: `${universities}+`,        color:'#64ac37', bg:'#f0fdf4' },
                { icon:Star,   label:'Cities Represented',  value: `${cities}+`,               color:'#1655c3', bg:'#eff6ff' },
              ].map(({ icon:Icon, label, value, color, bg }, i) => (
                <div key={i} className="text-center rounded-xl sm:rounded-2xl p-3 sm:p-5" style={{ background: bg }}>
                  <Icon size={18} style={{ color }} className="mx-auto mb-1.5" />
                  <div className="text-xl sm:text-2xl font-black" style={{ color }}>{value}</div>
                  <div className="text-[10px] sm:text-xs text-gray-500 font-medium mt-0.5">{label}</div>
                </div>
              ))}
            </div>

            <InfiniteMarquee
              items={ambassadors}
              pauseOnHover
              showNav
              gap={20}
              itemClassName="w-[240px] sm:w-[280px]"
              keyFn={(a, i) => a.id || i}
              renderItem={a => <AmbassadorCard a={a} />}
            />
          </>
        )}

        {applyEnabled && (
          <div className="text-center mt-8">
            <button onClick={handleApply}
              className="inline-flex items-center gap-2 text-white font-semibold px-7 py-3.5 rounded-full hover:-translate-y-1 transition-all duration-300 text-sm bg-[#1655c3] hover:bg-[#123f8f]"
              style={{ boxShadow:'0 6px 20px rgba(22,85,195,0.3)' }}>
              Apply as Ambassador <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
