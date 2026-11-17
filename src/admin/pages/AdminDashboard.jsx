import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import {
  Users, Video, BookOpen, Award, TrendingUp, UserPlus, CalendarClock, RefreshCw,
  ClipboardCheck, Newspaper, CreditCard, Mail, CalendarPlus, FileText, Download, ScrollText,
} from 'lucide-react'
import StatCard from '../components/StatCard'
import CoverImage from '../../components/CoverImage'
import { useToast } from '../components/Toast'
import useCountUp from '../hooks/useCountUp'
import useAdminBadgeCounts from '../hooks/useAdminBadgeCounts'
import {
  getDashboardStats, studentsDbService, webinarsService, ambassadorsService,
  courseEnrollmentsService, activityLogService, siteDataService,
} from '../../firebase/services'
import { refreshSiteData } from '../../hooks/useSiteData'

const rankColors = { Platinum: '#0369a1', Gold: '#b45309', Silver: '#475569', Bronze: '#9a3412' }
const ACCENTS = [
  { color: '#1655c3', bg: '#eff6ff' },
  { color: '#64ac37', bg: '#f0fdf4' },
  { color: '#7c3aed', bg: '#f5f3ff' },
  { color: '#d97706', bg: '#fffbeb' },
  { color: '#0ea5e9', bg: '#f0f9ff' },
  { color: '#db2777', bg: '#fdf2f8' },
]
const PIE_COLORS = ['#1655c3', '#64ac37', '#7c3aed', '#d97706', '#0ea5e9', '#db2777', '#059669', '#f59e0b']
const RANGE_OPTIONS = [{ label: '30d', days: 30 }, { label: '90d', days: 90 }, { label: '365d', days: 365 }]

function EmptyPanel({ icon: Icon, message }) {
  return (
    <div className="px-5 py-10 flex flex-col items-center gap-2 text-gray-400">
      <div className="w-11 h-11 rounded-2xl bg-gray-50 flex items-center justify-center">
        <Icon size={18} className="text-gray-300" />
      </div>
      <span className="text-sm font-medium text-center">{message}</span>
    </div>
  )
}

function KpiCard({ icon, label, target, sub, trend, accent, i }) {
  const animated = useCountUp(typeof target === 'number' ? target : 0)
  return (
    <div className="animate-card-in" style={{ '--stagger-i': i }}>
      <StatCard icon={icon} label={label} value={typeof target === 'number' ? animated : (target ?? '…')} sub={sub} trend={trend} {...accent} />
    </div>
  )
}

