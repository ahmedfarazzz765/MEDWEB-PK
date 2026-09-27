import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../../firebase/config'
import { adminUsersService } from '../../firebase/services'

// Resolves the signed-in admin's permission record. See the comment above
// adminUsersService in services.js for the bootstrapping rule: no matching
// doc = Super Admin (full access), matching current behavior for every
// admin account that already existed before this feature shipped.
export default function useAdminPermissions() {
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState(null)
  const [record, setRecord] = useState(null)

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, user => {
      setEmail(user?.email || null)
      if (!user) setLoading(false)
    })
    return unsubAuth
  }, [])

  useEffect(() => {
    if (!email) return
    let cancelled = false
    setLoading(true)
    adminUsersService.getByEmail(email)
      .then(doc => { if (!cancelled) { setRecord(doc); setLoading(false) } })
      .catch(() => { if (!cancelled) { setRecord(null); setLoading(false) } })
    return () => { cancelled = true }
  }, [email])

  // A doc created by the app's own invite flow (AcceptInvite.jsx) ALWAYS
  // writes `allowedSections` explicitly, even as an empty array — so a doc
  // whose `allowedSections` is truly absent (not just empty) was hand-added
  // directly in Firestore, and almost certainly meant to be unrestricted
  // (e.g. someone typing `role: "admin"` for a Super Admin, not realizing
  // this codebase's actual full-access marker is `role: "superadmin"`).
  // Without this, that account gets `allowedSections` defaulted to `[]`
  // below and silently loses access to every section except Dashboard.
  const hasNoAllowedSectionsField = !!record && record.allowedSections === undefined
  const isSuperAdmin = !record || record.role === 'superadmin' || hasNoAllowedSectionsField
  const allowedSections = isSuperAdmin ? null : (record.allowedSections || [])

  // key is a section key like 'webinars' or 'content:hero'. Dashboard and
  // the Admin Users page itself are handled by their callers, not here.
  const canAccess = key => isSuperAdmin || allowedSections.includes(key)

  return { loading, email, isSuperAdmin, allowedSections, canAccess }
}
