import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase/config'
import { ambassadorsService } from '../firebase/services'
import { Megaphone } from 'lucide-react'

// Gates /ambassador/dashboard. Mirrors admin/RequireAuth.jsx's shape, but
// checks the signed-in Firebase user's UID against an `ambassadors` doc
// (via `authUid`) instead of an `adminUsers` doc — an ambassador account and
// an admin account share the same Firebase Auth project, so being signed in
// at all is not enough; this doc match is what actually proves "this is an
// ambassador, and specifically THIS ambassador's data."
export default function RequireAmbassadorAuth({ children }) {
  const [checking, setChecking] = useState(true)
  const [ambassador, setAmbassador] = useState(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      if (!user) { setAmbassador(null); setChecking(false); return }
      try {
        const a = await ambassadorsService.getByAuthUid(user.uid)
        setAmbassador(a)
      } catch {
        setAmbassador(null)
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
            <Megaphone size={22} className="text-white" />
          </div>
          <p className="text-gray-400 text-sm">Checking session…</p>
        </div>
      </div>
    )
  }

  if (!ambassador) return <Navigate to="/ambassador/login" replace />

  return children
}
