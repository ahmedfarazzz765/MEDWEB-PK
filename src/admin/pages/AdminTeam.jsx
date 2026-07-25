import { useState, useEffect, useMemo, useRef } from 'react'
import { UserCheck, Layers, Plus, Image as ImageIcon, Sparkles } from 'lucide-react'
import StatCard    from '../components/StatCard'
import DataTable   from '../components/DataTable'
import Modal       from '../components/Modal'
import FormField, { inputCls } from '../components/FormField'
import ImageUpload from '../components/ImageUpload'
import AdminButton from '../components/AdminButton'
import ActionButtons from '../components/ActionButtons'
import { teamService, teamCategoriesService } from '../../firebase/services'
import { DEFAULT_TEAM_CATEGORIES } from '../../constants/teamCategories'

export const PRESET_CATEGORIES = [
  'Chief Executive',
  'Graphic Designer',
  'Development Team',
  'Medical Advisory',
  'Operations',
  'Marketing & PR',
]

const emptyMemberForm = () => ({
  name: '',
  role: '',
  category: 'Chief Executive',
  customCategory: '',
  email: '',
  bio: '',
  linkedinUrl: '',
  status: 'Active',
  imageUrl: ''
})

const emptyCatForm = () => ({
  name: '',
  desc: '',
  imageUrl: '',
  accent: 'green'
})

const colors = ['#1655c3', '#64ac37', '#2563eb', '#16a34a', '#0ea5e9', '#7c3aed']

