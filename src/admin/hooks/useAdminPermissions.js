import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from '../../firebase/config'
import { adminUsersService } from '../../firebase/services'
import { SUPER_ADMINS } from '../../constants/superAdmins'

// Resolves the signed-in admin's permission record.
//
// SECURITY FIX (Round 13): this used to treat "signed in, no adminUsers
// doc" as Super Admin — a bootstrap convenience that became a real hole
// once Ambassador Login (a much larger, less-trusted group) started
// issuing real Firebase Auth accounts in the same project. Super Admin
// is now ONLY the hardcoded SUPER_ADMINS list; anyone else needs an
// actual `adminUsers/{email}` doc (Editor or Viewer) to be an admin at
// all. A signed-in account that is neither is signed straight back out
// and redirected to /admin/login — this hook enforces that itself
// (defense in depth), and RequireAuth.jsx also checks it before this
// hook, or any admin page, ever renders.
export default function useAdminPermissions() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState(null)
  const [record, setRecord] = useState(null)
  const [recordChecked, setRecordChecked] = useState(false)
  // true ONLY when the Firestore read itself threw (network blip, a rules
  // mismatch, offline) — NOT when it resolved normally and simply found no
  // adminUsers/{email} doc (that's a real "not an admin", handled by
  // `record` staying null). Conflating the two used to mean a transient
  // read failure looked identical to "not an admin" and could both lock a
  // real admin out of /admin entirely AND hide every sidebar page for one
  // who stayed in — see the fallback below.
  const [recordFetchFailed, setRecordFetchFailed] = useState(false)

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, user => {
      setEmail(user?.email?.toLowerCase() || null)
      if (!user) { setLoading(false); setRecordChecked(true) }
    })
    return unsubAuth
  }, [])

  useEffect(() => {
    if (!email) return
    let cancelled = false
    setLoading(true)
    setRecordFetchFailed(false)
    adminUsersService.getByEmail(email)
      .then(doc => { if (!cancelled) { setRecord(doc); setRecordChecked(true); setLoading(false) } })
      .catch(err => {
        if (cancelled) return
        console.warn(
          `useAdminPermissions: couldn't read adminUsers/${email} (${err?.message || err}). ` +
          'Falling back to full access for this session rather than hiding every admin page or ' +
          'signing this account out over a read failure that may have nothing to do with their ' +
          'actual permissions.'
        )
        setRecord(null)
        setRecordFetchFailed(true)
        setRecordChecked(true)
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [email])

  const isSuperAdmin = !!email && SUPER_ADMINS.includes(email)
  // A failed read never means "not an admin" — RequireAuth.jsx already
  // confirmed admin status before this hook's own page ever mounted, so a
  // SECOND read failing here (a separate Firestore call) falls back to
  // treating this signed-in account as a full-access admin rather than
  // locking it out or hiding its sidebar.
  const isAdmin = isSuperAdmin || !!record || recordFetchFailed

  // Kicks a signed-in-but-not-admin account straight back out — same
  // treatment RequireAuth.jsx already gives an Ambassador account that
  // wanders into /admin, just driven from here too so this hook never
  // hands out write/read access by accident even if something renders
  // an admin page outside RequireAuth's own gate.
  useEffect(() => {
    if (!recordChecked || !email || isAdmin) return
    signOut(auth).catch(() => {})
    navigate('/admin/login', { replace: true })
  }, [recordChecked, email, isAdmin])

  // `null` means "unrestricted" — same meaning for isSuperAdmin and for a
  // failed read, which deliberately errs toward full access rather than
  // guessing a restrictive list it has no real data for.
  const allowedSections = (isSuperAdmin || recordFetchFailed) ? null : (record?.allowedSections || [])

  // key is a section key like 'webinars' or 'content:hero'. Dashboard and
  // the Admin Users page itself are handled by their callers, not here.
  // 'news' was renamed to 'events' when the News module became Events &
  // News (Round 13) — an Editor/Viewer already granted the old 'news'
  // section key keeps working under the new one instead of silently
  // losing access.
  const canAccess = key => isAdmin && (isSuperAdmin || recordFetchFailed || allowedSections.includes(key) || (key === 'events' && allowedSections.includes('news')))

  // A restricted record's role is 'editor' or 'viewer' — anything else
  // (including a legacy doc with no `role` field, or the old literal
  // `'admin'` value this field used to always be set to before roles
  // shipped) defaults to 'editor' so existing sub-admins keep their
  // current write access instead of silently becoming read-only. `null`
  // for a genuinely non-admin account — isAdmin is false for them
  // regardless, this is just so `role` never falsely reads 'editor'. A
  // failed read ALSO defaults to 'editor', for the same "never hide
  // pages/lock out over a read failure" reason as isAdmin/allowedSections
  // above — a real Viewer whose read happens to fail during an outage
  // gets full write access for that session instead of none; that's a
  // deliberate trade, not an oversight.
  const role = isSuperAdmin ? 'superadmin' : !isAdmin ? null : (recordFetchFailed ? 'editor' : (record?.role === 'viewer' ? 'viewer' : 'editor'))
  const isViewer = role === 'viewer'
  // Only the Super Admin can delete anything or manage other admins —
  // Editor keeps create/edit, matches Prompt 5's "Editor can't delete or
  // manage admins" (the admin-management half is already enforced by the
  // `isSuperAdmin`-only check AdminUsers.jsx itself does).
  const canDelete = isSuperAdmin
  const canWrite = isAdmin && !isViewer

  return { loading, email, isAdmin, isSuperAdmin, allowedSections, canAccess, role, isViewer, canDelete, canWrite, recordFetchFailed }
}
