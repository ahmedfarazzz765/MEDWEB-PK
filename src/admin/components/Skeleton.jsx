// Shimmering placeholder blocks — used anywhere a page/section is still
// loading instead of rendering nothing (Round 15 D2: "never a blank
// page"). `className` sets size/shape; the shimmer itself is a single
// shared animation so every skeleton across the app pulses in sync.
export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-white/10 rounded-xl ${className}`} />
}

// A generic full-page skeleton: a header bar, a KPI-like row, and a big
// content block — reasonable default for any admin page that doesn't have
// a more specific skeleton of its own yet.
export default function PageSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
      </div>
      <Skeleton className="h-64" />
    </div>
  )
}
