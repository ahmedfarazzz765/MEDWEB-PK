import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase/config'
import { Shield } from 'lucide-react'

// Gates every /admin route behind a real Firebase Auth session. Firestore
// rules already block unauthenticated data access, but the admin UI itself
// shouldn't render for anyone who isn't signed in.
export default function RequireAuth({ children }) {
  const [checking, setChecking] = useState(true)
  const [user, setUser] = useState(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u)
      setChecking(false)
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

  if (!user) return <Navigate to="/admin/login" replace />

  return children
}
