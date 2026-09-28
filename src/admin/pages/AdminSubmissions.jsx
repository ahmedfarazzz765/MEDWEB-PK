import { useState, useEffect, useRef } from 'react'
import { Inbox, Download, Video, Mail, Loader2 } from 'lucide-react'
import StatCard from '../components/StatCard'
import { inputCls } from '../components/FormField'
import AdminButton from '../components/AdminButton'
import { submissionsService, toIsoString } from '../../firebase/services'

const formatDateStr = (dateVal) => {
  const str = toIsoString(dateVal)
  return str ? str.split('T')[0] : '-'
}

// Matches DataTable.jsx's infinite-scroll pattern (PAGE_SIZE-per-reveal,
// IntersectionObserver sentinel) — this page can't use DataTable directly
// (it needs a type-filter bar, a multi-field search, and a CSV export
// button, none of which DataTable's single-searchKey UI supports), so it
// reimplements that same pattern manually rather than the old numbered
// pagination.
const PAGE_SIZE = 8

export default function AdminSubmissions() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('All')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const sentinelRef = useRef(null)

  useEffect(() => {
    const unsub = submissionsService.listen(data => { setRows(data); setLoading(false) })
    return unsub
  }, [])

  const filtered = rows.filter(r => {
    if (filter !== 'All' && r.type !== filter) return false
    if (!q) return true
    return [r.refName || '', r.name || '', r.email || '', r.whatsapp || ''].join(' ').toLowerCase().includes(q.toLowerCase())
  })

  const pageRows = filtered.slice(0, visibleCount)
  const hasMore = visibleCount < filtered.length

  const setFilterAndResetPage = t => { setFilter(t); setVisibleCount(PAGE_SIZE) }
  const setQAndResetPage = v => { setQ(v); setVisibleCount(PAGE_SIZE) }

  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasMore) return
    const io = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) setVisibleCount(c => c + PAGE_SIZE)
    }, { rootMargin: '200px' })
    io.observe(el)
    return () => io.disconnect()
  }, [hasMore, pageRows.length])

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
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={Inbox} label="Total Submissions" value={loading ? '…' : rows.length} color="#1655c3" bg="#eff6ff" />
        <StatCard icon={Video} label="Webinar Registrations" value={loading ? '…' : rows.filter(r => r.type === 'Webinar').length} color="#64ac37" bg="#f0fdf4" />
        <StatCard icon={Mail} label="Newsletter Signups" value={loading ? '…' : rows.filter(r => r.type === 'Newsletter').length} color="#64ac37" bg="#f0fdf4" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between mb-4">
          <div className="flex gap-2">
            {['All', 'Webinar', 'Newsletter'].map(t => (
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
                  <td className="px-3 py-2.5"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.type === 'Webinar' ? 'bg-blue-50 text-[#1655c3]' : 'bg-amber-50 text-amber-600'}`}>{r.type}</span></td>
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

        {/* Infinite-scroll footer — same pattern as DataTable.jsx */}
        {!loading && filtered.length > 0 && (
          <div className="flex items-center justify-between px-1 py-3">
            <span className="text-xs text-gray-500">Showing {pageRows.length} of {filtered.length}</span>
            {hasMore && (
              <div ref={sentinelRef} className="flex items-center gap-1.5 text-xs text-gray-400">
                <Loader2 size={13} className="animate-spin" /> Loading more…
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
