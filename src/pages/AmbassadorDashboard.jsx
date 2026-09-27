import { useEffect, useState } from 'react'
import {
  Trophy, TrendingUp, Target, Users, Copy, Check, GraduationCap,
  Linkedin, MessageCircle as WhatsAppIcon, Instagram, Mail, Phone,
} from 'lucide-react'
import { webinarsService, ambassadorRanksService } from '../firebase/services'
import { computeAmbassadorRank, DEFAULT_RANK_THRESHOLDS } from '../lib/ambassadorRank'
import { useSiteSettings } from '../hooks/useSiteSettings'
import AmbassadorLayout from '../ambassador/AmbassadorLayout'
import useAmbassador from '../ambassador/useAmbassador'
import CoverImage from '../components/CoverImage'

const TAGLINES = [
  'More Connections, Bigger Impact.',
  'Every Referral Moves You Forward.',
  'Build Your Network, Build Your Rank.',
  'Small Shares, Real Change.',
]

const FOOTER_DEFAULTS = { footerEmail: 'info@medweb.pk', footerPhone: '03291692899' }

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.05)] p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
      <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: accent.bg }}>
        <Icon size={20} style={{ color: accent.color }} />
      </div>
      <div className="min-w-0">
        <div className="text-lg sm:text-2xl font-black text-[#1a1a1a] leading-none truncate">{value}</div>
        <div className="text-[11px] sm:text-xs text-gray-400 mt-1 truncate">{label}</div>
      </div>
    </div>
  )
}

