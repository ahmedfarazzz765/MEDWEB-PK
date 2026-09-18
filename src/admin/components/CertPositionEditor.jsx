import { useRef, useState, useEffect } from 'react'
import { Rnd } from 'react-rnd'
import {
  Bold, Italic, AlignLeft, AlignCenter, AlignRight,
  Square, Circle as CircleIcon, Minus, Star, Award, Trash2, Plus,
} from 'lucide-react'
import { DEFAULT_CERT_FONT } from '../../constants/certificateFonts'
import { resolveBoxSize, drawTextField } from '../../lib/certFontFit'
import { ELEMENT_TYPES, defaultElement, drawElement } from '../../lib/certElements'
import { getAllCertFontEntries, getCachedCertFontEntries } from '../../lib/customCertFonts'
import FontUpload from './FontUpload'

// Must match DEFAULT_NAME_POS / DEFAULT_ID_POS in functions/index.js exactly —
// these are the fallbacks used if a webinar's certTemplate has no saved
// position yet, on both the preview (here) and the generated image (there).
const DEFAULT_NAME_POS = { xPct: 50, yPct: 28, fontSize: 48, color: '#1a1a1a', fontFamily: DEFAULT_CERT_FONT }
const DEFAULT_ID_POS   = { xPct: 10, yPct: 90, fontSize: 26, color: '#1a1a1a' }

const DEFAULT_CUSTOM_FIELD_POS = { xPct: 50, yPct: 50, fontSize: 28, color: '#1a1a1a', fontFamily: DEFAULT_CERT_FONT }

const MIN_BOX_PX = { width: 30, height: 16 }

const COLOR_SWATCHES = ['#1a1a1a', '#ffffff', '#1655c3', '#64ac37', '#b8860b', '#7c3aed', '#dc2626', '#0891b2']

const ELEMENT_ICONS = { rectangle: Square, circle: CircleIcon, line: Minus, star: Star, ribbon: Award }

// A small preset-swatch row alongside the existing native color input — an
// easy one-click pick for common certificate colors, with the raw input
// still there for anything else. Kept deliberately simple (no color-space
// picker library) per the "existing input is fine if easier isn't cheap"
// call.
function ColorSwatchPicker({ value, onChange }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {COLOR_SWATCHES.map(c => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          title={c}
          className={`w-5 h-5 rounded-full border ${value?.toLowerCase() === c ? 'ring-2 ring-offset-1 ring-[#1655c3]' : 'border-gray-300'}`}
          style={{ background: c }}
        />
      ))}
      <input type="color" value={value || '#1a1a1a'} onChange={e => onChange(e.target.value)} className="w-6 h-6 rounded cursor-pointer border border-gray-200" title="Custom color" />
    </div>
  )
}

