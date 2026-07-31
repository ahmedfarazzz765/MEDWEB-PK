import { useRef, useState } from 'react'
import { CERTIFICATE_FONTS, DEFAULT_CERT_FONT } from '../../constants/certificateFonts'

// Must match DEFAULT_NAME_POS / DEFAULT_ID_POS in functions/index.js exactly —
// these are the fallbacks used if a webinar's certTemplate has no saved
// position yet, on both the preview (here) and the generated image (there).
const DEFAULT_NAME_POS = { xPct: 50, yPct: 28, fontSize: 48, color: '#1a1a1a', fontFamily: DEFAULT_CERT_FONT }
const DEFAULT_ID_POS   = { xPct: 10, yPct: 90, fontSize: 26, color: '#1a1a1a' }

const DEFAULT_CUSTOM_FIELD_POS = { xPct: 50, yPct: 50, fontSize: 28, color: '#1a1a1a', fontFamily: DEFAULT_CERT_FONT }

// Draggable-box editor: shows the certificate template image with two fixed
// overlay boxes (Name, Certificate ID) the admin can drag into place, plus
// an optional dynamic list of custom-field boxes (only used by the manual
// "Issue Certificate" flow — AdminWebinars.jsx's webinar cert template never
// passes `customFields`, so it stays exactly as before). The Name box (and
// every custom field box) is centered on its point (matches text-anchor:middle
// in the canvas generator); the ID box is left-anchored at its point (matches
// text-anchor:start there) — these conventions must stay in sync with
// certificateGenerator.js's compositeCertificateCanvas or what the admin sees
// here won't match the generated certificate image.
export default function CertPositionEditor({ imageUrl, namePos, idPos, onChange, customFields, onChangeCustomField }) {
  const containerRef = useRef(null)
  const [dragging, setDragging] = useState(null) // 'name' | 'id' | `custom:${id}` | null
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
  const fields = customFields || []

  const setName = patch => onChange({ namePos: { ...name, ...patch }, idPos: id })
  const setId = patch => onChange({ namePos: name, idPos: { ...id, ...patch } })
  const setCustom = (fieldId, patch) => onChangeCustomField?.(fieldId, patch)

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
    else if (dragging === 'id') setId(pos)
    else if (dragging.startsWith('custom:')) setCustom(dragging.slice(7), pos)
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
            fontWeight: (CERTIFICATE_FONTS.find(f => f.css === name.fontFamily) || CERTIFICATE_FONTS[0]).bold ? 'bold' : 'normal',
            fontFamily: name.fontFamily || DEFAULT_CERT_FONT,
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

        {/* Custom field boxes — centered on their point, same convention as Name */}
        {fields.map(f => {
          const pos = { ...DEFAULT_CUSTOM_FIELD_POS, ...f }
          const font = CERTIFICATE_FONTS.find(cf => cf.css === pos.fontFamily) || CERTIFICATE_FONTS[0]
          return (
            <div
              key={f.id}
              onMouseDown={startDrag(`custom:${f.id}`)}
              onTouchStart={startDrag(`custom:${f.id}`)}
              className="absolute px-2 py-1 rounded cursor-grab active:cursor-grabbing border-2 border-dashed border-[#a855f7] bg-white/70"
              style={{
                left: `${pos.xPct}%`,
                top: `${pos.yPct}%`,
                transform: 'translate(-50%, -50%)',
                fontWeight: font.bold ? 'bold' : 'normal',
                fontFamily: pos.fontFamily || DEFAULT_CERT_FONT,
                fontSize: Math.max(8, pos.fontSize * previewScale),
                color: pos.color,
                whiteSpace: 'nowrap',
              }}
            >
              {f.value?.trim() || f.label?.trim() || 'Custom Field'}
            </div>
          )
        })}
      </div>
      <p className="text-[11px] text-gray-400 mt-1.5">Drag the boxes onto your template — blue is the student's name, green is the certificate ID, purple boxes are your custom fields.</p>

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
