import { useState, useEffect } from 'react'
import { Video, Users, CheckCircle, Clock } from 'lucide-react'
import StatCard   from '../components/StatCard'
import DataTable  from '../components/DataTable'
import Modal      from '../components/Modal'
import FormField, { inputCls } from '../components/FormField'
import ImageUpload from '../components/ImageUpload'
import AdminButton from '../components/AdminButton'
import ActionButtons from '../components/ActionButtons'
import CertPositionEditor from '../components/CertPositionEditor'
import CoverImage from '../../components/CoverImage'
import { webinarsService, formsService, settingsService, ensureDefaultWebinarForm } from '../../firebase/services'

const emptyForm = () => ({
  topic: '', speaker: '', role: '', date: '', time: '',
  type: 'Free', status: 'Upcoming', registered: 0, attended: 0,
  description: '',
  webinarImage: '', speakerImage: '',
  youtubeLink: '', registrationLink: '', registrationFormId: '',
  feedbackEnabled: false, feedbackLink: '', feedbackFormId: '', feedbackButtonEnabled: true,
  certTemplate: null,
})

function makeColumns(openEdit, handleDelete) {
  return [
    { key: 'webinarImage', label: '', render: (v, row) => (
      v ? <CoverImage src={v} alt="" className="w-10 h-10 rounded-lg" />
        : <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center"><Video size={14} className="text-gray-300" /></div>
    )},
    { key: 'topic',      label: 'Topic',      render: v => <span className="font-semibold text-[#1a1a1a] text-xs max-w-[180px] block truncate">{v}</span> },
    { key: 'speaker',    label: 'Speaker',    render: v => <span className="text-gray-600 text-xs">{v}</span> },
    { key: 'date',       label: 'Date' },
    { key: 'type',       label: 'Type',       render: v => <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: v === 'Free' ? '#dcfce7' : '#dbeafe', color: v === 'Free' ? '#16a34a' : '#1655c3' }}>{v}</span> },
    { key: 'registered', label: 'Reg.', render: v => <span className="font-bold text-[#1655c3]">{v || 0}</span> },
    { key: 'status',     label: 'Status',     render: v => {
      const s = { Completed: 'bg-green-50 text-green-600', Upcoming: 'bg-blue-50 text-[#1655c3]', Live: 'bg-red-50 text-red-500' }
      return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s[v] || 'bg-gray-100 text-gray-500'}`}>{v}</span>
    }},
    { key: 'id', label: 'Actions', render: (v, row) => (
      <ActionButtons onEdit={() => openEdit(row)} onDelete={() => handleDelete(v)} />
    )},
  ]
}

export default function AdminWebinars() {
  const [data,    setData]    = useState([])
  const [forms,   setForms]   = useState([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(false)
  const [form,    setForm]    = useState(emptyForm)
  const [editId,  setEditId]  = useState(null)
  const [saving,  setSaving]  = useState(false)
  const [defaultCfg, setDefaultCfg] = useState({ webinarDefaultFormId: '' })
  const [defaultSaved, setDefaultSaved] = useState(false)

  useEffect(() => {
    const unsub = webinarsService.listen(rows => { setData(rows); setLoading(false) })
    const unsub2 = formsService.listen(rows => setForms(rows))
    settingsService.get().then(async s => {
      let formId = s?.webinarDefaultFormId || ''
      if (!formId) {
        try {
          formId = await ensureDefaultWebinarForm()
          await settingsService.update({ webinarDefaultFormId: formId })
        } catch (e) { /* non-critical — registration page has its own fallback */ }
      }
      setDefaultCfg({ webinarDefaultFormId: formId })
    }).catch(() => {})
    return () => { unsub(); unsub2() }
  }, [])

  const saveDefaultCfg = async (next) => {
    setDefaultCfg(next)
    try { await settingsService.update(next); setDefaultSaved(true); setTimeout(() => setDefaultSaved(false), 1500) } catch (e) { alert(e.message) }
  }

  const openAdd  = () => { setForm(emptyForm()); setEditId(null); setModal('add') }
  const openEdit = row => {
    setForm({ ...emptyForm(), ...row })
    setEditId(row.id); setModal('edit')
  }
  const closeModal = () => { setModal(false); setEditId(null) }
  const set = field => e => setForm(prev => ({ ...prev, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  const setVal = (field, val) => setForm(prev => ({ ...prev, [field]: val }))

  const handleSave = async () => {
    if (!form.topic.trim()) return
    setSaving(true)
    try {
      if (modal === 'add') await webinarsService.add(form)
      else                 await webinarsService.update(editId, form)
      closeModal()
    } catch (e) { alert('Error: ' + e.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async id => {
    if (!confirm('Delete this webinar?')) return
    try { await webinarsService.delete(id) } catch (e) { alert('Error: ' + e.message) }
  }

  const columns   = makeColumns(openEdit, handleDelete)
  const completed = data.filter(w => w.status === 'Completed').length
  const upcoming  = data.filter(w => w.status === 'Upcoming').length
  const totalReg  = data.reduce((a, w) => a + (w.registered || 0), 0)

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Default Registration Form settings */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-black text-[#1a1a1a] text-sm">Default Webinar Registration Form</h3>
          {defaultSaved && <span className="text-xs font-bold text-green-600">Saved ✓</span>}
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Used for the public "Register" popup on any webinar that doesn't have its own Registration Form set below. Individual webinars can still override this in their own edit form.
        </p>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-600 whitespace-nowrap">Default Form:</span>
          <select className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-gray-50"
            value={defaultCfg.webinarDefaultFormId}
            onChange={e => saveDefaultCfg({ webinarDefaultFormId: e.target.value })}>
            <option value="">None (falls back to the built-in registration page)</option>
            {forms.map(f => <option key={f.id} value={f.id}>{f.title}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Video}       label="Total Webinars"   value={loading ? '…' : data.length} color="#1655c3" bg="#eff6ff" />
        <StatCard icon={CheckCircle} label="Completed"        value={loading ? '…' : completed}   color="#64ac37" bg="#f0fdf4" />
        <StatCard icon={Clock}       label="Upcoming"         value={loading ? '…' : upcoming}    color="#1655c3" bg="#eff6ff" />
        <StatCard icon={Users}       label="Total Registered" value={loading ? '…' : totalReg}    color="#64ac37" bg="#f0fdf4" />
      </div>

      <DataTable title="All Webinars" columns={columns} data={data} searchKey="topic" emptyMessage="No webinars yet — click Schedule Webinar to add one"
        actions={<AdminButton size="sm" onClick={openAdd}>+ Schedule Webinar</AdminButton>}
      />

      {modal && (
        <Modal title={modal === 'add' ? 'Schedule Webinar' : 'Edit Webinar'} onClose={closeModal}>
          <div className="space-y-4">

            {/* Images */}
            <div className="grid sm:grid-cols-2 gap-4">
              <ImageUpload label="Webinar Poster / Image" folder="medweb/webinars" value={form.webinarImage} onChange={v => setVal('webinarImage', v)} />
              <ImageUpload label="Speaker Image" folder="medweb/speakers" value={form.speakerImage} onChange={v => setVal('speakerImage', v)} />
            </div>

            <FormField label="Webinar Title">
              <input className={inputCls} value={form.topic} onChange={set('topic')} placeholder="Webinar topic" />
            </FormField>
            <FormField label="Description">
              <textarea rows={3} className={inputCls} value={form.description} onChange={set('description')} placeholder="Short description of the webinar" />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Speaker Name">
                <input className={inputCls} value={form.speaker} onChange={set('speaker')} placeholder="Dr. Name" />
              </FormField>
              <FormField label="Speaker Qualification">
                <input className={inputCls} value={form.role} onChange={set('role')} placeholder="Clinical Pharmacist" />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Date">
                <input className={inputCls} value={form.date} onChange={set('date')} placeholder="June 12, 2026" />
              </FormField>
              <FormField label="Time">
                <input className={inputCls} value={form.time} onChange={set('time')} placeholder="7:00 PM PKT" />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Type">
                <select className={inputCls} value={form.type} onChange={set('type')}>
                  <option>Free</option><option>Paid</option>
                </select>
              </FormField>
              <FormField label="Status (controls the button)">
                <select className={inputCls} value={form.status} onChange={set('status')}>
                  <option>Upcoming</option><option>Live</option><option>Completed</option>
                </select>
              </FormField>
            </div>

            {/* BUTTON SYSTEM */}
            <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 space-y-3">
              <p className="text-xs font-bold text-[#1655c3] uppercase tracking-wider">Button System</p>
              <p className="text-[11px] text-gray-500 -mt-1">
                Status <b>Upcoming</b> → shows <b>Register Now</b>. Status <b>Live</b> → shows <b>Watch Now</b> (opens the YouTube link below).
              </p>
              <FormField label="YouTube / Live Link (used by 'Watch Now')">
                <input className={inputCls} value={form.youtubeLink} onChange={set('youtubeLink')} placeholder="https://youtube.com/live/..." />
              </FormField>
              <FormField label="Registration — attach a custom form (optional)">
                <select className={inputCls} value={form.registrationFormId} onChange={set('registrationFormId')}>
                  <option value="">Default built-in registration form</option>
                  {forms.map(f => <option key={f.id} value={f.id}>{f.title}</option>)}
                </select>
              </FormField>
              <FormField label="Or external registration link (optional)">
                <input className={inputCls} value={form.registrationLink} onChange={set('registrationLink')} placeholder="https://forms.gle/... (overrides built-in page)" />
              </FormField>
            </div>

            {/* FEEDBACK SYSTEM */}
            <div className="rounded-xl border border-gray-200 p-4 space-y-3">
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Feedback System</p>
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input type="checkbox" checked={form.feedbackEnabled} onChange={set('feedbackEnabled')} className="w-4 h-4 accent-[#1655c3]" />
                <span className="text-sm font-semibold text-gray-700">Activate feedback form for this webinar</span>
              </label>
              {form.feedbackEnabled && (
                <>
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input type="checkbox" checked={form.feedbackButtonEnabled} onChange={set('feedbackButtonEnabled')} className="w-4 h-4 accent-[#1655c3]" />
                    <span className="text-sm text-gray-600">Show feedback button on the card</span>
                  </label>
                  <FormField label="Attach custom feedback form (optional)">
                    <select className={inputCls} value={form.feedbackFormId} onChange={set('feedbackFormId')}>
                      <option value="">— Use external link below —</option>
                      {forms.map(f => <option key={f.id} value={f.id}>{f.title}</option>)}
                    </select>
                  </FormField>
                  <FormField label="External feedback link (optional)">
                    <input className={inputCls} value={form.feedbackLink} onChange={set('feedbackLink')} placeholder="https://forms.gle/..." />
                  </FormField>
                </>
              )}
            </div>

            {/* CERTIFICATE TEMPLATE */}
            <div className="rounded-xl border border-gray-200 p-4 space-y-3">
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Certificate Template</p>
              <p className="text-[11px] text-gray-500 -mt-1">
                When a student submits the Form-Builder feedback form attached above, they're automatically emailed a certificate composited from this template. Leave this empty to skip certificate issuance for this webinar. (External feedback links don't generate certificates — only the Form-Builder option above can trigger this.)
              </p>
              <ImageUpload
                label="Certificate Template Image"
                folder="medweb/certificates/templates"
                value={form.certTemplate?.imageUrl || ''}
                onChange={v => setVal('certTemplate', v ? { ...form.certTemplate, imageUrl: v } : null)}
              />
              {form.certTemplate?.imageUrl && (
                <CertPositionEditor
                  imageUrl={form.certTemplate.imageUrl}
                  namePos={form.certTemplate.namePos}
                  idPos={form.certTemplate.idPos}
                  onChange={({ namePos, idPos }) => setVal('certTemplate', { ...form.certTemplate, namePos, idPos })}
                />
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <AdminButton variant="ghost" className="flex-1" onClick={closeModal}>Cancel</AdminButton>
              <AdminButton variant="primary" className="flex-1" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : modal === 'add' ? 'Schedule' : 'Save'}
              </AdminButton>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