// Buckets a flat list of { date: 'YYYY-MM-DD', ... } rows into day (<=60
// points) or week (otherwise) buckets so the 365-day view doesn't try to
// plot 365 individual points.
function bucketByDay(rows, days) {
  const bucketSize = days > 60 ? 7 : 1
  const buckets = new Map()
  for (const r of rows) {
    if (!r.date) continue
    const d = new Date(r.date)
    if (isNaN(d.getTime())) continue
    if (bucketSize === 7) {
      const weekStart = new Date(d)
      weekStart.setDate(d.getDate() - d.getDay())
      var key = weekStart.toISOString().slice(0, 10)
    } else {
      var key = r.date.slice(0, 10)
    }
    buckets.set(key, (buckets.get(key) || 0) + 1)
  }
  return Array.from(buckets.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count }))
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const toast = useToast()
  const badges = useAdminBadgeCounts()
  const [stats, setStats] = useState(null)
  const [students, setStudents] = useState([])
  const [upcomingWebinars, setUpcomingWebinars] = useState([])
  const [topAmbassadors, setTopAmbassadors] = useState([])
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [rebuilding, setRebuilding] = useState(false)

  const [rangeDays, setRangeDays] = useState(30)
  const [regRows, setRegRows] = useState(null) // null = loading
  const [enrollmentStatus, setEnrollmentStatus] = useState(null)
  const [studentSample, setStudentSample] = useState(null)

  useEffect(() => {
    getDashboardStats().then(s => { setStats(s); setLoading(false) }).catch(() => setLoading(false))
    studentsDbService.listen(r => setStudents(r.slice(0, 5)), 5)
    webinarsService.getUpcoming().then(setUpcomingWebinars).catch(() => setUpcomingWebinars([]))
    ambassadorsService.getTop(5).then(setTopAmbassadors).catch(() => setTopAmbassadors([]))
    const u = activityLogService.listen(setActivity)
    courseEnrollmentsService.getStatusCountsAll().then(setEnrollmentStatus).catch(() => {})
    studentsDbService.getSample(500).then(setStudentSample).catch(() => setStudentSample([]))
    return () => u()
  }, [])

  // Re-fetched only when the time-range toggle changes — a bounded
  // date-range query (webinarsService.getRegistrationsSince), never the
  // whole webinarRegistrations collection.
  useEffect(() => {
    setRegRows(null)
    const since = Date.now() - rangeDays * 24 * 60 * 60 * 1000
    webinarsService.getRegistrationsSince(since).then(rows => {
      setRegRows(rows.map(r => ({ date: (r.registeredAt || r.createdAt?.toDate?.()?.toISOString() || '').slice(0, 10), webinarTopic: r.webinarTopic || 'Unknown' })))
    }).catch(() => setRegRows([]))
  }, [rangeDays])

  const timeSeriesData = useMemo(() => bucketByDay(regRows || [], rangeDays), [regRows, rangeDays])

  const perWebinarData = useMemo(() => {
    if (!regRows) return []
    const counts = new Map()
    for (const r of regRows) counts.set(r.webinarTopic, (counts.get(r.webinarTopic) || 0) + 1)
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([name, count]) => ({ name: name.length > 18 ? name.slice(0, 18) + '…' : name, count }))
  }, [regRows])

  const universityDonutData = useMemo(() => {
    if (!studentSample) return []
    const counts = new Map()
    for (const s of studentSample) {
      const u = s.university?.trim()
      if (!u) continue
      counts.set(u, (counts.get(u) || 0) + 1)
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }))
  }, [studentSample])

  const enrollmentDonutData = enrollmentStatus
    ? [
        { name: 'Approved', value: enrollmentStatus.Approved },
        { name: 'Pending', value: enrollmentStatus.Pending },
        { name: 'Rejected', value: enrollmentStatus.Rejected },
      ].filter(d => d.value > 0)
    : []

  const regTrend = stats && stats.registrationsLastMonth > 0
    ? Math.round(((stats.registrationsThisMonth - stats.registrationsLastMonth) / stats.registrationsLastMonth) * 100)
    : undefined

  const kpis = stats ? [
    { icon: Users, label: 'Total Students', target: stats.totalStudents, sub: `${stats.activeStudents} on file` },
    { icon: TrendingUp, label: 'Registrations This Month', target: stats.registrationsThisMonth, sub: 'vs last 30 days', trend: regTrend },
    { icon: Video, label: 'Upcoming Webinars', target: stats.upcomingWebinars, sub: `${stats.totalWebinars} total` },
    { icon: CreditCard, label: 'Pending Enrollments', target: stats.pendingEnrollments, sub: 'awaiting payment review' },
    { icon: Award, label: 'Certificates Issued', target: stats.validCerts, sub: 'valid on file' },
    { icon: Newspaper, label: 'Published Posts/Events', target: stats.publishedPosts, sub: 'blog + events & news' },
  ] : []

  const handleRebuild = async () => {
    setRebuilding(true)
    try {
      await siteDataService.rebuild()
      await refreshSiteData()
      toast.success('Public cache rebuilt.')
    } catch (e) {
      toast.error('Rebuild failed: ' + e.message)
    } finally {
      setRebuilding(false)
    }
  }

  if (loading) return (
    <div className="p-6 flex items-center justify-center h-64">
      <div className="text-center">
        <div className="w-10 h-10 rounded-xl mx-auto mb-3 animate-pulse bg-[#1655c3]" />
        <p className="text-gray-400 text-sm">Loading live data from Firebase…</p>
      </div>
    </div>
  )

  const needsAttentionTotal = badges.pendingEnrollments + badges.pendingReviews + badges.autoNewsDrafts

  return (
    <div className="p-4 sm:p-6 space-y-6 font-poppins">
      <div className="flex flex-wrap items-center justify-end gap-3 -mb-2">
        <button onClick={handleRebuild} disabled={rebuilding}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-[#1655c3] border border-[#1655c3]/30 hover:bg-blue-50 disabled:opacity-50 transition-colors">
          <RefreshCw size={14} className={rebuilding ? 'animate-spin' : ''} />
          {rebuilding ? 'Rebuilding…' : 'Rebuild public cache'}
        </button>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: 'Schedule Webinar', icon: CalendarPlus, to: '/admin/webinars' },
          { label: 'New Event', icon: Newspaper, to: '/admin/events' },
          { label: 'New Course', icon: BookOpen, to: '/admin/courses' },
          { label: 'Export Students', icon: Download, to: '/admin/students' },
        ].map(a => (
          <button key={a.label} onClick={() => navigate(a.to)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-white hover-lift transition-colors"
            style={{ background: 'linear-gradient(135deg,#1655c3,#64ac37)' }}>
            <a.icon size={13} /> {a.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((k, i) => <KpiCard key={k.label} {...k} accent={ACCENTS[i % ACCENTS.length]} i={i} />)}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-[#1a1a1a] text-sm">Registrations Over Time</h3>
            <div className="flex gap-1">
              {RANGE_OPTIONS.map(r => (
                <button key={r.label} onClick={() => setRangeDays(r.days)}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-colors ${rangeDays === r.days ? 'bg-[#1655c3] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          {regRows === null ? (
            <div className="h-56 flex items-center justify-center text-gray-300 text-sm">Loading…</div>
          ) : timeSeriesData.length === 0 ? (
            <EmptyPanel icon={CalendarClock} message="No registrations in this range yet" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={timeSeriesData}>
                <defs>
                  <linearGradient id="regGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1655c3" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#1655c3" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} />
                <Area type="monotone" dataKey="count" name="Registrations" stroke="#1655c3" strokeWidth={2} fill="url(#regGradient)" isAnimationActive={true} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-bold text-[#1a1a1a] text-sm mb-4">Registrations Per Webinar <span className="text-gray-400 font-normal text-xs">(top 8, selected range)</span></h3>
          {regRows === null ? (
            <div className="h-56 flex items-center justify-center text-gray-300 text-sm">Loading…</div>
          ) : perWebinarData.length === 0 ? (
            <EmptyPanel icon={Video} message="No registrations in this range yet" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={perWebinarData} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} />
                <Bar dataKey="count" name="Registrations" fill="#64ac37" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-bold text-[#1a1a1a] text-sm mb-1">Students by University</h3>
          <p className="text-[11px] text-gray-400 mb-4">Top 8, based on the {studentSample?.length ?? '…'} most recently updated students</p>
          {studentSample === null ? (
            <div className="h-56 flex items-center justify-center text-gray-300 text-sm">Loading…</div>
          ) : universityDonutData.length === 0 ? (
            <EmptyPanel icon={Users} message="No university data on file yet" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={universityDonutData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                  {universityDonutData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-bold text-[#1a1a1a] text-sm mb-4">Enrollment Status <span className="text-gray-400 font-normal text-xs">(all courses)</span></h3>
          {enrollmentStatus === null ? (
            <div className="h-56 flex items-center justify-center text-gray-300 text-sm">Loading…</div>
          ) : enrollmentDonutData.length === 0 ? (
            <EmptyPanel icon={CreditCard} message="No course enrollments yet" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={enrollmentDonutData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                  {enrollmentDonutData.map((d, i) => (
                    <Cell key={i} fill={d.name === 'Approved' ? '#64ac37' : d.name === 'Pending' ? '#d97706' : '#ef4444'} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Needs attention */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-bold text-[#1a1a1a] text-sm">Needs Attention</h3>
          </div>
          {needsAttentionTotal === 0 ? (
            <EmptyPanel icon={ClipboardCheck} message="All caught up — nothing pending." />
          ) : (
            <div className="divide-y divide-gray-50">
              {badges.pendingEnrollments > 0 && (
                <button onClick={() => navigate('/admin/courses')} className="w-full flex items-center justify-between px-5 py-3 hover:bg-amber-50/40 transition-colors text-left">
                  <span className="flex items-center gap-2 text-sm text-gray-700"><CreditCard size={14} className="text-amber-500" /> Pending payments</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">{badges.pendingEnrollments}</span>
                </button>
              )}
              {badges.pendingReviews > 0 && (
                <button onClick={() => navigate('/admin/pendingTestimonials')} className="w-full flex items-center justify-between px-5 py-3 hover:bg-amber-50/40 transition-colors text-left">
                  <span className="flex items-center gap-2 text-sm text-gray-700"><ClipboardCheck size={14} className="text-amber-500" /> Pending reviews</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">{badges.pendingReviews}</span>
                </button>
              )}
              {badges.autoNewsDrafts > 0 && (
                <button onClick={() => navigate('/admin/events')} className="w-full flex items-center justify-between px-5 py-3 hover:bg-amber-50/40 transition-colors text-left">
                  <span className="flex items-center gap-2 text-sm text-gray-700"><Newspaper size={14} className="text-amber-500" /> Auto-news drafts</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">{badges.autoNewsDrafts}</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Recent students */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-[#1a1a1a] text-sm">Recently Active Students</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {students.length === 0 && <EmptyPanel icon={UserPlus} message="No students yet" />}
            {students.map((s, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-black shrink-0 bg-[#1655c3]">{(s.name || s.email)?.charAt(0)?.toUpperCase()}</div>
                <div className="flex-1 min-w-0"><div className="text-sm font-semibold text-[#1a1a1a] truncate">{s.name || s.email}</div><div className="text-[11px] text-gray-400 truncate">{s.email}</div></div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#1655c3]">{(s.registrations || []).length} reg</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-[#1a1a1a] text-sm flex items-center gap-1.5"><ScrollText size={14} /> Recent Activity</h3>
          </div>
          <div className="divide-y divide-gray-50 max-h-[280px] overflow-y-auto">
            {activity.length === 0 && <EmptyPanel icon={ScrollText} message="No activity logged yet" />}
            {activity.slice(0, 8).map((a, i) => (
              <div key={a.id || i} className="px-5 py-2.5">
                <div className="text-xs font-semibold text-[#1a1a1a]">{(a.action || '').replace(/_/g, ' ')}</div>
                <div className="text-[10px] text-gray-400">{a.actorEmail}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upcoming webinars */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-[#1a1a1a] text-sm">Upcoming Webinars</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {upcomingWebinars.length === 0 && <EmptyPanel icon={CalendarClock} message="No upcoming webinars — schedule via the Webinars page" />}
            {upcomingWebinars.slice(0, 4).map((w, i) => (
              <div key={i} className="flex items-start gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-black shrink-0" style={{ background: w.type === 'Free' ? '#64ac37' : '#1655c3' }}>{w.type === 'Free' ? 'F' : 'P'}</div>
                <div className="flex-1 min-w-0"><div className="text-sm font-semibold text-[#1a1a1a] truncate">{w.topic}</div><div className="text-[11px] text-gray-400">{w.speakers?.[0]?.name} · {w.date}</div></div>
                <div className="text-[11px] font-bold text-[#1655c3] whitespace-nowrap">{w.registered || 0} reg.</div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Ambassadors */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-bold text-[#1a1a1a] text-sm">Top Ambassadors</h3></div>
          {topAmbassadors.length === 0 ? <EmptyPanel icon={Mail} message="No ambassadors yet" /> : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="bg-gray-50 border-b border-gray-100">{['Name', 'University', 'Rank', 'Referred'].map(h => <th key={h} className="text-left text-xs text-gray-500 font-semibold px-5 py-2.5">{h}</th>)}</tr></thead>
                <tbody>{topAmbassadors.map((a, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-blue-50/20 transition-colors">
                    <td className="px-5 py-3 text-sm font-semibold text-[#1a1a1a] flex items-center gap-2">{a.imageUrl && <CoverImage src={a.imageUrl} alt={a.name || ''} bias="center 25%" className="w-6 h-6 rounded-full" />}{a.name}</td>
                    <td className="px-5 py-3 text-sm text-gray-500">{a.university}</td>
                    <td className="px-5 py-3"><span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${rankColors[a.rank]}15`, color: rankColors[a.rank] }}>{a.rank}</span></td>
                    <td className="px-5 py-3 text-sm font-bold text-[#1655c3]">{a.students || 0}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
