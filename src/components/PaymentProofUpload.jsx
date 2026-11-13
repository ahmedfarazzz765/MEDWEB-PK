import { useState, useRef } from 'react'
import { Upload, X, FileText, CheckCircle2 } from 'lucide-react'
import { uploadToCloudinary, uploadRawToCloudinary } from '../firebase/cloudinary'

const ACCEPTED = ['image/jpeg', 'image/png', 'application/pdf']
const MAX_SIZE = 5 * 1024 * 1024

// Public-facing file picker for a payment screenshot/receipt — unlike
// admin/components/ImageUpload.jsx (which always treats the result as a
// displayable image), this also accepts PDFs, which Cloudinary's image
// endpoint rejects outright — those go through uploadRawToCloudinary
// instead, picked by the file's own MIME type so the caller never has to
// know which one was used.
export default function PaymentProofUpload({ value, onChange, label = 'Payment Proof (JPG, PNG or PDF, max 5 MB)' }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')
  const inputRef = useRef()

  const handleFile = async e => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!ACCEPTED.includes(file.type)) { setError('Only JPG, PNG or PDF files are accepted.'); return }
    if (file.size > MAX_SIZE) { setError('File must be under 5 MB.'); return }
    setError('')
    setUploading(true)
    try {
      const url = file.type === 'application/pdf'
        ? await uploadRawToCloudinary(file, 'medweb/payment-proofs')
        : await uploadToCloudinary(file, 'medweb/payment-proofs')
      setFileName(file.name)
      onChange(url)
    } catch (err) {
      setError('Upload failed: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label} <span className="text-red-500">*</span></label>
      {value ? (
        <div className="flex items-center gap-3 border border-green-200 bg-green-50 rounded-xl px-4 py-3">
          <CheckCircle2 size={18} className="text-green-600 shrink-0" />
          <span className="text-sm text-green-700 truncate flex-1">{fileName || 'Uploaded'}</span>
          <button type="button" onClick={() => { onChange(''); setFileName('') }} className="shrink-0 text-gray-400 hover:text-red-500">
            <X size={16} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-[#1655c3]/30 rounded-xl py-4 text-sm font-semibold text-[#1655c3] hover:border-[#1655c3] hover:bg-blue-50 transition-all disabled:opacity-50"
        >
          {uploading ? <><FileText size={16} className="animate-pulse" /> Uploading…</> : <><Upload size={16} /> Click to upload payment proof</>}
        </button>
      )}
      {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,application/pdf" className="hidden" onChange={handleFile} />
    </div>
  )
}
