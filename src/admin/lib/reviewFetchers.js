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

const YOUTUBE_SEARCH_QUERY = '#MedWebReview'

// Students are asked to include the hashtag "#MedWebReview" in their video's
// title or description — that's the entire convention this search relies on.
// The YouTube Data API's search endpoint supports CORS, so this is a plain
// fetch(), unlike the Google Reviews call above.
export async function fetchYouTubeReviews() {
  const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY
  if (!apiKey) {
    throw new Error('Missing VITE_YOUTUBE_API_KEY — set it in your .env file.')
  }

  const publishedAfter = new Date(Date.now() - 1000 * 60 * 60 * 24 * 180).toISOString() // last ~6 months
  const params = new URLSearchParams({
    part: 'snippet',
    type: 'video',
    order: 'date',
    maxResults: '25',
    publishedAfter,
    q: YOUTUBE_SEARCH_QUERY,
    key: apiKey,
  })

  const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error('YouTube API request failed: ' + (body?.error?.message || res.statusText))
  }
  const data = await res.json()

  return (data.items || [])
    .filter(item => item.id?.videoId)
    .map(item => {
      const videoId = item.id.videoId
      return {
        source: 'YouTube',
        dedupeKey: `youtube_${videoId}`,
        name: item.snippet.channelTitle,
        text: item.snippet.title,
        stars: 5,
        img: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '',
        category: 'YouTube Review',
        videoId,
        videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
        submittedAt: item.snippet.publishedAt,
      }
    })
}
