import { Link } from 'react-router-dom'
import { LayoutDashboard, User, CreditCard, Link2, Users, Gift, HelpCircle, X, HeartPulse } from 'lucide-react'

// Only "dashboard" is wired to a real feature — every other entry routes to
// ComingSoonPage.jsx so the nav never looks broken (dead link / 404) while
// those sections are built out.
export const NAV_ITEMS = [
  { key: 'dashboard',     label: 'Dashboard',              icon: LayoutDashboard, to: '/ambassador/dashboard' },
  { key: 'profile',       label: 'My Profile',             icon: User,            to: '/ambassador/profile' },
  { key: 'card',          label: 'Ambassador Card',        icon: CreditCard,      to: '/ambassador/card' },
  { key: 'referral-link', label: 'Referral Link',          icon: Link2,           to: '/ambassador/referral-link' },
  { key: 'referrals',     label: 'My Referrals',           icon: Users,           to: '/ambassador/referrals' },
  { key: 'rewards',       label: 'Rewards & Certificates', icon: Gift,            to: '/ambassador/rewards' },
  { key: 'help',          label: 'Help & Support',         icon: HelpCircle,      to: '/ambassador/help' },
]

function NavList({ active, onNavigate }) {
  return (
    <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
      {NAV_ITEMS.map(({ key, label, icon: Icon, to }) => {
        const isActive = active === key
        return (
          <Link
            key={key}
            to={to}
            onClick={onNavigate}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors duration-150 ${isActive ? 'bg-[#64ac37] text-white' : 'text-white/65 hover:bg-white/5 hover:text-white'}`}
          >
            <Icon size={18} />
            <span className="text-sm font-semibold">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

// Fixed motivational line pinned near the bottom of the dark sidebar —
// script font reuses the "Dancing Script" family index.html already loads
// for certificate name rendering, so no new font/network cost.
function SidebarTagline() {
  return (
    <div className="px-5 pb-6 pt-2">
      <p className="text-[#95d348] leading-tight text-lg" style={{ fontFamily: "'Dancing Script', cursive" }}>
        Together We Build<br />a Healthier Tomorrow
      </p>
      <HeartPulse size={16} className="text-[#95d348]/70 mt-1" />
    </div>
  )
}

// Desktop: persistent fixed rail. Mobile: slide-in drawer over a backdrop,
// toggled from AmbassadorTopbar's hamburger button — same dark navy panel
// either way, just a different container/positioning. The MEDWEB logo lives
// in AmbassadorTopbar now (matches the reference layout), not duplicated
// here — this rail is nav + brand tagline only.
export default function AmbassadorSidebar({ active, mobileOpen, onCloseMobile }) {
  return (
    <>
      {/* Desktop rail */}
      <aside className="hidden lg:flex flex-col h-screen sticky top-0 w-64 shrink-0 bg-[#0B1220]">
        <NavList active={active} />
        <SidebarTagline />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={onCloseMobile} />
          <aside className="absolute left-0 top-0 h-full w-72 max-w-[80vw] bg-[#0B1220] flex flex-col shadow-2xl">
            <div className="flex items-center justify-end px-4 pt-4">
              <button onClick={onCloseMobile} className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10">
                <X size={18} />
              </button>
            </div>
            <NavList active={active} onNavigate={onCloseMobile} />
            <SidebarTagline />
          </aside>
        </div>
      )}
    </>
  )
}
