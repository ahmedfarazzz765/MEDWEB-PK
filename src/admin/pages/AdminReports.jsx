import { useState, useEffect, useMemo } from 'react'
import * as XLSX from 'xlsx'
import { Users, Award, Download, Video, BookOpen } from 'lucide-react'
import StatCard from '../components/StatCard'
import DataTable from '../components/DataTable'
import AdminButton from '../components/AdminButton'
import { webinarsService, coursesService, certificatesService } from '../../firebase/services'

// Mirrors AdminCertificates.jsx's own folderKeyFor() — a certificate links
// to its source via webinarId (priority) or sourceId+sourceType, same
// resolution order, just returning a {type,id} pair instead of a single
// string key since this groups by BOTH webinars and courses in one pass.
function sourceOf(cert) {
  if (cert.webinarId) return { type: 'webinar', id: cert.webinarId }
  if (cert.sourceId && (cert.sourceType === 'webinar' || cert.sourceType === 'course')) return { type: cert.sourceType, id: cert.sourceId }
  return null
}

export default function AdminReports() {
  const [webinars, setWebinars] = useState([])
  const [courses, setCourses] = useState([])
  const [certs, setCerts] = useState([])
  const [regCounts, setRegCounts] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let pending = 3
    const done = () => { if (--pending === 0) setLoading(false) }
    const unsub1 = webinarsService.listen(rows => { setWebinars(rows); done() })
    const unsub2 = coursesService.listen(rows => { setCourses(rows); done() })
    const unsub3 = webinarsService.listenRegistrations(rows => {
      const counts = {}
      for (const r of rows) { if (r.webinarId) counts[r.webinarId] = (counts[r.webinarId] || 0) + 1 }
      setRegCounts(counts)
      done()
    })
    certificatesService.getAll().then(setCerts).catch(() => setCerts([]))
    return () => { unsub1(); unsub2(); unsub3() }
  }, [])

  // Certificates issued per source (webinar or course), counting only
  // non-Revoked ones — same "not Revoked" rule Prompt 2 already applied
  // to the homepage's own Certificates Issued counter.
  const certCountBySource = useMemo(() => {
    const map = new Map() // "webinar:ID" | "course:ID" -> count
    for (const c of certs) {
      if (c.status === 'Revoked') continue
      const src = sourceOf(c)
      if (!src) continue
      const key = `${src.type}:${src.id}`
      map.set(key, (map.get(key) || 0) + 1)
    }
    return map
  }, [certs])

  const webinarRows = useMemo(() => webinars.map(w => ({
    id: w.id,
    name: w.topic || '-',
    date: w.date || '-',
    status: w.status || '-',
    registrations: regCounts[w.id] || 0,
    // `attended` is a plain number the admin types in on the webinar's own
    // edit form (not something this report instruments further) — shown
    // as-is, 0 if never set.
    attendance: w.attended || 0,
    certificates: certCountBySource.get(`webinar:${w.id}`) || 0,
  })), [webinars, regCounts, certCountBySource])

  // Courses have no registration/attendance data model in this app at
  // all (no payments/enrollment flow — see Round 12's own ground rules)
  // — only certificates can genuinely be reported per course. Shown as
  // "—" rather than a fabricated 0-that-looks-real for the other two.
  const courseRows = useMemo(() => courses.map(c => ({
    id: c.id,
    name: c.title || c.name || '-',
    status: c.status || '-',
    certificates: certCountBySource.get(`course:${c.id}`) || 0,
  })), [courses, certCountBySource])

  const totalReg = Object.values(regCounts).reduce((a, c) => a + c, 0)
  const totalCerts = certs.filter(c => c.status !== 'Revoked').length

  const webinarColumns = [
    { key: 'name', label: 'Webinar', render: v => <span className="font-semibold text-[#1a1a1a] max-w-[220px] block truncate">{v}</span> },
    { key: 'date', label: 'Date' },
    { key: 'status', label: 'Status', render: v => {
      const s = { Completed: 'bg-green-50 text-green-600', Upcoming: 'bg-blue-50 text-[#1655c3]', Live: 'bg-red-50 text-red-500' }
      return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s[v] || 'bg-gray-100 text-gray-500'}`}>{v}</span>
    }},
    { key: 'registrations', label: 'Registrations', render: v => <span className="font-bold text-[#1655c3]">{v}</span> },
    { key: 'attendance', label: 'Attendance', render: v => <span className="font-bold text-[#64ac37]">{v}</span> },
    { key: 'certificates', label: 'Certificates', render: v => <span className="font-bold text-amber-600">{v}</span> },
  ]

  const courseColumns = [
    { key: 'name', label: 'Course', render: v => <span className="font-semibold text-[#1a1a1a] max-w-[220px] block truncate">{v}</span> },
    { key: 'status', label: 'Status', render: v => <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#1655c3]">{v}</span> },
    { key: 'registrations', label: 'Registrations', render: () => <span className="text-gray-400">—</span> },
    { key: 'attendance', label: 'Attendance', render: () => <span className="text-gray-400">—</span> },
    { key: 'certificates', label: 'Certificates', render: v => <span className="font-bold text-amber-600">{v}</span> },
  ]

  const exportExcel = () => {
    const wb = XLSX.utils.book_new()
    const wsWebinars = XLSX.utils.json_to_sheet(webinarRows.map(w => ({
      'Webinar': w.name, 'Date': w.date, 'Status': w.status,
      'Registrations': w.registrations, 'Attendance': w.attendance, 'Certificates': w.certificates,
    })))
    const wsCourses = XLSX.utils.json_to_sheet(courseRows.map(c => ({
      'Course': c.name, 'Status': c.status, 'Certificates': c.certificates,
    })))
    XLSX.utils.book_append_sheet(wb, wsWebinars, 'Webinars')
    XLSX.utils.book_append_sheet(wb, wsCourses, 'Courses')
    XLSX.writeFile(wb, `MEDWEB_Report_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Video} label="Webinars" value={loading ? '…' : webinars.length} color="#1655c3" bg="#eff6ff" />
        <StatCard icon={Users} label="Total Registrations" value={loading ? '…' : totalReg} color="#64ac37" bg="#f0fdf4" />
        <StatCard icon={Award} label="Certificates Issued" value={loading ? '…' : totalCerts} color="#f59e0b" bg="#fffbeb" />
        <StatCard icon={BookOpen} label="Courses" value={loading ? '…' : courses.length} color="#64ac37" bg="#f0fdf4" />
      </div>

      <div className="flex justify-end">
        <AdminButton size="sm" onClick={exportExcel} disabled={loading}>
          <Download size={14} className="mr-1.5" /> Export Report (.xlsx)
        </AdminButton>
      </div>

      <DataTable title="Webinars — Registrations, Attendance & Certificates" columns={webinarColumns} data={webinarRows} searchKey="name" emptyMessage="No webinars yet" />
      <DataTable title="Courses — Certificates" columns={courseColumns} data={courseRows} searchKey="name" emptyMessage="No courses yet" />
    </div>
  )
}
