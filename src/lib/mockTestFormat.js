// Tiny formatting helpers shared by the result hero (screen + PDF print
// layout) — kept here rather than inlined twice since both render the exact
// same "Time Taken" / "Result ID" text.
export function formatMockTestDuration(startIso, endIso) {
  if (!startIso || !endIso) return '—'
  const ms = new Date(endIso) - new Date(startIso)
  if (!Number.isFinite(ms) || ms < 0) return '—'
  const totalSec = Math.round(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return min > 0 ? `${min} min ${sec} sec` : `${sec} sec`
}

// Cosmetic only — not a verification code, just a short human-readable tag
// for "Result ID" distinct from the Registration ID already shown.
export function shortMockTestResultId(attemptId) {
  return (attemptId || '').slice(-8).toUpperCase()
}
