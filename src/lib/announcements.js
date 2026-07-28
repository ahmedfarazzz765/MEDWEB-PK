// Shared "is this announcement currently visible" rule — used by both the
// public homepage banner and the admin list's status badge, so the two
// never disagree about what's actually showing.
export function isAnnouncementActive(a) {
  if (!a?.enabled) return false
  if (a.autoHideDate) {
    const today = new Date().toISOString().slice(0, 10)
    if (a.autoHideDate < today) return false
  }
  return true
}
