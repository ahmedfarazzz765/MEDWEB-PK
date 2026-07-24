import { useState } from 'react'
import { Search, ChevronLeft, ChevronRight, Inbox } from 'lucide-react'

const PAGE_SIZE = 8

export default function DataTable({ columns, data, searchKey = 'name', title, actions, emptyMessage = 'No records yet' }) {
  const [query, setQuery]   = useState('')
  const [page, setPage]     = useState(1)

  const filtered = data.filter(row => {
    const val = searchKey.split('.').reduce((o, k) => o?.[k], row) ?? ''
    return String(val).toLowerCase().includes(query.toLowerCase())
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Table top bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
        {title && <h3 className="font-bold text-[#1a1a1a] text-base">{title}</h3>}
        <div className="flex items-center gap-2 ml-auto">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
            <Search size={13} className="text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={query}
              onChange={e => { setQuery(e.target.value); setPage(1) }}
              className="bg-transparent text-sm text-gray-600 outline-none w-32 placeholder-gray-400"
            />
          </div>
          {actions}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-[#1655c3]">
              {columns.map(col => (
                <th key={col.key} className="text-left text-white text-xs font-semibold px-5 py-3 whitespace-nowrap">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-14">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <div className="w-11 h-11 rounded-2xl bg-gray-50 flex items-center justify-center">
                      <Inbox size={18} className="text-gray-300" />
                    </div>
                    <span className="text-sm font-medium">{query ? 'No matching records' : emptyMessage}</span>
                  </div>
                </td>
              </tr>
            ) : rows.map((row, i) => (
              <tr key={i}
                className={`border-b border-gray-50 hover:bg-blue-50/30 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                {columns.map(col => (
                  <td key={col.key} className="px-5 py-3.5 text-sm text-gray-700 whitespace-nowrap">
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50">
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
    </div>
  )
}