// Bold/Italic/Align/Color/Font/Size — the per-box formatting toolbar, shared
// by the Name panel, the ID panel, and every custom-field panel below the
// canvas. All of it flows into `pos` (bold/italic/align/color/fontFamily/
// fontSize), which drawTextField() (certFontFit.js) reads directly — same
// function for the live preview canvas above and the real generated
// certificate, so nothing here can visually diverge from the output.
function FieldStyleControls({ pos, set, fonts, defaultAlign, minSize = 10, maxSize = 120, showFont = true }) {
  const align = pos.align || defaultAlign
  return (
    <>
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-[11px] text-gray-500 flex items-center gap-1.5">
          Size
          <input type="number" min={minSize} max={maxSize} value={pos.fontSize}
            onChange={e => set({ fontSize: Number(e.target.value) || pos.fontSize })}
            className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-xs" />
        </label>

        <button type="button" onClick={() => set({ bold: !pos.bold })} title="Bold"
          className={`w-7 h-7 flex items-center justify-center rounded-lg border text-xs ${pos.bold ? 'bg-[#1655c3] text-white border-[#1655c3]' : 'border-gray-200 text-gray-500'}`}>
          <Bold size={13} />
        </button>
        <button type="button" onClick={() => set({ italic: !pos.italic })} title="Italic"
          className={`w-7 h-7 flex items-center justify-center rounded-lg border text-xs ${pos.italic ? 'bg-[#1655c3] text-white border-[#1655c3]' : 'border-gray-200 text-gray-500'}`}>
          <Italic size={13} />
        </button>

        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          {[['left', AlignLeft], ['center', AlignCenter], ['right', AlignRight]].map(([a, Icon]) => (
            <button key={a} type="button" onClick={() => set({ align: a })} title={`Align ${a}`}
              className={`w-7 h-7 flex items-center justify-center ${align === a ? 'bg-[#1655c3] text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
              <Icon size={13} />
            </button>
          ))}
        </div>
      </div>

      <div className="mt-2.5">
        <ColorSwatchPicker value={pos.color} onChange={c => set({ color: c })} />
      </div>

      {showFont && (
        <label className="text-[11px] text-gray-500 flex items-center gap-1.5 mt-2.5">
          Font
          <select
            value={pos.fontFamily || DEFAULT_CERT_FONT}
            onChange={e => set({ fontFamily: e.target.value })}
            className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs"
            style={{ fontFamily: pos.fontFamily || DEFAULT_CERT_FONT }}
          >
            {fonts.map(f => (
              <option key={f.css} value={f.css} style={{ fontFamily: f.css }}>{f.label}{f.custom ? ' (custom)' : ''}</option>
            ))}
          </select>
        </label>
      )}
    </>
  )
}

// Draggable + resizable box editor: shows the certificate template image
// with two fixed overlay boxes (Name, Certificate ID) the admin can drag
// AND resize (react-rnd — same library/pattern already used for the
// Ambassador Letter's resizable text box), plus an optional dynamic list of
// custom-field boxes and decorative element boxes (only used by the manual
// "Issue Certificate" flow's fuller UI — AdminWebinars.jsx's webinar cert
// template just won't render those panels/buttons, the component itself
// works either way). The Name box (and every custom field/element box) is
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
export default function CertPositionEditor({
  imageUrl, namePos, idPos, onChange, customFields, onChangeCustomField, nameSampleText,
  elements, onChangeElements,
}) {
  const containerRef = useRef(null)
  const canvasRef = useRef(null)
  // Tracked in state (not read directly off the ref during render) so box
  // pixel positions/sizes recompute once the template image has actually
  // laid out — clientWidth/Height are 0 until then. Same pattern as
  // LetterPositionEditor.jsx's resizable box.
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const [naturalSize, setNaturalSize] = useState({ width: 1, height: 1 })
  // Curated fonts + any admin-uploaded custom ones, merged — see
  // customCertFonts.js. Starts from whatever's already cached (instant on
  // repeat opens) and refetches once in case a font was uploaded elsewhere.
  const [fonts, setFonts] = useState(getCachedCertFontEntries())

  useEffect(() => {
    let cancelled = false
    getAllCertFontEntries().then(list => { if (!cancelled) setFonts(list) })
    return () => { cancelled = true }
  }, [])

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
  const els = elements || []
  const nameSample = nameSampleText?.trim() || 'Ahmed Khan'
  const idText = 'ID: MEDWEB-000123'

  const setName = patch => onChange({ namePos: { ...name, ...patch }, idPos: id })
  const setId = patch => onChange({ namePos: name, idPos: { ...id, ...patch } })
  const setCustom = (fieldId, patch) => onChangeCustomField?.(fieldId, patch)

  const addElement = type => onChangeElements?.([...els, defaultElement(type)])
  const setElement = (elId, patch) => onChangeElements?.(els.map(e => e.id === elId ? { ...e, ...patch } : e))
  const removeElement = elId => onChangeElements?.(els.filter(e => e.id !== elId))

  const w = containerSize.width || 1
  const h = containerSize.height || 1

  // resolveBoxSize() is the exact function drawTextField() (and, through
  // it, certificateGenerator.js) uses internally for the same purpose — a
  // box with no saved widthPct/heightPct yet gets the identical
  // text-measured fallback size here (for sizing the drag handle) and at
  // generation time (for sizing the auto-shrink-to-fit box), so the two can
  // never disagree. Passing the actual text (not just fontSize) matters: a
  // fontSize-only estimate badly overshoots for large sizes on short text
  // producing an oversized box that — since dragging is bounds-clamped to
  // stay inside the image — leaves almost no room to actually move it away
  // from center.
  const nameBoxSize = resolveBoxSize(name, naturalSize.width, naturalSize.height, 12, nameSample)
  const idBoxSize = resolveBoxSize(id, naturalSize.width, naturalSize.height, 10, idText, undefined, 'Helvetica, Arial, sans-serif', true)

  // The actual text/shapes are drawn on the <canvas> below via
  // drawTextField()/drawElement() — the SAME functions
  // certificateGenerator.js calls to composite the real certificate. It
  // draws at the template's full natural resolution onto a canvas sized/
  // scaled exactly like the <img> (CSS width: 100%), so what renders here
  // is pixel-identical to the generated certificate, not a separate CSS
  // approximation of it.
  useEffect(() => {
    let cancelled = false
    async function draw() {
      const canvas = canvasRef.current
      if (!canvas || naturalSize.width <= 1) return
      canvas.width = naturalSize.width
      canvas.height = naturalSize.height
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Shapes draw first (background layer), text on top — same order as
      // certificateGenerator.js's compositeCertificateCanvas().
      for (const el of els) drawElement(ctx, el, naturalSize.width, naturalSize.height)

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
  }, [JSON.stringify(name), JSON.stringify(id), JSON.stringify(fields), JSON.stringify(els), nameSample, idText, naturalSize.width, naturalSize.height])

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

        {/* Decorative element boxes — shapes/icons, same centered-box drag
            pattern as custom fields, drawn via drawElement() on the canvas. */}
        {els.map(el => (
          <Rnd
            key={el.id}
            bounds="parent"
            position={{ x: (el.xPct / 100) * w - ((el.widthPct ?? 12) / 100) * w / 2, y: (el.yPct / 100) * h - ((el.heightPct ?? 12) / 100) * h / 2 }}
            size={{ width: ((el.widthPct ?? 12) / 100) * w, height: ((el.heightPct ?? 12) / 100) * h }}
            minWidth={MIN_BOX_PX.width}
            minHeight={el.type === 'line' ? 4 : MIN_BOX_PX.height}
            onDragStop={(e, d) => {
              const widthPx = ((el.widthPct ?? 12) / 100) * w
              const heightPx = ((el.heightPct ?? 12) / 100) * h
              setElement(el.id, { xPct: ((d.x + widthPx / 2) / w) * 100, yPct: ((d.y + heightPx / 2) / h) * 100 })
            }}
            onResizeStop={(e, dir, ref, delta, position) => {
              const newW = ref.offsetWidth, newH = ref.offsetHeight
              setElement(el.id, {
                xPct: ((position.x + newW / 2) / w) * 100,
                yPct: ((position.y + newH / 2) / h) * 100,
                widthPct: (newW / w) * 100,
                heightPct: (newH / h) * 100,
              })
            }}
            className="border-2 border-dashed border-orange-400/70 hover:bg-orange-400/10 rounded"
          />
        ))}
      </div>
      <p className="text-[11px] text-gray-400 mt-1.5">Drag to reposition, or drag a corner/edge to resize — blue is the student's name, green is the certificate ID, purple boxes are your custom fields, orange boxes are shapes/elements. Text auto-shrinks to fit whatever size you set.</p>

      <div className="grid sm:grid-cols-2 gap-4 mt-3">
        <div className="rounded-xl border border-gray-100 p-3">
          <p className="text-xs font-bold text-[#1655c3] mb-2">Name text style</p>
          <FieldStyleControls pos={name} set={setName} fonts={fonts} defaultAlign="center" />
        </div>
        <div className="rounded-xl border border-gray-100 p-3">
          <p className="text-xs font-bold text-[#64ac37] mb-2">ID text style</p>
          <FieldStyleControls pos={id} set={setId} fonts={fonts} defaultAlign="left" maxSize={80} showFont={false} />
        </div>
      </div>

      {fields.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-4 mt-3">
          {fields.map(f => {
            const pos = { ...DEFAULT_CUSTOM_FIELD_POS, ...f }
            return (
              <div key={f.id} className="rounded-xl border border-gray-100 p-3">
                <p className="text-xs font-bold text-[#a855f7] mb-2 truncate">{f.label?.trim() || 'Custom Field'} text style</p>
                <FieldStyleControls pos={pos} set={patch => setCustom(f.id, patch)} fonts={fonts} defaultAlign="center" />
              </div>
            )
          })}
        </div>
      )}

      {/* ELEMENTS — basic decorative shapes (divider lines, seals, etc.),
          only shown when the parent wires onChangeElements (the manual
          Issue Certificate flow; AdminWebinars.jsx can opt in the same way
          if it ever needs this). */}
      {onChangeElements && (
        <div className="rounded-xl border border-gray-100 p-3 mt-3">
          <p className="text-xs font-bold text-orange-500 mb-2">Elements</p>
          <div className="flex items-center gap-2 flex-wrap">
            {ELEMENT_TYPES.map(({ type, label }) => {
              const Icon = ELEMENT_ICONS[type]
              return (
                <button key={type} type="button" onClick={() => addElement(type)}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-dashed border-orange-400/50 text-orange-600 hover:bg-orange-50">
                  <Plus size={12} /><Icon size={13} /> {label}
                </button>
              )
            })}
          </div>

          {els.length > 0 && (
            <div className="grid sm:grid-cols-2 gap-3 mt-3">
              {els.map(el => {
                const Icon = ELEMENT_ICONS[el.type] || Square
                return (
                  <div key={el.id} className="flex items-center gap-2 rounded-lg border border-gray-100 p-2">
                    <Icon size={14} className="text-orange-500 shrink-0" />
                    <span className="text-[11px] text-gray-600 capitalize flex-1">{el.type}</span>
                    <ColorSwatchPicker value={el.color} onChange={c => setElement(el.id, { color: c })} />
                    <button type="button" onClick={() => removeElement(el.id)} className="text-red-400 hover:text-red-600">
                      <Trash2 size={14} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      <div className="mt-3">
        <FontUpload onUploaded={async () => setFonts(await getAllCertFontEntries())} />
      </div>
    </div>
  )
}

export { DEFAULT_NAME_POS, DEFAULT_ID_POS }
