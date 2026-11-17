// KPI summary card (Round 16, matches docs/design/admin-{light,dark}.png) —
// icon chip + label on one row, big value with a sparkline beside it, then
// a trend row ("↑ 12.6% vs last 30D"). `trend` undefined -> no trend row at
// all; null/NaN -> neutral grey "—" (never a misleading "+100%" off a zero
// baseline); otherwise a green ↑ / red ↓ reading.
export default function StatCard({ icon: Icon, label, value, sub, color = '#1655c3', bg = '#eff6ff', trend, sparkline }) {
  const hasTrend = trend !== undefined
  const trendIsNeutral = hasTrend && (trend === null || !isFinite(trend))
  return (
    <div className="group admin-card p-5 flex flex-col gap-3 h-full hover-lift">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105" style={{ background: bg }}>
          <Icon size={19} style={{ color }} />
        </div>
        <div className="text-sm font-semibold admin-text-secondary truncate">{label}</div>
      </div>
      <div className="flex items-end justify-between gap-2">
        <div className="text-[30px] font-extrabold admin-text leading-none">{value}</div>
        {Array.isArray(sparkline) && sparkline.length > 1 && <Sparkline data={sparkline} color={color} />}
      </div>
      {hasTrend ? (
        <div className="flex items-center gap-1.5 text-xs font-bold">
          {trendIsNeutral ? (
            <span className="admin-text-secondary font-semibold">—</span>
          ) : (
            <span className={trend >= 0 ? 'text-[#64AC37]' : 'text-red-500'}>{trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%</span>
          )}
          <span className="admin-text-secondary font-medium">vs last 30D</span>
        </div>
      ) : sub ? (
        <div className="text-[11px] admin-text-secondary truncate">{sub}</div>
      ) : null}
    </div>
  )
}

function Sparkline({ data, color }) {
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const w = 64, h = 24
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ')
  return (
    <svg width={w} height={h} className="shrink-0 opacity-90">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
