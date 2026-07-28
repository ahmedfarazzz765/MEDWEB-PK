import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, arrayMove, useSortable, rectSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'

// Shared drag-and-drop reordering wrapper — used by Admin Courses, Team, and
// Ambassadors (the 3 sections with manual `order` reordering; Webinars and
// Blog Posts intentionally keep their date-based sort and don't use this).
//
// `items` must be the array currently rendered (each needs a stable `id`).
// On drop, calls `onReorder(reorderedItems)` — the caller is responsible for
// the optimistic setState + persisting via <collection>Service.reorder().
export default function SortableGrid({ items, onReorder, className = '', children }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex(i => i.id === active.id)
    const newIndex = items.findIndex(i => i.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    onReorder(arrayMove(items, oldIndex, newIndex))
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map(i => i.id)} strategy={rectSortingStrategy}>
        <div className={className}>{children}</div>
      </SortableContext>
    </DndContext>
  )
}

// Wraps one card/row so it becomes draggable — drop this around each mapped
// item inside <SortableGrid>. Renders a small grip handle in the corner
// rather than making the whole card draggable, so clicks on buttons/links
// inside the card (Edit, Delete, etc.) keep working normally.
export function SortableItem({ id, className = '', children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 'auto',
  }

  return (
    <div ref={setNodeRef} style={style} className={`relative ${className}`}>
      <button
        type="button"
        {...attributes}
        {...listeners}
        onClick={e => e.stopPropagation()}
        title="Drag to reorder"
        className="absolute top-2 right-2 z-10 w-7 h-7 rounded-lg bg-white/90 border border-gray-200 shadow-sm flex items-center justify-center text-gray-400 hover:text-[#1655c3] hover:border-[#1655c3]/40 cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical size={14} />
      </button>
      {children}
    </div>
  )
}
