import { useState, useEffect } from 'react'
import { FileText, Trash2, Edit2, Plus, Link2, Eye, Download, X } from 'lucide-react'
import StatCard from '../components/StatCard'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import FormField, { inputCls } from '../components/FormField'
import AdminButton from '../components/AdminButton'
import ResponsesModal from '../components/ResponsesModal'
import { formsService } from '../../firebase/services'

const FIELD_TYPES = [
  { type: 'text',          label: 'Text Input' },
  { type: 'email',         label: 'Email' },
  { type: 'phone',         label: 'Phone Number' },
  { type: 'dropdown',      label: 'Dropdown' },
  { type: 'radio',         label: 'Radio Buttons' },
  { type: 'checkbox',      label: 'Checkbox' },
  { type: 'textarea',      label: 'Textarea' },
  { type: 'qualification', label: 'Qualification' },
  { type: 'semester',      label: 'Semester' },
  { type: 'file',          label: 'File Upload' },
]

const uid = () => Math.random().toString(36).slice(2, 8)
const emptyForm = () => ({ title: '', description: '', status: 'Active', fields: [] })

export default function AdminForms() {
  const [data, setData]       = useState([])
  const [subs, setSubs]       = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(false)
  const [form, setForm]       = useState(emptyForm)
  const [editId, setEditId]   = useState(null)
  const [saving, setSaving]   = useState(false)
  const [viewSubs, setViewSubs] = useState(null) // form object
  const [search, setSearch]   = useState('')

  useEffect(() => {
    const u1 = formsService.listen(rows => { setData(rows); setLoading(false) })
    const u2 = formsService.listenSubmissions(rows => setSubs(rows))
    return () => { u1(); u2() }
  }, [])

  const openAdd  = () => { setForm(emptyForm()); setEditId(null); setModal(true) }
  const openEdit = row => { setForm({ ...emptyForm(), ...row }); setEditId(row.id); setModal(true) }
  const close    = () => { setModal(false); setEditId(null) }

  const addField = (type) => {
    const label = FIELD_TYPES.find(f => f.type === type)?.label || 'Field'
    setForm(p => ({ ...p, fields: [...p.fields, { key: uid(), type, label, placeholder: '', required: false, options: (type === 'dropdown' || type === 'radio') ? ['Option 1', 'Option 2'] : [] }] }))
  }
  const updField = (idx, patch) => setForm(p => ({ ...p, fields: p.fields.map((f, i) => i === idx ? { ...f, ...patch } : f) }))
  const delField = (idx) => setForm(p => ({ ...p, fields: p.fields.filter((_, i) => i !== idx) }))
  const moveField = (idx, dir) => setForm(p => {
    const arr = [...p.fields]; const j = idx + dir
    if (j < 0 || j >= arr.length) return p
    ;[arr[idx], arr[j]] = [arr[j], arr[idx]]
    return { ...p, fields: arr }
  })

  const handleSave = async () => {
    if (!form.title.trim()) { alert('Form title is required'); return }
    setSaving(true)
    try {
      if (editId) await formsService.update(editId, form)
      else        await formsService.add(form)
      close()
    } catch (e) { alert('Error: ' + e.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async id => {
    if (!confirm('Delete this form? Submissions are kept.')) return
    try { await formsService.delete(id) } catch (e) { alert(e.message) }
  }

  const toggleStatus = async row => {
    try { await formsService.update(row.id, { status: row.status === 'Active' ? 'Inactive' : 'Active' }) } catch (e) { alert(e.message) }
  }

  const copyLink = id => {
    const url = `${window.location.origin}/form/${id}`
    navigator.clipboard?.writeText(url)
    alert('Form link copied:\n' + url)
  }

  const subCount = id => subs.filter(s => s.formId === id).length

  const columns = [
    { key: 'title', label: 'Form Title', render: v => <span className="font-semibold text-[#1a1a1a] text-xs">{v}</span> },
    { key: 'fields', label: 'Fields', render: v => <span className="text-gray-500 text-xs">{(v || []).length}</span> },
    { key: 'id', label: 'Responses', render: v => <span className="font-bold text-[#1655c3]">{subCount(v)}</span> },
    { key: 'status', label: 'Status', render: (v, row) => (
      <button onClick={() => toggleStatus(row)} className={`text-xs font-bold px-2 py-0.5 rounded-full ${v === 'Active' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>{v}</button>
    )},
    { key: 'id', label: 'Actions', render: (v, row) => (
      <div className="flex gap-1.5">
        <button onClick={() => setViewSubs(row)} className="p-1.5 rounded-lg hover:bg-blue-50 text-[#1655c3]" title="Responses"><Eye size={13} /></button>
        <button onClick={() => copyLink(v)} className="p-1.5 rounded-lg hover:bg-blue-50 text-[#64ac37]" title="Copy link"><Link2 size={13} /></button>
        <button onClick={() => openEdit(row)} className="p-1.5 rounded-lg hover:bg-blue-50 text-[#1655c3]"><Edit2 size={13} /></button>
        <button onClick={() => handleDelete(v)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 size={13} /></button>
      </div>
    )},
  ]

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={FileText} label="Total Forms"   value={loading ? '…' : data.length} color="#1655c3" bg="#eff6ff" />
        <StatCard icon={Eye}      label="Active Forms"  value={loading ? '…' : data.filter(d => d.status === 'Active').length} color="#64ac37" bg="#f0fdf4" />
        <StatCard icon={Download} label="Total Responses" value={subs.length} color="#1655c3" bg="#eff6ff" />
      </div>

      <DataTable title="Form Builder" columns={columns} data={data} searchKey="title" emptyMessage="No forms yet — click Create Form to build one"
        actions={<AdminButton size="sm" onClick={openAdd}>+ Create Form</AdminButton>}
      />

      {/* BUILDER MODAL */}
      {modal && (
        <Modal title={editId ? 'Edit Form' : 'Create Form'} onClose={close} wide>
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <FormField label="Form Title">
                <input className={inputCls} value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Webinar Registration Form" />
              </FormField>
              <FormField label="Status">
                <select className={inputCls} value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                  <option>Active</option><option>Inactive</option>
                </select>
              </FormField>
            </div>
            <FormField label="Description">
              <input className={inputCls} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Optional description shown to users" />
            </FormField>

            {/* Add-field toolbar */}
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Add Field</p>
              <div className="flex flex-wrap gap-2">
                {FIELD_TYPES.map(ft => (
                  <button key={ft.type} onClick={() => addField(ft.type)}
                    className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-[#1655c3] hover:text-[#1655c3] transition-all">
                    <Plus size={12} /> {ft.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Field list */}
            <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
              {form.fields.length === 0 && <p className="text-sm text-gray-400 text-center py-6">No fields yet. Add fields above.</p>}
              {form.fields.map((f, idx) => (
                <div key={f.key} className="rounded-xl border border-gray-200 p-3 bg-gray-50/60">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex flex-col">
                      <button onClick={() => moveField(idx, -1)} className="text-gray-300 hover:text-[#1655c3] leading-none">▲</button>
                      <button onClick={() => moveField(idx, 1)} className="text-gray-300 hover:text-[#1655c3] leading-none">▼</button>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-[#1655c3]">{f.type}</span>
                    <input className={`${inputCls} flex-1 py-1.5`} value={f.label} onChange={e => updField(idx, { label: e.target.value })} placeholder="Field label" />
                    <label className="flex items-center gap-1 text-[11px] font-semibold text-gray-500 whitespace-nowrap">
                      <input type="checkbox" checked={f.required} onChange={e => updField(idx, { required: e.target.checked })} className="accent-[#1655c3]" /> Req.
                    </label>
                    <button onClick={() => delField(idx)} className="p-1 rounded hover:bg-red-50 text-red-400"><X size={14} /></button>
                  </div>
                  {(f.type === 'dropdown' || f.type === 'radio') && (
                    <input className={`${inputCls} py-1.5 text-xs`} value={(f.options || []).join(', ')}
                      onChange={e => updField(idx, { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                      placeholder="Comma-separated options" />
                  )}
                  {['text','email','phone','textarea','checkbox'].includes(f.type) && (
                    <input className={`${inputCls} py-1.5 text-xs`} value={f.placeholder || ''} onChange={e => updField(idx, { placeholder: e.target.value })} placeholder="Placeholder / helper text" />
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              <AdminButton variant="ghost" className="flex-1" onClick={close}>Cancel</AdminButton>
              <AdminButton variant="primary" className="flex-1" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Form'}</AdminButton>
            </div>
          </div>
        </Modal>
      )}

      {/* RESPONSES MODAL */}
      {viewSubs && (
        <ResponsesModal form={viewSubs} subs={subs.filter(s => s.formId === viewSubs.id)} onClose={() => setViewSubs(null)} />
      )}
    </div>
  )
}
