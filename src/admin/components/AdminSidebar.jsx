import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../../firebase/config'
import {
  LayoutDashboard, Users, Video, BookOpen, Award, Megaphone,
  FileText, UserCheck, LogOut, ChevronLeft, ChevronRight, Shield, Mail,
  FormInput, Star, Inbox, Link2, ToggleRight, GraduationCap,
  Image, Quote, Sparkles, Building2, ShieldCheck, PanelTop, Scale, ClipboardCheck,
  UserCog,
} from 'lucide-react'

// Each item's `id` is the page key in AdminPanel's `pages` map. Items that
// point into AdminContent.jsx's internal tabs also carry a `tab`, so the
// same page can be reached at a specific sub-section directly from the
// sidebar without giving each sub-section its own route.
const GROUPS = [
  {
    label: 'Overview',
    accent: '#7dd3fc',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Content',
    accent: '#6ee7b7',
    items: [
      { id: 'sections', label: 'Homepage Sections',      icon: ToggleRight },
      { id: 'announcements', label: 'Announcements',     icon: Megaphone },
      { id: 'content',  label: 'Hero',                    icon: Image,       tab: 'hero' },
      { id: 'content',  label: 'Founder Message',         icon: Quote,       tab: 'founder' },
      { id: 'content',  label: 'Why MEDWEB',              icon: Sparkles,    tab: 'why' },
      { id: 'content',  label: 'Trusted Partners',        icon: Building2,   tab: 'partners' },
      { id: 'content',  label: 'Certificate Verification',icon: ShieldCheck, tab: 'certificate' },
      { id: 'content',  label: 'Navbar & WelcomeBar',     icon: PanelTop,    tab: 'navbar' },
      { id: 'content',  label: 'Legal Pages',             icon: Scale,       tab: 'legal' },
      { id: 'footer',   label: 'Footer',                  icon: Link2 },
    ],
  },
  {
    label: 'People',
    accent: '#c4b5fd',
    items: [
      { id: 'students',    label: 'Students',       icon: Users },
      { id: 'team',        label: 'Team',           icon: UserCheck },
      { id: 'advisory',    label: 'Advisory Board', icon: GraduationCap },
      { id: 'ambassadors', label: 'Ambassadors',    icon: Megaphone },
    ],
  },
  {
    label: 'Programs',
    accent: '#fcd34d',
    items: [
      { id: 'webinars',     label: 'Webinars',     icon: Video },
      { id: 'courses',      label: 'Courses',      icon: BookOpen },
      { id: 'certificates', label: 'Certificates', icon: Award },
    ],
  },
  {
    label: 'Engagement',
    accent: '#f9a8d4',
    items: [
      { id: 'testimonials', label: 'Testimonials', icon: Star },
      { id: 'pendingTestimonials', label: 'Pending Reviews', icon: ClipboardCheck },
      { id: 'blog',         label: 'Blog Posts',   icon: FileText },
      { id: 'forms',        label: 'Form Builder', icon: FormInput },
      { id: 'submissions',  label: 'Submissions',  icon: Inbox },
    ],
  },
  {
    label: 'Settings',
    accent: '#cbd5e1',
    items: [
      { id: 'email', label: 'Email Settings', icon: Mail },
    ],
  },
  {
    label: 'Admin',
    accent: '#fca5a5',
    superAdminOnly: true,
    items: [
      { id: 'adminUsers', label: 'Admin Users', icon: UserCog },
    ],
  },
]

export default function AdminSidebar({ active, activeTab, onNav, permissions }) {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()

  // Firebase Auth's signOut() ends the session; RequireAuth's own
  // onAuthStateChanged listener will also react to this, but navigating
  // here too means the redirect happens immediately rather than waiting
  // on that listener's next tick.
  const handleLogout = async () => {
    try { await signOut(auth) } catch (e) { console.error('Sign out failed:', e) }
    navigate('/admin/login', { replace: true })
  }

  // While permissions are still loading, show everything rather than a
  // flash of a near-empty sidebar that then fills back in a moment later.
  const canSee = (id, tab) => {
    if (id === 'dashboard') return true
    if (id === 'adminUsers') return !!permissions?.isSuperAdmin
    if (!permissions || permissions.loading) return true
    return permissions.canAccess(tab ? `${id}:${tab}` : id)
  }

  return (
    <aside
      className="flex flex-col h-screen sticky top-0 transition-all duration-300 shadow-2xl z-40 bg-[#123f8f]"
      style={{ width: collapsed ? 72 : 250, minWidth: collapsed ? 72 : 250 }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
        <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
          <Shield size={18} className="text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <div className="text-white font-black text-lg leading-none">
              MED<span style={{ color: '#95d348' }}>WEB</span>
            </div>
            <div className="text-white/50 text-[10px] font-medium tracking-wider">ADMIN PANEL</div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-all"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {GROUPS.map((group, gi) => {
          const visibleItems = group.items.filter(({ id, tab }) => canSee(id, tab))
          if (visibleItems.length === 0) return null
          return (
          <div key={group.label} className={gi > 0 ? 'mt-3 pt-3 border-t border-white/10' : ''}>
            {!collapsed && (
              <div className="flex items-center gap-2 px-4 mb-1.5">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: group.accent }} />
                <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: group.accent }}>
                  {group.label}
                </span>
              </div>
            )}
            {visibleItems.map(({ id, tab, label, icon: Icon }) => {
              const isActive = active === id && (!tab || activeTab === tab)
              return (
                <button
                  key={label}
                  onClick={() => onNav(id, tab)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 transition-all duration-200 relative group"
                  style={{
                    background: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
                    borderRight: isActive ? '3px solid #95d348' : '3px solid transparent',
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all"
                    style={{ background: isActive ? 'rgba(255,255,255,0.2)' : 'transparent' }}
                  >
                    <Icon size={16} className="transition-colors" style={{ color: isActive ? '#fff' : group.accent, opacity: isActive ? 1 : 0.75 }} />
                  </div>
                  {!collapsed && (
                    <span className={`text-sm font-medium transition-colors truncate ${isActive ? 'text-white' : 'text-white/70 group-hover:text-white'}`}>
                      {label}
                    </span>
                  )}
                  {collapsed && (
                    <div className="absolute left-full ml-2 bg-[#1655c3] text-white text-xs font-semibold px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-lg">
                      {label}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t border-white/10 p-4">
        <button onClick={handleLogout} className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 transition-all group">
          <LogOut size={17} className="text-white/60 group-hover:text-red-400 shrink-0" />
          {!collapsed && <span className="text-white/60 text-sm group-hover:text-red-400">Logout</span>}
        </button>
      </div>
    </aside>
  )
}
