import { Edit2, Trash2 } from 'lucide-react'
import useAdminPermissions from '../hooks/useAdminPermissions'

// Consistent edit/delete icon pair for DataTable action columns — same size,
// spacing, and hover treatment everywhere it's used. Reads the signed-in
// admin's role itself (one chokepoint for every call site, instead of
// gating ~20 individual admin pages) — a Viewer never sees either button,
// an Editor never sees Delete (Prompt 5: "Editor can't delete").
export default function ActionButtons({ onEdit, onDelete, deleteDisabled = false }) {
  const { canWrite, canDelete } = useAdminPermissions()
  return (
    <div className="flex items-center gap-2">
      {onEdit && canWrite && (
        <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-blue-50 text-[#1655c3] transition-colors">
          <Edit2 size={14} />
        </button>
      )}
      {onDelete && canDelete && (
        <button onClick={onDelete} disabled={deleteDisabled} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors disabled:opacity-40">
          <Trash2 size={14} />
        </button>
      )}
    </div>
  )
}
