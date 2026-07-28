import { useState } from 'react'
import AdminSidebar from './components/AdminSidebar'
import AdminHeader  from './components/AdminHeader'
import AccessDenied  from './components/AccessDenied'
import useAdminPermissions from './hooks/useAdminPermissions'
import AdminDashboard   from './pages/AdminDashboard'
import AdminStudents    from './pages/AdminStudents'
import AdminWebinars    from './pages/AdminWebinars'
import AdminCourses     from './pages/AdminCourses'
import AdminCertificates from './pages/AdminCertificates'
import AdminAmbassadors from './pages/AdminAmbassadors'
import AdminAnnouncements from './pages/AdminAnnouncements'
import AdminBlog        from './pages/AdminBlog'
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

const pages = {
  dashboard:    AdminDashboard,
  students:     AdminStudents,
  webinars:     AdminWebinars,
  courses:      AdminCourses,
  certificates: AdminCertificates,
  ambassadors:  AdminAmbassadors,
  announcements: AdminAnnouncements,
  blog:         AdminBlog,
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
}

// Pages that every signed-in admin can always reach, regardless of their
// granted-sections list — not part of the assignable permission checklist.
const ALWAYS_ALLOWED = ['dashboard']

export default function AdminPanel() {
  const [activePage, setActivePage] = useState('dashboard')
  const [contentTab, setContentTab] = useState('hero')
  const perms = useAdminPermissions()
  const PageComponent = pages[activePage] || AdminDashboard

  const handleNav = (id, tab) => {
    setActivePage(id)
    if (tab) setContentTab(tab)
  }

  // Mirrors the permission key format used in adminSections.js: plain `id`
  // for most pages, `id:tab` for AdminContent's internal tabs.
  const permissionKey = activePage === 'content' ? `content:${contentTab}` : activePage

  const isAdminUsersPage = activePage === 'adminUsers'
  const blocked = !perms.loading && (
    isAdminUsersPage ? !perms.isSuperAdmin
      : !ALWAYS_ALLOWED.includes(activePage) && !perms.canAccess(permissionKey)
  )

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <AdminSidebar
        active={activePage}
        activeTab={activePage === 'content' ? contentTab : undefined}
        onNav={handleNav}
        permissions={perms}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader page={activePage} tab={contentTab} />
        <main key={activePage} className="flex-1 overflow-y-auto animate-page-fade-in">
          {perms.loading ? null
            : blocked ? <AccessDenied />
            : activePage === 'content' ? <AdminContent initialTab={contentTab} />
            : <PageComponent />}
        </main>
      </div>
    </div>
  )
}
