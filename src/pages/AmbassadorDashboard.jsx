import { useEffect, useState } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from '../firebase/config'
import { ambassadorsService, webinarsService, ambassadorRanksService } from '../firebase/services'
import { computeAmbassadorRank, DEFAULT_RANK_THRESHOLDS } from '../lib/ambassadorRank'
import { Megaphone, Trophy, Users, Copy, LogOut, GraduationCap, Check } from 'lucide-react'

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

  return (
    <div className="min-h-screen bg-[#f7f9fc] font-poppins">
      <div className="px-4 pt-8 pb-16 sm:pt-10 sm:pb-20" style={{ background: 'linear-gradient(135deg, #1655c3, #64ac37)' }}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center"><Megaphone size={20} className="text-white" /></div>
            <div>
              <div className="text-white font-black text-lg leading-tight">{ambassador.name}</div>
              <div className="text-white/75 text-xs">{ambassador.university}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs font-semibold text-white/80 hover:text-white transition-colors">
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-10 sm:-mt-12 pb-16 space-y-6">
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
