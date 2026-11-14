import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from '../firebase/config'
import { ambassadorsService, adminUsersService } from '../firebase/services'
import { SUPER_ADMINS } from '../constants/superAdmins'
import { Shield } from 'lucide-react'

// Gates every /admin route behind a real Firebase Auth session AND real
// admin status. Firestore rules already block unauthenticated/non-admin
// data access (see docs/firestore.rules.proposed), but the admin UI
// itself shouldn't even render for anyone who isn't signed in — or,
// since Round 13, for anyone signed in who isn't actually an admin
// either (see below).
//
// SECURITY FIX (Round 13): "signed in, no adminUsers doc = Super Admin"
// is gone — that bootstrap was safe only while the sole people who could
// ever hold a Firebase Auth account in this project were admins created
// directly in the Firebase Console. Ambassador Login
// (AmbassadorAcceptInvite.jsx) now lets a much larger, less-trusted
// group self-serve real Firebase Auth accounts in the SAME project, and
// none of them will ever have an adminUsers doc — so without an explicit
// check, every ambassador (or, before this fix, literally anyone who
// ever created ANY Firebase Auth account here) who opened /admin would
// silently get full access. Checked in this exact order: ambassador
// first (clearest, most likely real-world case), then real admin status
// (Super Admin by hardcoded email, or a genuine adminUsers doc) — anyone
// failing both is signed out and sent to /admin/login, same as before.
export default function RequireAuth({ children }) {
  const [checking, setChecking] = useState(true)
  const [user, setUser] = useState(null)
  const [isAmbassador, setIsAmbassador] = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async u => {
      if (!u) { setUser(null); setChecking(false); return }
      try {
        const ambassador = await ambassadorsService.getByAuthUid(u.uid)
        if (ambassador) {
          // Never let an ambassador account fall through to the admin
          // Super Admin bootstrap — end their admin-side session outright.
          await signOut(auth)
          setIsAmbassador(true)
          setUser(null)
          return
        }
        const email = (u.email || '').toLowerCase()
        const isAdmin = SUPER_ADMINS.includes(email) || !!(await adminUsersService.getByEmail(email))
        if (!isAdmin) {
          await signOut(auth)
          setUser(null)
        } else {
          setUser(u)
        }
      } catch {
        setUser(u) // Firestore lookup failure shouldn't lock out real admins
      } finally {
        setChecking(false)
      }
    })
    return unsub
  }, [])

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0faff]">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#1655c3] flex items-center justify-center mx-auto mb-3 animate-pulse">
            <Shield size={22} className="text-white" />
          </div>
          <p className="text-gray-400 text-sm">Checking session…</p>
        </div>
      </div>
    )
  }

  if (isAmbassador) return <Navigate to="/ambassador/login" replace />
  if (!user) return <Navigate to="/admin/login" replace />

  return children
}
