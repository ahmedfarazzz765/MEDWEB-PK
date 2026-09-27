import { useEffect, useState } from 'react'
import {
  Users, User, Star, Trophy, Target, Copy, Check, GraduationCap, CreditCard, ShieldCheck,
  Linkedin, MessageCircle as WhatsAppIcon, Instagram, Phone, Mail, Globe, Megaphone,
} from 'lucide-react'
import { webinarsService, ambassadorRanksService } from '../firebase/services'
import { computeAmbassadorRank, DEFAULT_RANK_THRESHOLDS } from '../lib/ambassadorRank'
import { useSiteSettings } from '../hooks/useSiteSettings'
import AmbassadorLayout from '../ambassador/AmbassadorLayout'
import useAmbassador from '../ambassador/useAmbassador'
import CoverImage from '../components/CoverImage'
import logo from '../assets/medweb.png'

const TAGLINES = [
  'More Connections,\nBigger Impact.',
  'Every Referral\nMoves You Forward.',
  'Build Your Network,\nBuild Your Rank.',
  'Small Shares,\nReal Change.',
]

const FOOTER_DEFAULTS = { footerEmail: 'info@medweb.pk', footerPhone: '03291692899' }

function StatCard({ icon: Icon, label, value, accent, progressPct }) {
  return (
    <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.05)] p-4 sm:p-5">
      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center mb-3" style={{ background: accent.bg }}>
        <Icon size={18} style={{ color: accent.color }} />
      </div>
      <div className="text-xl sm:text-2xl font-black text-[#0B1220] leading-none">{value}</div>
      <div className="text-[11px] sm:text-xs text-gray-500 mt-1.5 leading-snug">{label}</div>
      {progressPct !== undefined && (
        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden mt-3">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progressPct}%`, background: accent.color }} />
        </div>
      )}
    </div>
  )
}

