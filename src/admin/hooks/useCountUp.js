import { useEffect, useRef, useState } from 'react'

const prefersReducedMotion = () => {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches } catch { return false }
}

// Animates a number from 0 (or its previous value) up to `target` over
// `duration`ms. Skips straight to the final value when the browser/user
// has asked for reduced motion, or when `target` isn't a finite number yet
// (still loading).
export default function useCountUp(target, duration = 800) {
  const [value, setValue] = useState(0)
  const frameRef = useRef(null)

  useEffect(() => {
    if (typeof target !== 'number' || !isFinite(target)) return
    if (prefersReducedMotion()) { setValue(target); return }
    const start = performance.now()
    const from = 0
    const tick = now => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3) // ease-out cubic
      setValue(Math.round(from + (target - from) * eased))
      if (t < 1) frameRef.current = requestAnimationFrame(tick)
    }
    frameRef.current = requestAnimationFrame(tick)
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current) }
  }, [target, duration])

  return value
}
