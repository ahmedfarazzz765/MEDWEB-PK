import { useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

// Shared continuous-motion wrapper for every carousel on the site. Duplicates
// the item list once so the loop is always seamless regardless of item count
// or width. Two render paths:
//
// - showNav=false (default, unchanged): pure-CSS keyframe animation exactly
//   as before — every existing consumer that hasn't opted into manual
//   controls keeps byte-identical behavior.
// - showNav=true: an interactive, JS (rAF) driven version with the exact
//   same speed/direction/looping math, but pausable/draggable/steppable —
//   needed because you can't cleanly offset a mid-flight CSS keyframe
//   animation for a drag or an arrow click without visible jumps.
export default function InfiniteMarquee({
  items,
  renderItem,
  keyFn,
  direction = 'x',        // 'x' (horizontal) | 'y' (vertical)
  pxPerSecond = 60,       // desktop speed; mobile is faster automatically
  mobileSpeedMultiplier = 1.4,
  gap = 20,
  pauseOnHover = false,
  reverse = false,
  className = '',
  itemClassName = '',
  showNav = false,        // opt-in: prev/next arrows + drag/swipe + pause-resume
}) {
  if (items.length === 0) return null
  return showNav
    ? <InteractiveMarquee {...{ items, renderItem, keyFn, direction, pxPerSecond, mobileSpeedMultiplier, gap, pauseOnHover, reverse, className, itemClassName }} />
    : <StaticMarquee {...{ items, renderItem, keyFn, direction, pxPerSecond, mobileSpeedMultiplier, gap, pauseOnHover, reverse, className, itemClassName }} />
}

function StaticMarquee({ items, renderItem, keyFn, direction, pxPerSecond, mobileSpeedMultiplier, gap, pauseOnHover, reverse, className, itemClassName }) {
  const trackRef = useRef(null)

  useEffect(() => {
    const el = trackRef.current
    if (!el || items.length === 0) return

    const setDuration = () => {
      const total = direction === 'y' ? el.scrollHeight : el.scrollWidth
      const half = total / 2
      const isMobile = window.innerWidth < 640
      const speed = pxPerSecond * (isMobile ? mobileSpeedMultiplier : 1)
      el.style.animationDuration = `${Math.max(half / speed, 3)}s`
    }

    setDuration()
    const ro = new ResizeObserver(setDuration)
    ro.observe(el)
    window.addEventListener('resize', setDuration)
    return () => { ro.disconnect(); window.removeEventListener('resize', setDuration) }
  }, [items.length, direction, pxPerSecond, mobileSpeedMultiplier])

  const loop = [...items, ...items]
  const animClass = direction === 'y' ? 'animate-marquee-up' : 'animate-marquee-x'

  return (
    <div className={`overflow-hidden ${pauseOnHover ? 'marquee-pause-hover' : ''} ${className}`}>
      <div
        ref={trackRef}
        className={`flex ${direction === 'y' ? 'flex-col' : 'flex-row'} ${animClass}`}
        style={{ gap, animationDirection: reverse ? 'reverse' : 'normal' }}
      >
        {loop.map((item, i) => {
          const half = i < items.length ? 'a' : 'b'
          const identity = keyFn ? keyFn(item, i % items.length) : i % items.length
          return (
            <div key={`${half}-${identity}`} className={`flex-shrink-0 ${itemClassName}`}>
              {renderItem(item, i % items.length)}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const IDLE_RESUME_MS = 3500

function InteractiveMarquee({ items, renderItem, keyFn, direction, pxPerSecond, mobileSpeedMultiplier, gap, pauseOnHover, reverse, className, itemClassName }) {
  const containerRef = useRef(null)
  const trackRef = useRef(null)
  const isY = direction === 'y'

  const posRef = useRef(0)       // current translate offset, always in (-half, 0]
  const halfRef = useRef(0)      // half the track's own size (one full item-list pass)
  const stepRef = useRef(240)    // px per arrow click ≈ one item + gap
  const hoveringRef = useRef(false)
  const draggingRef = useRef(false)
  const pointerActiveRef = useRef(false) // true from pointerdown to pointerup/cancel, tap or drag alike
  const idleUntilRef = useRef(0)
  const dragStartRef = useRef({ pos: 0, client: 0 })
  const rafRef = useRef(null)
  const lastTsRef = useRef(null)

  const applyTransform = () => {
    const el = trackRef.current
    if (!el) return
    el.style.transform = isY ? `translateY(${posRef.current}px)` : `translateX(${posRef.current}px)`
  }

  const wrap = () => {
    const half = halfRef.current
    if (half <= 0) return
    if (posRef.current <= -half) posRef.current += half
    if (posRef.current > 0) posRef.current -= half
  }

  // Measure track size → half-loop distance + arrow step, on mount/resize/item-count change
  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    const measure = () => {
      const total = isY ? el.scrollHeight : el.scrollWidth
      halfRef.current = total / 2
      stepRef.current = (total / 2) / Math.max(items.length, 1)
      wrap()
      applyTransform()
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    window.addEventListener('resize', measure)
    return () => { ro.disconnect(); window.removeEventListener('resize', measure) }
  }, [items.length, isY])

  // Main animation loop — auto-advances unless the user is actively
  // interacting (hovering, dragging) or within the post-interaction cooldown.
  useEffect(() => {
    const dirMul = reverse ? 1 : -1
    const tick = ts => {
      if (lastTsRef.current == null) lastTsRef.current = ts
      const dt = (ts - lastTsRef.current) / 1000
      lastTsRef.current = ts

      // pointerActiveRef freezes the track for the whole press, not just
      // confirmed drags — touch devices never fire hover, so without this a
      // tap's target keeps sliding under the finger and never reads as
      // "stable", same failure mode a moving hover-pause was meant to avoid.
      const interacting = draggingRef.current || pointerActiveRef.current || (pauseOnHover && hoveringRef.current) || Date.now() < idleUntilRef.current
      if (!interacting) {
        const isMobile = window.innerWidth < 640
        const speed = pxPerSecond * (isMobile ? mobileSpeedMultiplier : 1)
        posRef.current += dirMul * speed * dt
        wrap()
        applyTransform()
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [reverse, pxPerSecond, mobileSpeedMultiplier, pauseOnHover])

  const scheduleResume = () => { idleUntilRef.current = Date.now() + IDLE_RESUME_MS }

  const handleArrow = dir => {
    // dir: -1 = prev, +1 = next. "Prev" always moves content the opposite
    // way to "next", independent of the reverse/auto-scroll direction.
    posRef.current += dir * stepRef.current * -1
    wrap()
    applyTransform()
    scheduleResume()
  }

  // Below this many px of pointer travel, a press+release is treated as a
  // tap/click rather than a drag. Without this, setPointerCapture fired on
  // every pointerdown — including on buttons nested in a card (e.g. "Watch
  // Now") — which hijacks the pointer and makes the browser suppress the
  // synthetic click, even for a stationary press. See bug: nested-button
  // clicks going dead inside interactive carousels.
  const DRAG_THRESHOLD = 6

  const onPointerDown = e => {
    pointerActiveRef.current = true
    const client = isY ? e.clientY : e.clientX
    dragStartRef.current = { pos: posRef.current, client, pointerId: e.pointerId, target: e.currentTarget }
  }
  const onPointerMove = e => {
    if (!dragStartRef.current.target) return
    const client = isY ? e.clientY : e.clientX
    const delta = client - dragStartRef.current.client
    if (!draggingRef.current) {
      if (Math.abs(delta) < DRAG_THRESHOLD) return
      draggingRef.current = true
      dragStartRef.current.target.setPointerCapture?.(dragStartRef.current.pointerId)
    }
    posRef.current = dragStartRef.current.pos + delta
    wrap()
    applyTransform()
  }
  const endDrag = () => {
    pointerActiveRef.current = false
    dragStartRef.current = { pos: 0, client: 0 }
    if (!draggingRef.current) return
    draggingRef.current = false
    scheduleResume()
  }

  const loop = [...items, ...items]
  const arrowBtnCls = 'w-9 h-9 rounded-full bg-white shadow-md border border-gray-100 flex items-center justify-center text-gray-500 hover:text-[#1655c3] hover:shadow-lg transition-all active:scale-90'

  return (
    <div
      ref={containerRef}
      className={`relative group ${className}`}
      onMouseEnter={() => { hoveringRef.current = true }}
      onMouseLeave={() => { hoveringRef.current = false; scheduleResume() }}
    >
      <div className="overflow-hidden">
        <div
          ref={trackRef}
          className={`flex ${isY ? 'flex-col' : 'flex-row'} cursor-grab active:cursor-grabbing touch-pan-y`}
          style={{ gap }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          {loop.map((item, i) => {
            const half = i < items.length ? 'a' : 'b'
            const identity = keyFn ? keyFn(item, i % items.length) : i % items.length
            return (
              <div key={`${half}-${identity}`} className={`flex-shrink-0 ${itemClassName}`} style={{ pointerEvents: 'auto' }}>
                {renderItem(item, i % items.length)}
              </div>
            )
          })}
        </div>
      </div>

      {!isY && (
        <>
          <button
            aria-label="Previous"
            onClick={() => handleArrow(-1)}
            className={`${arrowBtnCls} absolute left-1 sm:-left-4 top-1/2 -translate-y-1/2 z-10 opacity-80 sm:opacity-0 sm:group-hover:opacity-100`}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            aria-label="Next"
            onClick={() => handleArrow(1)}
            className={`${arrowBtnCls} absolute right-1 sm:-right-4 top-1/2 -translate-y-1/2 z-10 opacity-80 sm:opacity-0 sm:group-hover:opacity-100`}
          >
            <ChevronRight size={18} />
          </button>
        </>
      )}
    </div>
  )
}
