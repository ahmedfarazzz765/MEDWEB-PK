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
  // 'news' was renamed to 'events' when the News module became Events &
  // News (Round 13) — an Editor/Viewer already granted the old 'news'
  // section key keeps working under the new one instead of silently
  // losing access.
  const canAccess = key => isSuperAdmin || allowedSections.includes(key) || (key === 'events' && allowedSections.includes('news'))

  // A restricted record's role is 'editor' or 'viewer' — anything else
  // (including a legacy doc with no `role` field, or the old literal
  // `'admin'` value this field used to always be set to before roles
  // shipped) defaults to 'editor' so existing sub-admins keep their
  // current write access instead of silently becoming read-only.
  const role = isSuperAdmin ? 'superadmin' : (record?.role === 'viewer' ? 'viewer' : 'editor')
  const isViewer = role === 'viewer'
  // Only the Super Admin can delete anything or manage other admins —
  // Editor keeps create/edit, matches Prompt 5's "Editor can't delete or
  // manage admins" (the admin-management half is already enforced by the
  // `isSuperAdmin`-only check AdminUsers.jsx itself does).
  const canDelete = isSuperAdmin
  const canWrite = !isViewer

  return { loading, email, isSuperAdmin, allowedSections, canAccess, role, isViewer, canDelete, canWrite }
}
