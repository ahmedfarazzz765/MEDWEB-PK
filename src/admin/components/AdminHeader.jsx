import { useState } from 'react'
import { Bell, Search, Menu, Sun, Moon } from 'lucide-react'

const pageTitles = {
  dashboard:    { title: 'Dashboard',       sub: 'Welcome back, Admin' },
  sections:     { title: 'Homepage Sections', sub: 'Show or hide sections on the live site' },
  announcements:{ title: 'Announcements',    sub: 'Manage the homepage promo banner' },
  students:     { title: 'Students',        sub: 'Manage all enrolled students' },
  webinars:     { title: 'Webinars',        sub: 'Manage live sessions & registrations' },
  courses:      { title: 'Courses',         sub: 'Manage all programs & content' },
  certificates: { title: 'Certificates',   sub: 'Issue & verify student certificates' },
  mockTests:    { title: 'Mock Tests',     sub: 'Create tests, import questions & review results' },
  ambassadors:  { title: 'Ambassadors',    sub: 'Manage student ambassador network' },
  blog:         { title: 'Blog Posts',     sub: 'Manage articles & knowledge hub' },
  events:       { title: 'Events & News',  sub: 'Manage events, conferences and medical news' },
  team:         { title: 'Team',           sub: 'Manage MEDWEB team members' },
  advisory:     { title: 'Advisory Board', sub: 'Manage advisory board members' },
  email:        { title: 'Email Settings', sub: 'Configure automatic emails' },
  forms:        { title: 'Form Builder',    sub: 'Create dynamic forms & view responses' },
  testimonials: { title: 'Testimonials',    sub: 'Manage student testimonials' },
  submissions:  { title: 'Submissions',     sub: 'All webinar & form submissions' },
  footer:       { title: 'Footer & Links',  sub: 'Manage footer content & quick links' },
  adminUsers:   { title: 'Admin Users',     sub: 'Manage sub-admin access and permissions' },
  reports:      { title: 'Reports',         sub: 'Registrations, attendance & certificates per webinar/course' },
  activityLog:  { title: 'Activity Log',    sub: 'Who did what, and when' },
  pendingTestimonials: { title: 'Pending Reviews', sub: 'Approve or reject submitted testimonials' },
}

// AdminContent.jsx is one page with internal tabs — the header title follows
// whichever tab is currently active there instead of a single generic label.
const contentTabTitles = {
  hero:        { title: 'Hero',                     sub: 'Homepage hero banner text & image' },
  founder:     { title: 'Founder Message',           sub: 'Founder section & full message page' },
  why:         { title: 'Why MEDWEB',                sub: 'Why MEDWEB section heading & cards' },
  partners:    { title: 'Trusted Partners',          sub: 'Partner logos strip' },
  certificate: { title: 'Certificate Verification',  sub: 'Certificate verification section copy' },
  navbar:      { title: 'Navbar & WelcomeBar',        sub: 'Top navigation & welcome bar' },
  legal:       { title: 'Legal Pages',                sub: 'Privacy Policy, Terms, Refund Policy' },
}

// Was previously a hardcoded "Admin" / "Super Admin" label here, with no
// connection to the real signed-in account at all — every admin, at every
// role, always saw the literal text "Super Admin" regardless of their
// actual permissions. That's exactly what made the sidebar bug upstream
// so confusing to diagnose (the header looked right while the sidebar
// behaved as if it wasn't).
const ROLE_LABELS = { superadmin: 'Super Admin', editor: 'Editor', viewer: 'Viewer' }

// Mirrors AdminSidebar.jsx's GROUPS exactly (Round 15 B reorganization).
const GROUP_LABELS = {
  dashboard: 'Overview',
  webinars: 'Programs', courses: 'Programs', certificates: 'Programs', mockTests: 'Programs',
  students: 'People', submissions: 'People', ambassadors: 'People', advisory: 'People', team: 'People',
  testimonials: 'Engagement', pendingTestimonials: 'Engagement', events: 'Engagement', blog: 'Engagement', forms: 'Engagement', reports: 'Engagement',
  sections: 'Website Content', announcements: 'Website Content', content: 'Website Content', footer: 'Website Content',
  email: 'Settings',
  adminUsers: 'Admin', activityLog: 'Admin',
}

