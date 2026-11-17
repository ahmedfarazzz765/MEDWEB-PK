// Client-side Google Contacts integration (admin only) — no backend, no
// client secret, ever. Uses Google Identity Services' token client for an
// OAuth access token held only in memory (never persisted — a page reload
// means reconnecting), and the People API directly from the browser.
//
// Scope is `contacts` (read/write People API) plus `email` (just so the
// admin UI can show WHICH Google account granted access) — the admin
// can revoke access any time from https://myaccount.google.com/permissions.
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '233910635732-5r08r906shpjc9m46hgc9u31t5fpt9k6.apps.googleusercontent.com'
const SCOPES = 'https://www.googleapis.com/auth/contacts email'
const PEOPLE_API = 'https://people.googleapis.com/v1'

let tokenClient = null
let accessToken = null
let tokenExpiresAt = 0
let connectedEmail = null
const listeners = new Set()

function notify() {
  const state = { connected: isGoogleContactsConnected(), email: connectedEmail }
  for (const fn of listeners) fn(state)
}

// Subscribe to connect/disconnect/token-expiry changes — returns an
// unsubscribe function. Fires once immediately with the current state.
export function onGoogleContactsAuthChange(fn) {
  listeners.add(fn)
  fn({ connected: isGoogleContactsConnected(), email: connectedEmail })
  return () => listeners.delete(fn)
}

export function isGoogleContactsConnected() {
  return !!accessToken && Date.now() < tokenExpiresAt
}
export function getConnectedEmail() {
  return connectedEmail
}

let gisLoadingPromise = null
function loadGisScript() {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  if (gisLoadingPromise) return gisLoadingPromise
  gisLoadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = resolve
    script.onerror = () => { gisLoadingPromise = null; reject(new Error('Failed to load Google Identity Services script.')) }
    document.head.appendChild(script)
  })
  return gisLoadingPromise
}

function ensureTokenClient() {
  if (tokenClient) return tokenClient
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: SCOPES,
    callback: () => {}, // replaced per-request below
  })
  return tokenClient
}

function requestToken(promptMode) {
  return new Promise((resolve, reject) => {
    const client = ensureTokenClient()
    client.callback = resp => {
      if (resp.error) { reject(new Error(resp.error)); return }
      accessToken = resp.access_token
      // Shave a minute off so a call doesn't start right as the real token
      // expires mid-flight.
      tokenExpiresAt = Date.now() + ((resp.expires_in || 3600) * 1000) - 60000
      resolve()
    }
    client.requestAccessToken({ prompt: promptMode })
  })
}

async function fetchConnectedEmail() {
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=' + accessToken)
    if (!res.ok) return null
    const data = await res.json()
    return data.email || null
  } catch {
    return null
  }
}

// Interactive — call this directly from the "Connect Google Contacts"
// button's onClick (must be a real user gesture for the popup to open).
export async function connectGoogleContacts() {
  await loadGisScript()
  await requestToken('consent')
  connectedEmail = await fetchConnectedEmail()
  notify()
  return connectedEmail
}

// Silent — re-requests a token with no visible prompt if the admin already
// granted consent in this browser before. Called automatically by every
// People API call below when the in-memory token has expired, so a long
// admin session doesn't need the admin to notice and reconnect manually.
async function ensureFreshToken() {
  if (isGoogleContactsConnected()) return
  await loadGisScript()
  await requestToken('')
  if (!connectedEmail) connectedEmail = await fetchConnectedEmail()
  notify()
}

export function disconnectGoogleContacts() {
  if (accessToken && window.google?.accounts?.oauth2?.revoke) {
    window.google.accounts.oauth2.revoke(accessToken, () => {})
  }
  accessToken = null
  tokenExpiresAt = 0
  connectedEmail = null
  notify()
}

async function peopleFetch(path, options = {}) {
  await ensureFreshToken()
  const res = await fetch(`${PEOPLE_API}${path}`, {
    ...options,
    headers: { ...(options.headers || {}), Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Google Contacts error ${res.status}: ${body.slice(0, 300)}`)
  }
  if (res.status === 204) return null
  return res.json()
}

const digitsOnly = s => String(s || '').replace(/\D/g, '')
// The invariant part of a Pakistani mobile number regardless of format
// (+92, 0-prefixed, or bare) — the last 10 digits.
const last10 = phone => digitsOnly(phone).slice(-10)

// Normalizes to +92XXXXXXXXXX for storing on a new contact.
export function toPakistanE164(phone) {
  const l10 = last10(phone)
  return l10.length === 10 ? `+92${l10}` : ''
}

// 03XX / 92XX / bare — the three shapes a human or a prior export might
// have typed this number as, tried as actual search query strings (the
// People API's search is a fuzzy/prefix text search, not exact-match, so
// trying only one shape can miss a contact saved in a different one).
function phoneQueryVariants(phone) {
  const l10 = last10(phone)
  if (l10.length !== 10) return []
  return Array.from(new Set([`92${l10}`, `0${l10}`, l10]))
}

// Finds an existing contact by phone (any of the three shapes), comparing
// by normalized digits so formatting differences (+92 vs 0 vs spaces/
// dashes) never cause a false negative.
export async function findContactByPhone(phone) {
  const variants = phoneQueryVariants(phone)
  if (!variants.length) return null
  // Warm-up query — the People API's searchContacts index needs a first,
  // even empty, query to "prime" before a real one reliably returns
  // results in the same session (a well-documented quirk of this API).
  await peopleFetch('/people:searchContacts?query=&readMask=names,phoneNumbers,metadata').catch(() => {})
  const target = last10(phone)
  for (const variant of variants) {
    const data = await peopleFetch(`/people:searchContacts?query=${encodeURIComponent(variant)}&readMask=names,phoneNumbers,metadata`).catch(() => null)
    const results = data?.results || []
    for (const r of results) {
      const person = r.person
      const match = (person.phoneNumbers || []).some(p => last10(p.value) === target)
      if (match) return person
    }
  }
  return null
}

// Creates or updates (dedupe by phone) a contact for one approved
// enrollment. Never throws past the caller without a clear message —
// callers (AdminCourseEnrollments.jsx) decide how to surface it (toast +
// "Retry save contact"), this never blocks approval/email itself since
// it's always called fire-and-forget from there.
export async function saveEnrollmentContact({ enrollmentId, fullName, phone, email, courseTitle }) {
  const givenName = `${enrollmentId} ${fullName}`.trim()
  const existing = await findContactByPhone(phone)

  if (existing) {
    const body = {
      etag: existing.etag,
      names: [{ givenName }],
      emailAddresses: email ? [{ value: email }] : [],
      biographies: courseTitle ? [{ value: courseTitle, contentType: 'TEXT_PLAIN' }] : [],
    }
    const updated = await peopleFetch(
      `/${existing.resourceName}:updateContact?updatePersonFields=names,emailAddresses,biographies`,
      { method: 'PATCH', body: JSON.stringify(body) }
    )
    return { resourceName: updated.resourceName, created: false }
  }

  const e164 = toPakistanE164(phone)
  const body = {
    names: [{ givenName }],
    phoneNumbers: e164 ? [{ value: e164 }] : [],
    emailAddresses: email ? [{ value: email }] : [],
    biographies: courseTitle ? [{ value: courseTitle, contentType: 'TEXT_PLAIN' }] : [],
  }
  const created = await peopleFetch('/people:createContact', { method: 'POST', body: JSON.stringify(body) })
  return { resourceName: created.resourceName, created: true }
}
