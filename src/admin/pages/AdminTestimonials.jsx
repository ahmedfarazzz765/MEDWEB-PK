import { useState, useEffect } from 'react'
import { Star, MessageSquare, CheckCircle } from 'lucide-react'
import StatCard from '../components/StatCard'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import FormField, { inputCls } from '../components/FormField'
import ImageUpload from '../components/ImageUpload'
import AdminButton from '../components/AdminButton'
import ActionButtons from '../components/ActionButtons'
import { testimonialsService } from '../../firebase/services'

const emptyForm = () => ({ name: '', uni: '', role: '', text: '', img: '', stars: 5, status: 'Approved', category: '' })

export default function AdminTestimonials() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const unsub = testimonialsService.listen(rows => { setData(rows); setLoading(false) })
    return unsub
  }, [])

  const openAdd = () => { setForm(emptyForm()); setEditId(null); setModal(true) }
  const openEdit = row => { setForm({ ...emptyForm(), ...row }); setEditId(row.id); setModal(true) }
  const close = () => { setModal(false); setEditId(null) }
  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }))

  const handleSave = async () => {
    if (!form.name.trim() || !form.text.trim()) { alert('Name and testimonial text are required'); return }
    setSaving(true)
    try {
      const payload = { ...form, stars: Number(form.stars) || 5 }
      if (editId) await testimonialsService.update(editId, payload)
      else await testimonialsService.add(payload)
      close()
    } catch (e) { alert(e.message) } finally { setSaving(false) }
  }

  const handleDelete = async id => {
    if (!confirm('Delete this testimonial?')) return
    try { await testimonialsService.delete(id) } catch (e) { alert(e.message) }
  }

  const toggleStatus = async row => {
    try { await testimonialsService.update(row.id, { status: row.status === 'Approved' ? 'Hidden' : 'Approved' }) } catch (e) { alert(e.message) }
  }

  const columns = [
    { key: 'img', label: '', render: (v, row) => (
      v ? <img src={v} alt="" className="w-9 h-9 rounded-full object-cover" />
        : <div className="w-9 h-9 rounded-full bg-blue-50 text-[#1655c3] flex items-center justify-center text-xs font-bold">{(row.name || '?')[0]}</div>
    )},
    { key: 'name', label: 'Name', render: v => <span className="font-semibold text-[#1a1a1a] text-xs">{v}</span> },
    { key: 'uni', label: 'University / Role', render: (v, row) => <span className="text-gray-500 text-xs">{v || row.role || '-'}</span> },
    { key: 'stars', label: 'Stars', render: v => <span className="text-yellow-500 text-xs">{'★'.repeat(v || 5)}</span> },
    { key: 'status', label: 'Status', render: (v, row) => (
      <button onClick={() => toggleStatus(row)} className={`text-xs font-bold px-2 py-0.5 rounded-full ${v === 'Approved' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>{v || 'Approved'}</button>
    )},
    { key: 'id', label: 'Actions', render: (v, row) => (
      <ActionButtons onEdit={() => openEdit(row)} onDelete={() => handleDelete(v)} />
    )},
  ]

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={MessageSquare} label="Total" value={loading ? '…' : data.length} color="#1655c3" bg="#eff6ff" />
        <StatCard icon={CheckCircle} label="Approved" value={loading ? '…' : data.filter(d => (d.status || 'Approved') === 'Approved').length} color="#64ac37" bg="#f0fdf4" />
        <StatCard icon={Star} label="Avg Stars" value={loading || !data.length ? '…' : (data.reduce((a, d) => a + (d.stars || 5), 0) / data.length).toFixed(1)} color="#1655c3" bg="#eff6ff" />
      </div>

      <DataTable title="Testimonials" columns={columns} data={data} searchKey="name" emptyMessage="No testimonials yet — click Add Testimonial to create one"
        actions={<AdminButton size="sm" onClick={openAdd}>+ Add Testimonial</AdminButton>}
      />

      {modal && (
        <Modal title={editId ? 'Edit Testimonial' : 'Add Testimonial'} onClose={close}>
          <div className="space-y-4">
            <ImageUpload label="Student Photo" folder="medweb/testimonials" value={form.img} onChange={v => setForm(p => ({ ...p, img: v }))} />
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Name"><input className={inputCls} value={form.name} onChange={set('name')} /></FormField>
              <FormField label="Stars"><select className={inputCls} value={form.stars} onChange={set('stars')}>{[5,4,3,2,1].map(n => <option key={n} value={n}>{n}</option>)}</select></FormField>
            </div>
            <FormField label="University / Role"><input className={inputCls} value={form.uni} onChange={set('uni')} placeholder="University of Health Sciences, Lahore" /></FormField>
            <FormField label="Category / Topic Tag"><input className={inputCls} value={form.category} onChange={set('category')} placeholder="e.g. Clinical Pharmacy Masterclass, Webinar, Certification" /></FormField>
            <FormField label="Testimonial Text"><textarea rows={4} className={inputCls} value={form.text} onChange={set('text')} /></FormField>
            <FormField label="Status"><select className={inputCls} value={form.status} onChange={set('status')}><option>Approved</option><option>Hidden</option></select></FormField>
            <div className="flex gap-3 pt-2">
              <AdminButton variant="ghost" className="flex-1" onClick={close}>Cancel</AdminButton>
              <AdminButton variant="primary" className="flex-1" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</AdminButton>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
