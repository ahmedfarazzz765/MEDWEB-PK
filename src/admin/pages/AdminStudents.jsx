import { useState, useEffect, useMemo } from 'react'
import * as XLSX from 'xlsx'
import { Users, GraduationCap, Award, TrendingUp, Download, Eye } from 'lucide-react'
import StatCard   from '../components/StatCard'
import DataTable  from '../components/DataTable'
import Modal      from '../components/Modal'
import AdminButton from '../components/AdminButton'
import { studentsDbService } from '../../firebase/services'

function formatDate(iso) {
  if (!iso) return '-'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return String(iso).split('T')[0] || '-'
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── columns defined OUTSIDE component so reference is stable ─────────────────
function makeColumns(openProfile) {
  return [
    { key: 'name',         label: 'Full Name',   render: v => <span className="font-semibold text-[#1a1a1a]">{v || '-'}</span> },
    { key: 'email',        label: 'Email',       render: v => <span className="text-gray-500 text-xs">{v}</span> },
    { key: 'phone',        label: 'Phone',       render: v => v || <span className="text-gray-300">-</span> },
    { key: 'university',   label: 'University',  render: v => v || <span className="text-gray-300">-</span> },
    { key: 'degree',       label: 'Degree',      render: v => v || <span className="text-gray-300">-</span> },
    { key: 'regCount',     label: 'Registrations', render: v => <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-[#1655c3]">{v}</span> },
    { key: 'certCount',    label: 'Certificates', render: v => <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-green-50 text-[#64ac37]">{v}</span> },
    { key: 'id', label: 'Actions', render: (v, row) => (
      <button onClick={() => openProfile(row)} className="p-1.5 rounded-lg hover:bg-blue-50 text-[#1655c3] transition-colors">
        <Eye size={15} />
      </button>
    )},
  ]
}

export default function AdminStudents() {
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null) // the student row currently open in the profile modal

  useEffect(() => {
    const unsub = studentsDbService.listen(rows => { setData(rows); setLoading(false) })
    return unsub
  }, [])

  const students = useMemo(() => data.map(s => ({
    ...s,
    regCount: (s.registrations || []).length,
    certCount: (s.certificates || []).length,
  })), [data])

  const totalRegistrations = students.reduce((a, s) => a + s.regCount, 0)
  const totalCertificates  = students.reduce((a, s) => a + s.certCount, 0)
  const avgRegPerStudent   = students.length ? (totalRegistrations / students.length).toFixed(1) : '0'

  const openProfile = row => setProfile(row)
  const closeProfile = () => setProfile(null)

  const exportExcel = () => {
    const rows = students.map(s => ({
      'Full Name': s.name || '',
      'Email Address': s.email || '',
      'Phone Number': s.phone || '',
      'Total Webinar Registrations': s.regCount,
      'Total Certificates Earned': s.certCount,
      'University': s.university || '',
      'Degree': s.degree || '',
      'Registered Webinars': (s.registrations || []).map(r => r.webinarTitle).filter(Boolean).join(', '),
      'Certificates Earned (Webinars)': (s.certificates || []).map(c => c.webinarTitle).filter(Boolean).join(', '),
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [
      { wch: 22 }, { wch: 28 }, { wch: 16 }, { wch: 14 }, { wch: 14 },
      { wch: 22 }, { wch: 20 }, { wch: 40 }, { wch: 40 },
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Students')
    XLSX.writeFile(wb, `MEDWEB_Students_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const columns = makeColumns(openProfile)

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users}        label="Total Students"        value={loading ? '…' : students.length}       color="#1655c3" bg="#eff6ff" />
        <StatCard icon={GraduationCap} label="Webinar Registrations" value={loading ? '…' : totalRegistrations}     color="#64ac37" bg="#f0fdf4" />
        <StatCard icon={Award}        label="Certificates Issued"   value={loading ? '…' : totalCertificates}      color="#1655c3" bg="#eff6ff" />
        <StatCard icon={TrendingUp}   label="Avg Registrations"     value={loading ? '…' : avgRegPerStudent}       color="#f59e0b" bg="#fffbeb" />
      </div>

      <DataTable
        title="Student Database"
        columns={columns}
        data={students}
        searchKey="name"
        emptyMessage="No students yet — they'll appear automatically as webinar registrations, feedback, and ambassador applications come in."
        actions={
          <AdminButton size="sm" onClick={exportExcel} disabled={!students.length}>
            <Download size={13} className="mr-1.5" /> Export to Excel
          </AdminButton>
        }
      />

      {profile && (
        <Modal title={profile.name || profile.email} onClose={closeProfile} wide>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-2xl p-4">
              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Email</div>
                <div className="text-sm font-semibold text-[#1a1a1a]">{profile.email}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Phone</div>
                <div className="text-sm font-semibold text-[#1a1a1a]">{profile.phone || '-'}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">University</div>
                <div className="text-sm font-semibold text-[#1a1a1a]">{profile.university || '-'}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Degree</div>
                <div className="text-sm font-semibold text-[#1a1a1a]">{profile.degree || '-'}</div>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-[#1a1a1a] text-sm mb-3">
                Webinar Registrations <span className="text-gray-400 font-normal">({(profile.registrations || []).length})</span>
              </h3>
              {(profile.registrations || []).length === 0 ? (
                <p className="text-xs text-gray-400">No webinar registrations on file.</p>
              ) : (
                <div className="space-y-2">
                  {profile.registrations.map((r, i) => (
                    <div key={i} className="flex items-center justify-between bg-blue-50/50 rounded-xl px-4 py-2.5">
                      <span className="text-sm font-medium text-[#1a1a1a]">{r.webinarTitle || 'Untitled Webinar'}</span>
                      <span className="text-xs text-gray-500">{formatDate(r.registeredAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="font-bold text-[#1a1a1a] text-sm mb-3">
                Certificates Earned <span className="text-gray-400 font-normal">({(profile.certificates || []).length})</span>
              </h3>
              {(profile.certificates || []).length === 0 ? (
                <p className="text-xs text-gray-400">No certificates issued yet.</p>
              ) : (
                <div className="space-y-2">
                  {profile.certificates.map((c, i) => (
                    <div key={i} className="flex items-center justify-between bg-green-50/50 rounded-xl px-4 py-2.5">
                      <div>
                        <div className="text-sm font-medium text-[#1a1a1a]">{c.webinarTitle || 'Untitled Webinar'}</div>
                        {c.certCode && <div className="text-[10px] text-gray-400">{c.certCode}</div>}
                      </div>
                      <span className="text-xs text-gray-500">{formatDate(c.issuedAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
