import { useEffect, useState } from 'react'
import { studentsDbService, webinarsService, certificatesService, coursesService } from '../firebase/services'

// Shared by Stats.jsx and WhyMedweb.jsx (same STATS config, same 4 keys —
// see data/statsConfig.js) so the real-vs-manual logic exists in exactly
// one place, not copy-pasted into both sections.
//
// 4 of the 6 homepage counters have a real Firestore-backed source and are
// computed live by default: Students Trained, Webinars Hosted (completed
// only), Certificates Issued (non-revoked only), Courses Available (active
// only). The other 2 (Expert Instructors, Cities Reached) have no
// collection that could answer them, so they stay purely admin-entered —
// not touched here.
//
// Each computed counter can still be manually overridden per Admin → Home
// Content → Stats: a `${key}Manual` boolean on the settings doc, saved
// alongside the pre-existing `${key}` text field (which becomes the
// override's own value once that flag is on, same field, no migration of
// old saved strings needed).
export const COMPUTED_STAT_KEYS = new Set(['studentsCount', 'webinarsCount', 'certificatesCount', 'coursesCount'])

export function useComputedStats() {
  const [computed, setComputed] = useState({})

  useEffect(() => {
    const u1 = studentsDbService.listen(rows =>
      setComputed(p => ({ ...p, studentsCount: rows.length })))
    const u2 = webinarsService.listen(rows =>
      setComputed(p => ({ ...p, webinarsCount: rows.filter(w => w.status === 'Completed').length })))
    const u3 = certificatesService.listen(rows =>
      setComputed(p => ({ ...p, certificatesCount: rows.filter(c => c.status !== 'Revoked').length })))
    const u4 = coursesService.listen(rows =>
      setComputed(p => ({ ...p, coursesCount: rows.filter(c => c.status === 'Active').length })))
    return () => { u1(); u2(); u3(); u4() }
  }, [])

  // `settingsVals` is whatever the caller's own settingsService.listen()
  // callback already captured (Stats.jsx's `vals`, WhyMedweb.jsx's
  // `statVals`) — read here rather than this hook keeping its own second
  // settings listener.
  const resolveStat = (key, settingsVals, fallback) => {
    const isManual = !!settingsVals?.[`${key}Manual`]
    if (COMPUTED_STAT_KEYS.has(key) && !isManual) {
      const n = computed[key]
      return n === undefined ? fallback : n.toLocaleString()
    }
    return settingsVals?.[key] || fallback
  }

  return { computed, resolveStat }
}
