import { useRef, useState, useEffect } from 'react'
import { Rnd } from 'react-rnd'
import { CERTIFICATE_FONTS, DEFAULT_CERT_FONT } from '../../constants/certificateFonts'
import { resolveBoxSize, drawTextField } from '../../lib/certFontFit'

// Must match DEFAULT_NAME_POS / DEFAULT_ID_POS in functions/index.js exactly —
// these are the fallbacks used if a webinar's certTemplate has no saved
// position yet, on both the preview (here) and the generated image (there).
const DEFAULT_NAME_POS = { xPct: 50, yPct: 28, fontSize: 48, color: '#1a1a1a', fontFamily: DEFAULT_CERT_FONT }
const DEFAULT_ID_POS   = { xPct: 10, yPct: 90, fontSize: 26, color: '#1a1a1a' }

const DEFAULT_CUSTOM_FIELD_POS = { xPct: 50, yPct: 50, fontSize: 28, color: '#1a1a1a', fontFamily: DEFAULT_CERT_FONT }

const MIN_BOX_PX = { width: 30, height: 16 }

// Draggable + resizable box editor: shows the certificate template image
// with two fixed overlay boxes (Name, Certificate ID) the admin can drag
// AND resize (react-rnd — same library/pattern already used for the
// Ambassador Letter's resizable text box), plus an optional dynamic list of
// custom-field boxes (only used by the manual "Issue Certificate" flow —
// AdminWebinars.jsx's webinar cert template never passes `customFields`, so
// it stays exactly as before). The Name box (and every custom field box) is
// CENTERED on its xPct/yPct point (matches text-anchor:middle in the canvas
// generator); the ID box is LEFT-anchored horizontally at its xPct, centered
// vertically at yPct (matches text-anchor:start there). Resizing a box
// stores widthPct/heightPct alongside the existing point — the point itself
// never changes meaning, so every certificate already generated with an
// old, width-less position still renders identically (certFontFit.js falls
// back to a position-derived width when none is set).
// `nameSampleText` lets a caller drive the Name box's live preview with a
// real value (the bulk Issue Certificate flow passes the currently-focused
// recipient's typed name) instead of the generic placeholder — defaults to
// "Ahmed Khan" so every other caller (AdminWebinars.jsx) is unaffected.
export default function CertPositionEditor({ imageUrl, namePos, idPos, onChange, customFields, onChangeCustomField, nameSampleText }) {
  const containerRef = useRef(null)
  const canvasRef = useRef(null)
  // Tracked in state (not read directly off the ref during render) so box
  // pixel positions/sizes recompute once the template image has actually
  // laid out — clientWidth/Height are 0 until then. Same pattern as
  // LetterPositionEditor.jsx's resizable box.
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const [naturalSize, setNaturalSize] = useState({ width: 1, height: 1 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => setContainerSize({ width: el.clientWidth, height: el.clientHeight })
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const handleImageLoad = e => {
    setNaturalSize({ width: e.target.naturalWidth || 1, height: e.target.naturalHeight || 1 })
  }

  const name = { ...DEFAULT_NAME_POS, ...(namePos || {}) }
  const id = { ...DEFAULT_ID_POS, ...(idPos || {}) }
  const fields = customFields || []
  const nameSample = nameSampleText?.trim() || 'Ahmed Khan'
  const idText = 'ID: MEDWEB-000123'

  const setName = patch => onChange({ namePos: { ...name, ...patch }, idPos: id })
  const setId = patch => onChange({ namePos: name, idPos: { ...id, ...patch } })
  const setCustom = (fieldId, patch) => onChangeCustomField?.(fieldId, patch)

  const w = containerSize.width || 1
  const h = containerSize.height || 1

  // resolveBoxSize() is the exact function drawTextField() (and, through
  // it, certificateGenerator.js) uses internally for the same purpose — a
  // box with no saved widthPct/heightPct yet gets the identical
  // text-measured fallback size here (for sizing the drag handle) and at
  // generation time (for sizing the auto-shrink-to-fit box), so the two can
  // never disagree. Passing the actual text (not just fontSize) matters: a
  // fontSize-only estimate badly overshoots for large sizes on short text,
  // producing an oversized box that — since dragging is bounds-clamped to
  // stay inside the image — leaves almost no room to actually move it away
  // from center.
  const nameBoxSize = resolveBoxSize(name, naturalSize.width, naturalSize.height, 12, nameSample)
  const idBoxSize = resolveBoxSize(id, naturalSize.width, naturalSize.height, 10, idText, undefined, 'Helvetica, Arial, sans-serif', true)

  // The actual text is drawn on the <canvas> below via drawTextField() —
  // the SAME function certificateGenerator.js calls to composite the real
  // certificate. It draws at the template's full natural resolution onto a
  // canvas sized/scaled exactly like the <img> (CSS width: 100%), so what
  // renders here is pixel-identical to the generated certificate, not a
  // separate CSS approximation of it.
  useEffect(() => {
    let cancelled = false
    async function draw() {
      const canvas = canvasRef.current
      if (!canvas || naturalSize.width <= 1) return
      canvas.width = naturalSize.width
      canvas.height = naturalSize.height
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      await drawTextField(ctx, nameSample, name, naturalSize.width, naturalSize.height, { centered: true, widthFactor: 12 })
      if (cancelled) return
      await drawTextField(ctx, idText, id, naturalSize.width, naturalSize.height, { centered: false, fontFamily: 'Helvetica, Arial, sans-serif', widthFactor: 10 })
      if (cancelled) return
      for (const f of fields) {
        const pos = { ...DEFAULT_CUSTOM_FIELD_POS, ...f }
        const text = f.value?.trim() || f.label?.trim() || 'Custom Field'
        await drawTextField(ctx, text, pos, naturalSize.width, naturalSize.height, { centered: true, widthFactor: 12 })
        if (cancelled) return
      }
    }
    draw()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(name), JSON.stringify(id), JSON.stringify(fields), nameSample, idText, naturalSize.width, naturalSize.height])

  return (
    <div>
      <div
        ref={containerRef}
        className="relative w-full rounded-xl overflow-hidden border border-gray-200 select-none"
      >
        <img src={imageUrl} alt="Certificate template" className="w-full h-auto block pointer-events-none" draggable={false} onLoad={handleImageLoad} />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

        {/* Name box — centered on its point. Drag handle only; the actual
            text is rendered on the canvas above, not inside this box. */}
        <Rnd
          bounds="parent"
          position={{ x: (name.xPct / 100) * w - (nameBoxSize.widthPct / 100) * w / 2, y: (name.yPct / 100) * h - (nameBoxSize.heightPct / 100) * h / 2 }}
          size={{ width: (nameBoxSize.widthPct / 100) * w, height: (nameBoxSize.heightPct / 100) * h }}
          minWidth={MIN_BOX_PX.width}
          minHeight={MIN_BOX_PX.height}
          onDragStop={(e, d) => {
            const widthPx = (nameBoxSize.widthPct / 100) * w
            const heightPx = (nameBoxSize.heightPct / 100) * h
            setName({ xPct: ((d.x + widthPx / 2) / w) * 100, yPct: ((d.y + heightPx / 2) / h) * 100 })
          }}
          onResizeStop={(e, dir, ref, delta, position) => {
            const newW = ref.offsetWidth, newH = ref.offsetHeight
            setName({
              xPct: ((position.x + newW / 2) / w) * 100,
              yPct: ((position.y + newH / 2) / h) * 100,
              widthPct: (newW / w) * 100,
              heightPct: (newH / h) * 100,
            })
          }}
          className="border-2 border-dashed border-[#1655c3]/70 hover:bg-[#1655c3]/10 rounded"
        />

        {/* ID box — left-anchored horizontally, centered vertically */}
        <Rnd
          bounds="parent"
          position={{ x: (id.xPct / 100) * w, y: (id.yPct / 100) * h - (idBoxSize.heightPct / 100) * h / 2 }}
          size={{ width: (idBoxSize.widthPct / 100) * w, height: (idBoxSize.heightPct / 100) * h }}
          minWidth={MIN_BOX_PX.width}
          minHeight={MIN_BOX_PX.height}
          onDragStop={(e, d) => {
            const heightPx = (idBoxSize.heightPct / 100) * h
            setId({ xPct: (d.x / w) * 100, yPct: ((d.y + heightPx / 2) / h) * 100 })
          }}
          onResizeStop={(e, dir, ref, delta, position) => {
            const newW = ref.offsetWidth, newH = ref.offsetHeight
            setId({
              xPct: (position.x / w) * 100,
              yPct: ((position.y + newH / 2) / h) * 100,
              widthPct: (newW / w) * 100,
              heightPct: (newH / h) * 100,
            })
          }}
          className="border-2 border-dashed border-[#64ac37]/70 hover:bg-[#64ac37]/10 rounded"
        />

        {/* Custom field boxes — centered on their point, same convention as Name */}
        {fields.map(f => {
          const pos = { ...DEFAULT_CUSTOM_FIELD_POS, ...f }
          const text = f.value?.trim() || f.label?.trim() || 'Custom Field'
          const fieldBoxSize = resolveBoxSize(pos, naturalSize.width, naturalSize.height, 12, text)
          const widthPct = fieldBoxSize.widthPct
          const heightPct = fieldBoxSize.heightPct
          return (
            <Rnd
              key={f.id}
              bounds="parent"
              position={{ x: (pos.xPct / 100) * w - (widthPct / 100) * w / 2, y: (pos.yPct / 100) * h - (heightPct / 100) * h / 2 }}
              size={{ width: (widthPct / 100) * w, height: (heightPct / 100) * h }}
              minWidth={MIN_BOX_PX.width}
              minHeight={MIN_BOX_PX.height}
              onDragStop={(e, d) => {
                const widthPx = (widthPct / 100) * w
                const heightPx = (heightPct / 100) * h
                setCustom(f.id, { xPct: ((d.x + widthPx / 2) / w) * 100, yPct: ((d.y + heightPx / 2) / h) * 100 })
              }}
              onResizeStop={(e, dir, ref, delta, position) => {
                const newW = ref.offsetWidth, newH = ref.offsetHeight
                setCustom(f.id, {
                  xPct: ((position.x + newW / 2) / w) * 100,
                  yPct: ((position.y + newH / 2) / h) * 100,
                  widthPct: (newW / w) * 100,
                  heightPct: (newH / h) * 100,
                })
              }}
              className="border-2 border-dashed border-[#a855f7]/70 hover:bg-[#a855f7]/10 rounded"
            />
          )
        })}
      </div>
      <p className="text-[11px] text-gray-400 mt-1.5">Drag to reposition, or drag a corner/edge to resize — blue is the student's name, green is the certificate ID, purple boxes are your custom fields. Text auto-shrinks to fit whatever size you set.</p>

      <div className="grid sm:grid-cols-2 gap-4 mt-3">
        <div className="rounded-xl border border-gray-100 p-3">
          <p className="text-xs font-bold text-[#1655c3] mb-2">Name text style</p>
          <div className="flex items-center gap-3 flex-wrap">
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
          <label className="text-[11px] text-gray-500 flex items-center gap-1.5 mt-2.5">
            Font
            <select
              value={name.fontFamily || DEFAULT_CERT_FONT}
              onChange={e => setName({ fontFamily: e.target.value })}
              className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs"
              style={{ fontFamily: name.fontFamily || DEFAULT_CERT_FONT }}
            >
              {CERTIFICATE_FONTS.map(f => (
                <option key={f.css} value={f.css} style={{ fontFamily: f.css }}>{f.label}</option>
              ))}
            </select>
          </label>
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

      {fields.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-4 mt-3">
          {fields.map(f => {
            const pos = { ...DEFAULT_CUSTOM_FIELD_POS, ...f }
            return (
              <div key={f.id} className="rounded-xl border border-gray-100 p-3">
                <p className="text-xs font-bold text-[#a855f7] mb-2 truncate">{f.label?.trim() || 'Custom Field'} text style</p>
                <div className="flex items-center gap-3 flex-wrap">
                  <label className="text-[11px] text-gray-500 flex items-center gap-1.5">
                    Size
                    <input type="number" min="10" max="120" value={pos.fontSize}
                      onChange={e => setCustom(f.id, { fontSize: Number(e.target.value) || DEFAULT_CUSTOM_FIELD_POS.fontSize })}
                      className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-xs" />
                  </label>
                  <label className="text-[11px] text-gray-500 flex items-center gap-1.5">
                    Color
                    <input type="color" value={pos.color} onChange={e => setCustom(f.id, { color: e.target.value })} className="w-8 h-7 rounded cursor-pointer" />
                  </label>
                </div>
                <label className="text-[11px] text-gray-500 flex items-center gap-1.5 mt-2.5">
                  Font
                  <select
                    value={pos.fontFamily || DEFAULT_CERT_FONT}
                    onChange={e => setCustom(f.id, { fontFamily: e.target.value })}
                    className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs"
                    style={{ fontFamily: pos.fontFamily || DEFAULT_CERT_FONT }}
                  >
                    {CERTIFICATE_FONTS.map(cf => (
                      <option key={cf.css} value={cf.css} style={{ fontFamily: cf.css }}>{cf.label}</option>
                    ))}
                  </select>
                </label>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export { DEFAULT_NAME_POS, DEFAULT_ID_POS }
