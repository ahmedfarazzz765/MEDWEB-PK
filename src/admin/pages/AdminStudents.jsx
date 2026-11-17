import { useState, useEffect, useMemo } from 'react'
import * as XLSX from 'xlsx'
import { Users, GraduationCap, Award, TrendingUp, Download, Eye, Copy, Combine } from 'lucide-react'
import StatCard   from '../components/StatCard'
import DataTable  from '../components/DataTable'
import Modal      from '../components/Modal'
import AdminButton from '../components/AdminButton'
import FormField, { inputCls } from '../components/FormField'
import useAdminPermissions from '../hooks/useAdminPermissions'
import { studentsDbService } from '../../firebase/services'

const PAGE_SIZE = 200

function formatDate(iso) {
  if (!iso) return '-'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return String(iso).split('T')[0] || '-'
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// The invariant part of a phone number regardless of format (+92, 0, or
// bare) — same approach as googleContacts.js — used only to GROUP
// candidate duplicates for the preview below; the merge itself never runs
// without an admin explicitly confirming a specific pair.
const last10 = phone => String(phone || '').replace(/\D/g, '').slice(-10)
const normEmail = email => String(email || '').trim().toLowerCase()

// ── columns defined OUTSIDE component so reference is stable ─────────────────
function makeColumns(openProfile) {
  return [
    { key: 'name',         label: 'Full Name',   render: v => <span className="font-semibold text-[#1a1a1a]">{v || '-'}</span> },
    { key: 'email',        label: 'Email',       render: v => <span className="text-gray-500 text-xs">{v}</span> },
    { key: 'phone',        label: 'Phone',       render: v => v || <span className="text-gray-300">-</span> },
    { key: 'city',         label: 'City',        render: v => v || <span className="text-gray-300">-</span> },
    { key: 'university',   label: 'University',  render: v => v || <span className="text-gray-300">-</span> },
    { key: 'degree',       label: 'Degree',      render: v => v || <span className="text-gray-300">-</span> },
    { key: 'eventsAttended', label: 'Events Attended', render: v => <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-[#1655c3]">{v}</span> },
    { key: 'certCount',    label: 'Certificates', render: v => <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-green-50 text-[#64ac37]">{v}</span> },
    { key: 'id', label: 'Actions', render: (v, row) => (
      <button onClick={() => openProfile(row)} className="p-1.5 rounded-lg hover:bg-blue-50 text-[#1655c3] transition-colors">
        <Eye size={15} />
      </button>
    )},
  ]
}

export default function AdminStudents() {
  const { canDelete } = useAdminPermissions()
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(true)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [totalCount, setTotalCount] = useState(null)
  const [profile, setProfile] = useState(null) // the student row currently open in the profile modal

  const [filterUniversity, setFilterUniversity] = useState('All')
  const [filterCity, setFilterCity] = useState('All')
  const [filterDegree, setFilterDegree] = useState('All')
  const [filterEvent, setFilterEvent] = useState('All')

  const [dupModalOpen, setDupModalOpen] = useState(false)
  const [findingDupes, setFindingDupes] = useState(false)
  const [dupeGroups, setDupeGroups] = useState([]) // [{ key, students: [row, row, ...] }]
  const [mergingId, setMergingId] = useState(null)

  useEffect(() => {
    setLoading(true)
    const unsub = studentsDbService.listen(rows => { setData(rows); setLoading(false) }, pageSize)
    return unsub
  }, [pageSize])

  // Independent of pagination — this KPI must stay accurate even when not
  // every student is loaded (see "Load more" below).
  useEffect(() => { studentsDbService.getCount().then(setTotalCount).catch(() => {}) }, [])

  const students = useMemo(() => data.map(s => ({
    ...s,
    // Prefer the stored counters (maintained incrementally in
    // upsertFromRegistration/upsertFromCertificate/upsertFromCourseEnrollment)
    // — falls back to the array length only for a doc from before those
    // fields existed, until its next upsert backfills a real count.
    regCount: s.registrationCount ?? (s.registrations || []).length,
    enrollCount: s.enrollmentCount ?? (s.enrollments || []).length,
    certCount: s.certificateCount ?? (s.certificates || []).length,
  })).map(s => ({ ...s, eventsAttended: s.regCount + s.enrollCount })), [data])

  const universities = useMemo(() => Array.from(new Set(students.map(s => s.university).filter(Boolean))).sort(), [students])
  const cities = useMemo(() => Array.from(new Set(students.map(s => s.city).filter(Boolean))).sort(), [students])
  const degrees = useMemo(() => Array.from(new Set(students.map(s => s.degree).filter(Boolean))).sort(), [students])
  const events = useMemo(() => {
    const set = new Set()
    for (const s of students) {
      for (const r of s.registrations || []) if (r.webinarTitle) set.add(r.webinarTitle)
      for (const e of s.enrollments || []) if (e.courseTitle) set.add(e.courseTitle)
    }
    return Array.from(set).sort()
  }, [students])

  const filtered = useMemo(() => students.filter(s =>
    (filterUniversity === 'All' || s.university === filterUniversity) &&
    (filterCity === 'All' || s.city === filterCity) &&
    (filterDegree === 'All' || s.degree === filterDegree) &&
    (filterEvent === 'All' || (s.registrations || []).some(r => r.webinarTitle === filterEvent) || (s.enrollments || []).some(e => e.courseTitle === filterEvent))
  ), [students, filterUniversity, filterCity, filterDegree, filterEvent])

  const totalRegistrations = students.reduce((a, s) => a + s.regCount, 0)
  const totalCertificates  = students.reduce((a, s) => a + s.certCount, 0)
  const avgRegPerStudent   = students.length ? (totalRegistrations / students.length).toFixed(1) : '0'

  const openProfile = row => setProfile(row)
  const closeProfile = () => setProfile(null)

  const exportExcel = () => {
    const rows = filtered.map(s => ({
      'Full Name': s.name || '',
      'Email Address': s.email || '',
      'Phone Number': s.phone || '',
      'City': s.city || '',
      'University': s.university || '',
      'Degree': s.degree || '',
      'Events Attended': s.eventsAttended,
      'Total Certificates Earned': s.certCount,
      'Registered Webinars': (s.registrations || []).map(r => r.webinarTitle).filter(Boolean).join(', '),
      'Course/Workshop Enrollments': (s.enrollments || []).map(e => e.courseTitle).filter(Boolean).join(', '),
      'Certificates Earned (Webinars)': (s.certificates || []).map(c => c.webinarTitle).filter(Boolean).join(', '),
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [
      { wch: 22 }, { wch: 28 }, { wch: 16 }, { wch: 16 }, { wch: 22 }, { wch: 18 },
      { wch: 14 }, { wch: 14 }, { wch: 40 }, { wch: 40 }, { wch: 40 },
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Students')
    XLSX.writeFile(wb, `MEDWEB_Students_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  // Groups the currently loaded students by normalized phone AND by
  // normalized email — any group with more than one doc is a candidate
  // duplicate. A full one-time fetch (not the capped `listen` above) so
  // this check genuinely covers the whole collection, not just whatever
  // page is currently loaded — but it's only ever run when an admin
  // explicitly clicks the button, never automatically, and it never
  // writes anything by itself.
  const findDuplicates = async () => {
    setFindingDupes(true)
    setDupModalOpen(true)
    try {
      const all = await studentsDbService.getAll()
      const byPhone = new Map()
      const byEmail = new Map()
      for (const s of all) {
        const p = last10(s.phone)
        if (p) { if (!byPhone.has(p)) byPhone.set(p, []); byPhone.get(p).push(s) }
        const e = normEmail(s.email)
        if (e) { if (!byEmail.has(e)) byEmail.set(e, []); byEmail.get(e).push(s) }
      }
      const groups = []
      const seenPairs = new Set()
      const addGroup = (key, list) => {
        if (list.length < 2) return
        const idKey = list.map(s => s.id).sort().join('|')
        if (seenPairs.has(idKey)) return
        seenPairs.add(idKey)
        groups.push({ key, students: list })
      }
      for (const [k, list] of byPhone) addGroup(`phone:${k}`, list)
      for (const [k, list] of byEmail) addGroup(`email:${k}`, list)
      setDupeGroups(groups)
    } catch (e) {
      alert('Error finding duplicates: ' + e.message)
      setDupModalOpen(false)
    } finally {
      setFindingDupes(false)
    }
  }

  const mergePair = async (keepId, removeId) => {
    if (!confirm('Merge these two records into one? Every registration/certificate/enrollment from both is kept — nothing is lost. The duplicate record is then deleted. This cannot be undone.')) return
    setMergingId(removeId)
    try {
      await studentsDbService.mergeDuplicates(keepId, removeId)
      setDupeGroups(prev => prev
        .map(g => ({ ...g, students: g.students.filter(s => s.id !== removeId) }))
        .filter(g => g.students.length > 1))
    } catch (e) {
      alert('Error merging: ' + e.message)
    } finally {
      setMergingId(null)
    }
  }

  const columns = makeColumns(openProfile)

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users}        label="Total Students"        value={totalCount === null ? '…' : totalCount}  color="#1655c3" bg="#eff6ff" />
        <StatCard icon={GraduationCap} label="Webinar Registrations" value={loading ? '…' : totalRegistrations}     color="#64ac37" bg="#f0fdf4" />
        <StatCard icon={Award}        label="Certificates Issued"   value={loading ? '…' : totalCertificates}      color="#1655c3" bg="#eff6ff" />
        <StatCard icon={TrendingUp}   label="Avg Registrations"     value={loading ? '…' : avgRegPerStudent}       color="#f59e0b" bg="#fffbeb" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select className={`${inputCls} w-auto`} value={filterUniversity} onChange={e => setFilterUniversity(e.target.value)}>
          <option value="All">All Universities</option>
          {universities.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
        <select className={`${inputCls} w-auto`} value={filterCity} onChange={e => setFilterCity(e.target.value)}>
          <option value="All">All Cities</option>
          {cities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className={`${inputCls} w-auto`} value={filterDegree} onChange={e => setFilterDegree(e.target.value)}>
          <option value="All">All Degrees</option>
          {degrees.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select className={`${inputCls} w-auto`} value={filterEvent} onChange={e => setFilterEvent(e.target.value)}>
          <option value="All">All Events/Courses</option>
          {events.map(ev => <option key={ev} value={ev}>{ev}</option>)}
        </select>
        {canDelete && (
          <AdminButton variant="ghost" size="sm" onClick={findDuplicates}>
            <Copy size={13} className="mr-1.5" /> Find Duplicates
          </AdminButton>
        )}
      </div>

      <DataTable
        title="Student Database"
        columns={columns}
        data={filtered}
        searchKey="name"
        emptyMessage="No students yet — they'll appear automatically as webinar registrations, course enrollments, feedback, and ambassador applications come in."
        actions={
          <AdminButton size="sm" onClick={exportExcel} disabled={!filtered.length}>
            <Download size={13} className="mr-1.5" /> Export to Excel
          </AdminButton>
        }
      />
      {/* `data.length === pageSize` is a heuristic for "there might be
          more" — clicking this re-subscribes with a bigger limit, and the
          button disappears next render if that was in fact everything. */}
      {!loading && data.length === pageSize && (
        <div className="flex justify-center">
          <AdminButton variant="secondary" onClick={() => setPageSize(n => n + PAGE_SIZE)}>Load more</AdminButton>
        </div>
      )}

      {profile && (
        <Modal title={profile.name || profile.email} onClose={closeProfile} wide>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-2xl p-4">
              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Email</div>
                <div className="text-sm font-semibold text-[#1a1a1a]">{profile.email}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Phone</div>
                <div className="text-sm font-semibold text-[#1a1a1a]">{profile.phone || '-'}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">City</div>
                <div className="text-sm font-semibold text-[#1a1a1a]">{profile.city || '-'}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">University</div>
                <div className="text-sm font-semibold text-[#1a1a1a]">{profile.university || '-'}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Degree</div>
                <div className="text-sm font-semibold text-[#1a1a1a]">{profile.degree || '-'}</div>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-[#1a1a1a] text-sm mb-3">
                Webinar Registrations <span className="text-gray-400 font-normal">({(profile.registrations || []).length})</span>
              </h3>
              {(profile.registrations || []).length === 0 ? (
                <p className="text-xs text-gray-400">No webinar registrations on file.</p>
              ) : (
                <div className="space-y-2">
                  {profile.registrations.map((r, i) => (
                    <div key={i} className="flex items-center justify-between bg-blue-50/50 rounded-xl px-4 py-2.5">
                      <span className="text-sm font-medium text-[#1a1a1a]">{r.webinarTitle || 'Untitled Webinar'}</span>
                      <span className="text-xs text-gray-500">{formatDate(r.registeredAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="font-bold text-[#1a1a1a] text-sm mb-3">
                Course/Workshop Enrollments <span className="text-gray-400 font-normal">({(profile.enrollments || []).length})</span>
              </h3>
              {(profile.enrollments || []).length === 0 ? (
                <p className="text-xs text-gray-400">No course or workshop enrollments on file.</p>
              ) : (
                <div className="space-y-2">
                  {profile.enrollments.map((e, i) => (
                    <div key={i} className="flex items-center justify-between bg-amber-50/50 rounded-xl px-4 py-2.5">
                      <span className="text-sm font-medium text-[#1a1a1a]">{e.courseTitle || 'Untitled Course'}</span>
                      <span className="text-xs text-gray-500">{formatDate(e.enrolledAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="font-bold text-[#1a1a1a] text-sm mb-3">
                Certificates Earned <span className="text-gray-400 font-normal">({(profile.certificates || []).length})</span>
              </h3>
              {(profile.certificates || []).length === 0 ? (
                <p className="text-xs text-gray-400">No certificates issued yet.</p>
              ) : (
                <div className="space-y-2">
                  {profile.certificates.map((c, i) => (
                    <div key={i} className="flex items-center justify-between bg-green-50/50 rounded-xl px-4 py-2.5">
                      <div>
                        <div className="text-sm font-medium text-[#1a1a1a]">{c.webinarTitle || 'Untitled Webinar'}</div>
                        {c.certCode && <div className="text-[10px] text-gray-400">{c.certCode}</div>}
                      </div>
                      <span className="text-xs text-gray-500">{formatDate(c.issuedAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {dupModalOpen && (
        <Modal title="Possible Duplicate Students" onClose={() => setDupModalOpen(false)} wide>
          {findingDupes ? (
            <p className="text-sm text-gray-400 text-center py-10">Scanning the whole collection for matching phone/email…</p>
          ) : dupeGroups.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">No duplicates found — every record has a distinct phone and email.</p>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-gray-500">
                {dupeGroups.length} possible duplicate {dupeGroups.length === 1 ? 'group' : 'groups'} — review each before merging. Merging keeps every registration/certificate/enrollment from both records; nothing is deleted except the duplicate record itself.
              </p>
              {dupeGroups.map(g => (
                <div key={g.key} className="border border-gray-100 rounded-xl p-4">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Matched by {g.key.startsWith('phone:') ? 'phone number' : 'email'}
                  </div>
                  <div className="space-y-2">
                    {g.students.map(s => (
                      <div key={s.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                        <div className="text-sm">
                          <span className="font-semibold text-[#1a1a1a]">{s.name || '(no name)'}</span>
                          <span className="text-gray-400 ml-2">{s.email || '—'} · {s.phone || '—'}</span>
                          <span className="text-gray-400 ml-2">
                            {(s.registrations || []).length} reg · {(s.enrollments || []).length} enroll · {(s.certificates || []).length} cert
                          </span>
                        </div>
                        <AdminButton size="sm" variant="ghost" disabled={mergingId === s.id}
                          onClick={() => mergePair(s.id, g.students.find(o => o.id !== s.id).id)}>
                          <Combine size={13} className="mr-1.5" /> {mergingId === s.id ? 'Merging…' : 'Keep this one, merge other in'}
                        </AdminButton>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}
