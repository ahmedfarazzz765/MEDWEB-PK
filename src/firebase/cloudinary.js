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