// Friendly, brand-colored SVG illustration for the empty referrals state —
// an ID card + paper plane, no external image dependency.
function EmptyReferralsIllustration() {
  return (
    <svg width="140" height="110" viewBox="0 0 140 110" fill="none" className="mx-auto mb-3">
      <ellipse cx="70" cy="98" rx="46" ry="8" fill="#eff6ff" />
      <rect x="34" y="20" width="56" height="66" rx="10" fill="#1655c3" fillOpacity="0.08" stroke="#1655c3" strokeOpacity="0.25" strokeWidth="2" />
      <circle cx="62" cy="44" r="9" fill="#1655c3" fillOpacity="0.5" />
      <rect x="46" y="60" width="32" height="4" rx="2" fill="#1655c3" fillOpacity="0.3" />
      <rect x="46" y="68" width="22" height="4" rx="2" fill="#1655c3" fillOpacity="0.2" />
      <path d="M92 30 L118 18 L106 44 L100 38 L92 30Z" fill="#64ac37" />
      <path d="M100 38 L106 44 L104 52 L96 42 Z" fill="#4d8a2a" />
      <circle cx="24" cy="30" r="4" fill="#64ac37" fillOpacity="0.4" />
      <circle cx="112" cy="70" r="5" fill="#1655c3" fillOpacity="0.3" />
      <circle cx="30" cy="80" r="3" fill="#64ac37" fillOpacity="0.5" />
    </svg>
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* 1. Profile banner */}
        <div className="rounded-2xl sm:rounded-3xl p-6 sm:p-8 relative overflow-hidden text-white"
          style={{ background: 'linear-gradient(115deg, #0B1220 0%, #123f8f 45%, #1655c3 68%, #64ac37 125%)' }}>
          <div className="absolute inset-0 opacity-[0.07] pointer-events-none"
            style={{ backgroundImage: 'repeating-linear-gradient(115deg, white 0px, white 1px, transparent 1px, transparent 40px)' }} />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex items-center gap-5 flex-1 min-w-0">
              <div className="relative shrink-0">
                {ambassador.imageUrl
                  ? <CoverImage src={ambassador.imageUrl} alt={ambassador.name} bias="center 25%" className="w-20 h-20 sm:w-24 sm:h-24 rounded-full ring-4 ring-[#95d348]/60 shadow-lg" />
                  : <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white/15 flex items-center justify-center text-white font-bold text-2xl ring-4 ring-[#95d348]/60 shadow-lg">{ambassador.name?.charAt(0)}</div>}
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white flex items-center justify-center shadow-md">
                  <ShieldCheck size={15} className="text-[#64ac37]" />
                </div>
              </div>
              <div className="min-w-0">
                <span className="inline-block text-[10px] font-bold tracking-wider px-3 py-1 rounded-full bg-[#64ac37] text-white mb-2">MEDWEB AMBASSADOR</span>
                <div className="font-black text-2xl sm:text-3xl truncate">{ambassador.name}</div>
                <div className="flex items-center gap-1.5 mt-1.5 text-white/85 text-sm">
                  <User size={14} /> {rank}
                </div>
                <div className="inline-flex items-center gap-1.5 mt-2.5 bg-[#0B1220]/40 px-3 py-1.5 rounded-full text-xs font-bold">
                  <CreditCard size={13} /> {ambassador.ambCode || ambassador.referralCode || '—'}
                </div>
              </div>
            </div>

            {/* Rotating script-font tagline */}
            <div className="md:text-right shrink-0">
              <p key={taglineIdx} className="whitespace-pre-line text-xl sm:text-2xl leading-tight animate-page-fade-in" style={{ fontFamily: "'Dancing Script', cursive" }}>
                “{TAGLINES[taglineIdx]}”
              </p>
            </div>
          </div>
        </div>

        {/* 2. Stat row — icons/colors/order match the reference design */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard icon={Users} label="Total Points" value={points.toLocaleString()} accent={{ bg: '#e6f7ec', color: '#2f9e58' }} />
          <StatCard icon={Star} label="This Month" value={pointsThisMonth.toLocaleString()} accent={{ bg: '#eff6ff', color: '#1655c3' }} />
          <StatCard icon={Trophy}
            label={nextRank ? `Points to Reach ${nextRank}` : 'Rank Achieved 🎉'}
            value={nextRank ? pointsToNext.toLocaleString() : '🏆'}
            accent={{ bg: '#fff8e6', color: '#d97706' }}
            progressPct={nextRank ? progressPct : undefined}
          />
          <StatCard icon={Target} label="Successful Referrals" value={registrations.length.toLocaleString()} accent={{ bg: '#f5f0ff', color: '#7c3aed' }} />
        </div>
        {nextRank && (
          <p className="text-xs text-gray-500 -mt-2 px-1">
            🎯 <span className="font-bold text-[#1a1a1a]">{pointsToNext} more referral{pointsToNext === 1 ? '' : 's'}</span> to unlock <span className="font-bold text-[#1655c3]">{nextRank}</span>.
          </p>
        )}

        {/* 3. Referral Link card */}
        <div className="rounded-2xl p-6 sm:p-8 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #eafbe4, #f2fff6)' }}>
          <div className="relative z-10 grid lg:grid-cols-[1fr_auto] gap-6 items-center">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center">
                  <Copy size={15} className="text-[#1655c3]" />
                </div>
                <h2 className="font-black text-[#0B1220] text-lg">Your Referral Link</h2>
              </div>
              <p className="text-sm text-gray-500 mb-4 max-w-md">Share your unique link with friends and help them join MEDWEB-PK. Earn points and unlock amazing rewards!</p>

              <div className="flex flex-col sm:flex-row gap-2 max-w-xl">
                <select value={selectedWebinar} onChange={e => setSelectedWebinar(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white outline-none focus:border-[#1655c3]">
                  <option value="">Select a webinar…</option>
                  {webinars.map(w => <option key={w.id} value={w.id}>{w.topic || w.title}</option>)}
                </select>
                <button onClick={handleCopy} disabled={!referralLink}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-[#0B1220] hover:bg-[#123f8f] disabled:opacity-40 transition-colors whitespace-nowrap">
                  {copied ? <><Check size={15} /> Copied</> : <><Copy size={15} /> Copy Link</>}
                </button>
              </div>
              {referralLink && (
                <div className="bg-white rounded-xl px-4 py-2.5 mt-2.5 max-w-xl text-xs text-gray-600 font-mono break-all shadow-sm">{referralLink}</div>
              )}
              <p className="text-[11px] text-gray-400 mt-2">Your code: <span className="font-mono font-bold text-[#1655c3]">{ambassador.referralCode || '—'}</span></p>
            </div>

            {/* Decorative megaphone + share cluster — the icons ARE the real
                share buttons (WhatsApp/LinkedIn are share-intent links;
                Instagram copies the link since it has no web share-intent
                URL for prefilled posts), just composed as an illustration
                rather than a plain inline row. */}
            <div className="relative w-40 h-32 mx-auto hidden sm:block shrink-0">
              <Megaphone size={72} className="text-[#0B1220] opacity-90 absolute left-2 top-4 -rotate-12" />
              <span className="absolute -top-1 right-4 text-xs italic text-[#1655c3]" style={{ fontFamily: "'Dancing Script', cursive" }}>Share &amp; Earn!</span>
              <a href={referralLink ? whatsappShare : undefined} target="_blank" rel="noopener noreferrer"
                onClick={e => { if (!referralLink) e.preventDefault() }}
                className={`absolute top-2 right-0 w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-transform hover:scale-105 ${referralLink ? 'bg-[#25D366] text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
                <WhatsAppIcon size={17} />
              </a>
              <a href={referralLink ? linkedinShare : undefined} target="_blank" rel="noopener noreferrer"
                onClick={e => { if (!referralLink) e.preventDefault() }}
                className={`absolute bottom-6 right-6 w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-transform hover:scale-105 ${referralLink ? 'bg-[#0A66C2] text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
                <Linkedin size={17} />
              </a>
              <button onClick={handleInstagramShare} disabled={!referralLink}
                className={`absolute bottom-0 right-16 w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-transform hover:scale-105 ${referralLink ? 'bg-gradient-to-br from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
                <Instagram size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* 4. Referred students */}
        <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.05)] overflow-hidden">
          <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-black text-[#0B1220] text-sm">Students You've Referred</h2>
              <p className="text-xs text-gray-400 mt-0.5">Track your referrals and see their progress here.</p>
            </div>
            <span className="text-xs font-bold text-white bg-[#64ac37] px-3 py-1.5 rounded-full whitespace-nowrap">{registrations.length} Total Referrals</span>
          </div>
          {registrations.length === 0 ? (
            <div className="px-6 py-10 text-center text-gray-400">
              <EmptyReferralsIllustration />
              <p className="text-sm font-bold text-[#1a1a1a]">No referrals yet!</p>
              <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">Share your link above to get started and help students join the community.</p>
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
        <div className="rounded-2xl bg-[#0B1220] px-5 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-white/70 text-xs">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
            <a href={`tel:${footerCfg.footerPhone}`} className="flex items-center gap-1.5 hover:text-white transition-colors"><Phone size={12} /> {footerCfg.footerPhone}</a>
            <span className="text-white/20 hidden sm:inline">|</span>
            <a href={`mailto:${footerCfg.footerEmail}`} className="flex items-center gap-1.5 hover:text-white transition-colors"><Mail size={12} /> {footerCfg.footerEmail}</a>
            <span className="text-white/20 hidden sm:inline">|</span>
            <span className="flex items-center gap-1.5"><Globe size={12} /> {window.location.hostname}</span>
          </div>
          <div className="flex items-center gap-2">
            <img src={logo} alt="" className="w-5 h-5 object-contain" />
            <span className="text-sm" style={{ fontFamily: "'Dancing Script', cursive" }}>MEDWEB-PK</span>
          </div>
        </div>
      </div>
    </AmbassadorLayout>
  )
}