export default function AdminHeader({ page, tab, permissions, badges, onOpenMobileNav, onOpenSearch, theme, onToggleTheme }) {
  const [notifOpen, setNotifOpen] = useState(false)
  const { title, sub } = page === 'content'
    ? (contentTabTitles[tab] || contentTabTitles.hero)
    : (pageTitles[page] || pageTitles.dashboard)

  const roleLabel = ROLE_LABELS[permissions?.role] || (permissions?.loading ? 'Checking…' : 'Admin')
  const initial = (permissions?.email || 'A').charAt(0).toUpperCase()
  const b = badges || { pendingEnrollments: 0, pendingReviews: 0, autoNewsDrafts: 0 }
  const needsAttentionTotal = b.pendingEnrollments + b.pendingReviews + b.autoNewsDrafts

  return (
    <header className="sticky top-0 z-30 admin-card !rounded-none border-b">
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button onClick={onOpenMobileNav} className="lg:hidden w-9 h-9 rounded-xl admin-card flex items-center justify-center shrink-0 hover:bg-black/5 transition-colors">
            <Menu size={16} className="admin-text-secondary" />
          </button>
          {/* flex-1 (not just min-w-0) — without an explicit share of the
              row's width, this block was shrinking all the way to 0 next
              to the icon buttons' own fixed, non-shrinking size on a
              narrow viewport (classic flexbox default-min-width-auto
              behavior), not because there genuinely wasn't room. */}
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold admin-text-secondary uppercase tracking-wider truncate">{GROUP_LABELS[page] || 'Admin'} / {title}</p>
            <h1 className="text-xl sm:text-2xl font-black admin-text font-poppins truncate leading-tight">{title}</h1>
            <p className="text-xs admin-text-secondary font-medium hidden sm:block">{sub}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Search / command palette trigger */}
          <button onClick={onOpenSearch} className="hidden md:flex items-center gap-2 bg-[var(--admin-bg)] border admin-border rounded-full px-4 py-2 hover:bg-black/5 transition-colors">
            <Search size={14} className="admin-text-secondary" />
            <span className="text-sm admin-text-secondary w-56 text-left truncate">Search students, webinars, events…</span>
            <kbd className="text-[10px] font-semibold admin-text-secondary bg-[var(--admin-card)] border admin-border rounded px-1.5 py-0.5">Ctrl K</kbd>
          </button>
          <button onClick={onOpenSearch} className="md:hidden w-9 h-9 rounded-xl admin-card flex items-center justify-center hover:bg-black/5 transition-colors">
            <Search size={16} className="admin-text-secondary" />
          </button>

          {/* Theme toggle — persisted in localStorage via useAdminTheme,
              default = system preference. */}
          <button onClick={onToggleTheme} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="w-9 h-9 rounded-xl admin-card flex items-center justify-center hover:bg-black/5 transition-colors">
            {theme === 'dark' ? <Sun size={16} className="admin-text-secondary" /> : <Moon size={16} className="admin-text-secondary" />}
          </button>

          {/* Notifications — real counts (pending enrollments, pending
              reviews, bot drafts), not a decorative hardcoded badge. */}
          <div className="relative">
            <button onClick={() => setNotifOpen(o => !o)} className="relative w-9 h-9 rounded-xl admin-card flex items-center justify-center hover:bg-black/5 transition-colors">
              <Bell size={16} className="admin-text-secondary" />
              {needsAttentionTotal > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold">
                  {needsAttentionTotal > 9 ? '9+' : needsAttentionTotal}
                </span>
              )}
            </button>
            {notifOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-64 admin-card overflow-hidden z-50">
                  <div className="px-4 py-3 border-b admin-border text-xs font-bold admin-text-secondary uppercase tracking-wider">Needs Attention</div>
                  {needsAttentionTotal === 0 ? (
                    <p className="text-sm admin-text-secondary text-center py-6">All caught up.</p>
                  ) : (
                    <div className="py-1">
                      {b.pendingEnrollments > 0 && <div className="px-4 py-2.5 text-sm admin-text flex justify-between"><span>Pending enrollments</span><span className="font-bold text-amber-500">{b.pendingEnrollments}</span></div>}
                      {b.pendingReviews > 0 && <div className="px-4 py-2.5 text-sm admin-text flex justify-between"><span>Pending reviews</span><span className="font-bold text-amber-500">{b.pendingReviews}</span></div>}
                      {b.autoNewsDrafts > 0 && <div className="px-4 py-2.5 text-sm admin-text flex justify-between"><span>Auto-news bot drafts</span><span className="font-bold text-amber-500">{b.autoNewsDrafts}</span></div>}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Admin avatar */}
          <div className="hidden sm:flex items-center gap-2 bg-[var(--admin-bg)] border admin-border rounded-full pl-1 pr-3 py-1">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black bg-[#1655C3]">
              {initial}
            </div>
            <div>
              <div className="text-xs font-bold admin-text truncate max-w-[140px]">{permissions?.email || 'Admin'}</div>
              <div className="text-[10px] admin-text-secondary">{roleLabel}</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