// Friendly CSS-only illustration for the empty referrals state — no
// external image dependency, just layered circles + an icon.
function EmptyReferralsIllustration() {
  return (
    <div className="relative w-24 h-24 mx-auto mb-4">
      <div className="absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle, #eff6ff, transparent 70%)' }} />
      <div className="absolute inset-3 rounded-full border-2 border-dashed border-blue-100" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-14 h-14 rounded-full bg-white shadow-md flex items-center justify-center">
          <Users size={26} className="text-[#1655c3]" />
        </div>
      </div>
      <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-[#64ac37] flex items-center justify-center shadow-md">
        <span className="text-white text-sm font-black leading-none">+</span>
      </div>
    </div>
  )
}

export default function AmbassadorDashboard() {
  const ambassador = useAmbassador()
  const [thresholds, setThresholds] = useState(DEFAULT_RANK_THRESHOLDS)
  const [registrations, setRegistrations] = useState([])
  const [webinars, setWebinars] = useState([])
  const [selectedWebinar, setSelectedWebinar] = useState('')
  const [copied, setCopied] = useState(false)
  const [taglineIdx, setTaglineIdx] = useState(0)
  const footerCfg = useSiteSettings(FOOTER_DEFAULTS)

  useEffect(() => {
    const unsubRanks = ambassadorRanksService.listen(t => { if (t) setThresholds(t) })
    const unsubWebinars = webinarsService.listen(rows => setWebinars(rows.filter(w => w.status !== 'Completed')))
    const t = setInterval(() => setTaglineIdx(i => (i + 1) % TAGLINES.length), 4500)
    return () => { unsubRanks(); unsubWebinars(); clearInterval(t) }
  }, [])

  useEffect(() => {
    if (!ambassador?.authUid) return
    webinarsService.getRegistrationsByReferrerUid(ambassador.authUid).then(setRegistrations).catch(() => {})
  }, [ambassador?.authUid])

  if (ambassador === undefined) {
    return <div className="min-h-screen flex items-center justify-center bg-[#f0faff] text-gray-400 text-sm">Loading your dashboard…</div>
  }
  if (!ambassador) {
    return <div className="min-h-screen flex items-center justify-center bg-[#f0faff] text-gray-400 text-sm">Session expired — please sign in again.</div>
  }

  const points = Number(ambassador.points) || 0
  const { rank, nextRank, pointsToNext, progressPct } = computeAmbassadorRank(points, ambassador.gender, thresholds)

  // Real, derived from the same registrations already fetched for "Students
  // You've Referred" — 1 point is awarded per referred registration (see
  // ambassadorsService.addReferralPoint), so a count of this month's
  // referrals IS this month's points, not a separate estimate.
  const now = new Date()
  const pointsThisMonth = registrations.filter(r => {
    const d = r.createdAt?.toDate ? r.createdAt.toDate() : (r.createdAt ? new Date(r.createdAt) : null)
    return d && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  }).length

  const referralLink = selectedWebinar
    ? `${window.location.origin}/webinar/${selectedWebinar}/register?ref=${ambassador.referralCode}`
    : ''

  const handleCopy = () => {
    if (!referralLink) return
    navigator.clipboard?.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  const shareMessage = `Join this MEDWEB webinar — register here: ${referralLink}`
  const whatsappShare = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`
  const linkedinShare = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`
  const handleInstagramShare = () => {
    if (!referralLink) return
    navigator.clipboard?.writeText(referralLink)
    alert('Link copied! Instagram doesn\'t support direct link-sharing — paste it into your bio or a story.')
  }

  return (
    <AmbassadorLayout active="dashboard" ambassador={ambassador}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* 1. Profile banner */}
        <div className="rounded-2xl sm:rounded-3xl p-6 sm:p-8 relative overflow-hidden text-white"
          style={{ background: 'linear-gradient(120deg, #0B1220 0%, #123f8f 55%, #1655c3 80%, #64ac37 140%)' }}>
          <div className="absolute inset-0 opacity-[0.06] pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-5">
            {ambassador.imageUrl
              ? <CoverImage src={ambassador.imageUrl} alt={ambassador.name} bias="center 25%" className="w-20 h-20 rounded-full ring-4 ring-white/25 shadow-lg shrink-0" />
              : <div className="w-20 h-20 rounded-full bg-white/15 flex items-center justify-center text-white font-bold text-2xl ring-4 ring-white/25 shadow-lg shrink-0">{ambassador.name?.charAt(0)}</div>}
            <div className="min-w-0">
              <span className="inline-block text-[10px] font-bold tracking-wider px-3 py-1 rounded-full bg-white/15 mb-2">MEDWEB AMBASSADOR</span>
              <div className="font-black text-2xl sm:text-3xl truncate">{ambassador.name}</div>
              <div className="flex items-center gap-3 flex-wrap mt-2 text-white/85 text-sm">
                <span className="font-semibold">{rank}</span>
                {ambassador.ambCode && <span className="font-mono text-white/70">{ambassador.ambCode}</span>}
              </div>
              <p key={taglineIdx} className="text-white/70 text-xs sm:text-sm mt-3 italic animate-page-fade-in">{TAGLINES[taglineIdx]}</p>
            </div>
          </div>
        </div>

        {/* 2. Stat row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard icon={Trophy} label="Total Points" value={points.toLocaleString()} accent={{ bg: '#eff6ff', color: '#1655c3' }} />
          <StatCard icon={TrendingUp} label="Points This Month" value={pointsThisMonth.toLocaleString()} accent={{ bg: '#f0fdf4', color: '#64ac37' }} />
          <StatCard icon={Target} label={nextRank ? 'Points to Next Rank' : 'Top Rank'} value={nextRank ? pointsToNext.toLocaleString() : 'Achieved 🎉'} accent={{ bg: '#eff6ff', color: '#1655c3' }} />
          <StatCard icon={Users} label="Successful Referrals" value={registrations.length.toLocaleString()} accent={{ bg: '#f0fdf4', color: '#64ac37' }} />
        </div>

        {/* Progress toward next rank */}
        <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.05)] p-5 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-[#1a1a1a]">{rank}</span>
            {nextRank && <span className="text-xs text-gray-400">{progressPct}%</span>}
          </div>
          <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progressPct}%`, background: 'linear-gradient(90deg, #1655c3, #64ac37)' }} />
          </div>
          <p className="text-xs text-gray-500 mt-2.5">
            {nextRank
              ? <>🎯 <span className="font-bold text-[#1a1a1a]">{pointsToNext} more referral{pointsToNext === 1 ? '' : 's'}</span> to unlock <span className="font-bold text-[#1655c3]">{nextRank}</span>.</>
              : "🏆 You've reached the top rank — keep referring to stay there!"}
          </p>
        </div>

        {/* 3. Referral Link card */}
        <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.05)] p-5 sm:p-6">
          <h2 className="font-bold text-[#1a1a1a] text-sm mb-1">Your Referral Link</h2>
          <p className="text-xs text-gray-400 mb-4">Your code: <span className="font-mono font-bold text-[#1655c3]">{ambassador.referralCode || '—'}</span>. Pick a webinar to generate its shareable registration link.</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <select value={selectedWebinar} onChange={e => setSelectedWebinar(e.target.value)}
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 outline-none focus:border-[#1655c3]">
              <option value="">Select a webinar…</option>
              {webinars.map(w => <option key={w.id} value={w.id}>{w.topic || w.title}</option>)}
            </select>
            <button onClick={handleCopy} disabled={!referralLink}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-[#1655c3] hover:bg-[#123f8f] disabled:opacity-40 transition-colors">
              {copied ? <><Check size={15} /> Copied</> : <><Copy size={15} /> Copy Link</>}
            </button>
          </div>
          {referralLink && <p className="text-[11px] text-gray-400 mt-2 break-all">{referralLink}</p>}

          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
            <span className="text-xs font-semibold text-gray-500 mr-1">Share:</span>
            <a href={referralLink ? whatsappShare : undefined} target="_blank" rel="noopener noreferrer"
              aria-disabled={!referralLink} onClick={e => { if (!referralLink) e.preventDefault() }}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${referralLink ? 'bg-green-50 text-[#25D366] hover:bg-green-100' : 'bg-gray-50 text-gray-300 cursor-not-allowed'}`}>
              <WhatsAppIcon size={16} />
            </a>
            <a href={referralLink ? linkedinShare : undefined} target="_blank" rel="noopener noreferrer"
              aria-disabled={!referralLink} onClick={e => { if (!referralLink) e.preventDefault() }}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${referralLink ? 'bg-blue-50 text-[#0A66C2] hover:bg-blue-100' : 'bg-gray-50 text-gray-300 cursor-not-allowed'}`}>
              <Linkedin size={16} />
            </a>
            <button onClick={handleInstagramShare} disabled={!referralLink}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${referralLink ? 'bg-pink-50 text-[#E1306C] hover:bg-pink-100' : 'bg-gray-50 text-gray-300 cursor-not-allowed'}`}>
              <Instagram size={16} />
            </button>
          </div>
        </div>

        {/* 4. Referred students */}
        <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.05)] overflow-hidden">
          <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-[#1a1a1a] text-sm">Students You've Referred</h2>
            <span className="text-xs font-bold text-[#64ac37]">{registrations.length}</span>
          </div>
          {registrations.length === 0 ? (
            <div className="px-6 py-10 text-center text-gray-400">
              <EmptyReferralsIllustration />
              <p className="text-sm font-semibold text-gray-500">Your referral journey starts here!</p>
              <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">Share your link above and watch your network — and your rank — grow. 🌱</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {registrations.map((r, i) => (
                <div key={r.id || i} className="flex items-center gap-3 px-5 sm:px-6 py-3.5">
                  <div className="w-9 h-9 rounded-full bg-[#1655c3] flex items-center justify-center text-white font-bold text-xs shrink-0">
                    {(r.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-[#1a1a1a] truncate">{r.name || 'Unnamed'}</div>
                    {r.university && (
                      <div className="text-xs text-gray-400 truncate flex items-center gap-1">
                        <GraduationCap size={11} /> {r.university}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 5. Footer strip */}
        <div className="rounded-2xl bg-[#0B1220] px-5 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-white/60 text-xs">
          <span>© {new Date().getFullYear()} MEDWEB-PK — Ambassador Portal</span>
          <div className="flex items-center gap-4">
            <a href={`mailto:${footerCfg.footerEmail}`} className="flex items-center gap-1.5 hover:text-white transition-colors"><Mail size={12} /> {footerCfg.footerEmail}</a>
            <a href={`tel:${footerCfg.footerPhone}`} className="flex items-center gap-1.5 hover:text-white transition-colors"><Phone size={12} /> {footerCfg.footerPhone}</a>
          </div>
        </div>
      </div>
    </AmbassadorLayout>
  )
}
