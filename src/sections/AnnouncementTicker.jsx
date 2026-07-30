import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Megaphone, ExternalLink } from 'lucide-react'
import { announcementsService } from '../firebase/services'
import { isAnnouncementActive } from '../lib/announcements'
import InfiniteMarquee from '../components/InfiniteMarquee'

// Slim, unobtrusive replacement for the old large banner card — a
// continuously-scrolling text ticker of active announcement titles, sat
// just under the Navbar. Reuses the same InfiniteMarquee mechanism as
// every other carousel on the site (seamless CSS-driven loop,
// pause-on-hover built in) instead of a bespoke scroll implementation.
export default function AnnouncementTicker() {
  const [items, setItems] = useState(null) // null = loading
  const navigate = useNavigate()

  useEffect(() => {
    const unsub = announcementsService.listen(rows => {
      setItems(rows.filter(isAnnouncementActive))
    })
    return unsub
  }, [])

  if (!items || items.length === 0) return null

  const handleActivate = a => {
    if (a.linkType === 'external' && a.externalUrl) {
      window.open(a.externalUrl, '_blank', 'noopener,noreferrer')
    } else if (a.slug) {
      navigate(`/announcements/${a.slug}`)
    }
  }

  return (
    <div
      className="relative z-10 flex items-stretch overflow-hidden"
      style={{ background: 'linear-gradient(90deg, #0c1f45, #1655c3)' }}
    >
      {/* Static label — anchors the strip, doesn't scroll */}
      <div className="hidden sm:flex items-center gap-1.5 pl-4 pr-3 py-2 shrink-0 bg-black/15">
        <Megaphone size={13} className="text-[#7ee08a] shrink-0" />
        <span className="text-[11px] font-black uppercase tracking-wider text-white whitespace-nowrap">Announcements</span>
      </div>

      <InfiniteMarquee
        items={items}
        pauseOnHover
        gap={0}
        pxPerSecond={45}
        className="flex-1 min-w-0 py-2"
        itemClassName=""
        keyFn={(a, i) => a.id || i}
        renderItem={a => (
          <button
            onClick={() => handleActivate(a)}
            className="flex items-center gap-2 text-xs sm:text-[13px] font-semibold text-white/95 hover:text-white whitespace-nowrap px-4 transition-colors"
          >
            {a.title}
            {a.linkType === 'external' && <ExternalLink size={11} className="opacity-70" />}
            <span className="text-[#7ee08a] ml-2" aria-hidden="true">•</span>
          </button>
        )}
      />
    </div>
  )
}
