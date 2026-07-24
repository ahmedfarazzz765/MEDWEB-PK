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

  const isSuperAdmin = !record || record.role === 'superadmin'
  const allowedSections = isSuperAdmin ? null : (record.allowedSections || [])

  // key is a section key like 'webinars' or 'content:hero'. Dashboard and
  // the Admin Users page itself are handled by their callers, not here.
  const canAccess = key => isSuperAdmin || allowedSections.includes(key)

  return { loading, email, isSuperAdmin, allowedSections, canAccess }
}
