import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import AdminSidebar from './components/AdminSidebar'
import AdminHeader  from './components/AdminHeader'
import AccessDenied  from './components/AccessDenied'
import CommandPalette from './components/CommandPalette'
import { ToastProvider } from './components/Toast'
import { ConfirmProvider } from './components/ConfirmDialog'
import PageSkeleton from './components/Skeleton'
import useAdminPermissions from './hooks/useAdminPermissions'
import useAdminBadgeCounts from './hooks/useAdminBadgeCounts'
import useAdminTheme from './hooks/useAdminTheme'
import AdminDashboard   from './pages/AdminDashboard'
import AdminStudents    from './pages/AdminStudents'
import AdminWebinars    from './pages/AdminWebinars'
import AdminCourses     from './pages/AdminCourses'
import AdminCertificates from './pages/AdminCertificates'
import AdminAmbassadors from './pages/AdminAmbassadors'
import AdminAnnouncements from './pages/AdminAnnouncements'
import AdminBlog        from './pages/AdminBlog'
import AdminEvents      from './pages/AdminEvents'
import AdminTeam        from './pages/AdminTeam'
import AdminAdvisoryBoard from './pages/AdminAdvisoryBoard'
import AdminEmailSettings from './pages/AdminEmailSettings'
import AdminForms        from './pages/AdminForms'
import AdminContent      from './pages/AdminContent'
import AdminTestimonials from './pages/AdminTestimonials'
import AdminPendingTestimonials from './pages/AdminPendingTestimonials'
import AdminSubmissions  from './pages/AdminSubmissions'
import AdminFooter       from './pages/AdminFooter'
import AdminSections     from './pages/AdminSections'
import AdminUsers        from './pages/AdminUsers'
import AdminReports      from './pages/AdminReports'
import AdminActivityLog  from './pages/AdminActivityLog'

const pages = {
  dashboard:    AdminDashboard,
  students:     AdminStudents,
  webinars:     AdminWebinars,
  courses:      AdminCourses,
  certificates: AdminCertificates,
  ambassadors:  AdminAmbassadors,
  announcements: AdminAnnouncements,
  blog:         AdminBlog,
  events:       AdminEvents,
  team:         AdminTeam,
  advisory:     AdminAdvisoryBoard,
  email:        AdminEmailSettings,
  forms:        AdminForms,
  content:      AdminContent,
  testimonials: AdminTestimonials,
  pendingTestimonials: AdminPendingTestimonials,
  submissions:  AdminSubmissions,
  footer:       AdminFooter,
  sections:     AdminSections,
  adminUsers:   AdminUsers,
  reports:      AdminReports,
  activityLog:  AdminActivityLog,
}

// Pages that every signed-in admin can always reach, regardless of their
// granted-sections list — not part of the assignable permission checklist.
const ALWAYS_ALLOWED = ['dashboard']

// Section (and, for AdminContent, sub-tab) now live in the URL
// (/admin/webinars, /admin/content/founder, ...) instead of component
// state, so refresh/back/bookmark all land back on the same screen —
// Prompt 5's routing requirement. AdminPanel itself still renders a
// single element inside the existing `/admin/*` catch-all in App.jsx
// (adding a real nested <Routes> here would duplicate RequireAuth/layout
// for no benefit) — the path is just read directly off useLocation.
export default function AdminPanel() {
  const location = useLocation()
  const navigate = useNavigate()
  const segments = location.pathname.replace(/^\/admin\/?/, '').split('/').filter(Boolean)
  const activePage = segments[0] || 'dashboard'
  const contentTab = activePage === 'content' ? (segments[1] || 'hero') : 'hero'
  const perms = useAdminPermissions()
  const badges = useAdminBadgeCounts()
  const { theme, toggleTheme } = useAdminTheme()
  const PageComponent = pages[activePage] || AdminDashboard
  const [mobileOpen, setMobileOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)

  const handleNav = (id, tab) => {
    navigate(tab ? `/admin/${id}/${tab}` : `/admin/${id}`)
  }

  // Ctrl+K / Cmd+K anywhere in the admin panel opens the command palette —
  // ignored while typing in a text field/textarea/contenteditable so it
  // doesn't steal a literal "k" from a form.
  useEffect(() => {
    const onKeyDown = e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen(o => !o)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // Closes the mobile drawer automatically on navigation (route change) —
  // covers browser back/forward too, not just the sidebar's own link
  // clicks (which already close it directly).
  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  // Mirrors the permission key format used in adminSections.js: plain `id`
  // for most pages, `id:tab` for AdminContent's internal tabs.
  const permissionKey = activePage === 'content' ? `content:${contentTab}` : activePage

  // Admin Users AND the Activity Log are Super-Admin-only, not part of the
  // assignable permission checklist — same reasoning as Admin Users
  // already had (managing admins/auditing them is more sensitive than any
  // grantable section).
  const isSuperAdminOnlyPage = activePage === 'adminUsers' || activePage === 'activityLog'
  const blocked = !perms.loading && (
    isSuperAdminOnlyPage ? !perms.isSuperAdmin
      : !ALWAYS_ALLOWED.includes(activePage) && !perms.canAccess(permissionKey)
  )

  return (
    <ToastProvider>
      <ConfirmProvider>
      <div className="admin-shell admin-shell-bg relative flex h-screen overflow-hidden font-inter">
        <AdminSidebar
          active={activePage}
          activeTab={activePage === 'content' ? contentTab : undefined}
          onNav={handleNav}
          permissions={perms}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />
        <div className="relative z-10 flex-1 flex flex-col overflow-hidden min-w-0">
          <AdminHeader
            page={activePage} tab={contentTab} permissions={perms} badges={badges}
            onOpenMobileNav={() => setMobileOpen(true)}
            onOpenSearch={() => setPaletteOpen(true)}
            theme={theme} onToggleTheme={toggleTheme}
          />
          <main key={activePage} className="flex-1 overflow-y-auto overflow-x-hidden animate-page-fade-in">
            {perms.loading ? <PageSkeleton />
              : blocked ? <AccessDenied />
              : activePage === 'content' ? <AdminContent initialTab={contentTab} />
              : <PageComponent />}
          </main>
        </div>
        {paletteOpen && <CommandPalette onNavigate={handleNav} onClose={() => setPaletteOpen(false)} />}
      </div>
      </ConfirmProvider>
    </ToastProvider>
  )
}
