import { useState, useRef, useEffect, useMemo } from 'react'
import { Search, Inbox, Loader2, ArrowUp, ArrowDown, ChevronsUpDown } from 'lucide-react'

const PAGE_SIZE = 8

// Infinite scroll (was numbered 1/2/3/4 pagination) — a sentinel row past
// the last rendered row triggers revealing PAGE_SIZE more via
// IntersectionObserver as it nears the viewport, same "keeps loading as you
// scroll" pattern used everywhere else in admin now (AdminCertificates.jsx
// folder view included, since it renders through this same component).
//
// Round 15 D3: sticky header, generic column-click-to-sort (sorts by
// `row[col.key]` directly — works for any column whose raw value is
// orderable; a column rendering a derived/formatted value from `render()`
// alone, with nothing comparable at `row[col.key]`, just won't sort
// meaningfully, same as any plain table), and cell text clamped to 2 lines
// instead of a single nowrap line that could overflow the row.
export default function DataTable({ columns, data, searchKey = 'name', title, actions, emptyMessage = 'No records yet' }) {
  const [query, setQuery]     = useState('')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [sort, setSort] = useState(null) // { key, dir: 1 | -1 } | null
  const sentinelRef = useRef(null)

  const filtered = data.filter(row => {
    const val = searchKey.split('.').reduce((o, k) => o?.[k], row) ?? ''
    return String(val).toLowerCase().includes(query.toLowerCase())
  })

  const sorted = useMemo(() => {
    if (!sort) return filtered
    const { key, dir } = sort
    return [...filtered].sort((a, b) => {
      const av = a[key], bv = b[key]
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
      return String(av).localeCompare(String(bv)) * dir
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, sort])

  const rows = sorted.slice(0, visibleCount)
  const hasMore = visibleCount < sorted.length

  const onQueryChange = e => { setQuery(e.target.value); setVisibleCount(PAGE_SIZE) }

  const toggleSort = key => setSort(prev =>
    !prev || prev.key !== key ? { key, dir: 1 } : prev.dir === 1 ? { key, dir: -1 } : null
  )

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
    <div className="glass-solid overflow-hidden transition-shadow hover:shadow-md">
      {/* Table top bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-black/5">
        {title && <h3 className="font-bold text-[#0F172A] text-base">{title}</h3>}
        <div className="flex items-center gap-2 ml-auto">
          <div className="flex items-center gap-2 bg-black/5 border border-black/10 rounded-xl px-3 py-2 focus-within:border-[#1655c3] focus-within:ring-2 focus-within:ring-blue-100 transition-all">
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
          <thead className="sticky top-0 z-10">
            <tr className="bg-gradient-to-r from-[#1655c3] to-[#123f8f]">
              {columns.map(col => (
                <th key={col.key} className="text-left text-white text-xs font-semibold px-5 py-3 whitespace-nowrap select-none">
                  {col.key === 'actions' || col.key === 'select' || col.key === 'id' ? col.label : (
                    <button onClick={() => toggleSort(col.key)} className="flex items-center gap-1 hover:text-white/80 transition-colors">
                      {col.label}
                      {sort?.key === col.key ? (sort.dir === 1 ? <ArrowUp size={11} /> : <ArrowDown size={11} />) : <ChevronsUpDown size={11} className="opacity-40" />}
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-14">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <div className="w-11 h-11 rounded-2xl bg-black/5 flex items-center justify-center">
                      <Inbox size={18} className="text-gray-300" />
                    </div>
                    <span className="text-sm font-medium">{query ? 'No matching records' : emptyMessage}</span>
                  </div>
                </td>
              </tr>
            ) : rows.map((row, i) => (
              <tr key={i}
                className={`border-b border-black/5 hover:bg-blue-50/60 transition-colors duration-150 ${i % 2 === 0 ? 'bg-white/40' : 'bg-black/[0.02]'}`}>
                {columns.map(col => (
                  <td key={col.key} className="px-5 py-3.5 text-sm text-gray-700 align-top">
                    {col.render ? col.render(row[col.key], row) : <div className="line-clamp-2">{row[col.key]}</div>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Infinite-scroll footer */}
      {rows.length > 0 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-black/5 bg-black/[0.02]">
          <span className="text-xs text-gray-500">
            Showing {rows.length} of {sorted.length}
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
