import { useState } from 'react'
import { Bell, Search, Menu } from 'lucide-react'

const pageTitles = {
  dashboard:    { title: 'Dashboard',       sub: 'Welcome back, Admin' },
  sections:     { title: 'Homepage Sections', sub: 'Show or hide sections on the live site' },
  announcements:{ title: 'Announcements',    sub: 'Manage the homepage promo banner' },
  students:     { title: 'Students',        sub: 'Manage all enrolled students' },
  webinars:     { title: 'Webinars',        sub: 'Manage live sessions & registrations' },
  courses:      { title: 'Courses',         sub: 'Manage all programs & content' },
  certificates: { title: 'Certificates',   sub: 'Issue & verify student certificates' },
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

const GROUP_LABELS = {
  dashboard: 'Overview', sections: 'Content', announcements: 'Content', content: 'Content', footer: 'Content',
  students: 'People', team: 'People', advisory: 'People', ambassadors: 'People',
  webinars: 'Programs', courses: 'Programs', certificates: 'Programs',
  testimonials: 'Engagement', pendingTestimonials: 'Engagement', blog: 'Engagement', events: 'Engagement', forms: 'Engagement', submissions: 'Engagement', reports: 'Engagement',
  email: 'Settings',
  adminUsers: 'Admin', activityLog: 'Admin',
}

export default function AdminHeader({ page, tab, permissions, badges, onOpenMobileNav, onOpenSearch }) {
  const [notifOpen, setNotifOpen] = useState(false)
  const { title, sub } = page === 'content'
    ? (contentTabTitles[tab] || contentTabTitles.hero)
    : (pageTitles[page] || pageTitles.dashboard)

  const roleLabel = ROLE_LABELS[permissions?.role] || (permissions?.loading ? 'Checking…' : 'Admin')
  const initial = (permissions?.email || 'A').charAt(0).toUpperCase()
  const b = badges || { pendingEnrollments: 0, pendingReviews: 0, autoNewsDrafts: 0 }
  const needsAttentionTotal = b.pendingEnrollments + b.pendingReviews + b.autoNewsDrafts

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm">
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onOpenMobileNav} className="lg:hidden w-9 h-9 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center shrink-0 hover:bg-blue-50 transition-colors">
            <Menu size={16} className="text-gray-500" />
          </button>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">{GROUP_LABELS[page] || 'Admin'} / {title}</p>
            <h1 className="text-lg sm:text-xl font-black text-[#1a1a1a] font-poppins truncate">{title}</h1>
            <p className="text-xs text-gray-500 font-medium hidden sm:block">{sub}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Search / command palette trigger */}
          <button onClick={onOpenSearch} className="hidden sm:flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 hover:border-[#1655c3]/40 transition-colors">
            <Search size={14} className="text-gray-400" />
            <span className="text-sm text-gray-400 w-28 text-left">Search...</span>
            <kbd className="text-[10px] font-semibold text-gray-400 bg-white border border-gray-200 rounded px-1.5 py-0.5">Ctrl K</kbd>
          </button>
          <button onClick={onOpenSearch} className="sm:hidden w-9 h-9 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center hover:bg-blue-50 transition-colors">
            <Search size={16} className="text-gray-500" />
          </button>

          {/* Notifications — real counts (pending enrollments, pending
              reviews, bot drafts), not a decorative hardcoded badge. */}
          <div className="relative">
            <button onClick={() => setNotifOpen(o => !o)} className="relative w-9 h-9 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center hover:bg-blue-50 transition-colors">
              <Bell size={16} className="text-gray-500" />
              {needsAttentionTotal > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold">
                  {needsAttentionTotal > 9 ? '9+' : needsAttentionTotal}
                </span>
              )}
            </button>
            {notifOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">Needs Attention</div>
                  {needsAttentionTotal === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">All caught up.</p>
                  ) : (
                    <div className="py-1">
                      {b.pendingEnrollments > 0 && <div className="px-4 py-2.5 text-sm text-gray-700 flex justify-between"><span>Pending enrollments</span><span className="font-bold text-amber-600">{b.pendingEnrollments}</span></div>}
                      {b.pendingReviews > 0 && <div className="px-4 py-2.5 text-sm text-gray-700 flex justify-between"><span>Pending reviews</span><span className="font-bold text-amber-600">{b.pendingReviews}</span></div>}
                      {b.autoNewsDrafts > 0 && <div className="px-4 py-2.5 text-sm text-gray-700 flex justify-between"><span>Auto-news bot drafts</span><span className="font-bold text-amber-600">{b.autoNewsDrafts}</span></div>}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Admin avatar */}
          <div className="hidden sm:flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-black bg-[#1655c3]">
              {initial}
            </div>
            <div>
              <div className="text-xs font-bold text-[#1a1a1a] truncate max-w-[140px]">{permissions?.email || 'Admin'}</div>
              <div className="text-[10px] text-gray-400">{roleLabel}</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
