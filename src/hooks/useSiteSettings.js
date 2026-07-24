import { useEffect, useState } from 'react'
import { settingsService } from '../firebase/services'

// Shared "Firestore field with a hardcoded fallback" pattern used across every
// section (Round 17). Pass an object of default values — string fields fall
// back on empty/missing, array fields fall back unless Firestore has a
// non-empty array. Returns the merged, live-updating object.
export function useSiteSettings(defaults) {
  const [d, setD] = useState(defaults)

  useEffect(() => {
    const unsub = settingsService.listen(s => {
      if (!s) return
      setD(prev => {
        const next = { ...prev }
        for (const key in defaults) {
          const val = s[key]
          if (Array.isArray(defaults[key])) {
            if (Array.isArray(val) && val.length) next[key] = val
          } else if (val) {
            next[key] = val
          }
        }
        return next
      })
    })
    return () => unsub && unsub()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return d
}
