import { useRef, useState } from 'react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Upload, X, GripVertical } from 'lucide-react'
import { uploadToCloudinaryWithProgress, toOptimizedUrl } from '../../firebase/cloudinary'

function GalleryItem({ item, onCaptionChange, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 bg-gray-50 rounded-xl p-2.5">
      <button type="button" {...attributes} {...listeners} className="p-1.5 text-gray-400 hover:text-[#1655c3] cursor-grab active:cursor-grabbing touch-none shrink-0">
        <GripVertical size={16} />
      </button>
      <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-200 shrink-0">
        <img src={item.url} alt="" className="w-full h-full object-cover" />
      </div>
      <input
        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:border-[#1655c3]"
        value={item.caption || ''}
        onChange={e => onCaptionChange(item.id, e.target.value)}
        placeholder="Caption (optional)"
      />
      <button type="button" onClick={() => onRemove(item.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-400 shrink-0">
        <X size={16} />
      </button>
    </div>
  )
}

// Multi-file gallery uploader with per-file progress and drag-to-reorder —
// `value` is [{id, url, caption}], `onChange` receives the updated array.
// Images are run through toOptimizedUrl() (Cloudinary f_auto,q_auto — WebP
// to any browser that supports it) before being saved, satisfying
// "compress images to WebP on upload" without any client-side image
// processing library.
export default function GalleryUpload({ value = [], onChange, folder = 'medweb/events' }) {
  const [uploading, setUploading] = useState({}) // tempId -> 0-100
  const [error, setError] = useState('')
  const inputRef = useRef()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleFiles = async e => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setError('')
    for (const file of files) {
      const tempId = crypto.randomUUID()
      setUploading(p => ({ ...p, [tempId]: 0 }))
      try {
        const url = await uploadToCloudinaryWithProgress(file, folder, pct => setUploading(p => ({ ...p, [tempId]: pct })))
        onChange([...value, { id: tempId, url: toOptimizedUrl(url), caption: '' }])
      } catch (err) {
        setError(`${file.name}: ${err.message}`)
      } finally {
        setUploading(p => { const n = { ...p }; delete n[tempId]; return n })
      }
    }
    e.target.value = ''
  }

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return
    const oldIndex = value.findIndex(i => i.id === active.id)
    const newIndex = value.findIndex(i => i.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    onChange(arrayMove(value, oldIndex, newIndex))
  }

  const setCaption = (id, caption) => onChange(value.map(i => i.id === id ? { ...i, caption } : i))
  const remove = id => onChange(value.filter(i => i.id !== id))

  return (
    <div>
      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Gallery</label>
      <div className="space-y-2 mb-3">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={value.map(i => i.id)} strategy={verticalListSortingStrategy}>
            {value.map(item => (
              <GalleryItem key={item.id} item={item} onCaptionChange={setCaption} onRemove={remove} />
            ))}
          </SortableContext>
        </DndContext>
        {Object.entries(uploading).map(([id, pct]) => (
          <div key={id} className="flex items-center gap-3 bg-blue-50 rounded-xl p-2.5">
            <div className="w-16 h-16 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 text-[#1655c3] text-xs font-bold">{pct}%</div>
            <div className="flex-1 h-1.5 bg-blue-100 rounded-full overflow-hidden">
              <div className="h-full bg-[#1655c3] transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-[#1655c3]/30 rounded-xl py-3 text-sm font-semibold text-[#1655c3] hover:border-[#1655c3] hover:bg-blue-50 transition-all"
      >
        <Upload size={15} /> Add photos (multiple allowed)
      </button>
      {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
    </div>
  )
}
