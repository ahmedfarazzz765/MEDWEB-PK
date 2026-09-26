import { useState, useEffect } from 'react'
import { Inbox, Download, Video, FileText, Mail, ChevronLeft, ChevronRight } from 'lucide-react'
import StatCard from '../components/StatCard'
import { inputCls } from '../components/FormField'
import AdminButton from '../components/AdminButton'
import { submissionsService, toIsoString } from '../../firebase/services'

const formatDateStr = (dateVal) => {
  const str = toIsoString(dateVal)
  return str ? str.split('T')[0] : '-'
}

// Matches DataTable.jsx's page size — this page can't use DataTable
// directly (it needs a type-filter bar, a multi-field search, and a CSV
// export button, none of which DataTable's single-searchKey UI supports),
// so it reimplements the same page-size-8 pagination pattern manually.
const PAGE_SIZE = 8

export default function AdminSubmissions() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('All')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const unsub = submissionsService.listen(data => { setRows(data); setLoading(false) })
    return unsub
  }, [])

  const filtered = rows.filter(r => {
    if (filter !== 'All' && r.type !== filter) return false
    if (!q) return true
    return [r.refName || '', r.name || '', r.email || '', r.whatsapp || ''].join(' ').toLowerCase().includes(q.toLowerCase())
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const setFilterAndResetPage = t => { setFilter(t); setPage(1) }
  const setQAndResetPage = v => { setQ(v); setPage(1) }

  const exportCsv = () => {
    const header = ['Type', 'Webinar/Event', 'Name', 'Email', 'WhatsApp', 'Date']
    const body = filtered.map(r => [r.type, r.refName, r.name, r.email, r.whatsapp, formatDateStr(r.date)])
    const csv = [header, ...body].map(line => line.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = 'submissions.csv'; a.click()
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Inbox} label="Total Submissions" value={loading ? '…' : rows.length} color="#1655c3" bg="#eff6ff" />
        <StatCard icon={Video} label="Webinar Registrations" value={loading ? '…' : rows.filter(r => r.type === 'Webinar').length} color="#64ac37" bg="#f0fdf4" />
        <StatCard icon={FileText} label="Form Submissions" value={loading ? '…' : rows.filter(r => r.type === 'Form').length} color="#1655c3" bg="#eff6ff" />
        <StatCard icon={Mail} label="Newsletter Signups" value={loading ? '…' : rows.filter(r => r.type === 'Newsletter').length} color="#64ac37" bg="#f0fdf4" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between mb-4">
          <div className="flex gap-2">
            {['All', 'Webinar', 'Form', 'Newsletter'].map(t => (
              <button key={t} onClick={() => setFilterAndResetPage(t)}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${filter === t ? 'text-white bg-[#1655c3]' : 'text-gray-500 bg-gray-100 hover:bg-gray-200'}`}>{t}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <input className={`${inputCls} sm:w-56`} placeholder="Search…" value={q} onChange={e => setQAndResetPage(e.target.value)} />
            <AdminButton size="sm" onClick={exportCsv} disabled={!filtered.length}>
              <Download size={13} className="mr-1.5" /> Export CSV
            </AdminButton>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-500">
                {['Type', 'Webinar / Event', 'Name', 'Email', 'WhatsApp', 'Date'].map(h => <th key={h} className="px-3 py-2.5 font-semibold whitespace-nowrap">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">Loading…</td></tr>
              ) : !filtered.length ? (
                <tr><td colSpan={6} className="py-14">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <div className="w-11 h-11 rounded-2xl bg-gray-50 flex items-center justify-center">
                      <Inbox size={18} className="text-gray-300" />
                    </div>
                    <span className="text-sm font-medium">No submissions yet</span>
                  </div>
                </td></tr>
              ) : pageRows.map(r => (
                <tr key={r.id} className="border-t border-gray-100">
                  <td className="px-3 py-2.5"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.type === 'Webinar' ? 'bg-blue-50 text-[#1655c3]' : r.type === 'Newsletter' ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'}`}>{r.type}</span></td>
                  <td className="px-3 py-2.5 text-gray-700 max-w-[180px] truncate">{r.refName}</td>
                  <td className="px-3 py-2.5 text-gray-700">{r.name}</td>
                  <td className="px-3 py-2.5 text-gray-500">{r.email}</td>
                  <td className="px-3 py-2.5 text-gray-500">{r.whatsapp}</td>
                  <td className="px-3 py-2.5 text-gray-400 whitespace-nowrap">{formatDateStr(r.date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination — same page-size-8 pattern as DataTable.jsx */}
        {!loading && filtered.length > 0 && (
          <div className="flex items-center justify-between px-1 py-3">
            <span className="text-xs text-gray-500">
              Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="w-7 h-7 rounded-lg flex items-center justify-center border border-gray-200 hover:border-[#1655c3] hover:text-[#1655c3] disabled:opacity-40 transition-all">
                <ChevronLeft size={13} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  className="w-7 h-7 rounded-lg text-xs font-semibold border transition-all"
                  style={p === page
                    ? { background: '#1655c3', color: 'white', borderColor: '#1655c3' }
                    : { background: 'white', color: '#6b7280', borderColor: '#e5e7eb' }
                  }>
                  {p}
                </button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="w-7 h-7 rounded-lg flex items-center justify-center border border-gray-200 hover:border-[#1655c3] hover:text-[#1655c3] disabled:opacity-40 transition-all">
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
