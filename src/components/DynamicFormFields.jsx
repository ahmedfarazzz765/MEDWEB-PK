import { Star } from 'lucide-react'
import { uploadToCloudinary, uploadRawToCloudinary } from '../firebase/cloudinary'

export const inputCls =
  'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1655c3]/30 focus:border-[#1655c3] transition-all placeholder:text-gray-400 bg-gray-50'

const FILE_ACCEPTED = ['image/jpeg', 'image/png', 'application/pdf']
const FILE_MAX_SIZE = 5 * 1024 * 1024

// Single Form-Builder renderer shared by every public form surface
// (WebinarRegister.jsx, the course registration form) — extracted from
// WebinarRegister.jsx's own render/upload logic rather than duplicating a
// second one for courses. DynamicForm.jsx (plain /form/:id pages) keeps
// its own separate, pre-existing renderer — out of scope here, not
// touched, so nothing about it regresses.

// A field with `showIfField`/`showIfValue` set only renders (and only
// counts toward "required") once `values[showIfField] === showIfValue` —
// e.g. a bank-details note shown only when "Payment Method" = "Bank
// Transfer". No condition set = always visible (every pre-existing form).
export function isFieldVisible(field, values) {
  if (!field.showIfField) return true
  return values[field.showIfField] === field.showIfValue
}

export function visibleFields(fields, values) {
  return (fields || []).filter(f => isFieldVisible(f, values))
}

// `file` fields now accept JPG/PNG/PDF (max 5MB) — a PDF previously had
// no working path at all (Cloudinary's image/upload endpoint rejects
// non-images outright), silently failing with no size/type check on
// anything. Routed through uploadRawToCloudinary for PDFs, same split
// PaymentProofUpload.jsx already uses.
export async function uploadDynamicFormFile(file) {
  if (!FILE_ACCEPTED.includes(file.type)) throw new Error('Only JPG, PNG or PDF files are accepted.')
  if (file.size > FILE_MAX_SIZE) throw new Error('File must be under 5 MB.')
  return file.type === 'application/pdf'
    ? uploadRawToCloudinary(file, 'medweb/form-uploads')
    : uploadToCloudinary(file, 'medweb/form-uploads')
}

function DynamicFormField({ f, values, setField, onFileUpload }) {
  const v = values[f.key] ?? (f.type === 'checkbox' ? false : '')
  switch (f.type) {
    case 'textarea':
      return <textarea rows={4} placeholder={f.placeholder} value={v} onChange={e => setField(f.key, e.target.value)} className={`${inputCls} resize-none`} />
    case 'dropdown':
    case 'qualification':
    case 'semester': {
      const opts = f.type === 'qualification'
        ? ['MBBS', 'BDS', 'Pharm-D', 'Nursing', 'Allied Health Sciences', 'Medical Student', 'Other']
        : f.type === 'semester'
        ? ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', 'Final Year', 'Graduated']
        : (f.options || [])
      return (
        <select value={v} onChange={e => setField(f.key, e.target.value)} className={`${inputCls} cursor-pointer`}>
          <option value="">Select {f.label}</option>
          {opts.map((o, i) => <option key={i} value={o}>{o}</option>)}
        </select>
      )
    }
    case 'radio':
      return (
        <div className="flex flex-wrap gap-3">
          {(f.options || []).map((o, i) => (
            <label key={i} className="flex items-center gap-2 cursor-pointer text-sm text-gray-600">
              <input type="radio" name={f.key} checked={v === o} onChange={() => setField(f.key, o)} className="accent-[#1655c3]" />{o}
            </label>
          ))}
        </div>
      )
    case 'checkbox':
      return (
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input type="checkbox" checked={!!values[f.key]} onChange={e => setField(f.key, e.target.checked)} className="w-4 h-4 accent-[#1655c3]" />
          <span className="text-sm text-gray-600">{f.placeholder || f.label}</span>
        </label>
      )
    case 'file':
      return (
        <div>
          <input type="file" accept="image/jpeg,image/png,application/pdf" onChange={e => onFileUpload(f.key, e.target.files?.[0])} className="text-sm" />
          <p className="text-[11px] text-gray-400 mt-1">JPG, PNG or PDF — max 5 MB</p>
          {values[f.key + '__uploading'] && <p className="text-xs text-[#1655c3] mt-1">Uploading…</p>}
          {values[f.key] && !values[f.key + '__uploading'] && <p className="text-xs text-green-600 mt-1">Uploaded ✓</p>}
        </div>
      )
    case 'rating':
      return (
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} type="button" onClick={() => setField(f.key, n)} className="p-0.5">
              <Star size={26} className={n <= (Number(v) || 0) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'} />
            </button>
          ))}
        </div>
      )
    default:
      return <input type={f.type === 'email' ? 'email' : f.type === 'phone' ? 'tel' : 'text'} placeholder={f.placeholder} value={v} onChange={e => setField(f.key, e.target.value)} className={inputCls} />
  }
}

// `fields`/`values`/`setField` — same contract WebinarRegister.jsx's own
// inline version already had. `error`, if passed, surfaces an upload
// failure (size/type) the same way the caller's own validation errors do.
export default function DynamicFormFields({ fields, values, setField, onUploadError }) {
  const handleFile = async (key, file) => {
    if (!file) return
    setField(key + '__uploading', true)
    try {
      const url = await uploadDynamicFormFile(file)
      setField(key, url)
    } catch (e) {
      onUploadError?.(e.message)
    } finally {
      setField(key + '__uploading', false)
    }
  }

  return (
    <>
      {visibleFields(fields, values).map((f, i) => (
        <div key={f.key || i}>
          {f.type !== 'checkbox' && (
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              {f.label} {f.required && <span className="text-red-500">*</span>}
            </label>
          )}
          <DynamicFormField f={f} values={values} setField={setField} onFileUpload={handleFile} />
        </div>
      ))}
    </>
  )
}
