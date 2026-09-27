import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase/config'
import { ambassadorsService } from '../firebase/services'

// Shared by every /ambassador/* page (Dashboard, ComingSoonPage) so the
// signed-in ambassador's own doc isn't re-fetched with slightly different
// logic in each one. RequireAmbassadorAuth.jsx already guarantees a match
// exists before any of these pages render, but each page still resolves
// its own copy — same pattern admin pages use with useAdminPermissions.
export default function useAmbassador() {
  const [ambassador, setAmbassador] = useState(undefined) // undefined = loading, null = signed out

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      if (!user) { setAmbassador(null); return }
      const a = await ambassadorsService.getByAuthUid(user.uid).catch(() => null)
      setAmbassador(a)
    })
    return unsub
  }, [])

  return ambassador
}
