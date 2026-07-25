import { useState, useRef } from 'react'
import { Upload, X, Image } from 'lucide-react'
import { uploadToCloudinary, toCircleAvatarUrl } from '../../firebase/cloudinary'

export default function ImageUpload({ value, onChange, folder = 'medweb', label = 'Photo', circle = false }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState('')
  const inputRef = useRef()

  const handleFile = async e => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError('File must be under 5 MB'); return }
    setError('')
    setUploading(true)
    try {
      const url = await uploadToCloudinary(file, folder)
      onChange(circle ? toCircleAvatarUrl(url) : url)
    } catch (err) {
      setError('Upload failed: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">{label}</label>
      <div className="flex items-center gap-3">
        {/* Preview */}
        {value ? (
          circle ? (
            <div className="relative shrink-0 p-[3px] bg-gradient-to-tr from-[#64ac37] via-[#1655c3] to-[#64ac37] rounded-full">
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-white">
                <img src={value} alt="preview" className="w-full h-full object-cover" />
              </div>
              <button onClick={() => onChange('')}
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center">
                <X size={10} />
              </button>
            </div>
          ) : (
            <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 shrink-0">
              <img src={value} alt="preview" className="w-full h-full object-cover" />
              <button onClick={() => onChange('')}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center">
                <X size={10} />
              </button>
            </div>
          )
        ) : (
          <div className={`w-20 h-20 ${circle ? 'rounded-full' : 'rounded-xl'} border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50 shrink-0`}>
            <Image size={22} className="text-gray-300" />
          </div>
        )}

        {/* Upload button */}
        <div className="flex-1">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-[#1655c3]/30 rounded-xl py-3 text-sm font-semibold text-[#1655c3] hover:border-[#1655c3] hover:bg-blue-50 transition-all disabled:opacity-50"
          >
            <Upload size={15} />
            {uploading ? 'Uploading to Cloudinary…' : 'Click to upload image'}
          </button>
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          <p className="text-[10px] text-gray-400 mt-1">PNG, JPG, WEBP · max 5 MB · stored on Cloudinary</p>
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </div>
      </div>
    </div>
  )
}
