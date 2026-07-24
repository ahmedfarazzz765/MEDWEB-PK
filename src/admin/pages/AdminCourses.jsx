import { useState, useEffect } from 'react'
import { BookOpen, Users, Star, Plus, X } from 'lucide-react'
import TagInput from '../components/TagInput'
import StatCard    from '../components/StatCard'
import DataTable   from '../components/DataTable'
import Modal       from '../components/Modal'
import FormField, { inputCls } from '../components/FormField'
import ImageUpload from '../components/ImageUpload'
import AdminButton from '../components/AdminButton'
import ActionButtons from '../components/ActionButtons'
import { coursesService } from '../../firebase/services'

const emptyForm = () => ({
  title: '', instructor: '', instructorImage: '', qualification: '', type: 'Free', status: 'Active',
  description: '', shortDescription: '', fullDescription: '',
  students: 0, revenue: 'PKR 0', rating: 0, imageUrl: '',
  whatsapp: '03291692899', courseDuration: '', tags: [], featured: false,
  posterImage: '', driveLink: '', lectures: [],
})

function makeColumns(openEdit, handleDelete) {
  return [
    { key: 'imageUrl',   label: '',          render: v => v ? <img src={v} className="w-8 h-8 rounded-lg object-cover" /> : <div className="w-8 h-8 rounded-lg bg-blue-50" /> },
    { key: 'title',      label: 'Title',     render: v => <span className="font-semibold text-[#1a1a1a]">{v}</span> },
    { key: 'instructor', label: 'Instructor',render: v => <span className="text-gray-500 text-xs">{v}</span> },
    { key: 'type',       label: 'Type',      render: v => <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: v === 'Free' ? '#dcfce7' : '#dbeafe', color: v === 'Free' ? '#16a34a' : '#1655c3' }}>{v}</span> },
    { key: 'students',   label: 'Students',  render: v => <span className="font-bold text-[#1655c3]">{(v || 0).toLocaleString()}</span> },
    { key: 'rating',     label: 'Rating',    render: v => v > 0 ? <span className="text-amber-500 font-bold">⭐ {v}</span> : <span className="text-gray-300 text-xs">—</span> },
    { key: 'status',     label: 'Status',    render: v => {
      const m = { Active: 'bg-green-50 text-green-600', Draft: 'bg-yellow-50 text-yellow-600', Archived: 'bg-gray-100 text-gray-500' }
      return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${m[v]}`}>{v}</span>
    }},
    { key: 'id', label: 'Actions', render: (v, row) => (
      <ActionButtons onEdit={() => openEdit(row)} onDelete={() => handleDelete(v)} />
    )},
  ]
}

export default function AdminCourses() {
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(false)
  const [form,    setForm]    = useState(emptyForm)
  const [editId,  setEditId]  = useState(null)
  const [saving,  setSaving]  = useState(false)

  useEffect(() => {
    const unsub = coursesService.listen(rows => { setData(rows); setLoading(false) })
    return unsub
  }, [])

  const openAdd  = () => { setForm(emptyForm()); setEditId(null); setModal('add') }
  const openEdit = row => {
    setForm({
      title: row.title, instructor: row.instructor, instructorImage: row.instructorImage || '', qualification: row.qualification || '', type: row.type, status: row.status,
      description: row.description || '', shortDescription: row.shortDescription || '', fullDescription: row.fullDescription || '',
      students: row.students || 0, revenue: row.revenue || 'PKR 0', rating: row.rating || 0,
      imageUrl: row.imageUrl || '', whatsapp: row.whatsapp || '03291692899',
      courseDuration: row.courseDuration || '', tags: Array.isArray(row.tags) ? row.tags : [], featured: !!row.featured,
      posterImage: row.posterImage || '', driveLink: row.driveLink || '', lectures: Array.isArray(row.lectures) ? row.lectures : [],
    })
    setEditId(row.id); setModal('edit')
  }
  const closeModal = () => { setModal(false); setEditId(null) }
  const set = field => e => setForm(prev => ({ ...prev, [field]: e.target.value }))
  const setNum = field => e => setForm(prev => ({ ...prev, [field]: parseFloat(e.target.value) || 0 }))
  const setImg = url => setForm(prev => ({ ...prev, imageUrl: url }))
  const setInstructorImg = url => setForm(prev => ({ ...prev, instructorImage: url }))
  const setPoster = url => setForm(prev => ({ ...prev, posterImage: url }))
  const setTags = tags => setForm(prev => ({ ...prev, tags }))

  const addLecture = () => setForm(prev => ({ ...prev, lectures: [...prev.lectures, { title: '', description: '' }] }))
  const removeLecture = i => setForm(prev => ({ ...prev, lectures: prev.lectures.filter((_, idx) => idx !== i) }))
  const setLecture = (i, field) => e => setForm(prev => ({
    ...prev, lectures: prev.lectures.map((l, idx) => idx === i ? { ...l, [field]: e.target.value } : l),
  }))

  const handleSave = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    try {
      if (modal === 'add') await coursesService.add(form)
      else                 await coursesService.update(editId, form)
      closeModal()
    } catch (e) { alert('Error: ' + e.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async id => {
    if (!confirm('Delete this course?')) return
    try { await coursesService.delete(id) } catch (e) { alert('Error: ' + e.message) }
  }

  const columns   = makeColumns(openEdit, handleDelete)
  const active    = data.filter(c => c.status === 'Active').length
  const totalStu  = data.reduce((a, c) => a + (c.students || 0), 0)
  const rated     = data.filter(c => c.rating > 0)
  const avgRating = rated.length ? (rated.reduce((a, c) => a + c.rating, 0) / rated.length).toFixed(1) : 'N/A'
  const colors    = ['#1655c3','#64ac37','#2563eb','#16a34a','#0ea5e9']

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={BookOpen} label="Total Courses"  value={loading ? '…' : data.length}                  color="#1655c3" bg="#eff6ff" />
        <StatCard icon={BookOpen} label="Active"         value={loading ? '…' : active}                       color="#64ac37" bg="#f0fdf4" />
        <StatCard icon={Users}    label="Enrollments"    value={loading ? '…' : totalStu.toLocaleString()}     color="#1655c3" bg="#eff6ff" />
        <StatCard icon={Star}     label="Avg Rating"     value={loading ? '…' : avgRating}                    color="#64ac37" bg="#f0fdf4" />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.map((c, i) => {
          const col = colors[i % colors.length]
          return (
            <div key={c.id || i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3 mb-3">
                {c.imageUrl
                  ? <img src={c.imageUrl} className="w-12 h-12 rounded-xl object-cover shrink-0" />
                  : <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-base shrink-0" style={{ background: col }}>{c.title?.charAt(0)}</div>
                }
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[#1a1a1a] text-sm truncate">{c.title}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{c.instructor}</div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                  style={{ background: c.status === 'Active' ? '#dcfce7' : '#fef9c3', color: c.status === 'Active' ? '#16a34a' : '#92400e' }}>
                  {c.status}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span><span className="font-bold text-[#1655c3]">{(c.students || 0).toLocaleString()}</span> students</span>
                {c.rating > 0 && <span className="font-bold text-amber-500">⭐ {c.rating}</span>}
              </div>
            </div>
          )
        })}
      </div>

      <DataTable title="All Courses" columns={columns} data={data} searchKey="title" emptyMessage="No courses yet — click Add Course to create one"
        actions={<AdminButton size="sm" onClick={openAdd}>+ Add Course</AdminButton>}
      />

      {modal && (
        <Modal title={modal === 'add' ? 'Add Course' : 'Edit Course'} onClose={closeModal} wide>
          <div className="space-y-4">
            <ImageUpload value={form.imageUrl} onChange={setImg} folder="medweb/courses" label="Course Thumbnail" />
            <FormField label="Course Title">
              <input className={inputCls} value={form.title} onChange={set('title')} placeholder="Clinical Pharmacy Masterclass" />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Instructor">
                <input className={inputCls} value={form.instructor} onChange={set('instructor')} placeholder="Dr. Sara Malik" />
              </FormField>
              <FormField label="Instructor Qualification">
                <input className={inputCls} value={form.qualification} onChange={set('qualification')} placeholder="Pharm-D, PMDC Registered" />
              </FormField>
            </div>
            <ImageUpload value={form.instructorImage} onChange={setInstructorImg} folder="medweb/instructors" label="Instructor Image" />
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Type">
                <select className={inputCls} value={form.type} onChange={set('type')}>
                  <option>Free</option><option>Paid</option>
                </select>
              </FormField>
              <FormField label="WhatsApp Number (for Enrollment)">
                <input className={inputCls} value={form.whatsapp} onChange={set('whatsapp')} placeholder="03XXXXXXXXX" />
              </FormField>
            </div>
            <FormField label="Description (legacy — used only if Short/Full Description below are empty)">
              <textarea className={inputCls} rows={2} value={form.description} onChange={set('description')} placeholder="Course description…" />
            </FormField>
            <FormField label="Short Description (shown on the course card)">
              <textarea className={inputCls} rows={2} value={form.shortDescription} onChange={set('shortDescription')} placeholder="One or two lines shown on the course card…" />
            </FormField>
            <FormField label="Full Description (shown on the Course Detail Page)">
              <textarea className={inputCls} rows={4} value={form.fullDescription} onChange={set('fullDescription')} placeholder="The complete course description…" />
            </FormField>
            <div className="grid grid-cols-3 gap-4">
              <FormField label="Status">
                <select className={inputCls} value={form.status} onChange={set('status')}>
                  <option>Active</option><option>Draft</option><option>Archived</option>
                </select>
              </FormField>
              <FormField label="Revenue">
                <input className={inputCls} value={form.revenue} onChange={set('revenue')} placeholder="PKR 0" />
              </FormField>
              <FormField label="Rating (0–5)">
                <input className={inputCls} type="number" min="0" max="5" step="0.1" value={form.rating} onChange={setNum('rating')} />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-4 items-end">
              <FormField label="Course Duration">
                <input className={inputCls} value={form.courseDuration} onChange={set('courseDuration')} placeholder="e.g. 6 weeks / 3 hours" />
              </FormField>
              <label className="flex items-center gap-3 cursor-pointer select-none pb-2.5">
                <input type="checkbox" checked={form.featured} onChange={e => setForm(prev => ({ ...prev, featured: e.target.checked }))} className="w-4 h-4 accent-[#1655c3]" />
                <span className="text-sm font-semibold text-gray-700">Featured Course</span>
              </label>
            </div>
            <TagInput value={form.tags} onChange={setTags} label="Tags" placeholder="e.g. Pharmacology, Free, Certificate — press Enter" />

            <div className="border-t border-gray-100 pt-4 mt-2">
              <h4 className="font-bold text-[#1a1a1a] text-sm mb-3">Course Detail Page</h4>
              <ImageUpload value={form.posterImage} onChange={setPoster} folder="medweb/courses" label="Poster Image" />
              <FormField label="Google Drive Link (lecture materials)">
                <input className={inputCls} value={form.driveLink} onChange={set('driveLink')} placeholder="https://drive.google.com/..." />
              </FormField>

              <div className="mt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-600">Lectures</span>
                  <button type="button" onClick={addLecture} className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-dashed border-[#1655c3]/40 text-[#1655c3] hover:bg-blue-50">
                    <Plus size={13} /> Add Lecture
                  </button>
                </div>
                <div className="space-y-2">
                  {form.lectures.map((l, i) => (
                    <div key={i} className="flex items-start gap-2 bg-gray-50 rounded-lg p-2.5">
                      <div className="flex-1 space-y-1.5">
                        <input className={inputCls} value={l.title} onChange={setLecture(i, 'title')} placeholder={`Lecture ${i + 1} title`} />
                        <textarea className={inputCls} rows={2} value={l.description} onChange={setLecture(i, 'description')} placeholder="Short description…" />
                      </div>
                      <button type="button" onClick={() => removeLecture(i)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 shrink-0"><X size={14} /></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <AdminButton variant="ghost" className="flex-1" onClick={closeModal}>Cancel</AdminButton>
              <AdminButton variant="primary" className="flex-1" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : modal === 'add' ? 'Add Course' : 'Save Changes'}
              </AdminButton>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
