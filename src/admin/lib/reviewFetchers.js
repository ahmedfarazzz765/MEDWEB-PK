// Fetcher for the YouTube auto-fetch testimonial source. Returns arrays of
// "pending testimonial" objects ready to be deduped and passed to
// pendingTestimonialsService.add().
//
// (Google Reviews used to be auto-fetched here via the Maps JavaScript API,
// but that required an API key + Place ID and only ever returned up to 5
// reviews. It's been replaced by a manual "Add Google Review" form in
// AdminPendingTestimonials.jsx that publishes straight to testimonialsService
// — the admin is copy-pasting an already-vetted review themselves, so there's
// no need for an API integration or a Pending step for it anymore.)

// MEDWEB's own YouTube channel (@medwebpk) — verified live via the Data API:
// channel snippet.customUrl === "@medwebpk" and its description matches the
// site. Hardcoded rather than an env var/setting because it essentially
// never changes; if the channel is ever recreated, update this one constant.
//   Channel ID:          UCQ59LSip4_ScVonRPKY08kw
//   Uploads playlist ID: UUQ59LSip4_ScVonRPKY08kw  (YouTube's fixed "UC"→"UU"
//     convention for a channel's own uploads playlist — no extra API call
//     needed to look it up).
const UPLOADS_PLAYLIST_ID = 'UUQ59LSip4_ScVonRPKY08kw'

// Safety cap on how many playlistItems pages we'll walk to enumerate the
// channel's videos (250 videos) — the channel currently has 52, this just
// guards against unbounded pagination if it grows a lot.
const MAX_VIDEO_PAGES = 5

function isLowValueComment(text) {
  const t = text.trim()
  if (t.length < 10) return true
  // A comment that is ENTIRELY a question ("Link?", "When it start?") has no
  // statement content worth queuing. A question mark anywhere in a longer
  // comment ("Loved this, when's the next one?") is left alone — only skip
  // when the whole thing is just the question.
  if (t.endsWith('?') && !/[.!]/.test(t.slice(0, -1))) return true
  return false
}

async function listChannelVideoIds(apiKey) {
  const ids = []
  let pageToken
  for (let page = 0; page < MAX_VIDEO_PAGES; page++) {
    const params = new URLSearchParams({
      part: 'snippet',
      playlistId: UPLOADS_PLAYLIST_ID,
      maxResults: '50',
      key: apiKey,
      ...(pageToken ? { pageToken } : {}),
    })
    const res = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?${params}`)
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error('YouTube playlistItems request failed: ' + (body?.error?.message || res.statusText))
    }
    const data = await res.json()
    for (const item of data.items || []) {
      const videoId = item.snippet?.resourceId?.videoId
      if (videoId) ids.push(videoId)
    }
    if (!data.nextPageToken) break
    pageToken = data.nextPageToken
  }
  return ids
}

// Pulls only the newest page (up to 100) of top-level comments per video,
// newest-first, stopping as soon as a comment older than `cutoff` is seen —
// this bounds it to one commentThreads.list call per video per run (cheap:
// 1 quota unit each) instead of deep-paginating every video's full comment
// history on every click of "Fetch New Reviews".
async function fetchVideoComments(apiKey, videoId, cutoff) {
  const params = new URLSearchParams({
    part: 'snippet',
    videoId,
    order: 'time',
    maxResults: '100',
    textFormat: 'plainText',
    key: apiKey,
  })
  const res = await fetch(`https://www.googleapis.com/youtube/v3/commentThreads?${params}`)
  if (!res.ok) {
    // Comments disabled on this video (403 commentsDisabled) or similar —
    // not a real failure, just nothing to collect from this one video.
    return []
  }
  const data = await res.json()
  const out = []
  for (const thread of data.items || []) {
    const c = thread.snippet?.topLevelComment?.snippet
    if (!c) continue
    const publishedAt = c.publishedAt
    if (cutoff && new Date(publishedAt) <= cutoff) break // newest-first — nothing after this is new either
    const text = (c.textDisplay || '').trim()
    if (!text || isLowValueComment(text)) continue
    const commentId = thread.snippet.topLevelComment.id
    out.push({
      source: 'YouTube Comment',
      dedupeKey: `youtube_comment_${commentId}`,
      name: c.authorDisplayName || 'YouTube User',
      text,
      stars: 5,
      img: c.authorProfileImageUrl || '',
      category: 'YouTube Comment',
      videoId,
      videoUrl: `https://www.youtube.com/watch?v=${videoId}&lc=${commentId}`,
      submittedAt: publishedAt,
    })
  }
  return out
}

// `lastFetchedAt` — a Firestore Timestamp, ISO string, Date, or null/undefined
// for a first-ever run — bounds how far back we look, so a repeat fetch only
// walks comments newer than the previous successful run.
export async function fetchYouTubeReviews(lastFetchedAt) {
  const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY
  if (!apiKey) {
    throw new Error('Missing VITE_YOUTUBE_API_KEY — set it in your .env file.')
  }

  const cutoff = lastFetchedAt?.toDate ? lastFetchedAt.toDate()
    : lastFetchedAt ? new Date(lastFetchedAt)
    : null

  const videoIds = await listChannelVideoIds(apiKey)

  const results = []
  for (const videoId of videoIds) {
    try {
      const comments = await fetchVideoComments(apiKey, videoId, cutoff)
      results.push(...comments)
    } catch {
      // one video's comments failing shouldn't abort the whole fetch
    }
  }
  return results
}
