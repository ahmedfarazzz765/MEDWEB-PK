import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from '../firebase/config'
import { ambassadorsService } from '../firebase/services'
import { Shield } from 'lucide-react'

// Gates every /admin route behind a real Firebase Auth session. Firestore
// rules already block unauthenticated data access, but the admin UI itself
// shouldn't render for anyone who isn't signed in.
//
// IMPORTANT: adminUsersService's bootstrap rule treats any signed-in user
// with no adminUsers doc as a Super Admin (see the comment above that
// service) — that was safe when the only people who could ever hold a
// Firebase Auth account in this project were admins created directly in the
// Firebase Console. Ambassador Login (AmbassadorAcceptInvite.jsx) now lets a
// much larger, less-trusted group self-serve real Firebase Auth accounts in
// the SAME project, and none of them will ever have an adminUsers doc — so
// without this explicit check, every ambassador who ever logs in and then
// happens to open /admin would silently become a full Super Admin. This
// check must run before the adminUsers bootstrap logic ever gets a chance.
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
