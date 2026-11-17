// Glass summary card (Round 15) — used on the Dashboard and anywhere else
// a page shows top-line KPI numbers. `trend` renders BELOW the value, not
// beside it: undefined -> no chip at all, 0 or NaN -> a neutral grey "—"
// (never a misleading "+100%" off a zero baseline), otherwise a green ▲ /
// red ▼ chip. `sparkline` (optional array of numbers) draws a tiny trend
// line under the trend chip.
export default function StatCard({ icon: Icon, label, value, sub, color = '#1655c3', bg = '#eff6ff', trend, sparkline }) {
  const hasTrend = trend !== undefined
  const trendIsNeutral = hasTrend && (trend === null || !isFinite(trend))
  return (
    <div className="group glass-card p-5 flex flex-col gap-3 h-full hover-lift">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105" style={{ background: bg }}>
          <Icon size={22} style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-white/60 font-medium mb-1 truncate">{label}</div>
          <div className="text-[28px] font-black text-white leading-none">{value}</div>
          {sub && <div className="text-[11px] text-white/50 mt-1 truncate">{sub}</div>}
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 mt-auto">
        {hasTrend ? (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            trendIsNeutral ? 'bg-white/10 text-white/50' : trend >= 0 ? 'bg-[#64ac37]/20 text-[#95d348]' : 'bg-red-500/20 text-red-300'
          }`}>
            {trendIsNeutral ? '—' : trend >= 0 ? `▲ ${trend}%` : `▼ ${Math.abs(trend)}%`}
          </span>
        ) : <span />}
        {Array.isArray(sparkline) && sparkline.length > 1 && <Sparkline data={sparkline} color={color} />}
      </div>
    </div>
  )
}

function Sparkline({ data, color }) {
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const w = 64, h = 20
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ')
  return (
    <svg width={w} height={h} className="shrink-0 opacity-80">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
