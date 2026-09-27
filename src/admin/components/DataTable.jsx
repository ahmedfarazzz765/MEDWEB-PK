import { useState, useRef, useEffect } from 'react'
import { Search, Inbox, Loader2 } from 'lucide-react'

const PAGE_SIZE = 8

// Infinite scroll (was numbered 1/2/3/4 pagination) — a sentinel row past
// the last rendered row triggers revealing PAGE_SIZE more via
// IntersectionObserver as it nears the viewport, same "keeps loading as you
// scroll" pattern used everywhere else in admin now (AdminCertificates.jsx
// folder view included, since it renders through this same component).
export default function DataTable({ columns, data, searchKey = 'name', title, actions, emptyMessage = 'No records yet' }) {
  const [query, setQuery]     = useState('')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const sentinelRef = useRef(null)

  const filtered = data.filter(row => {
    const val = searchKey.split('.').reduce((o, k) => o?.[k], row) ?? ''
    return String(val).toLowerCase().includes(query.toLowerCase())
  })

  const rows = filtered.slice(0, visibleCount)
  const hasMore = visibleCount < filtered.length

  const onQueryChange = e => { setQuery(e.target.value); setVisibleCount(PAGE_SIZE) }

  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasMore) return
    const io = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) setVisibleCount(c => c + PAGE_SIZE)
    }, { rootMargin: '200px' })
    io.observe(el)
    return () => io.disconnect()
  }, [hasMore, rows.length])

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-shadow hover:shadow-md">
      {/* Table top bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
        {title && <h3 className="font-bold text-[#1a1a1a] text-base">{title}</h3>}
        <div className="flex items-center gap-2 ml-auto">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus-within:border-[#1655c3] focus-within:ring-2 focus-within:ring-blue-100 transition-all">
            <Search size={13} className="text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={query}
              onChange={onQueryChange}
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
            <tr className="bg-gradient-to-r from-[#1655c3] to-[#123f8f]">
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
                className={`border-b border-gray-50 hover:bg-blue-50/40 transition-colors duration-150 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
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

      {/* Infinite-scroll footer */}
      {rows.length > 0 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50">
          <span className="text-xs text-gray-500">
            Showing {rows.length} of {filtered.length}
          </span>
          {hasMore && (
            <div ref={sentinelRef} className="flex items-center gap-1.5 text-xs text-gray-400">
              <Loader2 size={13} className="animate-spin" /> Loading more…
            </div>
          )}
        </div>
      )}
    </div>
  )
}
