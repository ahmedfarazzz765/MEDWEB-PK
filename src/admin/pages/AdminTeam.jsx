import { useState, useEffect, useMemo } from 'react'
import { UserCheck, Layers } from 'lucide-react'
import StatCard    from '../components/StatCard'
import DataTable   from '../components/DataTable'
import Modal       from '../components/Modal'
import FormField, { inputCls } from '../components/FormField'
import ImageUpload from '../components/ImageUpload'
import AdminButton from '../components/AdminButton'
import ActionButtons from '../components/ActionButtons'
import { teamService } from '../../firebase/services'

export const PRESET_CATEGORIES = [
  'Chief Executive',
  'Graphic Designer',
  'Development Team',
  'Medical Advisory',
  'Operations',
  'Marketing & PR',
]

const emptyForm = () => ({
  name: '',
  role: '',
  category: 'Chief Executive',
  customCategory: '',
  email: '',
  status: 'Active',
  imageUrl: ''
})

const colors = ['#1655c3', '#64ac37', '#2563eb', '#16a34a', '#0ea5e9', '#7c3aed']

function makeColumns(openEdit, handleDelete) {
  return [
    {
      key: 'imageUrl',
      label: '',
      render: v => v ? <img src={v} className="w-9 h-9 rounded-xl object-cover" /> : <div className="w-9 h-9 rounded-xl bg-blue-50" />
    },
    {
      key: 'name',
      label: 'Name',
      render: v => <span className="font-semibold text-[#1a1a1a]">{v}</span>
    },
    {
      key: 'role',
      label: 'Designation / Post',
      render: v => <span className="text-gray-600 text-xs font-medium">{v}</span>
    },
    {
      key: 'category',
      label: 'Category',
      render: v => (
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-[#1655c3]">
          {v || 'Chief Executive'}
        </span>
      )
    },
    {
      key: 'email',
      label: 'Email',
      render: v => v ? <a href={`mailto:${v}`} className="text-[#1655c3] hover:underline text-xs">{v}</a> : <span className="text-gray-300">-</span>
    },
    {
      key: 'status',
      label: 'Status',
      render: v => (
        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${v === 'Active' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
          {v}
        </span>
      )
    },
    {
      key: 'id',
      label: 'Actions',
      render: (v, row) => (
        <ActionButtons onEdit={() => openEdit(row)} onDelete={() => handleDelete(v)} />
      )
    },
  ]
}

export default function AdminTeam() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('All')

  useEffect(() => {
    const unsub = teamService.listen(rows => {
      setData(rows)
      setLoading(false)
    })
    return unsub
  }, [])

  // Extract all unique categories present in the system
  const categories = useMemo(() => {
    const set = new Set(PRESET_CATEGORIES)
    data.forEach(m => {
      if (m.category?.trim()) set.add(m.category.trim())
    })
    return Array.from(set)
  }, [data])

  const filteredData = useMemo(() => {
    if (selectedCategory === 'All') return data
    return data.filter(m => (m.category || 'Chief Executive') === selectedCategory)
  }, [data, selectedCategory])

  const openAdd = () => {
    setForm(emptyForm())
    setEditId(null)
    setModal('add')
  }

  const openEdit = row => {
    const cat = row.category || 'Chief Executive'
    const isCustom = !PRESET_CATEGORIES.includes(cat)
    setForm({
      name: row.name || '',
      role: row.role || '',
      category: isCustom ? 'Other' : cat,
      customCategory: isCustom ? cat : '',
      email: row.email || '',
      status: row.status || 'Active',
      imageUrl: row.imageUrl || ''
    })
    setEditId(row.id)
    setModal('edit')
  }

  const closeModal = () => {
    setModal(false)
    setEditId(null)
  }

  const set = field => e => setForm(prev => ({ ...prev, [field]: e.target.value }))
  const setImg = url => setForm(prev => ({ ...prev, imageUrl: url }))

  const handleSave = async () => {
    if (!form.name.trim()) return

    const finalCategory = form.category === 'Other'
      ? (form.customCategory.trim() || 'General')
      : form.category

    const payload = {
      name: form.name.trim(),
      role: form.role.trim(),
      category: finalCategory,
      email: form.email.trim(),
      status: form.status,
      imageUrl: form.imageUrl
    }

    setSaving(true)
    try {
      if (modal === 'add') {
        await teamService.add(payload)
      } else {
        await teamService.update(editId, payload)
      }
      closeModal()
    } catch (e) {
      alert('Error: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async id => {
    if (!confirm('Remove team member?')) return
    try {
      await teamService.delete(id)
    } catch (e) {
      alert('Error: ' + e.message)
    }
  }

  const columns = makeColumns(openEdit, handleDelete)

  return (
    <div className="p-6 space-y-6">
      {/* Stats Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={UserCheck} label="Total Members" value={loading ? '…' : data.length} color="#1655c3" bg="#eff6ff" />
        <StatCard icon={UserCheck} label="Active" value={loading ? '…' : data.filter(t => t.status === 'Active').length} color="#64ac37" bg="#f0fdf4" />
        <StatCard icon={UserCheck} label="Inactive" value={loading ? '…' : data.filter(t => t.status !== 'Active').length} color="#f59e0b" bg="#fffbeb" />
        <StatCard icon={Layers} label="Categories" value={loading ? '…' : categories.length} color="#7c3aed" bg="#f5f3ff" />
      </div>

      {/* Admin Category Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
        <span className="text-xs font-bold text-gray-400 mr-2 uppercase tracking-wider">Filter Category:</span>
        <button
          onClick={() => setSelectedCategory('All')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            selectedCategory === 'All'
              ? 'bg-[#1655c3] text-white shadow-sm'
              : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
          }`}
        >
          All ({data.length})
        </button>
        {categories.map(cat => {
          const count = data.filter(m => (m.category || 'Chief Executive') === cat).length
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                selectedCategory === cat
                  ? 'bg-[#1655c3] text-white shadow-sm'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {cat} ({count})
            </button>
          )
        })}
      </div>

      {/* Member Cards Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredData.map((m, i) => {
          const col = colors[i % colors.length]
          return (
            <div key={m.id || i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center gap-4 hover:shadow-md transition-shadow relative overflow-hidden">
              {m.imageUrl ? (
                <img src={m.imageUrl} className="w-12 h-12 rounded-2xl object-cover shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-base shrink-0" style={{ background: col }}>
                  {m.name?.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[#1a1a1a] text-sm truncate">{m.name}</div>
                <div className="text-xs text-gray-500 font-medium truncate">{m.role || 'Team Member'}</div>
                <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#1655c3]">
                    {m.category || 'Chief Executive'}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m.status === 'Active' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                    {m.status}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Data Table */}
      <DataTable
        title="Team Members"
        columns={columns}
        data={filteredData}
        searchKey="name"
        emptyMessage="No team members match this category — click Add Member to create one."
        actions={<AdminButton size="sm" onClick={openAdd}>+ Add Member</AdminButton>}
      />

      {/* Add / Edit Modal */}
      {modal && (
        <Modal title={modal === 'add' ? 'Add Team Member' : 'Edit Member'} onClose={closeModal}>
          <div className="space-y-4">
            <ImageUpload value={form.imageUrl} onChange={setImg} folder="medweb/team" label="Profile Photo" />
            
            <FormField label="Full Name">
              <input className={inputCls} value={form.name} onChange={set('name')} placeholder="Dr. Shahroz Abbas" />
            </FormField>

            <FormField label="Designation / Post">
              <input className={inputCls} value={form.role} onChange={set('role')} placeholder="Chief Executive Officer / Lead Designer" />
            </FormField>

            <FormField label="Category">
              <select className={inputCls} value={form.category} onChange={set('category')}>
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
                <option value="Other">+ Add Custom Category...</option>
              </select>
            </FormField>

            {form.category === 'Other' && (
              <FormField label="Custom Category Name">
                <input
                  className={inputCls}
                  value={form.customCategory}
                  onChange={set('customCategory')}
                  placeholder="e.g. Video Editor, Content Strategist"
                />
              </FormField>
            )}

            <FormField label="Email">
              <input className={inputCls} type="email" value={form.email} onChange={set('email')} placeholder="name@medweb.pk" />
            </FormField>

            <FormField label="Status">
              <select className={inputCls} value={form.status} onChange={set('status')}>
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </FormField>

            <div className="flex gap-3 pt-2">
              <AdminButton variant="ghost" className="flex-1" onClick={closeModal}>Cancel</AdminButton>
              <AdminButton variant="primary" className="flex-1" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : modal === 'add' ? 'Add Member' : 'Save Changes'}
              </AdminButton>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
