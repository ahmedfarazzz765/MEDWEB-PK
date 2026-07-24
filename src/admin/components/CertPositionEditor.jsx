import { useRef, useState } from 'react'

// Must match DEFAULT_NAME_POS / DEFAULT_ID_POS in functions/index.js exactly —
// these are the fallbacks used if a webinar's certTemplate has no saved
// position yet, on both the preview (here) and the generated image (there).
const DEFAULT_NAME_POS = { xPct: 50, yPct: 28, fontSize: 48, color: '#1a1a1a' }
const DEFAULT_ID_POS   = { xPct: 10, yPct: 90, fontSize: 26, color: '#1a1a1a' }

// Draggable-box editor: shows the certificate template image with two
// overlay boxes (Name, Certificate ID) the admin can drag into place. The
// Name box is centered on its point (matches text-anchor:middle in the
// Cloud Function's SVG overlay); the ID box is left-anchored at its point
// (matches text-anchor:start there) — the two must stay in sync or what the
// admin sees here won't match the generated certificate image.
export default function CertPositionEditor({ imageUrl, namePos, idPos, onChange }) {
  const containerRef = useRef(null)
  const [dragging, setDragging] = useState(null) // 'name' | 'id' | null
  // fontSize is stored in the template image's own pixel units (the Cloud
  // Function draws at full resolution) — this ratio scales it down so the
  // preview text is the same relative size as it'll be on the real image,
  // not an arbitrary approximation.
  const [previewScale, setPreviewScale] = useState(1)

  const handleImageLoad = e => {
    const displayedWidth = containerRef.current?.clientWidth || e.target.naturalWidth
    setPreviewScale(displayedWidth / (e.target.naturalWidth || displayedWidth))
  }

  const name = { ...DEFAULT_NAME_POS, ...(namePos || {}) }
  const id = { ...DEFAULT_ID_POS, ...(idPos || {}) }

  const setName = patch => onChange({ namePos: { ...name, ...patch }, idPos: id })
  const setId = patch => onChange({ namePos: name, idPos: { ...id, ...patch } })

  const posFromEvent = e => {
    const rect = containerRef.current.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    const xPct = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100))
    const yPct = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100))
    return { xPct, yPct }
  }

  const startDrag = box => e => {
    e.preventDefault()
    setDragging(box)
  }

  const handleMove = e => {
    if (!dragging) return
    const pos = posFromEvent(e)
    if (dragging === 'name') setName(pos)
    else setId(pos)
  }

  const endDrag = () => setDragging(null)

  return (
    <div>
      <div
        ref={containerRef}
        className="relative w-full rounded-xl overflow-hidden border border-gray-200 select-none"
        style={{ cursor: dragging ? 'grabbing' : 'default' }}
        onMouseMove={handleMove}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
        onTouchMove={handleMove}
        onTouchEnd={endDrag}
      >
        <img src={imageUrl} alt="Certificate template" className="w-full h-auto block pointer-events-none" draggable={false} onLoad={handleImageLoad} />

        {/* Name box — centered on its point */}
        <div
          onMouseDown={startDrag('name')}
          onTouchStart={startDrag('name')}
          className="absolute px-2 py-1 rounded cursor-grab active:cursor-grabbing border-2 border-dashed border-[#1655c3] bg-white/70"
          style={{
            left: `${name.xPct}%`,
            top: `${name.yPct}%`,
            transform: 'translate(-50%, -50%)',
            fontWeight: 'bold',
            fontSize: Math.max(8, name.fontSize * previewScale),
            color: name.color,
            whiteSpace: 'nowrap',
          }}
        >
          Ahmed Khan
        </div>

        {/* ID box — left-anchored at its point */}
        <div
          onMouseDown={startDrag('id')}
          onTouchStart={startDrag('id')}
          className="absolute px-2 py-1 rounded cursor-grab active:cursor-grabbing border-2 border-dashed border-[#64ac37] bg-white/70"
          style={{
            left: `${id.xPct}%`,
            top: `${id.yPct}%`,
            transform: 'translate(0, -50%)',
            fontWeight: 'bold',
            fontSize: Math.max(8, id.fontSize * previewScale),
            color: id.color,
            whiteSpace: 'nowrap',
          }}
        >
          ID: MEDWEB-000123
        </div>
      </div>
      <p className="text-[11px] text-gray-400 mt-1.5">Drag the two boxes onto your template — blue is where the student's name prints, green is where the certificate ID prints.</p>

      <div className="grid sm:grid-cols-2 gap-4 mt-3">
        <div className="rounded-xl border border-gray-100 p-3">
          <p className="text-xs font-bold text-[#1655c3] mb-2">Name text style</p>
          <div className="flex items-center gap-3">
            <label className="text-[11px] text-gray-500 flex items-center gap-1.5">
              Size
              <input type="number" min="10" max="120" value={name.fontSize}
                onChange={e => setName({ fontSize: Number(e.target.value) || DEFAULT_NAME_POS.fontSize })}
                className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-xs" />
            </label>
            <label className="text-[11px] text-gray-500 flex items-center gap-1.5">
              Color
              <input type="color" value={name.color} onChange={e => setName({ color: e.target.value })} className="w-8 h-7 rounded cursor-pointer" />
            </label>
          </div>
        </div>
        <div className="rounded-xl border border-gray-100 p-3">
          <p className="text-xs font-bold text-[#64ac37] mb-2">ID text style</p>
          <div className="flex items-center gap-3">
            <label className="text-[11px] text-gray-500 flex items-center gap-1.5">
              Size
              <input type="number" min="10" max="80" value={id.fontSize}
                onChange={e => setId({ fontSize: Number(e.target.value) || DEFAULT_ID_POS.fontSize })}
                className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-xs" />
            </label>
            <label className="text-[11px] text-gray-500 flex items-center gap-1.5">
              Color
              <input type="color" value={id.color} onChange={e => setId({ color: e.target.value })} className="w-8 h-7 rounded cursor-pointer" />
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}

export { DEFAULT_NAME_POS, DEFAULT_ID_POS }
