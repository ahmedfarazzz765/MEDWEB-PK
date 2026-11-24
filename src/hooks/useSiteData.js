import { useEffect, useState } from 'react'
import { siteDataService } from '../firebase/services'

// Shared client for public/siteData (see rebuildSiteData() in services.js).
// One fetch per session: every component calling useSiteData() shares the
// same in-memory cache and the same in-flight request (no duplicate reads
// just because five sections mounted at once), and that result is also
// kept in localStorage for 30 minutes so a repeat visit/reload in the same
// browser doesn't cost a read at all until the cache goes stale.
const CACHE_KEY = 'medweb_siteData_v2'
const TTL_MS = 30 * 60 * 1000

const EMPTY = {
  courses: [], webinars: [], blogs: [], announcements: [], site: {},
  ambassadors: [], testimonials: [], team: [], teamCategories: [], advisory: [],
  blogCategories: [], sectionVisibility: {}, news: [],
}

let memoryCache = null       // { data, updatedAt, fetchedAt }
let inflightPromise = null   // dedupes concurrent fetchSiteData() calls
const listeners = new Set()  // every mounted useSiteData() hook, notified on refresh

function readLocalStorage() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CACHE_KEY))
    if (!parsed?.data || !parsed?.fetchedAt) return null
    if (Date.now() - parsed.fetchedAt > TTL_MS) return null
    return parsed
  } catch {
    return null
  }
}

function writeLocalStorage(entry) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(entry)) } catch {}
}

function notifyListeners() {
  for (const fn of listeners) fn(memoryCache?.data || null)
}

async function fetchSiteData({ force = false } = {}) {
  if (!force && memoryCache && Date.now() - memoryCache.fetchedAt < TTL_MS) return memoryCache.data
  if (!force) {
    const fromLocal = readLocalStorage()
    if (fromLocal) {
      memoryCache = fromLocal
      return fromLocal.data
    }
  }
  if (inflightPromise) return inflightPromise
  inflightPromise = siteDataService.get()
    .then(data => {
      const entry = { data: data || EMPTY, updatedAt: data?.updatedAt || null, fetchedAt: Date.now() }
      // `updatedAt` doubles as a version key — if a forced refresh comes
      // back with the same updatedAt as what's already cached, nothing
      // actually changed server-side, so we just extend the cache window
      // instead of forcing every mounted component to re-render.
      if (force && memoryCache && entry.updatedAt && entry.updatedAt === memoryCache.updatedAt) {
        memoryCache = { ...memoryCache, fetchedAt: Date.now() }
      } else {
        memoryCache = entry
      }
      writeLocalStorage(memoryCache)
      notifyListeners()
      return memoryCache.data
    })
    .finally(() => { inflightPromise = null })
  return inflightPromise
}

export function useSiteData() {
  const [data, setData] = useState(memoryCache?.data || null)
  const [loading, setLoading] = useState(!memoryCache?.data)

  useEffect(() => {
    let alive = true
    listeners.add(setData)
    if (memoryCache?.data) {
      setLoading(false)
    } else {
      fetchSiteData().then(d => { if (alive) { setData(d); setLoading(false) } })
    }
    return () => { alive = false; listeners.delete(setData) }
  }, [])

  const d = data || EMPTY
  return {
    courses: d.courses || [], webinars: d.webinars || [], blogs: d.blogs || [], announcements: d.announcements || [], site: d.site || {},
    ambassadors: d.ambassadors || [], testimonials: d.testimonials || [], team: d.team || [], teamCategories: d.teamCategories || [],
    advisory: d.advisory || [], blogCategories: d.blogCategories || [], sectionVisibility: d.sectionVisibility || {}, news: d.news || [],
    loading,
  }
}

// Bypasses both caches and re-notifies every mounted useSiteData() — call
// after the admin's "Rebuild public cache" button, or anywhere a caller
// explicitly needs the very latest data in THIS tab without waiting for the
// 30-minute TTL.
export function refreshSiteData() {
  return fetchSiteData({ force: true })
}