function makeMemberColumns(openEdit, handleDelete) {
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
      key: 'linkedinUrl',
      label: 'LinkedIn',
      render: (v, row) => {
        const link = v || row.linkedin
        return link ? (
          <a href={link.startsWith('http') ? link : `https://${link}`} target="_blank" rel="noreferrer" className="text-[#0a66c2] text-xs hover:underline font-semibold">
            Profile
          </a>
        ) : (
          <span className="text-gray-300">-</span>
        )
      }
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
  const [activeTab, setActiveTab] = useState('members') // 'members' | 'categories'
  const [data, setData] = useState([])
  const [dbCategories, setDbCategories] = useState([])
  const [loading, setLoading] = useState(true)

  // Member Modal states
  const [memberModal, setMemberModal] = useState(false)
  const [memberForm, setMemberForm] = useState(emptyMemberForm)
  const [memberEditId, setMemberEditId] = useState(null)

  // Category Modal states
  const [catModal, setCatModal] = useState(false)
  const [catForm, setCatForm] = useState(emptyCatForm)
  const [catEditId, setCatEditId] = useState(null)

  const [saving, setSaving] = useState(false)
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All')
  const [catsLoaded, setCatsLoaded] = useState(false)
  const seedAttempted = useRef(false)

  useEffect(() => {
    const unsubTeam = teamService.listen(rows => {
      setData(rows)
      setLoading(false)
    })
    const unsubCats = teamCategoriesService.listen(cats => {
      setDbCategories(cats)
      setCatsLoaded(true)
    })
    return () => {
      unsubTeam()
      unsubCats()
    }
  }, [])

  // One-time seed: turns the hardcoded default category cards (previously
  // shown as a frozen fallback with no Firestore id, hence no Edit/Delete)
  // into real editable/deletable docs the first time this page loads with
  // an empty/partial teamCategories collection.
  useEffect(() => {
    if (!catsLoaded || seedAttempted.current) return
    seedAttempted.current = true
    const existingNames = new Set(dbCategories.map(c => c.name?.trim().toLowerCase()))
    const missing = DEFAULT_TEAM_CATEGORIES.filter(tpl => !existingNames.has(tpl.name.toLowerCase()))
    missing.forEach(tpl => {
      const { label1, label2, icon, ...catData } = tpl
      teamCategoriesService.add(catData).catch(() => {})
    })
  }, [catsLoaded, dbCategories])

  // All unique category names from DB + Presets
  const categoryNames = useMemo(() => {
    const set = new Set(PRESET_CATEGORIES)
    dbCategories.forEach(c => {
      if (c.name?.trim()) set.add(c.name.trim())
    })
    data.forEach(m => {
      if (m.category?.trim()) set.add(m.category.trim())
    })
    return Array.from(set)
  }, [data, dbCategories])

  const filteredMembers = useMemo(() => {
    if (selectedCategoryFilter === 'All') return data
    return data.filter(m => (m.category || 'Chief Executive') === selectedCategoryFilter)
  }, [data, selectedCategoryFilter])

  // --- Member Handlers ---
  const openAddMember = () => {
    setMemberForm(emptyMemberForm())
    setMemberEditId(null)
    setMemberModal('add')
  }

  const openEditMember = row => {
    const cat = row.category || 'Chief Executive'
    const isCustom = !categoryNames.includes(cat)
    setMemberForm({
      name: row.name || '',
      role: row.role || '',
      category: isCustom ? 'Other' : cat,
      customCategory: isCustom ? cat : '',
      email: row.email || '',
      bio: row.bio || '',
      linkedinUrl: row.linkedinUrl || row.linkedin || '',
      status: row.status || 'Active',
      imageUrl: row.imageUrl || ''
    })
    setMemberEditId(row.id)
    setMemberModal('edit')
  }

  const handleSaveMember = async () => {
    if (!memberForm.name.trim()) return

    const finalCategory = memberForm.category === 'Other'
      ? (memberForm.customCategory.trim() || 'General')
      : memberForm.category

    const payload = {
      name: memberForm.name.trim(),
      role: memberForm.role.trim(),
      category: finalCategory,
      email: memberForm.email.trim(),
      bio: memberForm.bio.trim(),
      linkedinUrl: memberForm.linkedinUrl.trim(),
      status: memberForm.status,
      imageUrl: memberForm.imageUrl
    }

    setSaving(true)
    try {
      if (memberModal === 'add') {
        await teamService.add(payload)
      } else {
        await teamService.update(memberEditId, payload)
      }
      setMemberModal(false)
    } catch (e) {
      alert('Error: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteMember = async id => {
    if (!confirm('Remove team member?')) return
    try {
      await teamService.delete(id)
    } catch (e) {
      alert('Error: ' + e.message)
    }
  }

  // --- Category Handlers ---
  const openAddCategory = () => {
    setCatForm(emptyCatForm())
    setCatEditId(null)
    setCatModal('add')
  }

  const openEditCategory = cat => {
    setCatForm({
      name: cat.name || '',
      desc: cat.desc || '',
      imageUrl: cat.imageUrl || '',
      accent: cat.accent || 'green'
    })
    setCatEditId(cat.id)
    setCatModal('edit')
  }

  const handleSaveCategory = async () => {
    if (!catForm.name.trim()) return

    const payload = {
      name: catForm.name.trim(),
      desc: catForm.desc.trim(),
      imageUrl: catForm.imageUrl.trim(),
      accent: catForm.accent
    }

    setSaving(true)
    try {
      if (catModal === 'add') {
        await teamCategoriesService.add(payload)
      } else {
        await teamCategoriesService.update(catEditId, payload)
      }
      setCatModal(false)
    } catch (e) {
      alert('Error: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCategory = async id => {
    if (!confirm('Delete this category card?')) return
    try {
      await teamCategoriesService.delete(id)
    } catch (e) {
      alert('Error: ' + e.message)
    }
  }

  const memberColumns = makeMemberColumns(openEditMember, handleDeleteMember)

  return (
    <div className="p-6 space-y-6">
      {/* Stats Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={UserCheck} label="Total Members" value={loading ? '…' : data.length} color="#1655c3" bg="#eff6ff" />
        <StatCard icon={UserCheck} label="Active" value={loading ? '…' : data.filter(t => t.status === 'Active').length} color="#64ac37" bg="#f0fdf4" />
        <StatCard icon={UserCheck} label="Inactive" value={loading ? '…' : data.filter(t => t.status !== 'Active').length} color="#f59e0b" bg="#fffbeb" />
        <StatCard icon={Layers} label="Categories" value={loading ? '…' : categoryNames.length} color="#7c3aed" bg="#f5f3ff" />
      </div>

      {/* Main Tabs Switcher */}
      <div className="flex items-center justify-between bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('members')}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'members'
                ? 'bg-[#1655c3] text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Team Members ({data.length})
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'categories'
                ? 'bg-[#1655c3] text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Team Category Cards ({dbCategories.length || categoryNames.length})
          </button>
        </div>

        {activeTab === 'members' ? (
          <AdminButton size="sm" onClick={openAddMember}>+ Add Member</AdminButton>
        ) : (
          <AdminButton size="sm" onClick={openAddCategory}>+ Add Category Card</AdminButton>
        )}
      </div>

      {/* ─── TAB 1: MEMBERS MANAGEMENT ─── */}
      {activeTab === 'members' && (
        <div className="space-y-6">
          {/* Admin Category Filter Bar */}
          <div className="flex flex-wrap items-center gap-2 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
            <span className="text-xs font-bold text-gray-400 mr-2 uppercase tracking-wider">Filter Category:</span>
            <button
              onClick={() => setSelectedCategoryFilter('All')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                selectedCategoryFilter === 'All'
                  ? 'bg-[#1655c3] text-white shadow-sm'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              All ({data.length})
            </button>
            {categoryNames.map(cat => {
              const count = data.filter(m => (m.category || 'Chief Executive') === cat).length
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    selectedCategoryFilter === cat
                      ? 'bg-[#1655c3] text-white shadow-sm'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {cat} ({count})
                </button>
              )
            })}
          </div>

          {/* Member Cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMembers.map((m, i) => {
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
                    {m.bio && <div className="text-[11px] text-gray-400 truncate mt-0.5">{m.bio}</div>}
                    <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
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
            columns={memberColumns}
            data={filteredMembers}
            searchKey="name"
            emptyMessage="No team members match this category — click Add Member to create one."
          />
        </div>
      )}

      {/* ─── TAB 2: CATEGORY CARDS MANAGEMENT (Why Medweb style) ─── */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-xs text-[#1655c3] font-medium leading-relaxed">
            💡 <strong>Why MEDWEB Style Category Cards:</strong> These Category Cards appear in the continuous Marquee Slider on the homepage. Adding or editing a Category Card here lets you upload a custom thumbnail image, set description, and control the card design shown to visitors.
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {(dbCategories.length > 0 ? dbCategories : DEFAULT_TEAM_CATEGORIES).map((cat, i) => {
              const count = data.filter(m => (m.category || 'Chief Executive') === cat.name).length
              return (
                <div key={cat.id || i} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between">
                  {/* Thumbnail Image Header */}
                  <div className="relative aspect-video bg-gray-100">
                    {cat.imageUrl ? (
                      <img src={cat.imageUrl} alt={cat.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <ImageIcon size={32} />
                      </div>
                    )}
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-extrabold text-[#0f172a] text-base">{cat.name}</h3>
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-green-50 text-green-600">
                          {count} {count === 1 ? 'Member' : 'Members'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed mb-4">
                        {cat.desc || `Explore team members under ${cat.name}`}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-gray-50 flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-[#1655c3]">Why MEDWEB Style</span>
                      {cat.id && (
                        <ActionButtons
                          onEdit={() => openEditCategory(cat)}
                          onDelete={() => handleDeleteCategory(cat.id)}
                        />
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Add / Edit Member Modal */}
      {memberModal && (
        <Modal title={memberModal === 'add' ? 'Add Team Member' : 'Edit Member'} onClose={() => setMemberModal(false)}>
          <div className="space-y-4">
            <ImageUpload value={memberForm.imageUrl} onChange={url => setMemberForm(p => ({ ...p, imageUrl: url }))} folder="medweb/team" label="Profile Photo" circle />
            
            <FormField label="Full Name">
              <input className={inputCls} value={memberForm.name} onChange={e => setMemberForm(p => ({ ...p, name: e.target.value }))} placeholder="Dr. Shahroz Abbas" />
            </FormField>

            <FormField label="Designation / Post">
              <input className={inputCls} value={memberForm.role} onChange={e => setMemberForm(p => ({ ...p, role: e.target.value }))} placeholder="Founder & CEO / Lead Designer" />
            </FormField>

            <FormField label="Category">
              <select className={inputCls} value={memberForm.category} onChange={e => setMemberForm(p => ({ ...p, category: e.target.value }))}>
                {categoryNames.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
                <option value="Other">+ Add Custom Category...</option>
              </select>
            </FormField>

            {memberForm.category === 'Other' && (
              <FormField label="Custom Category Name">
                <input
                  className={inputCls}
                  value={memberForm.customCategory}
                  onChange={e => setMemberForm(p => ({ ...p, customCategory: e.target.value }))}
                  placeholder="e.g. Video Editor, Content Strategist"
                />
              </FormField>
            )}

            <FormField label="Short Bio / Details / Qualifications">
              <textarea
                className={`${inputCls} h-20 resize-none`}
                value={memberForm.bio}
                onChange={e => setMemberForm(p => ({ ...p, bio: e.target.value }))}
                placeholder="e.g. Pharm-D, Medical Content Writer, Researcher"
              />
            </FormField>

            <FormField label="LinkedIn Profile URL">
              <input
                className={inputCls}
                value={memberForm.linkedinUrl}
                onChange={e => setMemberForm(p => ({ ...p, linkedinUrl: e.target.value }))}
                placeholder="https://linkedin.com/in/username"
              />
            </FormField>

            <FormField label="Email">
              <input className={inputCls} type="email" value={memberForm.email} onChange={e => setMemberForm(p => ({ ...p, email: e.target.value }))} placeholder="name@medweb.pk" />
            </FormField>

            <FormField label="Status">
              <select className={inputCls} value={memberForm.status} onChange={e => setMemberForm(p => ({ ...p, status: e.target.value }))}>
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </FormField>

            <div className="flex gap-3 pt-2">
              <AdminButton variant="ghost" className="flex-1" onClick={() => setMemberModal(false)}>Cancel</AdminButton>
              <AdminButton variant="primary" className="flex-1" onClick={handleSaveMember} disabled={saving}>
                {saving ? 'Saving…' : memberModal === 'add' ? 'Add Member' : 'Save Changes'}
              </AdminButton>
            </div>
          </div>
        </Modal>
      )}

      {/* Add / Edit Category Card Modal */}
      {catModal && (
        <Modal title={catModal === 'add' ? 'Add Category Card' : 'Edit Category Card'} onClose={() => setCatModal(false)}>
          <div className="space-y-4">
            <ImageUpload value={catForm.imageUrl} onChange={url => setCatForm(p => ({ ...p, imageUrl: url }))} folder="medweb/categories" label="Category Thumbnail Image" />

            <FormField label="Category Name">
              <input className={inputCls} value={catForm.name} onChange={e => setCatForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Graphic Designer, Medical Advisory" />
            </FormField>

            <FormField label="Description">
              <textarea
                className={`${inputCls} h-20 resize-none`}
                value={catForm.desc}
                onChange={e => setCatForm(p => ({ ...p, desc: e.target.value }))}
                placeholder="Short tagline for this category..."
              />
            </FormField>

            <FormField label="Accent Color">
              <select className={inputCls} value={catForm.accent} onChange={e => setCatForm(p => ({ ...p, accent: e.target.value }))}>
                <option value="green">Green (#64ac37)</option>
                <option value="blue">Blue (#1655c3)</option>
              </select>
            </FormField>

            <div className="flex gap-3 pt-2">
              <AdminButton variant="ghost" className="flex-1" onClick={() => setCatModal(false)}>Cancel</AdminButton>
              <AdminButton variant="primary" className="flex-1" onClick={handleSaveCategory} disabled={saving}>
                {saving ? 'Saving…' : catModal === 'add' ? 'Add Category' : 'Save Changes'}
              </AdminButton>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
