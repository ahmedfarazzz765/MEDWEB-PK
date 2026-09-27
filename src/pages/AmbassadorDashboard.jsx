import { useEffect, useState } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from '../firebase/config'
import { ambassadorsService, webinarsService, ambassadorRanksService } from '../firebase/services'
import { computeAmbassadorRank, DEFAULT_RANK_THRESHOLDS } from '../lib/ambassadorRank'
import { Trophy, Users, Copy, LogOut, GraduationCap, Check, Linkedin, Instagram, Facebook, MessageCircle } from 'lucide-react'
import CoverImage from '../components/CoverImage'

// Same shape/behavior as AmbassadorProfilePage.jsx's SOCIAL_PLATFORMS —
// only platforms with a value are rendered.
const SOCIAL_PLATFORMS = [
  { key: 'linkedin',  Icon: Linkedin,      label: 'LinkedIn' },
  { key: 'instagram', Icon: Instagram,     label: 'Instagram' },
  { key: 'facebook',  Icon: Facebook,      label: 'Facebook' },
  { key: 'whatsapp',  Icon: MessageCircle, label: 'WhatsApp' },
]

export default function AmbassadorDashboard() {
  const [ambassador, setAmbassador] = useState(undefined) // undefined = loading
  const [thresholds, setThresholds] = useState(DEFAULT_RANK_THRESHOLDS)
  const [registrations, setRegistrations] = useState([])
  const [webinars, setWebinars] = useState([])
  const [selectedWebinar, setSelectedWebinar] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async user => {
      if (!user) { setAmbassador(null); return }
      const a = await ambassadorsService.getByAuthUid(user.uid).catch(() => null)
      setAmbassador(a)
      if (a) {
        webinarsService.getRegistrationsByReferrerUid(user.uid).then(setRegistrations).catch(() => {})
      }
    })
    const unsubRanks = ambassadorRanksService.listen(t => { if (t) setThresholds(t) })
    const unsubWebinars = webinarsService.listen(rows => {
      setWebinars(rows.filter(w => w.status !== 'Completed'))
    })
    return () => { unsubAuth(); unsubRanks(); unsubWebinars() }
  }, [])

  if (ambassador === undefined) {
    return <div className="min-h-screen flex items-center justify-center bg-[#f0faff] text-gray-400 text-sm">Loading your dashboard…</div>
  }
  if (!ambassador) {
    return <div className="min-h-screen flex items-center justify-center bg-[#f0faff] text-gray-400 text-sm">Session expired — please sign in again.</div>
  }

  const points = Number(ambassador.points) || 0
  const { rank, nextRank, pointsToNext } = computeAmbassadorRank(points, ambassador.gender, thresholds)

  const referralLink = selectedWebinar
    ? `${window.location.origin}/webinar/${selectedWebinar}/register?ref=${ambassador.referralCode}`
    : ''

  const handleCopy = () => {
    if (!referralLink) return
    navigator.clipboard?.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  const handleLogout = () => signOut(auth)
  const filledSocials = SOCIAL_PLATFORMS.filter(p => ambassador.socialLinks?.[p.key])

  return (
    <div className="min-h-screen bg-[#f7f9fc] font-poppins">
      <div className="max-w-4xl mx-auto px-4 pt-6 sm:pt-10 pb-16 space-y-6">

        {/* Profile — same fields AdminAmbassadors.jsx lets admin edit,
            same card style as the rest of this page (and the same photo/
            rank/code/social pattern as AmbassadorProfilePage.jsx) */}
        <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.06)] p-5 sm:p-6 relative">
          <button onClick={handleLogout} title="Sign Out"
            className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
            <LogOut size={17} />
          </button>

          <div className="flex items-center gap-4 pr-10">
            {ambassador.imageUrl
              ? <CoverImage src={ambassador.imageUrl} alt={ambassador.name} bias="center 25%" className="w-16 h-16 sm:w-20 sm:h-20 rounded-full ring-4 ring-white shadow-md shrink-0" />
              : <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#1655c3] flex items-center justify-center text-white font-bold text-xl sm:text-2xl ring-4 ring-white shadow-md shrink-0">{ambassador.name?.charAt(0)}</div>}
            <div className="min-w-0">
              <div className="font-black text-[#1a1a1a] text-lg sm:text-xl truncate">{ambassador.name}</div>
              {ambassador.university && (
                <div className="text-xs sm:text-sm text-gray-500 truncate flex items-center gap-1.5 mt-0.5">
                  <GraduationCap size={13} className="shrink-0" /> {ambassador.university}
                </div>
              )}
              <div className="flex items-center gap-2 flex-wrap mt-2">
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-[#1655c3]">{ambassador.rank || 'Ambassador'}</span>
                {ambassador.ambCode && <span className="text-xs font-mono text-gray-400">{ambassador.ambCode}</span>}
                {ambassador.gender && <span className="text-xs text-gray-400 capitalize">{ambassador.gender}</span>}
              </div>
            </div>
          </div>

          {filledSocials.length > 0 && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
              {filledSocials.map(({ key, Icon, label }) => (
                <a key={key} href={ambassador.socialLinks[key]} target="_blank" rel="noopener noreferrer" aria-label={label}
                  className="w-9 h-9 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-500 hover:text-[#1655c3] hover:border-[#1655c3] transition-colors">
                  <Icon size={15} />
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Points + Rank */}
        <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.06)] p-6 grid sm:grid-cols-2 gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">
              <Trophy size={26} className="text-[#1655c3]" />
            </div>
            <div>
              <div className="text-3xl font-black text-[#1a1a1a] leading-none">{points.toLocaleString()}</div>
              <div className="text-xs text-gray-400 mt-1">Total Points</div>
            </div>
          </div>
          <div>
            <div className="text-sm font-bold text-[#1655c3] mb-1">{rank}</div>
            {nextRank ? (
              <p className="text-xs text-gray-500">
                <span className="font-bold text-[#1a1a1a]">{pointsToNext.toLocaleString()} points</span> to {nextRank}
              </p>
            ) : (
              <p className="text-xs text-gray-500">You've reached the top rank 🎉</p>
            )}
          </div>
        </div>

        {/* Referral link generator */}
        <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.06)] p-6">
          <h2 className="font-bold text-[#1a1a1a] text-sm mb-1">Your Referral Link</h2>
          <p className="text-xs text-gray-400 mb-4">Your code: <span className="font-mono font-bold text-[#1655c3]">{ambassador.referralCode || '—'}</span>. Pick a webinar below to generate its shareable registration link.</p>
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
        </div>

        {/* Referred students */}
        <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-[#1a1a1a] text-sm">Students You've Referred</h2>
            <span className="text-xs font-bold text-[#64ac37]">{registrations.length}</span>
          </div>
          {registrations.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-400">
              <Users size={28} className="mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No referrals yet — share your link above to get started.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {registrations.map((r, i) => (
                <div key={r.id || i} className="flex items-center gap-3 px-6 py-3.5">
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
      </div>
    </div>
  )
}
