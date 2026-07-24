import { useRef, useState } from 'react'

// Same drag-to-position pattern as CertPositionEditor.jsx, generalized for
// the Ambassador Letter's two regions instead of that component's fixed
// name/id pair:
//   - "body": the admin's own letter text, shown here literally (curly-brace
//     placeholders like {name}/{university}/{role} are NOT substituted in
//     this preview — that only happens for a real ambassador's actual
//     download, in ambassadorLetterGenerator.js) — a word-wrapped block with
//     its own width, not just a single point, since it's a whole letter.
//   - "date": a single point, same convention as the certificate's ID box.
// Kept as its own component rather than extending CertPositionEditor so the
// certificate feature's drag boxes (exactly 2, both single-point) are never
// put at risk by this letter's different (block + point) shape.
export default function LetterPositionEditor({ imageUrl, bodyText, bodyPos, datePos, onChange }) {
  const containerRef = useRef(null)
  const [dragging, setDragging] = useState(null) // 'body' | 'date' | null
  const [previewScale, setPreviewScale] = useState(1)

  const handleImageLoad = e => {
    const displayedWidth = containerRef.current?.clientWidth || e.target.naturalWidth
    setPreviewScale(displayedWidth / (e.target.naturalWidth || displayedWidth))
  }

  const body = bodyPos
  const date = datePos

  const setBody = patch => onChange({ bodyPos: { ...body, ...patch }, datePos: date })
  const setDate = patch => onChange({ bodyPos: body, datePos: { ...date, ...patch } })

  const posFromEvent = e => {
    const rect = containerRef.current.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    const xPct = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100))
    const yPct = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100))
    return { xPct, yPct }
  }

  const startDrag = box => e => { e.preventDefault(); setDragging(box) }
  const handleMove = e => {
    if (!dragging) return
    const pos = posFromEvent(e)
    if (dragging === 'body') setBody(pos)
    else setDate(pos)
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
        <img src={imageUrl} alt="Letterhead template" className="w-full h-auto block pointer-events-none" draggable={false} onLoad={handleImageLoad} />

        {/* Body text block — a wrapped paragraph, so it gets a width, not just a point */}
        <div
          onMouseDown={startDrag('body')}
          onTouchStart={startDrag('body')}
          className="absolute px-2 py-1.5 rounded cursor-grab active:cursor-grabbing border-2 border-dashed border-[#1655c3] bg-white/70"
          style={{
            left: `${body.xPct}%`,
            top: `${body.yPct}%`,
            width: `${body.widthPct}%`,
            transform: 'translate(-50%, 0)',
            fontSize: Math.max(7, body.fontSize * previewScale),
            lineHeight: 1.5,
            color: body.color,
            whiteSpace: 'pre-wrap',
          }}
        >
          {bodyText || 'Start typing the letter body above — it will appear here exactly as written, placeholders included.'}
        </div>

        {/* Date box — single point, left-anchored (matches CertPositionEditor's ID box) */}
        <div
          onMouseDown={startDrag('date')}
          onTouchStart={startDrag('date')}
          className="absolute px-2 py-1 rounded cursor-grab active:cursor-grabbing border-2 border-dashed border-[#64ac37] bg-white/70"
          style={{
            left: `${date.xPct}%`,
            top: `${date.yPct}%`,
            transform: 'translate(0, -50%)',
            fontWeight: 'bold',
            fontSize: Math.max(8, date.fontSize * previewScale),
            color: date.color,
            whiteSpace: 'nowrap',
          }}
        >
          {new Date().toLocaleDateString()}
        </div>
      </div>
      <p className="text-[11px] text-gray-400 mt-1.5">Drag the blue box to where the letter body should sit (it wraps to this box's width), and the green box to where the standalone date stamp should print.</p>

      <div className="grid sm:grid-cols-2 gap-4 mt-3">
        <div className="rounded-xl border border-gray-100 p-3">
          <p className="text-xs font-bold text-[#1655c3] mb-2">Body text style</p>
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-[11px] text-gray-500 flex items-center gap-1.5">
              Size
              <input type="number" min="8" max="60" value={body.fontSize}
                onChange={e => setBody({ fontSize: Number(e.target.value) || 20 })}
                className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-xs" />
            </label>
            <label className="text-[11px] text-gray-500 flex items-center gap-1.5">
              Width %
              <input type="number" min="20" max="100" value={body.widthPct}
                onChange={e => setBody({ widthPct: Number(e.target.value) || 80 })}
                className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-xs" />
            </label>
            <label className="text-[11px] text-gray-500 flex items-center gap-1.5">
              Color
              <input type="color" value={body.color} onChange={e => setBody({ color: e.target.value })} className="w-8 h-7 rounded cursor-pointer" />
            </label>
          </div>
        </div>
        <div className="rounded-xl border border-gray-100 p-3">
          <p className="text-xs font-bold text-[#64ac37] mb-2">Date style</p>
          <div className="flex items-center gap-3">
            <label className="text-[11px] text-gray-500 flex items-center gap-1.5">
              Size
              <input type="number" min="8" max="50" value={date.fontSize}
                onChange={e => setDate({ fontSize: Number(e.target.value) || 18 })}
                className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-xs" />
            </label>
            <label className="text-[11px] text-gray-500 flex items-center gap-1.5">
              Color
              <input type="color" value={date.color} onChange={e => setDate({ color: e.target.value })} className="w-8 h-7 rounded cursor-pointer" />
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}

export const DEFAULT_BODY_POS = { xPct: 50, yPct: 40, widthPct: 70, fontSize: 22, color: '#1a1a1a' }
export const DEFAULT_DATE_POS = { xPct: 15, yPct: 85, fontSize: 18, color: '#1a1a1a' }
