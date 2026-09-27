// Client-side <title>/<meta> updates for a specific page — e.g.
// CertificatePage.jsx setting og:image/title/description to THIS
// certificate's own image and copy instead of the static site-wide
// defaults in index.html.
//
// Important limitation: this only changes what a real browser sees after
// the page's JS has run. index.html is a plain static Vite SPA with no
// server-side rendering or prerendering, and most link-preview crawlers
// (including LinkedIn's) fetch the raw HTML WITHOUT executing JavaScript —
// so this does not reliably change what LinkedIn's own preview shows.
// Genuinely per-certificate LinkedIn previews would need a prerendering
// step or a small server-rendered endpoint for this one route; that's a
// bigger, separate piece of work, not something fixable purely client-side.
// Still worth doing: it's correct for the actual tab title/description a
// visitor sees, and for any crawler that does render JS.
export function setPageMeta({ title, description, image, url }) {
  if (title) document.title = title
  const setMeta = (attr, key, content) => {
    if (!content) return
    let el = document.querySelector(`meta[${attr}="${key}"]`)
    if (!el) {
      el = document.createElement('meta')
      el.setAttribute(attr, key)
      document.head.appendChild(el)
    }
    el.setAttribute('content', content)
  }
  setMeta('name', 'description', description)
  setMeta('property', 'og:title', title)
  setMeta('property', 'og:description', description)
  setMeta('property', 'og:image', image)
  if (url) setMeta('property', 'og:url', url)
}
