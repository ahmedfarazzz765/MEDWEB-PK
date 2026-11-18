import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../../firebase/config'
import useAdminBadgeCounts from '../hooks/useAdminBadgeCounts'
import {
  LayoutDashboard, Users, Video, BookOpen, Award, Megaphone,
  FileText, UserCheck, LogOut, ChevronLeft, ChevronRight, ChevronDown, Mail,
  FormInput, Star, Inbox, Link2, ToggleRight, GraduationCap,
  Image, Quote, Sparkles, Building2, ShieldCheck, PanelTop, Scale, ClipboardCheck,
  UserCog, Newspaper, BarChart3, ScrollText, X,
} from 'lucide-react'
import logo from '../../assets/medweb-logo.png'

// Each item's `id` is the page key in AdminPanel's `pages` map. Items that
// point into AdminContent.jsx's internal tabs also carry a `tab`, so the
// same page can be reached at a specific sub-section directly from the
// sidebar without giving each sub-section its own route.
//
// Round 15 B: reordered/regrouped per the new brief exactly (Overview ->
// Programs -> People -> Engagement -> Website Content (collapsible,
// collapsed by default) -> Settings -> Admin) — this is a pure navigation
// reorganization, no page/route/permission was added, removed or renamed.
const GROUPS = [
  {
    label: 'Overview',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Programs',
    items: [
      { id: 'webinars',     label: 'Webinars',     icon: Video },
      { id: 'courses',      label: 'Courses',      icon: BookOpen, badgeKey: 'pendingEnrollments' },
      { id: 'certificates', label: 'Certificates', icon: Award },
      { id: 'mockTests',    label: 'Mock Tests',   icon: ClipboardCheck },
    ],
  },
  {
    label: 'People',
    items: [
      { id: 'students',    label: 'Students',       icon: Users },
      { id: 'submissions', label: 'Submissions',    icon: Inbox },
      { id: 'ambassadors', label: 'Ambassadors',    icon: Megaphone },
      { id: 'advisory',    label: 'Advisory Board', icon: GraduationCap },
      { id: 'team',        label: 'Team',           icon: UserCheck },
    ],
  },
  {
    label: 'Engagement',
    items: [
      { id: 'testimonials', label: 'Testimonials', icon: Star },
      { id: 'pendingTestimonials', label: 'Pending Reviews', icon: ClipboardCheck, badgeKey: 'pendingReviews' },
      { id: 'events',       label: 'Events & News', icon: Newspaper, badgeKey: 'autoNewsDrafts' },
      { id: 'blog',         label: 'Blog Posts',   icon: FileText },
      { id: 'forms',        label: 'Form Builder', icon: FormInput },
      { id: 'reports',      label: 'Reports',      icon: BarChart3 },
    ],
  },
  {
    label: 'Website Content',
    collapsible: true,
    items: [
      { id: 'content',  label: 'Hero',                    icon: Image,       tab: 'hero' },
      { id: 'sections', label: 'Homepage Sections',      icon: ToggleRight },
      { id: 'announcements', label: 'Announcements',     icon: Megaphone },
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
    label: 'Settings',
    items: [
      { id: 'email', label: 'Email Settings', icon: Mail },
    ],
  },
  {
    label: 'Admin',
    superAdminOnly: true,
    items: [
      { id: 'adminUsers', label: 'Admin Users', icon: UserCog },
      { id: 'activityLog', label: 'Activity Log', icon: ScrollText },
    ],
  },
]

export default function AdminSidebar({ active, activeTab, onNav, permissions, mobileOpen, onCloseMobile }) {
  const [collapsed, setCollapsed] = useState(false)
  // Collapsed by default (Round 15 B) — any collapsible group an admin has
  // expanded stays expanded for the rest of the session (not persisted
  // beyond that; reloading goes back to collapsed, matching "collapsed by
  // default" literally rather than only on first-ever visit).
  const [expandedGroups, setExpandedGroups] = useState(() => new Set())
  const toggleGroup = label => setExpandedGroups(prev => {
    const next = new Set(prev)
    if (next.has(label)) next.delete(label); else next.add(label)
    return next
  })
  const navigate = useNavigate()
  const badges = useAdminBadgeCounts()

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
  //
  // The `isSuperAdmin` check below is NOT redundant with
  // `permissions.canAccess()`'s own internal `isSuperAdmin ||` check —
  // it's a second, independent guard specifically so a Super Admin can
  // never end up with a hidden sidebar no matter what canAccess() does
  // internally (a future change to that function, a bad `allowedSections`
  // value, anything) — this one line is the actual guarantee "Super Admin
  // always sees every page" rests on, not an implementation detail of
  // useAdminPermissions.js.
  const canSee = (id, tab) => {
    if (id === 'dashboard') return true
    if (permissions?.isSuperAdmin) return true
    if (id === 'adminUsers' || id === 'activityLog') return !!permissions?.isSuperAdmin
    if (!permissions || permissions.loading) return true
    return permissions.canAccess(tab ? `${id}:${tab}` : id)
  }

  return (
    <>
      {/* Mobile backdrop — only rendered (and only blocks clicks) while the
          drawer is open; the sidebar itself is position-fixed and slid
          off-screen below the lg breakpoint otherwise. Desktop (lg+)
          ignores mobileOpen entirely and keeps the original sticky layout. */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={onCloseMobile} />
      )}
      <aside
        className={`flex flex-col h-screen transition-all duration-300 z-40
          admin-card !rounded-none border-r
          fixed inset-y-0 left-0 lg:sticky lg:top-0 lg:left-auto lg:inset-y-auto
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        style={{ width: collapsed ? 72 : 250, minWidth: collapsed ? 72 : 250 }}
      >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b admin-border">
        <img src={logo} alt="MEDWEB" className="w-10 h-10 rounded-full object-cover shrink-0" />
        {!collapsed && (
          <div className="overflow-hidden">
            <div className="admin-text font-black text-base leading-none">MEDWEB</div>
            <div className="admin-text-secondary text-[10px] font-semibold tracking-wider">ADMIN PANEL</div>
          </div>
        )}
        <button onClick={onCloseMobile} className="ml-auto p-1 rounded-lg hover:bg-black/5 admin-text-secondary transition-all lg:hidden">
          <X size={18} />
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto p-1 rounded-lg hover:bg-black/5 admin-text-secondary transition-all hidden lg:block"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {GROUPS.map((group, gi) => {
          const visibleItems = group.items.filter(({ id, tab }) => canSee(id, tab))
          if (visibleItems.length === 0) return null
          // A collapsible group auto-expands when the active page lives
          // inside it (e.g. reached via the command palette or a direct
          // URL), even though it's collapsed by default otherwise.
          const groupHasActive = visibleItems.some(({ id, tab }) => active === id && (!tab || activeTab === tab))
          const isExpanded = !group.collapsible || expandedGroups.has(group.label) || groupHasActive
          return (
          <div key={group.label} className={gi > 0 ? 'mt-3 pt-3 border-t admin-border' : ''}>
            {!collapsed && (
              group.collapsible ? (
                <button onClick={() => toggleGroup(group.label)} className="w-full flex items-center gap-2 px-4 mb-1.5 group/header">
                  <span className="text-[10px] font-bold tracking-wider uppercase flex-1 text-left admin-text-secondary">
                    {group.label}
                  </span>
                  <ChevronDown size={12} className={`admin-text-secondary transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>
              ) : (
                <div className="px-4 mb-1.5">
                  <span className="text-[10px] font-bold tracking-wider uppercase admin-text-secondary">
                    {group.label}
                  </span>
                </div>
              )
            )}
            {isExpanded && visibleItems.map(({ id, tab, label, icon: Icon, badgeKey }) => {
              const isActive = active === id && (!tab || activeTab === tab)
              return (
                <button
                  key={label}
                  onClick={() => { onNav(id, tab); onCloseMobile?.() }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 transition-all duration-200 relative group border-l-[3px] ${
                    isActive ? 'admin-nav-active border-[#64AC37]' : 'bg-transparent border-transparent hover:bg-black/[0.03]'
                  }`}
                >
                  <Icon size={17} className="shrink-0" style={{ color: isActive ? '#1655C3' : 'var(--admin-text-secondary)' }} />
                  {!collapsed && (
                    <span className={`text-sm font-medium truncate flex-1 text-left ${isActive ? 'admin-text font-semibold' : 'admin-text-secondary group-hover:text-[var(--admin-text)]'}`}>
                      {label}
                    </span>
                  )}
                  {!collapsed && badgeKey && badges[badgeKey] > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#1655C3] text-white shrink-0">
                      {badges[badgeKey]}
                    </span>
                  )}
                  {collapsed && badgeKey && badges[badgeKey] > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#1655C3]" />
                  )}
                  {collapsed && (
                    <div className="absolute left-full ml-2 bg-[#1655c3] text-white text-xs font-semibold px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-lg">
                      {label}{badgeKey && badges[badgeKey] > 0 ? ` (${badges[badgeKey]})` : ''}
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
      <div className="border-t admin-border p-4">
        <button onClick={handleLogout} className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-black/5 transition-all group">
          <LogOut size={17} className="admin-text-secondary group-hover:text-red-500 shrink-0" />
          {!collapsed && <span className="admin-text-secondary text-sm group-hover:text-red-500">Logout</span>}
        </button>
      </div>
      </aside>
    </>
  )
}
