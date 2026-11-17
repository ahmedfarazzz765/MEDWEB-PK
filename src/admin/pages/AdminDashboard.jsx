import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import {
  Users, Video, BookOpen, Award, TrendingUp, UserPlus, CalendarClock, RefreshCw,
  ClipboardCheck, Newspaper, CreditCard, Mail, CalendarPlus, Download, ScrollText,
} from 'lucide-react'
import StatCard from '../components/StatCard'
import CoverImage from '../../components/CoverImage'
import { Skeleton } from '../components/Skeleton'
import { useToast } from '../components/Toast'
import useCountUp from '../hooks/useCountUp'
import useAdminPermissions from '../hooks/useAdminPermissions'
import useAdminBadgeCounts from '../hooks/useAdminBadgeCounts'
import {
  getDashboardStats, studentsDbService, webinarsService, ambassadorsService,
  courseEnrollmentsService, activityLogService, siteDataService, toIsoString,
} from '../../firebase/services'
import { refreshSiteData } from '../../hooks/useSiteData'

const rankColors = { Platinum: '#7dd3fc', Gold: '#fbbf24', Silver: '#cbd5e1', Bronze: '#fb923c' }
const ACCENTS = [
  { color: '#60a5fa', bg: 'rgba(96,165,250,0.15)' },
  { color: '#95d348', bg: 'rgba(149,211,72,0.15)' },
  { color: '#c084fc', bg: 'rgba(192,132,252,0.15)' },
  { color: '#fbbf24', bg: 'rgba(251,191,36,0.15)' },
  { color: '#22d3ee', bg: 'rgba(34,211,238,0.15)' },
  { color: '#f472b6', bg: 'rgba(244,114,182,0.15)' },
]
const PIE_COLORS = ['#60a5fa', '#95d348', '#c084fc', '#fbbf24', '#22d3ee', '#f472b6', '#34d399', '#fb923c']
const RANGE_OPTIONS = [{ label: '7D', days: 7 }, { label: '30D', days: 30 }, { label: '90D', days: 90 }, { label: '1Y', days: 365 }]
const CHART_AXIS = { fontSize: 10, fill: 'rgba(255,255,255,0.55)' }
const CHART_TOOLTIP_STYLE = { background: 'rgba(15,35,71,0.95)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, fontSize: 12, color: '#fff' }

function EmptyPanel({ icon: Icon, message }) {
  return (
    <div className="px-5 py-10 flex flex-col items-center gap-2 text-white/40">
      <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center">
        <Icon size={18} className="text-white/30" />
      </div>
      <span className="text-sm font-medium text-center">{message}</span>
    </div>
  )
}

function KpiCard({ icon, label, target, sub, trend, sparkline, accent, i }) {
  const animated = useCountUp(typeof target === 'number' ? target : 0)
  return (
    <div className="animate-card-in h-full" style={{ '--stagger-i': i }}>
      <StatCard icon={icon} label={label} value={typeof target === 'number' ? animated : (target ?? '…')} sub={sub} trend={trend} sparkline={sparkline} {...accent} />
    </div>
  )
}

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

// Buckets a flat list of { date: 'YYYY-MM-DD' } rows into day (<=60 points)
// or week buckets, filling in zero-count gaps so the line doesn't skip days
// with no registrations at all — an empty day is real data, not missing data.
function bucketByDay(rows, days) {
  const bucketSize = days > 60 ? 7 : 1
  const counts = new Map()
  for (const r of rows) {
    if (!r.date) continue
    const d = new Date(r.date)
    if (isNaN(d.getTime())) continue
    let key
    if (bucketSize === 7) {
      const weekStart = new Date(d)
      weekStart.setDate(d.getDate() - d.getDay())
      key = weekStart.toISOString().slice(0, 10)
    } else {
      key = r.date.slice(0, 10)
    }
    counts.set(key, (counts.get(key) || 0) + 1)
  }
  // Fill the full range so recent zero-activity days render as 0, not a gap.
  const out = []
  const stepMs = bucketSize * 24 * 60 * 60 * 1000
  const totalBuckets = Math.ceil(days / bucketSize)
  const now = new Date()
  for (let i = totalBuckets - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * stepMs)
    const key = d.toISOString().slice(0, 10)
    out.push({ date: key, count: counts.get(key) || 0 })
  }
  return out
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const toast = useToast()
  const { email } = useAdminPermissions()
  const badges = useAdminBadgeCounts()
  const [stats, setStats] = useState(null)
  const [students, setStudents] = useState([])
  const [upcomingWebinars, setUpcomingWebinars] = useState([])
  const [topAmbassadors, setTopAmbassadors] = useState([])
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [rebuilding, setRebuilding] = useState(false)

  const [rangeDays, setRangeDays] = useState(30)
  const [allRegRows, setAllRegRows] = useState(null) // null = loading; normalized { date } rows, unfiltered by time range
  const [enrollmentStatus, setEnrollmentStatus] = useState(null)
  const [studentSample, setStudentSample] = useState(null)

  useEffect(() => {
    getDashboardStats().then(s => { setStats(s); setLoading(false) }).catch(() => setLoading(false))
    const u = studentsDbService.listen(r => setStudents(r.slice(0, 5)), 5)
    webinarsService.getUpcoming().then(setUpcomingWebinars).catch(() => setUpcomingWebinars([]))
    ambassadorsService.getTop(5).then(setTopAmbassadors).catch(() => setTopAmbassadors([]))
    const u2 = activityLogService.listen(setActivity)
    courseEnrollmentsService.getStatusCountsAll().then(setEnrollmentStatus).catch(() => {})
    studentsDbService.getSample(500).then(setStudentSample).catch(() => setStudentSample([]))
    return () => { u(); u2() }
  }, [])

  // ── Round 15 bug fix ───────────────────────────────────────────────────
  // Fetched ONCE (not re-queried per range toggle, and with no `where()` on
  // a date field at all — see getAllRegistrationsCapped's own comment for
  // why that was the actual bug). Every date is normalized through the one
  // shared toIsoString() helper, which tolerates a Firestore Timestamp, a
  // plain ISO string, or an epoch number — whichever shape a given
  // document actually has. Cross-checked against the server's own
  // unfiltered count (stats.totalRegistrations) so a future regression
  // logs loudly instead of silently showing an empty chart again.
  useEffect(() => {
    webinarsService.getAllRegistrationsCapped().then(rows => {
      const normalized = rows.map(r => ({
        date: toIsoString(r.registeredAt || r.createdAt).slice(0, 10),
        webinarTopic: r.webinarTopic || r.webinarTitle || 'Unknown',
      })).filter(r => r.date)
      setAllRegRows(normalized)
      if (stats && normalized.length < stats.totalRegistrations) {
        console.warn(
          `AdminDashboard: fetched ${normalized.length} registrations with a readable date, but the collection has ` +
          `${stats.totalRegistrations} total — some documents are missing both registeredAt and createdAt, or have ` +
          `a date in a shape toIsoString() doesn't recognize yet. Those are excluded from the charts/KPI below.`
        )
      }
    }).catch(() => setAllRegRows([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats?.totalRegistrations])

  const regRowsInRange = useMemo(() => {
    if (!allRegRows) return null
    const sinceStr = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    return allRegRows.filter(r => r.date >= sinceStr)
  }, [allRegRows, rangeDays])

  const timeSeriesData = useMemo(() => regRowsInRange ? bucketByDay(regRowsInRange, rangeDays) : [], [regRowsInRange, rangeDays])

  const perWebinarData = useMemo(() => {
    if (!regRowsInRange) return []
    const counts = new Map()
    for (const r of regRowsInRange) counts.set(r.webinarTopic, (counts.get(r.webinarTopic) || 0) + 1)
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([name, count]) => ({ name: name.length > 18 ? name.slice(0, 18) + '…' : name, count }))
  }, [regRowsInRange])

  // This month / last month, derived from the SAME normalized fetch the
  // charts use — one source of truth, immune to the date-field-shape issue
  // a separate server-side where() count query hit before.
  const { registrationsThisMonth, registrationsLastMonth } = useMemo(() => {
    if (!allRegRows) return { registrationsThisMonth: null, registrationsLastMonth: null }
    const now = new Date()
    const startThis = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
    const startLast = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10)
    let thisMonth = 0, lastMonth = 0
    for (const r of allRegRows) {
      if (r.date >= startThis) thisMonth++
      else if (r.date >= startLast && r.date < startThis) lastMonth++
    }
    return { registrationsThisMonth: thisMonth, registrationsLastMonth: lastMonth }
  }, [allRegRows])

  // Last 7 days of daily counts for the KPI's own sparkline.
  const registrationsSparkline = useMemo(() => {
    if (!allRegRows) return undefined
    return bucketByDay(allRegRows, 7).map(d => d.count)
  }, [allRegRows])

  const universityDonutData = useMemo(() => {
    if (!studentSample) return []
    const counts = new Map()
    for (const s of studentSample) {
      const u = s.university?.trim()
      if (!u) continue
      counts.set(u, (counts.get(u) || 0) + 1)
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, value]) => ({ name, value }))
  }, [studentSample])

  const enrollmentTotal = enrollmentStatus ? enrollmentStatus.Approved + enrollmentStatus.Pending + enrollmentStatus.Rejected : 0
  const enrollmentDonutData = enrollmentStatus
    ? [
        { name: 'Approved', value: enrollmentStatus.Approved },
        { name: 'Pending', value: enrollmentStatus.Pending },
        { name: 'Rejected', value: enrollmentStatus.Rejected },
      ].filter(d => d.value > 0)
    : []

  // Never a misleading "+100%" off a zero baseline — undefined when there's
  // no prior-month data at all to compare against (StatCard renders a
  // neutral "—" for that), a real percentage otherwise.
  const regTrend = registrationsLastMonth === null ? undefined
    : registrationsLastMonth === 0 ? (registrationsThisMonth > 0 ? undefined : null)
    : Math.round(((registrationsThisMonth - registrationsLastMonth) / registrationsLastMonth) * 100)

  const kpis = stats ? [
    { icon: Users, label: 'Total Students', target: stats.totalStudents, sub: `${stats.activeStudents} on file` },
    { icon: TrendingUp, label: 'Registrations This Month', target: registrationsThisMonth, sub: '', trend: regTrend, sparkline: registrationsSparkline },
    { icon: Video, label: 'Upcoming Webinars', target: stats.upcomingWebinars, sub: `${stats.totalWebinars} total` },
    { icon: CreditCard, label: 'Pending Enrollments', target: stats.pendingEnrollments, sub: 'awaiting payment review' },
    { icon: Award, label: 'Certificates Issued', target: stats.validCerts, sub: 'valid on file' },
    { icon: Newspaper, label: 'Published Posts & Events', target: stats.publishedPosts, sub: 'blog + events & news' },
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
    <div className="p-4 sm:p-6 space-y-6">
      <Skeleton className="h-9 w-64" />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-60" />)}
      </div>
    </div>
  )

  const needsAttentionTotal = badges.pendingEnrollments + badges.pendingReviews + badges.autoNewsDrafts
  const firstName = (email || 'Admin').split('@')[0]

  return (
    <div className="p-4 sm:p-6 space-y-6 font-poppins">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-white">{greeting()}, {firstName} 👋</h2>
          <p className="text-sm text-white/60">Here's what's happening at MEDWEB today.</p>
        </div>
        <button onClick={handleRebuild} disabled={rebuilding} className="btn-glass-secondary flex items-center gap-2 px-4 py-2 text-xs disabled:opacity-50">
          <RefreshCw size={14} className={rebuilding ? 'animate-spin' : ''} />
          {rebuilding ? 'Rebuilding…' : 'Rebuild public cache'}
        </button>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => navigate('/admin/webinars')} className="btn-glass-primary flex items-center gap-2 px-4 py-2.5 text-xs">
          <CalendarPlus size={14} /> + Schedule Webinar
        </button>
        {[
          { label: 'New Event', icon: Newspaper, to: '/admin/events' },
          { label: 'New Course', icon: BookOpen, to: '/admin/courses' },
          { label: 'Export Students', icon: Download, to: '/admin/students' },
        ].map(a => (
          <button key={a.label} onClick={() => navigate(a.to)} className="btn-glass-secondary flex items-center gap-2 px-4 py-2.5 text-xs">
            <a.icon size={13} /> {a.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {kpis.map((k, i) => <KpiCard key={k.label} {...k} accent={ACCENTS[i % ACCENTS.length]} i={i} />)}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white text-sm">Registrations Over Time</h3>
            <div className="flex gap-1">
              {RANGE_OPTIONS.map(r => (
                <button key={r.label} onClick={() => setRangeDays(r.days)}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full transition-colors ${rangeDays === r.days ? 'bg-white text-[#0A1B3D]' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          {allRegRows === null ? (
            <Skeleton className="h-56" />
          ) : timeSeriesData.every(d => d.count === 0) ? (
            <EmptyPanel icon={CalendarClock} message="No registrations in this range yet" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={timeSeriesData}>
                <defs>
                  <linearGradient id="regGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="date" tick={CHART_AXIS} />
                <YAxis allowDecimals={false} tick={CHART_AXIS} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Area type="monotone" dataKey="count" name="Registrations" stroke="#93c5fd" strokeWidth={2.5} fill="url(#regGradient)" isAnimationActive={true} animationDuration={600} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="glass-card p-5">
          <h3 className="font-bold text-white text-sm mb-4">Registrations Per Webinar <span className="text-white/40 font-normal text-xs">(top 8, selected range)</span></h3>
          {allRegRows === null ? (
            <Skeleton className="h-56" />
          ) : perWebinarData.length === 0 ? (
            <EmptyPanel icon={Video} message="No registrations in this range yet" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={perWebinarData} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={CHART_AXIS} />
                <YAxis type="category" dataKey="name" width={110} tick={CHART_AXIS} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Bar dataKey="count" name="Registrations" fill="#95d348" radius={[0, 6, 6, 0]} animationDuration={600} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="glass-card p-5">
          <h3 className="font-bold text-white text-sm mb-1">Students by University</h3>
          <p className="text-[11px] text-white/40 mb-4">Top 6, based on a sample of {studentSample?.length ?? '…'} students</p>
          {studentSample === null ? (
            <Skeleton className="h-56" />
          ) : universityDonutData.length === 0 ? (
            <EmptyPanel icon={Users} message="No university data on file yet" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={universityDonutData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2} animationDuration={600}>
                  {universityDonutData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="rgba(10,27,61,0.4)" />)}
                </Pie>
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 10, color: 'rgba(255,255,255,0.7)' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="glass-card p-5">
          <h3 className="font-bold text-white text-sm mb-4">Enrollment Status <span className="text-white/40 font-normal text-xs">(all courses)</span></h3>
          {enrollmentStatus === null ? (
            <Skeleton className="h-56" />
          ) : enrollmentDonutData.length === 0 ? (
            <EmptyPanel icon={CreditCard} message="No course enrollments yet" />
          ) : (
            <div className="relative">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={enrollmentDonutData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2} animationDuration={600}>
                    {enrollmentDonutData.map((d, i) => (
                      <Cell key={i} fill={d.name === 'Approved' ? '#95d348' : d.name === 'Pending' ? '#fbbf24' : '#f87171'} stroke="rgba(10,27,61,0.4)" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 10, color: 'rgba(255,255,255,0.7)' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ marginBottom: 28 }}>
                <div className="text-center">
                  <div className="text-xl font-black text-white">{enrollmentTotal}</div>
                  <div className="text-[9px] text-white/40 uppercase tracking-wider">Total</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Needs attention */}
        <div className="glass-card overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10">
            <h3 className="font-bold text-white text-sm">Needs Attention</h3>
          </div>
          {needsAttentionTotal === 0 ? (
            <EmptyPanel icon={ClipboardCheck} message="All caught up — nothing pending." />
          ) : (
            <div className="divide-y divide-white/5">
              {badges.pendingEnrollments > 0 && (
                <button onClick={() => navigate('/admin/courses')} className="w-full flex items-center justify-between px-5 py-3 hover:bg-white/5 transition-colors text-left">
                  <span className="flex items-center gap-2 text-sm text-white/80"><span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" /> Pending payments</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300">{badges.pendingEnrollments}</span>
                </button>
              )}
              {badges.pendingReviews > 0 && (
                <button onClick={() => navigate('/admin/pendingTestimonials')} className="w-full flex items-center justify-between px-5 py-3 hover:bg-white/5 transition-colors text-left">
                  <span className="flex items-center gap-2 text-sm text-white/80"><span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" /> Pending reviews</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-cyan-400/20 text-cyan-300">{badges.pendingReviews}</span>
                </button>
              )}
              {badges.autoNewsDrafts > 0 && (
                <button onClick={() => navigate('/admin/events')} className="w-full flex items-center justify-between px-5 py-3 hover:bg-white/5 transition-colors text-left">
                  <span className="flex items-center gap-2 text-sm text-white/80"><span className="w-2 h-2 rounded-full bg-pink-400 shrink-0" /> Auto-news drafts</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-pink-400/20 text-pink-300">{badges.autoNewsDrafts}</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Recent students */}
        <div className="glass-card overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10">
            <h3 className="font-bold text-white text-sm">Recent Students</h3>
          </div>
          <div className="divide-y divide-white/5">
            {students.length === 0 && <EmptyPanel icon={UserPlus} message="No students yet" />}
            {students.map((s, i) => {
              const displayName = s.name?.trim() || 'Unnamed student'
              return (
                <div key={i} className="flex items-center gap-3 px-5 py-3 hover:bg-white/5 transition-colors">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-black shrink-0 bg-white/15">{(s.name || s.email)?.charAt(0)?.toUpperCase() || '?'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{displayName}</div>
                    <div className="text-[11px] text-white/40 truncate" title={s.email}>{s.email}</div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-white/70 shrink-0">{(s.registrations || []).length} reg</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent activity */}
        <div className="glass-card overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10">
            <h3 className="font-bold text-white text-sm flex items-center gap-1.5"><ScrollText size={14} /> Activity Feed</h3>
          </div>
          <div className="divide-y divide-white/5 max-h-[280px] overflow-y-auto">
            {activity.length === 0 && <EmptyPanel icon={ScrollText} message="No activity logged yet" />}
            {activity.slice(0, 8).map((a, i) => (
              <div key={a.id || i} className="px-5 py-2.5 relative pl-7">
                <span className="absolute left-5 top-4 w-1.5 h-1.5 rounded-full bg-[#95d348]" />
                <div className="text-xs font-semibold text-white">{(a.action || '').replace(/_/g, ' ')}</div>
                <div className="text-[10px] text-white/40">{a.actorEmail}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upcoming webinars */}
        <div className="glass-card overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10">
            <h3 className="font-bold text-white text-sm">Upcoming Webinars</h3>
          </div>
          <div className="divide-y divide-white/5">
            {upcomingWebinars.length === 0 && <EmptyPanel icon={CalendarClock} message="No upcoming webinars — schedule via the Webinars page" />}
            {upcomingWebinars.slice(0, 4).map((w, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3 hover:bg-white/5 transition-colors">
                <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-white/10 text-white/70 shrink-0 whitespace-nowrap">{w.date || 'TBD'}</span>
                <div className="flex-1 min-w-0"><div className="text-sm font-semibold text-white truncate">{w.topic}</div><div className="text-[11px] text-white/40 truncate">{w.speakers?.[0]?.name}</div></div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${w.status === 'Live' ? 'bg-red-400/20 text-red-300' : 'bg-[#95d348]/20 text-[#95d348]'}`}>{w.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Ambassadors */}
        <div className="glass-card overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10"><h3 className="font-bold text-white text-sm">Top Ambassadors</h3></div>
          {topAmbassadors.length === 0 ? <EmptyPanel icon={Mail} message="No ambassadors yet" /> : (
            <div className="divide-y divide-white/5">
              {topAmbassadors.map((a, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3 hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {a.imageUrl ? <CoverImage src={a.imageUrl} alt={a.name || ''} bias="center 25%" className="w-7 h-7 rounded-full shrink-0" /> : <div className="w-7 h-7 rounded-full bg-white/15 shrink-0" />}
                    <div className="min-w-0" title={`${a.name || ''} — ${a.university || ''}`}>
                      <div className="text-sm font-semibold text-white truncate">{a.name}</div>
                      <div className="text-[11px] text-white/40 truncate">{a.university}</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ background: `${rankColors[a.rank]}25`, color: rankColors[a.rank] }}>{a.rank}</span>
                  <span className="text-sm font-bold text-white w-10 text-right shrink-0">{a.students || 0}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
