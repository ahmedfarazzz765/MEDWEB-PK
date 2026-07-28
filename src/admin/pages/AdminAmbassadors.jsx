import { useState, useEffect } from 'react'
import { Megaphone, Users, Trophy, MapPin, Star, Linkedin, Instagram, Facebook, MessageCircle } from 'lucide-react'
import StatCard    from '../components/StatCard'
import DataTable   from '../components/DataTable'
import Modal       from '../components/Modal'
import FormField, { inputCls } from '../components/FormField'
import ImageUpload from '../components/ImageUpload'
import AdminButton from '../components/AdminButton'
import ActionButtons from '../components/ActionButtons'
import AmbassadorLetterSettings from '../components/AmbassadorLetterSettings'
import CoverImage from '../../components/CoverImage'
import { ambassadorsService, settingsService, formsService, studentsDbService } from '../../firebase/services'
import {
  sendAmbassadorWelcomeEmail, sendAmbassadorPointsUpdateEmail,
  sendAmbassadorRemovedEmail, sendAmbassadorUpdatedEmail,
} from '../../firebase/email'

// Which fields trigger the generic "profile updated" email when changed,
// and what to call each one in that email's summary. Points and Status are
// handled separately below (they get their own, more specific email
// copy) so they're deliberately left out of this map. CNIC is never
// mentioned in outgoing email either, even though it's editable — no need
// to echo a national ID number back over email.
const NOTIFY_FIELD_LABELS = {
  university: 'University', city: 'City', degreeProgram: 'Degree Program',
  semester: 'Semester', rank: 'Rank', ranking: 'Ranking',
  ambCode: 'Ambassador Code', email: 'Email', phone: 'Phone Number',
}

function diffAmbassadorFields(before, after) {
  const changes = []
  for (const [key, label] of Object.entries(NOTIFY_FIELD_LABELS)) {
    const oldVal = before?.[key] ?? ''
    const newVal = after?.[key] ?? ''
    if (String(oldVal) !== String(newVal)) {
      changes.push(newVal ? `${label} updated to "${newVal}"` : `${label} cleared`)
    }
  }
  const oldSocial = JSON.stringify(before?.socialLinks || {})
  const newSocial = JSON.stringify(after?.socialLinks || {})
  if (oldSocial !== newSocial) changes.push('Social links updated')
  return changes
}

// The consolidated Rank dropdown — replaces the old separate Role + Rank
// (tier) dropdowns, which overlapped confusingly with this ambassador-type
// concept. See migrateLegacyRank() below for how existing records move over.
export const RANK_OPTIONS = [
  'Head Ambassador', 'Regional Ambassador', 'Campus Ambassador',
  'Male Head Ambassador', 'Female Head Ambassador', 'Ambassador',
]

// Same option set as the Form Builder's dedicated "Semester" field type
// (src/pages/DynamicForm.jsx / WebinarRegisterModal.jsx), kept in sync by convention.
export const SEMESTER_OPTIONS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', 'Final Year', 'Graduated']

const rankColors = {
  'Head Ambassador': '#7c3aed', 'Regional Ambassador': '#0369a1', 'Campus Ambassador': '#1655c3',
  'Male Head Ambassador': '#0891b2', 'Female Head Ambassador': '#db2777', 'Ambassador': '#64748b',
}
const rankBg = {
  'Head Ambassador': '#f5f3ff', 'Regional Ambassador': '#f0f9ff', 'Campus Ambassador': '#eff6ff',
  'Male Head Ambassador': '#ecfeff', 'Female Head Ambassador': '#fdf2f8', 'Ambassador': '#f8fafc',
}

// Old role → closest new Rank option. Roles with no sensible equivalent map
// to '' so the admin has to consciously reassign them, per the migration
// requirement ("don't silently drop data" — the original `role`/`rank`
// fields are left untouched on the doc, only a new `rank` value is set).
const LEGACY_ROLE_TO_RANK = {
  'Campus Ambassador': 'Campus Ambassador',
  'Regional Lead': 'Regional Ambassador',
}

const emptyForm = () => ({
  name: '', university: '', city: '',
  rank: '', status: 'Active', students: 0, points: 0, imageUrl: '', cnic: '',
  email: '', phone: '',
  ambCode: '',
  degreeProgram: '', semester: '',
  socialLinks: { linkedin: '', instagram: '', facebook: '', whatsapp: '' },
  ranking: 0,
  cardImageUrl: '',
})

function StarPicker({ value, onChange }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" onClick={() => onChange(n === value ? 0 : n)} className="p-0.5">
          <Star size={22} className={n <= value ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'} />
        </button>
      ))}
    </div>
  )
}

