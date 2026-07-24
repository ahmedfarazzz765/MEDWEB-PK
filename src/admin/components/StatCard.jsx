export default function StatCard({ icon: Icon, label, value, sub, color = '#1655c3', bg = '#eff6ff', trend }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-start gap-4 hover:shadow-md transition-shadow">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: bg }}>
        <Icon size={22} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-gray-500 font-medium mb-1">{label}</div>
        <div className="text-2xl font-black text-[#1a1a1a] leading-none">{value}</div>
        {sub && <div className="text-[11px] text-gray-400 mt-1">{sub}</div>}
      </div>
      {trend !== undefined && (
        <div className={`text-xs font-bold px-2 py-0.5 rounded-full ${trend >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
        </div>
      )}
    </div>
  )
}
