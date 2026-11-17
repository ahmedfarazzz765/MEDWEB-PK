import { useEffect, useState } from 'react'
import { courseEnrollmentsService, pendingTestimonialsService, newsService } from '../../firebase/services'

const REFRESH_MS = 60_000

// Small counts for the sidebar's per-item badges — each is a single cheap
// getCountFromServer() aggregate query, not a collection download, and
// they're only ever refetched on a slow interval (not live listeners),
// since "is there a 3 or a 4 next to Courses" doesn't need to update the
// instant an admin somewhere else approves one.
export default function useAdminBadgeCounts() {
  const [counts, setCounts] = useState({ pendingEnrollments: 0, pendingReviews: 0, autoNewsDrafts: 0 })

  useEffect(() => {
    let cancelled = false
    const refresh = () => {
      Promise.all([
        courseEnrollmentsService.getPendingCountAll().catch(() => 0),
        pendingTestimonialsService.getPendingCount().catch(() => 0),
        newsService.getAutoDraftCount().catch(() => 0),
      ]).then(([pendingEnrollments, pendingReviews, autoNewsDrafts]) => {
        if (!cancelled) setCounts({ pendingEnrollments, pendingReviews, autoNewsDrafts })
      })
    }
    refresh()
    const id = setInterval(refresh, REFRESH_MS)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  return counts
}
