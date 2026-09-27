import { Link } from 'react-router-dom'
import { LayoutDashboard, User, CreditCard, Link2, Users, Gift, HelpCircle, Megaphone, X } from 'lucide-react'

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
    <nav className="flex-1 py-3 overflow-y-auto">
      {NAV_ITEMS.map(({ key, label, icon: Icon, to }) => {
        const isActive = active === key
        return (
          <Link
            key={key}
            to={to}
            onClick={onNavigate}
            className="flex items-center gap-3 px-5 py-3 transition-all duration-200 relative"
            style={{
              background: isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
              borderRight: isActive ? '3px solid #95d348' : '3px solid transparent',
            }}
          >
            <Icon size={17} style={{ color: isActive ? '#95d348' : 'rgba(255,255,255,0.7)' }} />
            <span className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-white/70'}`}>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

// Desktop: persistent fixed rail. Mobile: slide-in drawer over a backdrop,
// toggled from AmbassadorTopbar's hamburger button — same dark navy panel
// either way, just a different container/positioning.
export default function AmbassadorSidebar({ active, mobileOpen, onCloseMobile }) {
  return (
    <>
      {/* Desktop rail */}
      <aside className="hidden lg:flex flex-col h-screen sticky top-0 w-64 shrink-0 bg-[#0B1220]">
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
            <Megaphone size={18} className="text-[#95d348]" />
          </div>
          <div className="text-white font-black text-base leading-none">
            MED<span style={{ color: '#95d348' }}>WEB</span>
            <div className="text-white/40 text-[10px] font-medium tracking-wider mt-1">AMBASSADOR PORTAL</div>
          </div>
        </div>
        <NavList active={active} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={onCloseMobile} />
          <aside className="absolute left-0 top-0 h-full w-72 max-w-[80vw] bg-[#0B1220] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between gap-3 px-5 py-5 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                  <Megaphone size={18} className="text-[#95d348]" />
                </div>
                <div className="text-white font-black text-base leading-none">
                  MED<span style={{ color: '#95d348' }}>WEB</span>
                  <div className="text-white/40 text-[10px] font-medium tracking-wider mt-1">AMBASSADOR PORTAL</div>
                </div>
              </div>
              <button onClick={onCloseMobile} className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10">
                <X size={18} />
              </button>
            </div>
            <NavList active={active} onNavigate={onCloseMobile} />
          </aside>
        </div>
      )}
    </>
  )
}
