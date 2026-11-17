import { useState } from 'react'
import { Users, Video, BookOpen, Award, TrendingUp, Newspaper, CreditCard, CalendarPlus, Download, Eye } from 'lucide-react'
import AdminSidebar from './components/AdminSidebar'
import AdminHeader from './components/AdminHeader'
import StatCard from './components/StatCard'
import DataTable from './components/DataTable'
import Modal from './components/Modal'
import FormField, { inputCls } from './components/FormField'
import AdminButton from './components/AdminButton'
import { ToastProvider } from './components/Toast'
import { ConfirmProvider } from './components/ConfirmDialog'

// DEV-ONLY visual-QA harness (Round 15 F) — renders the real admin shell
// (sidebar, topbar, aurora background, glass cards) with hand-written mock
// data instead of live Firestore reads, so the design can be screenshotted
// and reviewed without needing a real admin session or live data. Never
// imported in a production build — see the import.meta.env.DEV guard
// around both this file's lazy() import and its <Route> in App.jsx, which
// Vite/Rollup statically eliminates entirely (dead-code elimination on a
// compile-time constant), not just hides at runtime.
const MOCK_PERMISSIONS = {
  loading: false, isAdmin: true, isSuperAdmin: true, email: 'preview@medwebpk.com',
  role: 'superadmin', isViewer: false, canWrite: true, canDelete: true,
  canAccess: () => true, allowedSections: null,
}

const MOCK_BADGES = { pendingEnrollments: 4, pendingReviews: 2, autoNewsDrafts: 3 }

const MOCK_WEBINARS = [
  { id: '1', topic: 'AMR: The Silent Pandemic', speaker: 'Dr. Ayesha Khan', date: '2026-11-20', status: 'Upcoming', registered: 142, type: 'Free' },
  { id: '2', topic: 'Clinical Pharmacology Update', speaker: 'Dr. Bilal Ahmed', date: '2026-11-15', status: 'Live', registered: 89, type: 'Paid' },
  { id: '3', topic: 'Psychiatry Grand Rounds', speaker: 'Dr. Sana Malik', date: '2026-10-30', status: 'Completed', registered: 210, type: 'Free' },
]

const MOCK_STUDENTS = [
  { id: '1', name: 'Hassan Raza', email: 'hassan.raza@example.com', phone: '03001234567', university: 'Aga Khan University', degree: 'Pharm.D', eventsAttended: 5, certCount: 3 },
  { id: '2', name: '', email: 'unnamed.student@example.com', phone: '03111234567', university: 'Dow University', degree: 'MBBS', eventsAttended: 2, certCount: 1 },
  { id: '3', name: 'Fatima Noor', email: 'fatima.noor@example.com', phone: '03211234567', university: 'King Edward Medical University', degree: 'MBBS', eventsAttended: 8, certCount: 6 },
]

const MOCK_EVENTS = [
  { id: '1', title: 'National Pharmacy Conference 2026', category: 'Conference', status: 'Published', published: '2026-11-10' },
  { id: '2', title: 'AMR Awareness Camp — Lahore', category: 'Medical Camp', status: 'Draft', published: '' },
  { id: '3', title: 'Breaking: New WHO Antibiotic Guidelines', category: 'News', status: 'Draft', published: '' },
]

function MockDashboard() {
  const kpis = [
    { icon: Users, label: 'Total Students', value: 268, sub: '268 on file', trend: 12, color: '#60a5fa', bg: 'rgba(96,165,250,0.15)' },
    { icon: TrendingUp, label: 'Registrations This Month', value: 47, sub: '', trend: 8, sparkline: [3, 5, 2, 8, 6, 9, 14], color: '#95d348', bg: 'rgba(149,211,72,0.15)' },
    { icon: Video, label: 'Upcoming Webinars', value: 3, sub: '18 total', color: '#c084fc', bg: 'rgba(192,132,252,0.15)' },
    { icon: CreditCard, label: 'Pending Enrollments', value: 4, sub: 'awaiting payment review', color: '#fbbf24', bg: 'rgba(251,191,36,0.15)' },
    { icon: Award, label: 'Certificates Issued', value: 204, sub: 'valid on file', trend: 0, color: '#22d3ee', bg: 'rgba(34,211,238,0.15)' },
    { icon: Newspaper, label: 'Published Posts & Events', value: 31, sub: 'blog + events & news', color: '#f472b6', bg: 'rgba(244,114,182,0.15)' },
  ]
  return (
    <div className="p-4 sm:p-6 space-y-6 font-poppins">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-white">Good afternoon, preview 👋</h2>
          <p className="text-sm text-white/60">Here's what's happening at MEDWEB today.</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button className="btn-glass-primary flex items-center gap-2 px-4 py-2.5 text-xs"><CalendarPlus size={14} /> + Schedule Webinar</button>
        <button className="btn-glass-secondary flex items-center gap-2 px-4 py-2.5 text-xs"><Newspaper size={13} /> New Event</button>
        <button className="btn-glass-secondary flex items-center gap-2 px-4 py-2.5 text-xs"><BookOpen size={13} /> New Course</button>
        <button className="btn-glass-secondary flex items-center gap-2 px-4 py-2.5 text-xs"><Download size={13} /> Export Students</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {kpis.map((k, i) => <StatCard key={k.label} {...k} />)}
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass-card p-5 h-56 flex items-center justify-center text-white/40 text-sm">Chart preview (Recharts) — see live Dashboard</div>
        <div className="glass-card p-5 h-56 flex items-center justify-center text-white/40 text-sm">Chart preview (Recharts) — see live Dashboard</div>
      </div>
    </div>
  )
}

