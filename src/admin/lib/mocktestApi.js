// Thin client for the admin-only endpoints under public/api/mocktest/*.php
// (admin-resend.php, admin-reset.php, admin-generate-cert.php) — each is
// gated server-side by _lib/admin_auth.php verifying this same Firebase ID
// token's RS256 signature, so there's nothing else to prove here beyond
// attaching it.
import { auth } from '../../firebase/config'

export async function callMockTestAdminApi(path, body) {
  const user = auth.currentUser
  if (!user) throw new Error('Not signed in.')
  const token = await user.getIdToken()
  const res = await fetch(`/api/mocktest/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  let data = {}
  try { data = await res.json() } catch { /* non-JSON error page */ }
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || `Request failed (${res.status})`)
  }
  return data
}
