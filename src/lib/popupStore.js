// Tiny shared store — no library — so CoursePopup.jsx can know whether
// WebinarAnnouncementPopup.jsx is currently on screen without either
// component reaching into the other's internals (and without DOM
// sniffing, which broke the moment some other element happened to share
// a style value with the webinar popup's pin badge).
let webinarPopupOpen = false
const listeners = new Set()

export function setWebinarPopupOpen(open) {
  webinarPopupOpen = open
  listeners.forEach(fn => fn(webinarPopupOpen))
}

export function getWebinarPopupOpen() {
  return webinarPopupOpen
}

// Returns an unsubscribe function.
export function subscribeWebinarPopupOpen(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
