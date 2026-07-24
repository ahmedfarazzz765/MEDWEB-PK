// Minimal pulsing placeholder block, reused to build per-section loading
// skeletons that roughly match each card's real shape (so there's no layout
// jump once real data replaces it).
export default function Skeleton({ className = '', style }) {
  return <div className={`animate-pulse bg-gray-200 rounded-xl ${className}`} style={style} />
}
