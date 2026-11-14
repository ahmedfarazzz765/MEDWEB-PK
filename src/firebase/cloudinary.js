// ── Cloudinary Upload Utility ─────────────────────────────────────────────────
// Cloud name: dxsrucrpg
// Upload preset: medweb  (unsigned preset — set in Cloudinary dashboard)

const CLOUD_NAME  = 'dxsrucrpg'
const UPLOAD_PRESET = 'medweb'

/**
 * Upload a File object to Cloudinary.
 * Returns the secure URL string on success.
 *
 * @param {File} file      - The file to upload
 * @param {string} folder  - Cloudinary folder e.g. 'medweb/team', 'medweb/blog'
 * @returns {Promise<string>} secure_url
 */
export async function uploadToCloudinary(file, folder = 'medweb') {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', UPLOAD_PRESET)
  formData.append('folder', folder)

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  )

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error?.message || 'Cloudinary upload failed')
  }

  const data = await res.json()
  return data.secure_url   // ← this URL is saved to Firestore
}

/**
 * Face-detects and crops a Cloudinary URL to a square so it fits a circular
 * avatar frame without off-center cropping. Safe no-op on non-Cloudinary URLs.
 */
export function toCircleAvatarUrl(url, size = 400) {
  if (!url || !url.includes('/upload/')) return url
  return url.replace('/upload/', `/upload/c_fill,g_face,w_${size},h_${size},q_auto,f_auto/`)
}

/**
 * Requests Cloudinary's automatic-format delivery (serves WebP to any
 * browser that supports it, falling back automatically otherwise) plus
 * automatic quality — the standard Cloudinary way to "compress to WebP"
 * without any client-side image processing (Cloudinary transcodes on
 * the fly from whatever format was actually uploaded). Used for Events &
 * News cover/gallery images. Safe no-op on a non-Cloudinary URL.
 */
export function toOptimizedUrl(url) {
  if (!url || !url.includes('/upload/')) return url
  return url.replace('/upload/', '/upload/f_auto,q_auto/')
}

/**
 * Same as uploadToCloudinary, but over XMLHttpRequest instead of fetch so
 * real upload progress is available — used by the Events & News gallery
 * multi-upload, which shows a per-file progress bar. `onProgress` receives
 * a 0–100 number.
 */
export function uploadToCloudinaryWithProgress(file, folder = 'medweb', onProgress) {
  return new Promise((resolve, reject) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', UPLOAD_PRESET)
    formData.append('folder', folder)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`)
    xhr.upload.onprogress = e => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText)
        if (xhr.status >= 200 && xhr.status < 300) resolve(data.secure_url)
        else reject(new Error(data.error?.message || 'Cloudinary upload failed'))
      } catch (e) { reject(e) }
    }
    xhr.onerror = () => reject(new Error('Network error during upload'))
    xhr.send(formData)
  })
}

/**
 * Upload a non-image File (e.g. a .ttf/.otf custom certificate font) to
 * Cloudinary via its `raw` resource type — the `image/upload` endpoint
 * above will reject anything Cloudinary can't decode as an image. Same
 * unsigned preset/cloud, just a different endpoint.
 *
 * @param {File} file
 * @param {string} folder
 * @returns {Promise<string>} secure_url
 */
export async function uploadRawToCloudinary(file, folder = 'medweb') {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', UPLOAD_PRESET)
  formData.append('folder', folder)

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/raw/upload`,
    { method: 'POST', body: formData }
  )

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error?.message || 'Cloudinary upload failed')
  }

  const data = await res.json()
  return data.secure_url
}
