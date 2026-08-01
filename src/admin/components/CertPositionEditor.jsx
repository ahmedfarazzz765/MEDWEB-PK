import { useRef, useState, useEffect } from 'react'
import { Rnd } from 'react-rnd'
import { CERTIFICATE_FONTS, DEFAULT_CERT_FONT } from '../../constants/certificateFonts'
import { fitFontSize, resolveBoxSize, boxWidthPx, boxHeightPx } from '../../lib/certFontFit'

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
  const nameFontMeta = CERTIFICATE_FONTS.find(f => f.css === name.fontFamily) || CERTIFICATE_FONTS[0]

  const setName = patch => onChange({ namePos: { ...name, ...patch }, idPos: id })
  const setId = patch => onChange({ namePos: name, idPos: { ...id, ...patch } })
  const setCustom = (fieldId, patch) => onChangeCustomField?.(fieldId, patch)

  // Fitted at full image resolution (matching how the real generator
  // measures it), then scaled down for on-screen display via containerSize.
  const w = containerSize.width || 1
  const h = containerSize.height || 1
  const previewScale = naturalSize.width ? w / naturalSize.width : 1

  // resolveBoxSize() is the exact function certificateGenerator.js calls
  // for the same purpose — a box with no saved widthPct/heightPct yet gets
  // the identical fallback size here and at generation time.
  const nameBoxSize = resolveBoxSize(name, naturalSize.width, naturalSize.height, 12)
  const nameWidthPct = nameBoxSize.widthPct
  const nameHeightPct = nameBoxSize.heightPct
  const fittedNameSize = fitFontSize({
    text: nameSample,
    fontFamily: name.fontFamily || DEFAULT_CERT_FONT,
    bold: nameFontMeta.bold,
    startSize: name.fontSize,
    maxWidthPx: boxWidthPx(nameWidthPct, naturalSize.width),
    maxHeightPx: boxHeightPx(nameHeightPct, naturalSize.height),
  })

  const idBoxSize = resolveBoxSize(id, naturalSize.width, naturalSize.height, 10)
  const idWidthPct = idBoxSize.widthPct
  const idHeightPct = idBoxSize.heightPct
  const idText = 'ID: MEDWEB-000123'
  const fittedIdSize = fitFontSize({
    text: idText,
    fontFamily: 'Helvetica, Arial, sans-serif',
    bold: true,
    startSize: id.fontSize,
    maxWidthPx: boxWidthPx(idWidthPct, naturalSize.width),
    maxHeightPx: boxHeightPx(idHeightPct, naturalSize.height),
  })

  return (
    <div>
      <div
        ref={containerRef}
        className="relative w-full rounded-xl overflow-hidden border border-gray-200 select-none"
      >
        <img src={imageUrl} alt="Certificate template" className="w-full h-auto block pointer-events-none" draggable={false} onLoad={handleImageLoad} />

        {/* Name box — centered on its point */}
        <Rnd
          bounds="parent"
          position={{ x: (name.xPct / 100) * w - (nameWidthPct / 100) * w / 2, y: (name.yPct / 100) * h - (nameHeightPct / 100) * h / 2 }}
          size={{ width: (nameWidthPct / 100) * w, height: (nameHeightPct / 100) * h }}
          minWidth={MIN_BOX_PX.width}
          minHeight={MIN_BOX_PX.height}
          onDragStop={(e, d) => {
            const widthPx = (nameWidthPct / 100) * w
            const heightPx = (nameHeightPct / 100) * h
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
          className="border-2 border-dashed border-[#1655c3] bg-white/70 rounded flex items-center justify-center"
        >
          <span
            style={{
              fontWeight: nameFontMeta.bold ? 'bold' : 'normal',
              fontFamily: name.fontFamily || DEFAULT_CERT_FONT,
              fontSize: Math.max(8, fittedNameSize * previewScale),
              color: name.color,
              whiteSpace: 'nowrap',
            }}
          >
            {nameSample}
          </span>
        </Rnd>

        {/* ID box — left-anchored horizontally, centered vertically */}
        <Rnd
          bounds="parent"
          position={{ x: (id.xPct / 100) * w, y: (id.yPct / 100) * h - (idHeightPct / 100) * h / 2 }}
          size={{ width: (idWidthPct / 100) * w, height: (idHeightPct / 100) * h }}
          minWidth={MIN_BOX_PX.width}
          minHeight={MIN_BOX_PX.height}
          onDragStop={(e, d) => {
            const heightPx = (idHeightPct / 100) * h
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
          className="border-2 border-dashed border-[#64ac37] bg-white/70 rounded flex items-center justify-start"
        >
          <span
            style={{
              fontWeight: 'bold',
              fontSize: Math.max(8, fittedIdSize * previewScale),
              color: id.color,
              whiteSpace: 'nowrap',
            }}
          >
            {idText}
          </span>
        </Rnd>

        {/* Custom field boxes — centered on their point, same convention as Name */}
        {fields.map(f => {
          const pos = { ...DEFAULT_CUSTOM_FIELD_POS, ...f }
          const font = CERTIFICATE_FONTS.find(cf => cf.css === pos.fontFamily) || CERTIFICATE_FONTS[0]
          const fieldBoxSize = resolveBoxSize(pos, naturalSize.width, naturalSize.height, 12)
          const widthPct = fieldBoxSize.widthPct
          const heightPct = fieldBoxSize.heightPct
          const text = f.value?.trim() || f.label?.trim() || 'Custom Field'
          const fittedSize = fitFontSize({
            text,
            fontFamily: pos.fontFamily || DEFAULT_CERT_FONT,
            bold: font.bold,
            startSize: pos.fontSize,
            maxWidthPx: boxWidthPx(widthPct, naturalSize.width),
            maxHeightPx: boxHeightPx(heightPct, naturalSize.height),
          })
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
              className="border-2 border-dashed border-[#a855f7] bg-white/70 rounded flex items-center justify-center"
            >
              <span
                style={{
                  fontWeight: font.bold ? 'bold' : 'normal',
                  fontFamily: pos.fontFamily || DEFAULT_CERT_FONT,
                  fontSize: Math.max(8, fittedSize * previewScale),
                  color: pos.color,
                  whiteSpace: 'nowrap',
                }}
              >
                {text}
              </span>
            </Rnd>
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