function makeColumns(openEdit, handleDelete) {
  return [
    { key: 'imageUrl',   label: '',           render: v => v ? <CoverImage src={v} bias="center 25%" className="w-8 h-8 rounded-full" /> : <div className="w-8 h-8 rounded-full bg-blue-50" /> },
    { key: 'name',       label: 'Name',        render: v => <span className="font-semibold text-[#1a1a1a]">{v}</span> },
    { key: 'university', label: 'University',  render: v => <span className="text-gray-500 text-xs">{v}</span> },
    { key: 'city',       label: 'City' },
    { key: 'rank',       label: 'Rank',        render: v => v
      ? <span className="text-xs font-bold px-2 py-0.5 rounded-full border" style={{ background: rankBg[v], color: rankColors[v], borderColor: `${rankColors[v]}33` }}>{v}</span>
      : <span className="text-xs text-gray-300 italic">Unassigned</span> },
    { key: 'students',   label: 'Referred',    render: v => <span className="font-bold text-[#64ac37]">{v || 0}</span> },
    { key: 'points',     label: 'Points',      render: v => <span className="font-bold text-[#1655c3]">{(v || 0).toLocaleString()}</span> },
    { key: 'status',     label: 'Status',      render: v => <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${v === 'Active' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>{v}</span> },
    { key: 'id',         label: 'Actions',     render: (v, row) => (
      <ActionButtons onEdit={() => openEdit(row)} onDelete={() => handleDelete(v)} />
    )},
  ]
}

export default function AdminAmbassadors() {
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(false)
  const [form,    setForm]    = useState(emptyForm)
  const [editId,  setEditId]  = useState(null)
  const [editOriginal, setEditOriginal] = useState(null)
  const [saving,  setSaving]  = useState(false)
  const [forms,   setForms]   = useState([])
  const [applyCfg, setApplyCfg] = useState({ ambassadorApplyEnabled: true, ambassadorApplyFormId: '', ambassadorApplyLink: '' })
  const [applySaved, setApplySaved] = useState(false)

  useEffect(() => {
    const uf = formsService.listen(rows => setForms(rows))
    settingsService.get().then(s => {
      if (s) setApplyCfg(p => ({
        ambassadorApplyEnabled: typeof s.ambassadorApplyEnabled === 'boolean' ? s.ambassadorApplyEnabled : true,
        ambassadorApplyFormId: s.ambassadorApplyFormId || '',
        ambassadorApplyLink: s.ambassadorApplyLink || '',
      }))
    }).catch(() => {})
    return () => uf()
  }, [])

  const saveApplyCfg = async (next) => {
    setApplyCfg(next)
    try { await settingsService.update(next); setApplySaved(true); setTimeout(() => setApplySaved(false), 1500) } catch (e) { alert(e.message) }
  }

  useEffect(() => {
    const unsub = ambassadorsService.listen(rows => {
      setData(rows)
      setLoading(false)
      // One-time background migration: any record with a legacy `role`
      // field (from before Role+Rank were consolidated into one Rank
      // dropdown) gets its new `rank` value inferred and `rankMigrated`
      // set so it's never re-processed. Fresh records never have `role`
      // at all, so they're skipped here permanently — no infinite loop.
      rows.forEach(row => {
        if (row.rankMigrated || row.role === undefined) return
        const mapped = LEGACY_ROLE_TO_RANK[row.role] || ''
        ambassadorsService.update(row.id, { rank: mapped, rankMigrated: true }).catch(() => {})
      })
    })
    return unsub
  }, [])

  const openAdd  = () => { setForm(emptyForm()); setEditId(null); setModal('add') }
  const openEdit = row => {
    setForm({
      name: row.name, university: row.university, city: row.city,
      rank: row.rank || '', status: row.status, students: row.students || 0, points: row.points || 0,
      imageUrl: row.imageUrl || '', cnic: row.cnic || '',
      email: row.email || '', phone: row.phone || '',
      ambCode: row.ambCode || '',
      degreeProgram: row.degreeProgram || '', semester: row.semester || '',
      socialLinks: {
        linkedin: row.socialLinks?.linkedin || '', instagram: row.socialLinks?.instagram || '',
        facebook: row.socialLinks?.facebook || '', whatsapp: row.socialLinks?.whatsapp || '',
      },
      ranking: row.ranking || 0,
      cardImageUrl: row.cardImageUrl || '',
    })
    setEditId(row.id); setEditOriginal(row); setModal('edit')
  }
  const closeModal = () => { setModal(false); setEditId(null); setEditOriginal(null) }
  const set    = field => e => setForm(prev => ({ ...prev, [field]: e.target.value }))
  const setNum = field => e => setForm(prev => ({ ...prev, [field]: parseInt(e.target.value) || 0 }))
  const setImg = url => setForm(prev => ({ ...prev, imageUrl: url }))
  const setCardImg = url => setForm(prev => ({ ...prev, cardImageUrl: url }))
  const setSocial = platform => e => setForm(prev => ({ ...prev, socialLinks: { ...prev.socialLinks, [platform]: e.target.value } }))
  const setRanking = n => setForm(prev => ({ ...prev, ranking: n }))

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      if (modal === 'add') {
        await ambassadorsService.add(form)
        if (form.email) {
          sendAmbassadorWelcomeEmail({
            name: form.name, email: form.email,
            ambCode: form.ambCode, university: form.university, rank: form.rank,
          }).catch(() => {})
          studentsDbService.upsertFromAmbassador({
            email: form.email, name: form.name, phone: form.phone,
            university: form.university, degree: form.degreeProgram,
          }).catch(() => {})
        }
      } else {
        await ambassadorsService.update(editId, form)
        if (form.email) {
          const becameInactive = form.status === 'Inactive' && editOriginal?.status !== 'Inactive'
          const pointsChanged = Number(form.points) !== Number(editOriginal?.points || 0)
          const otherChanges = diffAmbassadorFields(editOriginal, form)

          if (becameInactive) {
            sendAmbassadorRemovedEmail({ name: form.name, email: form.email }).catch(() => {})
          } else if (pointsChanged) {
            sendAmbassadorPointsUpdateEmail({ name: form.name, email: form.email, points: form.points }).catch(() => {})
          } else if (otherChanges.length > 0) {
            sendAmbassadorUpdatedEmail({ name: form.name, email: form.email, changes: otherChanges }).catch(() => {})
          }
        }
      }
      closeModal()
    } catch (e) { alert('Error: ' + e.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async id => {
    if (!confirm('Remove ambassador?')) return
    const row = data.find(d => d.id === id)
    try {
      await ambassadorsService.delete(id)
      if (row?.email) sendAmbassadorRemovedEmail({ name: row.name, email: row.email }).catch(() => {})
    } catch (e) { alert('Error: ' + e.message) }
  }

  const columns  = makeColumns(openEdit, handleDelete)
  const active   = data.filter(a => a.status === 'Active').length
  const cities   = [...new Set(data.map(a => a.city))].length
  const referred = data.reduce((acc, a) => acc + (a.students || 0), 0)

  return (
    <div className="p-6 space-y-6">
      {/* Ambassador Apply Form settings */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-black text-[#1a1a1a] text-sm">Ambassador Apply Form</h3>
          {applySaved && <span className="text-xs font-bold text-green-600">Saved ✓</span>}
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={applyCfg.ambassadorApplyEnabled}
              onChange={e => saveApplyCfg({ ...applyCfg, ambassadorApplyEnabled: e.target.checked })}
              className="w-4 h-4 accent-[#1655c3]" />
            <span className="text-sm font-semibold text-gray-700">Show "Apply as Ambassador" button on website</span>
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-600">Link Form:</span>
            <select className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-gray-50"
              value={applyCfg.ambassadorApplyFormId}
              onChange={e => saveApplyCfg({ ...applyCfg, ambassadorApplyFormId: e.target.value })}>
              <option value="">None</option>
              {forms.map(f => <option key={f.id} value={f.id}>{f.title}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <span className="text-sm font-semibold text-gray-600 whitespace-nowrap">or Link:</span>
            <input className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-gray-50"
              placeholder="https://forms.gle/..." value={applyCfg.ambassadorApplyLink}
              onChange={e => setApplyCfg(p => ({ ...p, ambassadorApplyLink: e.target.value }))}
              onBlur={() => saveApplyCfg(applyCfg)} />
          </div>
        </div>
      </div>

      <AmbassadorLetterSettings />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Megaphone} label="Total"    value={loading ? '…' : data.length} color="#1655c3" bg="#eff6ff" />
        <StatCard icon={Users}     label="Active"   value={loading ? '…' : active}      color="#64ac37" bg="#f0fdf4" />
        <StatCard icon={MapPin}    label="Cities"   value={loading ? '…' : cities}      color="#1655c3" bg="#eff6ff" />
        <StatCard icon={Trophy}    label="Referred" value={loading ? '…' : referred}    color="#64ac37" bg="#f0fdf4" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-bold text-[#1a1a1a] text-sm mb-4">Rank Distribution</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {RANK_OPTIONS.map(rank => {
            const count = data.filter(a => a.rank === rank).length
            return (
              <div key={rank} className="rounded-2xl p-4 text-center border" style={{ background: rankBg[rank], borderColor: `${rankColors[rank]}33` }}>
                <div className="text-2xl font-black" style={{ color: rankColors[rank] }}>{count}</div>
                <div className="text-xs font-bold mt-1" style={{ color: rankColors[rank] }}>{rank}</div>
              </div>
            )
          })}
        </div>
      </div>

      <DataTable title="All Ambassadors" columns={columns} data={data} searchKey="name" emptyMessage="No ambassadors yet — click Add Ambassador to create one"
        actions={<AdminButton size="sm" onClick={openAdd}>+ Add Ambassador</AdminButton>}
      />

      {modal && (
        <Modal title={modal === 'add' ? 'Add Ambassador' : 'Edit Ambassador'} onClose={closeModal} wide>
          <div className="space-y-4">
            <ImageUpload value={form.imageUrl} onChange={setImg} folder="medweb/ambassadors" label="Profile Photo" />
            <ImageUpload value={form.cardImageUrl} onChange={setCardImg} folder="medweb/ambassadors/cards" label="Ambassador Card Image (designed externally, e.g. in Canva — upload the finished card here)" />
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Full Name">
                <input className={inputCls} value={form.name} onChange={set('name')} placeholder="Ali Khan" />
              </FormField>
              <FormField label="City">
                <input className={inputCls} value={form.city} onChange={set('city')} placeholder="Islamabad" />
              </FormField>
            </div>
            <FormField label="University">
              <input className={inputCls} value={form.university} onChange={set('university')} placeholder="NUST Islamabad" />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Degree Program">
                <input className={inputCls} value={form.degreeProgram} onChange={set('degreeProgram')} placeholder="Pharm-D" />
              </FormField>
              <FormField label="Semester">
                <select className={inputCls} value={form.semester} onChange={set('semester')}>
                  <option value="">Select Semester</option>
                  {SEMESTER_OPTIONS.map(s => <option key={s}>{s}</option>)}
                </select>
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Email">
                <input className={inputCls} type="email" value={form.email} onChange={set('email')} placeholder="ali.khan@example.com" />
              </FormField>
              <FormField label="Phone Number (private — never shown publicly)">
                <input className={inputCls} value={form.phone} onChange={set('phone')} placeholder="03XX-XXXXXXX" />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Rank">
                <select className={inputCls} value={form.rank} onChange={set('rank')}>
                  <option value="">Select Rank</option>
                  {RANK_OPTIONS.map(r => <option key={r}>{r}</option>)}
                </select>
              </FormField>
              <FormField label="Ambassador Code">
                <input className={inputCls} value={form.ambCode} onChange={set('ambCode')} placeholder="MWA25678" />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Status">
                <select className={inputCls} value={form.status} onChange={set('status')}>
                  <option>Active</option><option>Inactive</option>
                </select>
              </FormField>
              <FormField label="Students Referred">
                <input className={inputCls} type="number" value={form.students} onChange={setNum('students')} />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Points">
                <input className={inputCls} type="number" value={form.points} onChange={setNum('points')} placeholder="0" />
              </FormField>
              <FormField label="Ranking">
                <StarPicker value={form.ranking} onChange={setRanking} />
              </FormField>
            </div>
            <FormField label="Social Links (all optional — leave blank to hide on profile)">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 bg-gray-50 focus-within:border-[#1655c3]">
                  <Linkedin size={15} className="text-gray-400 shrink-0" />
                  <input className="flex-1 bg-transparent py-2.5 text-sm outline-none" value={form.socialLinks.linkedin} onChange={setSocial('linkedin')} placeholder="LinkedIn URL" />
                </div>
                <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 bg-gray-50 focus-within:border-[#1655c3]">
                  <Instagram size={15} className="text-gray-400 shrink-0" />
                  <input className="flex-1 bg-transparent py-2.5 text-sm outline-none" value={form.socialLinks.instagram} onChange={setSocial('instagram')} placeholder="Instagram URL" />
                </div>
                <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 bg-gray-50 focus-within:border-[#1655c3]">
                  <Facebook size={15} className="text-gray-400 shrink-0" />
                  <input className="flex-1 bg-transparent py-2.5 text-sm outline-none" value={form.socialLinks.facebook} onChange={setSocial('facebook')} placeholder="Facebook URL" />
                </div>
                <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 bg-gray-50 focus-within:border-[#1655c3]">
                  <MessageCircle size={15} className="text-gray-400 shrink-0" />
                  <input className="flex-1 bg-transparent py-2.5 text-sm outline-none" value={form.socialLinks.whatsapp} onChange={setSocial('whatsapp')} placeholder="WhatsApp link (wa.me/...)" />
                </div>
              </div>
            </FormField>
            <FormField label="CNIC (used to verify identity before Card/Letter download — never shown publicly)">
              <input className={inputCls} value={form.cnic} onChange={set('cnic')} placeholder="12345-1234567-1" />
            </FormField>
            <div className="flex gap-3 pt-2">
              <AdminButton variant="ghost" className="flex-1" onClick={closeModal}>Cancel</AdminButton>
              <AdminButton variant="primary" className="flex-1" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : modal === 'add' ? 'Add' : 'Save'}
              </AdminButton>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
