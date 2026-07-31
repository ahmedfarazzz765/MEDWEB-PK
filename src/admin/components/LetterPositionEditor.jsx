import { useRef, useState, useEffect } from 'react'
import { Rnd } from 'react-rnd'

// Same drag-to-position pattern as CertPositionEditor.jsx, generalized for
// the Ambassador Letter's two regions instead of that component's fixed
// name/id pair:
//   - "body": the admin's own letter text, rendered here as real rich HTML
//     (curly-brace placeholders like {name}/{university}/{role} are NOT
//     substituted in this preview — that only happens for a real
//     ambassador's actual download, in ambassadorLetterGenerator.js). Uses
//     react-rnd so the admin controls both its position AND its width/height
//     — the box is a hard boundary (overflow hidden), matching exactly what
//     compositeLetterCanvas() rasterizes at generation time.
//   - "date": a single point, same convention as the certificate's ID box —
//     just a stamp, so it stays drag-only, no resize.
// Kept as its own component rather than extending CertPositionEditor so the
// certificate feature's drag boxes (exactly 2, both single-point) are never
// put at risk by this letter's different (resizable block + point) shape.
export default function LetterPositionEditor({ imageUrl, bodyHtml, bodyPos, datePos, onChange }) {
  const containerRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  // Tracked in state (not read directly off the ref during render) so the
  // Rnd box's pixel position recomputes once the letterhead image has
  // actually laid out — clientWidth/Height are 0 until then.
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => setContainerSize({ width: el.clientWidth, height: el.clientHeight })
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

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

  const startDateDrag = e => { e.preventDefault(); setDragging(true) }
  const handleDateMove = e => {
    if (!dragging) return
    setDate(posFromEvent(e))
  }
  const endDateDrag = () => setDragging(false)

  return (
    <div>
      <div
        ref={containerRef}
        className="relative w-full rounded-xl overflow-hidden border border-gray-200 select-none"
        style={{ cursor: dragging ? 'grabbing' : 'default' }}
        onMouseMove={handleDateMove}
        onMouseUp={endDateDrag}
        onMouseLeave={endDateDrag}
        onTouchMove={handleDateMove}
        onTouchEnd={endDateDrag}
      >
        <img src={imageUrl} alt="Letterhead template" className="w-full h-auto block pointer-events-none" draggable={false} />

        {/* Body text box — draggable AND resizable, position/size stored as
            percentages of the container so it stays correct at any image size */}
        <Rnd
          bounds="parent"
          position={{
            x: (body.xPct / 100) * containerSize.width,
            y: (body.yPct / 100) * containerSize.height,
          }}
          size={{
            width: `${body.widthPct}%`,
            height: `${body.heightPct}%`,
          }}
          minWidth={60}
          minHeight={40}
          onDragStop={(e, d) => {
            const w = containerSize.width || 1
            const h = containerSize.height || 1
            setBody({ xPct: (d.x / w) * 100, yPct: (d.y / h) * 100 })
          }}
          onResizeStop={(e, dir, ref, delta, position) => {
            const w = containerSize.width || 1
            const h = containerSize.height || 1
            setBody({
              widthPct: (ref.offsetWidth / w) * 100,
              heightPct: (ref.offsetHeight / h) * 100,
              xPct: (position.x / w) * 100,
              yPct: (position.y / h) * 100,
            })
          }}
          className="border-2 border-dashed border-[#1655c3] bg-white/70 rounded"
        >
          <div
            className="letter-body w-full h-full overflow-hidden px-2 py-1.5"
            style={{ fontSize: body.fontSize, color: body.color }}
            dangerouslySetInnerHTML={{
              __html: bodyHtml || '<p>Start typing the letter body above — it will appear here exactly as formatted, placeholders included.</p>',
            }}
          />
        </Rnd>

        {/* Date box — single point, left-anchored (matches CertPositionEditor's ID box) */}
        <div
          onMouseDown={startDateDrag}
          onTouchStart={startDateDrag}
          className="absolute px-2 py-1 rounded cursor-grab active:cursor-grabbing border-2 border-dashed border-[#64ac37] bg-white/70"
          style={{
            left: `${date.xPct}%`,
            top: `${date.yPct}%`,
            transform: 'translate(0, -50%)',
            fontWeight: 'bold',
            fontSize: date.fontSize,
            color: date.color,
            whiteSpace: 'nowrap',
          }}
        >
          {new Date().toLocaleDateString()}
        </div>
      </div>
      <p className="text-[11px] text-gray-400 mt-1.5">
        Drag or resize (corners/edges) the blue box to position and size the letter body, and drag the green box to where the standalone date stamp should print.
      </p>

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

export const DEFAULT_BODY_POS = { xPct: 15, yPct: 30, widthPct: 70, heightPct: 40, fontSize: 22, color: '#1a1a1a' }
export const DEFAULT_DATE_POS = { xPct: 15, yPct: 85, fontSize: 18, color: '#1a1a1a' }
