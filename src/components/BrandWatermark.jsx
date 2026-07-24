import logo from '../assets/medweb.png'

// Deterministic pseudo-random generator (same seed always produces the same
// scatter) so each section's watermark layout is stable across re-renders
// instead of jumping around, while still differing section-to-section.
function seededRandom(seed) {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

// Scatters a handful of very-low-opacity, variously-sized and -rotated logo
// instances across the nearest positioned ancestor — a subtle brand texture
// for otherwise-plain background space, deliberately irregular (not a tiled/
// repeating pattern) so it reads as texture rather than wallpaper. Purely
// decorative: aria-hidden and pointer-events-none, sits behind real content.
export default function BrandWatermark({ seed = 1, count = 5 }) {
  const rand = seededRandom(seed)
  const items = Array.from({ length: count }, () => ({
    top: 2 + rand() * 88,
    left: 2 + rand() * 88,
    size: 70 + rand() * 110,
    rotate: -35 + rand() * 70,
  }))

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden="true">
      {items.map((it, i) => (
        <img
          key={i}
          src={logo}
          alt=""
          className="absolute object-contain opacity-[0.04]"
          style={{
            top: `${it.top}%`,
            left: `${it.left}%`,
            width: it.size,
            height: it.size,
            transform: `rotate(${it.rotate}deg)`,
          }}
        />
      ))}
    </div>
  )
}
