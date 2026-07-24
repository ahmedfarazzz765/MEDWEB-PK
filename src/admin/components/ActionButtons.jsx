import { Edit2, Trash2 } from 'lucide-react'

// Consistent edit/delete icon pair for DataTable action columns — same size,
// spacing, and hover treatment everywhere it's used.
export default function ActionButtons({ onEdit, onDelete, deleteDisabled = false }) {
  return (
    <div className="flex items-center gap-2">
      {onEdit && (
        <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-blue-50 text-[#1655c3] transition-colors">
          <Edit2 size={14} />
        </button>
      )}
      {onDelete && (
        <button onClick={onDelete} disabled={deleteDisabled} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors disabled:opacity-40">
          <Trash2 size={14} />
        </button>
      )}
    </div>
  )
}
