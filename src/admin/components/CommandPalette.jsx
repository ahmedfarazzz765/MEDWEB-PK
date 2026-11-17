import { useEffect, useRef, useState } from 'react'
import { Search, CornerDownLeft } from 'lucide-react'

// Flat index of every reachable admin page/tab — kept separate from
// AdminSidebar.jsx's GROUPS (which also needs to filter by permission and
// collapse empty groups) since this only ever needs id/tab/label/keywords
// to search over, not the grouped/permission-gated render tree.
const PAGES = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'sections', label: 'Homepage Sections' },
  { id: 'announcements', label: 'Announcements' },
  { id: 'content', tab: 'hero', label: 'Hero' },
  { id: 'content', tab: 'founder', label: 'Founder Message' },
  { id: 'content', tab: 'why', label: 'Why MEDWEB' },
  { id: 'content', tab: 'partners', label: 'Trusted Partners' },
  { id: 'content', tab: 'certificate', label: 'Certificate Verification' },
  { id: 'content', tab: 'navbar', label: 'Navbar & WelcomeBar' },
  { id: 'content', tab: 'legal', label: 'Legal Pages' },
  { id: 'footer', label: 'Footer' },
  { id: 'students', label: 'Students', keywords: 'student database' },
  { id: 'team', label: 'Team' },
  { id: 'advisory', label: 'Advisory Board' },
  { id: 'ambassadors', label: 'Ambassadors' },
  { id: 'webinars', label: 'Webinars' },
  { id: 'courses', label: 'Courses', keywords: 'workshops enrollments' },
  { id: 'certificates', label: 'Certificates' },
  { id: 'testimonials', label: 'Testimonials' },
  { id: 'pendingTestimonials', label: 'Pending Reviews' },
  { id: 'blog', label: 'Blog Posts' },
  { id: 'events', label: 'Events & News', keywords: 'auto news bot drafts' },
  { id: 'forms', label: 'Form Builder' },
  { id: 'submissions', label: 'Submissions' },
  { id: 'reports', label: 'Reports' },
  { id: 'email', label: 'Email Settings' },
  { id: 'adminUsers', label: 'Admin Users' },
  { id: 'activityLog', label: 'Activity Log' },
]

// Ctrl+K (or Cmd+K on Mac) command palette — jump to any admin page by
// typing its name. Global keydown listener lives in AdminPanel.jsx; this
// component is just the overlay + list, rendered only while open.
export default function CommandPalette({ onNavigate, onClose }) {
  const [q, setQ] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const results = PAGES.filter(p => {
    if (!q.trim()) return true
    const hay = `${p.label} ${p.keywords || ''}`.toLowerCase()
    return hay.includes(q.toLowerCase())
  }).slice(0, 8)

  useEffect(() => { setActiveIdx(0) }, [q])

  const go = page => {
    if (!page) return
    onNavigate(page.id, page.tab)
    onClose()
  }

  const onKeyDown = e => {
    if (e.key === 'Escape') { onClose(); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, results.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter') { e.preventDefault(); go(results[activeIdx]) }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-24 px-4 bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <Search size={16} className="text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Jump to a page… (e.g. Courses, Submissions)"
            className="flex-1 outline-none text-sm text-gray-700 placeholder-gray-400"
          />
          <kbd className="text-[10px] font-semibold text-gray-400 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5">Esc</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto py-1.5">
          {results.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No matching page.</p>
          ) : results.map((p, i) => (
            <button
              key={`${p.id}:${p.tab || ''}`}
              onClick={() => go(p)}
              onMouseEnter={() => setActiveIdx(i)}
              className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition-colors ${i === activeIdx ? 'bg-blue-50 text-[#1655c3]' : 'text-gray-700'}`}
            >
              <span className="font-medium">{p.label}</span>
              {i === activeIdx && <CornerDownLeft size={13} className="text-[#1655c3] shrink-0" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
