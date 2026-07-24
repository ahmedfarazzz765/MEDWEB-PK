import { useState, useEffect } from 'react'
import { Users, Video, BookOpen, Award, Megaphone, TrendingUp, Star, UserPlus, CalendarClock } from 'lucide-react'
import StatCard from '../components/StatCard'
import { getDashboardStats, studentsService, webinarsService, ambassadorsService } from '../../firebase/services'

const rankColors = { Platinum:'#0369a1', Gold:'#b45309', Silver:'#475569', Bronze:'#9a3412' }

// Rotating accent per stat card — blue / green / purple / amber — so the KPI
// row reads as distinct metrics at a glance instead of one repeated color.
const ACCENTS = [
  { color: '#1655c3', bg: '#eff6ff' },
  { color: '#64ac37', bg: '#f0fdf4' },
  { color: '#7c3aed', bg: '#f5f3ff' },
  { color: '#d97706', bg: '#fffbeb' },
]

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

export default function AdminDashboard() {
  const [stats,      setStats]      = useState(null)
  const [students,   setStudents]   = useState([])
  const [webinars,   setWebinars]   = useState([])
  const [ambassadors,setAmbassadors]= useState([])
  const [loading,    setLoading]    = useState(true)

  useEffect(() => {
    getDashboardStats().then(s => { setStats(s); setLoading(false) }).catch(()=>setLoading(false))
    const u1 = studentsService.listen(r  => setStudents(r.slice(0,5)))
    const u2 = webinarsService.listen(r  => setWebinars(r))
    const u3 = ambassadorsService.listen(r=> setAmbassadors(r))
    return () => { u1(); u2(); u3() }
  }, [])

  const kpis = stats ? [
    { icon:Users,      label:'Total Students',    value:stats.totalStudents,     sub:`${stats.activeStudents} active`,     trend:12 },
    { icon:Video,      label:'Total Webinars',    value:stats.totalWebinars,     sub:`${stats.upcomingWebinars} upcoming`, trend:8  },
    { icon:BookOpen,   label:'Active Courses',    value:stats.activeCourses,     sub:'programs live',                      trend:5  },
    { icon:Award,      label:'Certificates',      value:stats.validCerts,        sub:'valid & issued',                     trend:18 },
    { icon:Megaphone,  label:'Ambassadors',       value:stats.activeAmbassadors, sub:'active reps',                        trend:3  },
    { icon:TrendingUp, label:'Cities Reached',    value:'50+',                   sub:'across Pakistan' },
    { icon:Star,       label:'Avg Rating',        value:'4.75',                  sub:'out of 5.0',                         trend:2  },
  ].map((k, i) => ({ ...k, ...ACCENTS[i % ACCENTS.length] })) : []

  if (loading) return (
    <div className="p-6 flex items-center justify-center h-64">
      <div className="text-center">
        <div className="w-10 h-10 rounded-xl mx-auto mb-3 animate-pulse bg-[#1655c3]" />
        <p className="text-gray-400 text-sm">Loading live data from Firebase…</p>
      </div>
    </div>
  )

  const upcoming = webinars.filter(w=>w.status==='Upcoming')

  return (
    <div className="p-6 space-y-8 animate-page-fade-in">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k,i)=><StatCard key={i} {...k}/>)}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent students */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-[#1a1a1a] text-sm">Recent Enrollments</h3>
            <span className="text-xs text-[#1655c3] font-semibold">Live from Firebase</span>
          </div>
          <div className="divide-y divide-gray-50">
            {students.length===0 && <EmptyPanel icon={UserPlus} message="No students yet — add via the Students page" />}
            {students.map((s,i)=>(
              <div key={i} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-black shrink-0 bg-[#1655c3]">{s.name?.charAt(0)}</div>
                <div className="flex-1 min-w-0"><div className="text-sm font-semibold text-[#1a1a1a] truncate">{s.name}</div><div className="text-[11px] text-gray-400 truncate">{s.course}</div></div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.status==='Active'?'bg-green-50 text-green-600':'bg-gray-100 text-gray-500'}`}>{s.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming webinars */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-[#1a1a1a] text-sm">Upcoming Webinars</h3>
            <span className="text-xs text-[#1655c3] font-semibold">Live from Firebase</span>
          </div>
          <div className="divide-y divide-gray-50">
            {upcoming.length===0 && <EmptyPanel icon={CalendarClock} message="No upcoming webinars — schedule via the Webinars page" />}
            {upcoming.slice(0,4).map((w,i)=>(
              <div key={i} className="flex items-start gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-black shrink-0" style={{background:w.type==='Free'?'#64ac37':'#1655c3'}}>{w.type==='Free'?'F':'P'}</div>
                <div className="flex-1 min-w-0"><div className="text-sm font-semibold text-[#1a1a1a] truncate">{w.topic}</div><div className="text-[11px] text-gray-400">{w.speaker} · {w.date}</div></div>
                <div className="text-[11px] font-bold text-[#1655c3] whitespace-nowrap">{w.registered||0} reg.</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Ambassadors */}
      {ambassadors.length>0&&(
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-bold text-[#1a1a1a] text-sm">Top Ambassadors</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-gray-50 border-b border-gray-100">{['Name','University','Rank','Referred','Status'].map(h=><th key={h} className="text-left text-xs text-gray-500 font-semibold px-5 py-2.5">{h}</th>)}</tr></thead>
              <tbody>{ambassadors.slice(0,5).map((a,i)=>(
                <tr key={i} className="border-b border-gray-50 hover:bg-blue-50/20 transition-colors">
                  <td className="px-5 py-3 text-sm font-semibold text-[#1a1a1a] flex items-center gap-2">{a.imageUrl&&<img src={a.imageUrl} className="w-6 h-6 rounded-full object-cover"/>}{a.name}</td>
                  <td className="px-5 py-3 text-sm text-gray-500">{a.university}</td>
                  <td className="px-5 py-3"><span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{background:`${rankColors[a.rank]}15`,color:rankColors[a.rank]}}>{a.rank}</span></td>
                  <td className="px-5 py-3 text-sm font-bold text-[#1655c3]">{a.students||0}</td>
                  <td className="px-5 py-3"><span className={`text-xs font-bold px-2 py-0.5 rounded-full ${a.status==='Active'?'bg-green-50 text-green-600':'bg-gray-100 text-gray-500'}`}>{a.status}</span></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
