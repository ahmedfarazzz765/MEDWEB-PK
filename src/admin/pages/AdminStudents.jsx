import { useState, useEffect } from 'react'
import { Users, UserCheck, UserX, Award } from 'lucide-react'
import StatCard   from '../components/StatCard'
import DataTable  from '../components/DataTable'
import Modal      from '../components/Modal'
import FormField, { inputCls } from '../components/FormField'
import AdminButton from '../components/AdminButton'
import ActionButtons from '../components/ActionButtons'
import { studentsService } from '../../firebase/services'

const COURSES = [
  'Clinical Pharmacy Masterclass',
  'Drug Therapy Series',
  '100 Vital Drugs',
  'How to Treat Series',
]

const emptyForm = () => ({
  name: '', email: '', city: '',
  course: COURSES[0],
  enrolled: new Date().toISOString().split('T')[0],
  status: 'Active',
  certified: false,
})

// ── columns defined OUTSIDE component so reference is stable ─────────────────
function makeColumns(openEdit, handleDelete, deleting) {
  return [
    { key: 'name',      label: 'Name',      render: v => <span className="font-semibold text-[#1a1a1a]">{v}</span> },
    { key: 'email',     label: 'Email',     render: v => <span className="text-gray-500 text-xs">{v}</span> },
    { key: 'city',      label: 'City' },
    { key: 'course',    label: 'Course',    render: v => <span className="text-xs font-medium text-[#1655c3] bg-blue-50 px-2 py-0.5 rounded-full">{v}</span> },
    { key: 'enrolled',  label: 'Enrolled' },
    { key: 'certified', label: 'Certified', render: v => v
      ? <span className="text-xs font-bold bg-green-50 text-green-600 px-2 py-0.5 rounded-full">Yes</span>
      : <span className="text-xs font-bold bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">No</span>
    },
    { key: 'status', label: 'Status', render: v =>
      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${v === 'Active' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>{v}</span>
    },
    { key: 'id', label: 'Actions', render: (v, row) => (
      <ActionButtons onEdit={() => openEdit(row)} onDelete={() => handleDelete(v)} deleteDisabled={deleting === v} />
    )},
  ]
}

export default function AdminStudents() {
  const [data,     setData]     = useState([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(false)   // false | 'add' | 'edit'
  const [form,     setForm]     = useState(emptyForm)
  const [editId,   setEditId]   = useState(null)
  const [saving,   setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(null)

  useEffect(() => {
    const unsub = studentsService.listen(rows => { setData(rows); setLoading(false) })
    return unsub
  }, [])

  const openAdd  = () => { setForm(emptyForm()); setEditId(null); setModal('add') }
  const openEdit = row => {
    setForm({ name: row.name, email: row.email, city: row.city, course: row.course, enrolled: row.enrolled, status: row.status, certified: row.certified })
    setEditId(row.id)
    setModal('edit')
  }
  const closeModal = () => { setModal(false); setEditId(null) }

  const set = field => e => setForm(prev => ({ ...prev, [field]: e.target.value }))
  const setBool = field => e => setForm(prev => ({ ...prev, [field]: e.target.value === 'Yes' }))

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) return
    setSaving(true)
    try {
      if (modal === 'add') await studentsService.add(form)
      else                 await studentsService.update(editId, form)
      closeModal()
    } catch (e) { alert('Error: ' + e.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async id => {
    if (!confirm('Delete this student?')) return
    setDeleting(id)
    try { await studentsService.delete(id) } finally { setDeleting(null) }
  }

  const columns = makeColumns(openEdit, handleDelete, deleting)
  const active    = data.filter(s => s.status === 'Active').length
  const inactive  = data.filter(s => s.status === 'Inactive').length
  const certified = data.filter(s => s.certified).length

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users}     label="Total Students" value={loading ? '…' : data.length} color="#1655c3" bg="#eff6ff" />
        <StatCard icon={UserCheck} label="Active"         value={loading ? '…' : active}      color="#64ac37" bg="#f0fdf4" />
        <StatCard icon={UserX}     label="Inactive"       value={loading ? '…' : inactive}    color="#ef4444" bg="#fef2f2" />
        <StatCard icon={Award}     label="Certified"      value={loading ? '…' : certified}   color="#1655c3" bg="#eff6ff" />
      </div>

      <DataTable
        title="All Students" columns={columns} data={data} searchKey="name" emptyMessage="No students yet — click Add Student to enroll one"
        actions={<AdminButton size="sm" onClick={openAdd}>+ Add Student</AdminButton>}
      />

      {modal && (
        <Modal title={modal === 'add' ? 'Add Student' : 'Edit Student'} onClose={closeModal}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Full Name">
                <input className={inputCls} value={form.name} onChange={set('name')} placeholder="Fatima Zahra" />
              </FormField>
              <FormField label="Email">
                <input className={inputCls} type="email" value={form.email} onChange={set('email')} placeholder="student@uni.pk" />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="City">
                <input className={inputCls} value={form.city} onChange={set('city')} placeholder="Lahore" />
              </FormField>
              <FormField label="Enrolled Date">
                <input className={inputCls} type="date" value={form.enrolled} onChange={set('enrolled')} />
              </FormField>
            </div>
            <FormField label="Course">
              <select className={inputCls} value={form.course} onChange={set('course')}>
                {COURSES.map(c => <option key={c}>{c}</option>)}
              </select>
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Status">
                <select className={inputCls} value={form.status} onChange={set('status')}>
                  <option>Active</option><option>Inactive</option>
                </select>
              </FormField>
              <FormField label="Certified">
                <select className={inputCls} value={form.certified ? 'Yes' : 'No'} onChange={setBool('certified')}>
                  <option>No</option><option>Yes</option>
                </select>
              </FormField>
            </div>
            <div className="flex gap-3 pt-2">
              <AdminButton variant="ghost" className="flex-1" onClick={closeModal}>Cancel</AdminButton>
              <AdminButton variant="primary" className="flex-1" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : modal === 'add' ? 'Add Student' : 'Save Changes'}
              </AdminButton>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
