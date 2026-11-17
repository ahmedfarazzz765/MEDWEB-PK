// ── MEDWEB Firebase Configuration ────────────────────────────────────────────
// Values are read from environment variables (see .env / .env.local at the
// project root). Firebase's client-side web config (apiKey, authDomain, etc.)
// is not a secret — it's meant to ship inside the app's JS bundle. Real
// security comes from Firestore security rules and Firebase Auth, not from
// hiding this config. It's still kept in .env (and .gitignored) for the
// usual reasons: easy per-environment swapping, no hardcoded values in source.

import { initializeApp } from 'firebase/app'
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
} from 'firebase/firestore'
import { getAuth }        from 'firebase/auth'
import { getFunctions }   from 'firebase/functions'
import { getAnalytics, isSupported } from 'firebase/analytics'

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:      import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

if (!firebaseConfig.apiKey) {
  console.warn(
    '⚠️ MEDWEB Notice: VITE_FIREBASE_API_KEY environment variable is missing in build environment. ' +
    'Please set VITE_FIREBASE_API_KEY in your GitHub Secrets.'
  )
}

const app = initializeApp({
  ...firebaseConfig,
  apiKey: firebaseConfig.apiKey || 'placeholder-api-key',
})

// Persistent (IndexedDB) local cache, shared across tabs — a repeat
// getDoc() for something already cached (e.g. public/siteData, or any admin
// doc read twice in a session) can be served from disk instead of a fresh
// network read in some cases, and keeps multiple open tabs from each
// building their own separate in-memory cache from scratch.
//
// ignoreUndefinedProperties: a safety net, not the fix — setDoc()/
// updateDoc() otherwise reject the ENTIRE write the moment any field,
// anywhere (including nested in an array/object), is `undefined`.
// rebuildSiteData() already deep-cleans its own payload explicitly before
// writing (see deepCleanForFirestore in services.js); this just means any
// OTHER write in the app with a stray undefined field quietly drops that
// field instead of failing outright.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  ignoreUndefinedProperties: true,
})
export const auth      = getAuth(app)
export const functions = getFunctions(app)

export let analytics = null
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app)
    }
  }).catch(() => {})
}

export default app
