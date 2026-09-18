import { useState, useRef } from 'react'
import { Type, Upload } from 'lucide-react'
import { uploadRawToCloudinary } from '../../firebase/cloudinary'
import { customFontsService } from '../../firebase/services'
import { slugifyFontFamily, refreshCustomFonts } from '../../lib/customCertFonts'

// Admin uploads a .ttf/.otf downloaded from Google Fonts (or anywhere) —
// stored on Cloudinary (raw file, not an image), registered as a new
// `customFonts` Firestore doc, and immediately usable in every certificate
// template's font dropdown afterward (see CertPositionEditor.jsx, which
// calls onUploaded to refresh its own font list right after this resolves).
export default function FontUpload({ onUploaded }) {
  const [name, setName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef()

  const handleFile = async e => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!name.trim()) { setError('Name the font first (e.g. "Roboto Slab")'); e.target.value = ''; return }
    if (!/\.(ttf|otf)$/i.test(file.name)) { setError('Only .ttf or .otf files are supported'); e.target.value = ''; return }
    if (file.size > 5 * 1024 * 1024) { setError('File must be under 5 MB'); e.target.value = ''; return }

    setError('')
    setUploading(true)
    try {
      const fileUrl = await uploadRawToCloudinary(file, 'medweb/certificates/fonts')
      const fontFamily = slugifyFontFamily(name)
      const format = /\.otf$/i.test(file.name) ? 'opentype' : 'truetype'
      await customFontsService.add({ name: name.trim(), fontFamily, fileUrl, format })
      await refreshCustomFonts()
      setName('')
      onUploaded?.()
    } catch (err) {
      setError('Upload failed: ' + err.message)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="rounded-xl border border-dashed border-gray-200 p-3">
      <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <Type size={13} /> Upload Custom Font
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Font name (e.g. Roboto Slab)"
          className="flex-1 min-w-[160px] border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 border-2 border-dashed border-[#1655c3]/30 rounded-lg px-3 py-1.5 text-xs font-semibold text-[#1655c3] hover:border-[#1655c3] hover:bg-blue-50 transition-all disabled:opacity-50"
        >
          <Upload size={13} />
          {uploading ? 'Uploading…' : 'Choose .ttf / .otf'}
        </button>
        <input ref={inputRef} type="file" accept=".ttf,.otf" className="hidden" onChange={handleFile} />
      </div>
      {error && <p className="text-[11px] text-red-500 mt-1.5">{error}</p>}
      <p className="text-[10px] text-gray-400 mt-1.5">Once uploaded it appears in the Font dropdown below, for this and every future certificate.</p>
    </div>
  )
}
