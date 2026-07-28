import { useState, useEffect } from 'react'
import { UserCheck } from 'lucide-react'
import StatCard    from '../components/StatCard'
import DataTable   from '../components/DataTable'
import Modal       from '../components/Modal'
import FormField, { inputCls } from '../components/FormField'
import ImageUpload from '../components/ImageUpload'
import AdminButton from '../components/AdminButton'
import ActionButtons from '../components/ActionButtons'
import CoverImage from '../../components/CoverImage'
import { advisoryService } from '../../firebase/services'

const emptyForm = () => ({ name: '', role: '', qualification: '', status: 'Active', imageUrl: '' })
const colors    = ['#1655c3','#64ac37','#2563eb','#16a34a','#0ea5e9','#7c3aed']

function makeColumns(openEdit, handleDelete) {
  return [
    { key: 'imageUrl',      label: '',              render: v => v ? <CoverImage src={v} bias="center 25%" className="w-9 h-9 rounded-xl" /> : <div className="w-9 h-9 rounded-xl bg-blue-50" /> },
    { key: 'name',          label: 'Name',           render: v => <span className="font-semibold text-[#1a1a1a]">{v}</span> },
    { key: 'role',          label: 'Role',           render: v => <span className="text-gray-500 text-xs">{v}</span> },
    { key: 'qualification', label: 'Qualification',  render: v => <span className="text-[#1655c3] text-xs">{v}</span> },
    { key: 'status',        label: 'Status',         render: v => <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${v === 'Active' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>{v}</span> },
    { key: 'id',            label: 'Actions',        render: (v, row) => (
      <ActionButtons onEdit={() => openEdit(row)} onDelete={() => handleDelete(v)} />
    )},
  ]
}

export default function AdminAdvisoryBoard() {
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(false)
  const [form,    setForm]    = useState(emptyForm)
  const [editId,  setEditId]  = useState(null)
  const [saving,  setSaving]  = useState(false)

  useEffect(() => {
    const unsub = advisoryService.listen(rows => { setData(rows); setLoading(false) })
    return unsub
  }, [])

  const openAdd  = () => { setForm(emptyForm()); setEditId(null); setModal('add') }
  const openEdit = row => {
    setForm({ name: row.name, role: row.role, qualification: row.qualification, status: row.status, imageUrl: row.imageUrl || '' })
    setEditId(row.id); setModal('edit')
  }
  const closeModal = () => { setModal(false); setEditId(null) }
  const set    = field => e => setForm(prev => ({ ...prev, [field]: e.target.value }))
  const setImg = url => setForm(prev => ({ ...prev, imageUrl: url }))

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      if (modal === 'add') await advisoryService.add(form)
      else                 await advisoryService.update(editId, form)
      closeModal()
    } catch (e) { alert('Error: ' + e.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async id => {
    if (!confirm('Remove advisory board member?')) return
    try { await advisoryService.delete(id) } catch (e) { alert('Error: ' + e.message) }
  }

  const columns = makeColumns(openEdit, handleDelete)

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={UserCheck} label="Total Advisors" value={loading ? '…' : data.length}                                color="#1655c3" bg="#eff6ff" />
        <StatCard icon={UserCheck} label="Active"         value={loading ? '…' : data.filter(t => t.status === 'Active').length} color="#64ac37" bg="#f0fdf4" />
        <StatCard icon={UserCheck} label="Inactive"       value={loading ? '…' : data.filter(t => t.status !== 'Active').length} color="#f59e0b" bg="#fffbeb" />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.map((m, i) => {
          const col = colors[i % colors.length]
          return (
            <div key={m.id || i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
              {m.imageUrl
                ? <CoverImage src={m.imageUrl} bias="center 25%" className="w-12 h-12 rounded-2xl shrink-0" />
                : <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-base shrink-0" style={{ background: col }}>
                    {m.name?.split(' ').map(n => n[0]).slice(0, 2).join('')}
                  </div>
              }
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[#1a1a1a] text-sm truncate">{m.name}</div>
                <div className="text-xs text-gray-400 mt-0.5 truncate">{m.role}</div>
                <div className="text-xs text-[#1655c3] mt-0.5 truncate">{m.qualification}</div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-600 shrink-0">{m.status}</span>
            </div>
          )
        })}
      </div>

      <DataTable title="Advisory Board Members" columns={columns} data={data} searchKey="name" emptyMessage="No advisory board members yet — click Add Advisor to create one"
        actions={<AdminButton size="sm" onClick={openAdd}>+ Add Advisor</AdminButton>}
      />

      {modal && (
        <Modal title={modal === 'add' ? 'Add Advisory Board Member' : 'Edit Advisor'} onClose={closeModal}>
          <div className="space-y-4">
            <ImageUpload value={form.imageUrl} onChange={setImg} folder="medweb/advisory" label="Profile Photo" />
            <FormField label="Full Name">
              <input className={inputCls} value={form.name} onChange={set('name')} placeholder="Dr. Sana" />
            </FormField>
            <FormField label="Role / Designation">
              <input className={inputCls} value={form.role} onChange={set('role')} placeholder="PhD Scholar" />
            </FormField>
            <FormField label="Qualification">
              <input className={inputCls} value={form.qualification} onChange={set('qualification')} placeholder="Chief Advisory Member" />
            </FormField>
            <FormField label="Status">
              <select className={inputCls} value={form.status} onChange={set('status')}>
                <option>Active</option><option>Inactive</option>
              </select>
            </FormField>
            <div className="flex gap-3 pt-2">
              <AdminButton variant="ghost" className="flex-1" onClick={closeModal}>Cancel</AdminButton>
              <AdminButton variant="primary" className="flex-1" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : modal === 'add' ? 'Add Advisor' : 'Save'}
              </AdminButton>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