function MockWebinars() {
  const columns = [
    { key: 'topic', label: 'Title' },
    { key: 'speaker', label: 'Speaker' },
    { key: 'date', label: 'Date' },
    { key: 'registered', label: 'Registered' },
    { key: 'status', label: 'Status', render: v => <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${v === 'Live' ? 'bg-red-50 text-red-600' : v === 'Upcoming' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>{v}</span> },
  ]
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={Video} label="Total Webinars" value={18} color="#60a5fa" bg="rgba(96,165,250,0.15)" />
        <StatCard icon={TrendingUp} label="Live Now" value={1} color="#f472b6" bg="rgba(244,114,182,0.15)" />
        <StatCard icon={Users} label="Total Registrations" value={441} color="#95d348" bg="rgba(149,211,72,0.15)" />
      </div>
      <DataTable title="Webinars" columns={columns} data={MOCK_WEBINARS} searchKey="topic"
        actions={<AdminButton size="sm">+ Schedule Webinar</AdminButton>} />
    </div>
  )
}

function MockStudents() {
  const columns = [
    { key: 'name', label: 'Full Name', render: v => <span className="font-semibold text-[#1a1a1a]">{v?.trim() || 'Unnamed student'}</span> },
    { key: 'email', label: 'Email', render: v => <span className="text-gray-500 text-xs truncate block max-w-[160px]" title={v}>{v}</span> },
    { key: 'university', label: 'University' },
    { key: 'degree', label: 'Degree' },
    { key: 'eventsAttended', label: 'Events Attended' },
    { key: 'certCount', label: 'Certificates' },
    { key: 'id', label: 'Actions', render: () => <Eye size={15} className="text-[#1655c3]" /> },
  ]
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Students" value={268} color="#60a5fa" bg="rgba(96,165,250,0.15)" />
        <StatCard icon={Award} label="Certificates Issued" value={204} color="#22d3ee" bg="rgba(34,211,238,0.15)" />
      </div>
      <DataTable title="Student Database" columns={columns} data={MOCK_STUDENTS} searchKey="name"
        actions={<AdminButton size="sm"><Download size={13} className="mr-1.5" /> Export to Excel</AdminButton>} />
    </div>
  )
}

function MockEvents() {
  const columns = [
    { key: 'title', label: 'Title' },
    { key: 'category', label: 'Category' },
    { key: 'status', label: 'Status', render: v => <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${v === 'Published' ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'}`}>{v}</span> },
  ]
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex gap-2">
        <button className="text-xs font-bold px-3.5 py-2 rounded-lg bg-[#1655c3] text-white">Events & News</button>
        <button className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-lg bg-gray-100 text-gray-500">Auto News (bot drafts) <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">3</span></button>
      </div>
      <DataTable title="Events & News" columns={columns} data={MOCK_EVENTS} searchKey="title" />
    </div>
  )
}

function MockFormModal({ onClose }) {
  return (
    <Modal title="New Item — Details" onClose={onClose} wide>
      <div className="space-y-4">
        <FormField label="Title"><input className={inputCls} placeholder="Event or news title…" /></FormField>
        <FormField label="Category">
          <select className={inputCls}><option>Conference</option><option>Workshop</option></select>
        </FormField>
        <div className="flex gap-3 pt-2">
          <AdminButton variant="ghost" className="flex-1" onClick={onClose}>Cancel</AdminButton>
          <AdminButton variant="primary" className="flex-1">Next: Write Content →</AdminButton>
        </div>
      </div>
    </Modal>
  )
}

const PAGES = { dashboard: MockDashboard, webinars: MockWebinars, students: MockStudents, events: MockEvents }

export default function AdminPreview() {
  const [page, setPage] = useState('dashboard')
  const [showModal, setShowModal] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const Page = PAGES[page] || MockDashboard

  return (
    <ToastProvider>
      <ConfirmProvider>
        <div className="admin-shell relative flex h-screen overflow-hidden font-inter">
          <div className="admin-aurora"><div className="aurora-blob" /></div>
          <AdminSidebar active={page} onNav={(id) => setPage(id)} permissions={MOCK_PERMISSIONS} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
          <div className="relative z-10 flex-1 flex flex-col overflow-hidden min-w-0">
            <AdminHeader page={page} permissions={MOCK_PERMISSIONS} badges={MOCK_BADGES} onOpenMobileNav={() => setMobileOpen(true)} onOpenSearch={() => {}} />
            <main className="flex-1 overflow-y-auto overflow-x-hidden">
              <Page />
              <div className="p-4 sm:p-6">
                <AdminButton size="sm" onClick={() => setShowModal(true)}>Preview a form modal</AdminButton>
              </div>
            </main>
          </div>
          {showModal && <MockFormModal onClose={() => setShowModal(false)} />}
        </div>
      </ConfirmProvider>
    </ToastProvider>
  )
}
