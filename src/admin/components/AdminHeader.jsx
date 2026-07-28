import { Bell, Search } from 'lucide-react'

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
  team:         { title: 'Team',           sub: 'Manage MEDWEB team members' },
  advisory:     { title: 'Advisory Board', sub: 'Manage advisory board members' },
  email:        { title: 'Email Settings', sub: 'Configure automatic emails' },
  forms:        { title: 'Form Builder',    sub: 'Create dynamic forms & view responses' },
  testimonials: { title: 'Testimonials',    sub: 'Manage student testimonials' },
  submissions:  { title: 'Submissions',     sub: 'All webinar & form submissions' },
  footer:       { title: 'Footer & Links',  sub: 'Manage footer content & quick links' },
  adminUsers:   { title: 'Admin Users',     sub: 'Manage sub-admin access and permissions' },
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

export default function AdminHeader({ page, tab }) {
  const { title, sub } = page === 'content'
    ? (contentTabTitles[tab] || contentTabTitles.hero)
    : (pageTitles[page] || pageTitles.dashboard)

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <h1 className="text-xl font-black text-[#1a1a1a]">{title}</h1>
          <p className="text-xs text-gray-500 font-medium">{sub}</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="hidden sm:flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
            <Search size={14} className="text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              className="bg-transparent text-sm text-gray-600 outline-none w-36 placeholder-gray-400"
            />
          </div>

          {/* Notifications */}
          <button className="relative w-9 h-9 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center hover:bg-blue-50 transition-colors">
            <Bell size={16} className="text-gray-500" />
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold">3</span>
          </button>

          {/* Admin avatar */}
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-black bg-[#1655c3]">
              A
            </div>
            <div className="hidden sm:block">
              <div className="text-xs font-bold text-[#1a1a1a]">Admin</div>
              <div className="text-[10px] text-gray-400">Super Admin</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
