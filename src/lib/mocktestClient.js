// Thin client for the PUBLIC (student-facing) endpoints under
// public/api/mocktest/*.php — auth is the attempt bearer token (not
// Firebase Auth), kept in sessionStorage per course so refreshing the tab
// resumes instead of re-entering, but closing the tab and coming back
// later requires re-entering (matches "re-entry re-issues a token for the
// same attempt" being the intended resume path, not a long-lived client-
// side session).
const BASE = '/api/mocktest'

const tokenKey = courseSlug => `mocktest_token_${courseSlug}`
export const getStoredToken = courseSlug => sessionStorage.getItem(tokenKey(courseSlug))
export const storeToken = (courseSlug, token) => sessionStorage.setItem(tokenKey(courseSlug), token)
export const clearStoredToken = courseSlug => sessionStorage.removeItem(tokenKey(courseSlug))

async function call(path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${BASE}/${path}`, { method: 'POST', headers, body: JSON.stringify(body || {}) })
  let data = {}
  try { data = await res.json() } catch { /* non-JSON error page */ }
  if (!res.ok || data.ok === false) {
    const err = new Error(data.error || `Request failed (${res.status})`)
    err.status = res.status
    throw err
  }
  return data
}

export const mocktestApi = {
  enter: (courseSlug, registrationId, fullName, phone) =>
    call('enter.php', { body: { courseSlug, registrationId, fullName, phone } }),
  start: token => call('start.php', { token }),
  state: token => call('state.php', { token }),
  answer: (token, position, selectedIndex) => call('answer.php', { token, body: { position, selectedIndex } }),
  result: token => call('result.php', { token }),
  issueCert: (token, imageUrl) => call('issue-cert.php', { token, body: { imageUrl } }),
}
