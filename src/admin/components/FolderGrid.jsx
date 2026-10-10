import { Folder } from 'lucide-react'

// Shared "folder grid" view — originally built for Admin > Certificates
// (grouping certificates by webinar/course), extracted here so Admin >
// Submissions can group webinar registrations by webinar using the exact
// same card/grid markup instead of a second copy of it. Purely
// presentational: the caller decides what a "folder" is and what its
// `key`/`label`/`sublabel`/`count` mean.
export default function FolderGrid({ title, items, onOpen, actions, emptyMessage }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-[#1a1a1a] text-base">{title}</h3>
        {actions}
      </div>
      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 text-gray-400 py-14">
          <div className="w-11 h-11 rounded-2xl bg-gray-50 flex items-center justify-center">
            <Folder size={18} className="text-gray-300" />
          </div>
          <span className="text-sm font-medium">{emptyMessage}</span>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(f => (
            <button key={f.key} onClick={() => onOpen(f.key)}
              className="flex items-center gap-3 text-left p-4 rounded-2xl border border-gray-100 hover:border-[#1655c3]/40 hover:shadow-md transition-all duration-200 bg-gray-50/60 hover:bg-white">
              <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <Folder size={20} className="text-[#1655c3]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm text-[#1a1a1a] truncate">{f.label}</div>
                <div className="text-xs text-gray-400 mt-0.5">{f.sublabel}</div>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-[#1655c3] shrink-0">{f.count}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
