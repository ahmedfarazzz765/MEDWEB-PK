import { Sparkles } from 'lucide-react'
import AmbassadorLayout from './AmbassadorLayout'
import useAmbassador from './useAmbassador'
import { NAV_ITEMS } from './AmbassadorSidebar'

// One shared placeholder for every not-yet-built nav item (My Profile,
// Ambassador Card, Referral Link, My Referrals, Rewards & Certificates,
// Help & Support) — so the sidebar never links to a dead route, and adding
// the real page later is just swapping this element out in App.jsx.
export default function ComingSoonPage({ navKey }) {
  const ambassador = useAmbassador()
  const item = NAV_ITEMS.find(n => n.key === navKey)

  if (ambassador === undefined) {
    return <div className="min-h-screen flex items-center justify-center bg-[#f0faff] text-gray-400 text-sm">Loading…</div>
  }
  if (!ambassador) {
    return <div className="min-h-screen flex items-center justify-center bg-[#f0faff] text-gray-400 text-sm">Session expired — please sign in again.</div>
  }

  const Icon = item?.icon || Sparkles

  return (
    <AmbassadorLayout active={navKey} ambassador={ambassador}>
      <div className="flex flex-col items-center justify-center text-center px-4 py-24">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style={{ background: 'linear-gradient(135deg, #eff6ff, #f0fdf4)' }}>
          <Icon size={28} className="text-[#1655c3]" />
        </div>
        <h1 className="text-xl font-black text-[#1a1a1a] mb-2">{item?.label || 'Coming Soon'}</h1>
        <p className="text-sm text-gray-500 max-w-xs">This section is on its way — check back soon.</p>
      </div>
    </AmbassadorLayout>
  )
}
