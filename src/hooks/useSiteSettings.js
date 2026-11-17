import { useSiteData } from './useSiteData'

// Shared "Firestore field with a hardcoded fallback" pattern used across
// every section. Pass an object of default values — string fields fall back
// on empty/missing, array fields fall back unless Firestore has a non-empty
// array. Returns the merged object.
//
// Used to be its own onSnapshot listener on settings/site — since nearly
// every section on the homepage calls this, that meant one live listener
// PER SECTION all reading the exact same single doc (8+ duplicate reads on
// one page load). Now reads site data out of the shared useSiteData() cache
// (one fetch per session, see src/hooks/useSiteData.js) instead.
export function useSiteSettings(defaults) {
  const { site } = useSiteData()
  const d = { ...defaults }
  for (const key in defaults) {
    const val = site[key]
    if (Array.isArray(defaults[key])) {
      if (Array.isArray(val) && val.length) d[key] = val
    } else if (val) {
      d[key] = val
    }
  }
  return d
}
