// Early-bird/registration-close date pickers are always meant as Asia/
// Karachi wall-clock time (PKT, UTC+5, no DST) regardless of the admin's
// own browser timezone — a `datetime-local` input gives back a
// timezone-naive string, so it's interpreted here as Karachi time
// explicitly (append a fixed +05:00 offset) rather than the browser's
// local zone. Stored as a plain ISO string, same convention every other
// admin-picked date in this app already uses (registeredAt, etc.) — not
// a real Firestore Timestamp object, which nothing else here uses either
// and would need `.toDate()` everywhere it's read back.
export function karachiLocalToIso(localStr) {
  if (!localStr) return ''
  const withSeconds = localStr.length === 16 ? `${localStr}:00` : localStr
  const d = new Date(`${withSeconds}+05:00`)
  return isNaN(d.getTime()) ? '' : d.toISOString()
}

// Reverse — renders a stored ISO string back into the Asia/Karachi
// wall-clock `datetime-local` string the input needs, regardless of
// where the admin's browser itself is.
export function isoToKarachiLocal(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  // Shift to UTC+5 wall-clock by formatting from a UTC timestamp offset
  // by 5 hours, then reading the UTC fields back off that shifted Date.
  const shifted = new Date(d.getTime() + 5 * 60 * 60 * 1000)
  const pad = n => String(n).padStart(2, '0')
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}T${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}`
}

// Human-readable "20 Nov 2026, 8:00 PM PKT" for public display.
export function formatKarachiDisplay(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const shifted = new Date(d.getTime() + 5 * 60 * 60 * 1000)
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const h24 = shifted.getUTCHours()
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  const ampm = h24 < 12 ? 'AM' : 'PM'
  const mm = String(shifted.getUTCMinutes()).padStart(2, '0')
  return `${shifted.getUTCDate()} ${months[shifted.getUTCMonth()]} ${shifted.getUTCFullYear()}, ${h12}:${mm} ${ampm} PKT`
}

export function isBeforeNow(iso) {
  if (!iso) return false
  const t = new Date(iso).getTime()
  return !isNaN(t) && Date.now() > t
}
