import { useState, useEffect } from 'react'
import { Megaphone, Eye, EyeOff, CalendarClock, ExternalLink, FileText } from 'lucide-react'
import StatCard    from '../components/StatCard'
import DataTable   from '../components/DataTable'
import Modal       from '../components/Modal'
import FormField, { inputCls } from '../components/FormField'
import ImageUpload from '../components/ImageUpload'
import AdminButton from '../components/AdminButton'
import ActionButtons from '../components/ActionButtons'
import CoverImage from '../../components/CoverImage'
import SortableGrid, { SortableItem } from '../components/SortableGrid'
import { announcementsService } from '../../firebase/services'
import { isAnnouncementActive } from '../../lib/announcements'

function slugify(str) {
  return String(str || '').toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'announcement'
}

function uniqueSlug(base, existingSlugs) {
  let slug = base, n = 2
  while (existingSlugs.has(slug)) { slug = `${base}-${n}`; n++ }
  return slug
}

const emptyForm = () => ({
  title: '', shortDescription: '', content: '', imageUrl: '',
  linkType: 'internal', externalUrl: '', slug: '', ctaLabel: 'Learn More',
  enabled: true, autoHideDate: '',
})

export default function AdminAnnouncements() {
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(false)
  const [form,    setForm]    = useState(emptyForm)
  const [editId,  setEditId]  = useState(null)
  const [saving,  setSaving]  = useState(false)

  useEffect(() => {
    const unsub = announcementsService.listen(rows => { setData(rows); setLoading(false) })
    return unsub
  }, [])

  // Backfill: any announcement saved before drag-reorder existed gets an
  // `order` matching its current position (already createdAt-desc), same
  // self-heal pattern as Courses/Team/Ambassadors.
  useEffect(() => {
    if (loading) return
    const missing = data.filter(a => a.order === undefined || a.order === null)
    if (missing.length === 0) return
    missing.forEach(a => {
      const idx = data.findIndex(x => x.id === a.id)
      announcementsService.update(a.id, { order: idx }).catch(() => {})
    })
  }, [data, loading])

  const handleReorder = reordered => {
    setData(reordered) // optimistic
    announcementsService.reorder(reordered).catch(e => alert('Error saving order: ' + e.message))
  }

  const openAdd  = () => { setForm(emptyForm()); setEditId(null); setModal('add') }
  const openEdit = row => {
    setForm({
      title: row.title || '', shortDescription: row.shortDescription || '', content: row.content || '',
      imageUrl: row.imageUrl || '', linkType: row.linkType || 'internal', externalUrl: row.externalUrl || '',
      slug: row.slug || '', ctaLabel: row.ctaLabel || 'Learn More',
      enabled: row.enabled !== false, autoHideDate: row.autoHideDate || '',
    })
    setEditId(row.id); setModal('edit')
  }
  const closeModal = () => { setModal(false); setEditId(null) }

  const set = field => e => setForm(prev => {
    const next = { ...prev, [field]: e.target.value }
    if (field === 'title' && !prev.slug) next.slug = slugify(e.target.value)
    return next
  })
  const setImg = url => setForm(prev => ({ ...prev, imageUrl: url }))

  const handleSave = async () => {
    if (!form.title.trim()) { alert('Title is required'); return }
    if (form.linkType === 'external' && !form.externalUrl.trim()) { alert('External URL is required for an external link'); return }
    setSaving(true)
    try {
      const existingSlugs = new Set(data.filter(a => a.id !== editId).map(a => a.slug).filter(Boolean))
      const payload = {
        ...form,
        title: form.title.trim(),
        slug: uniqueSlug(slugify(form.slug || form.title), existingSlugs),
      }
      if (modal === 'add') await announcementsService.add(payload)
      else                 await announcementsService.update(editId, payload)
      closeModal()
    } catch (e) { alert('Error: ' + e.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async id => {
    if (!confirm('Delete this announcement?')) return
    try { await announcementsService.delete(id) } catch (e) { alert('Error: ' + e.message) }
  }

  const toggleEnabled = async row => {
    try { await announcementsService.update(row.id, { enabled: row.enabled === false }) } catch (e) { alert(e.message) }
  }

  const activeCount = data.filter(isAnnouncementActive).length

  const columns = [
    { key: 'imageUrl', label: '', render: v => v ? <CoverImage src={v} className="w-9 h-9 rounded-lg" /> : <div className="w-9 h-9 rounded-lg bg-blue-50" /> },
    { key: 'title', label: 'Title', render: v => <span className="font-semibold text-[#1a1a1a]">{v}</span> },
    { key: 'linkType', label: 'Link', render: v => (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500">
        {v === 'external' ? <><ExternalLink size={12} /> External</> : <><FileText size={12} /> Internal Page</>}
      </span>
    )},
    { key: 'autoHideDate', label: 'Auto-hide', render: v => v
      ? <span className="inline-flex items-center gap-1 text-xs text-gray-500"><CalendarClock size={12} /> {v}</span>
      : <span className="text-gray-300 text-xs">—</span>
    },
    { key: 'id', label: 'Status', render: (v, row) => {
      const active = isAnnouncementActive(row)
      return (
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
          {row.enabled === false ? 'Disabled' : active ? 'Active' : 'Expired'}
        </span>
      )
    }},
    { key: 'enabled', label: 'Toggle', render: (v, row) => (
      <button onClick={() => toggleEnabled(row)} className="p-1.5 rounded-lg hover:bg-blue-50 text-[#1655c3]" title={v === false ? 'Enable' : 'Disable'}>
        {v === false ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    )},
    { key: 'id2', label: 'Actions', render: (v, row) => (
      <ActionButtons onEdit={() => openEdit(row)} onDelete={() => handleDelete(row.id)} />
    )},
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={Megaphone} label="Total Announcements" value={loading ? '…' : data.length} color="#1655c3" bg="#eff6ff" />
        <StatCard icon={Eye}       label="Currently Active"    value={loading ? '…' : activeCount}   color="#64ac37" bg="#f0fdf4" />
        <StatCard icon={EyeOff}    label="Disabled/Expired"    value={loading ? '…' : data.length - activeCount} color="#f59e0b" bg="#fffbeb" />
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-xs text-[#1655c3] font-medium leading-relaxed">
        💡 <strong>Homepage Banner:</strong> Enabled, not-yet-expired announcements appear as a prominent banner above the Hero section. One shows full-width; 2-3 active at once auto-rotate. Drag to set which shows first.
      </div>

      {data.length > 1 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-bold text-[#1a1a1a] text-sm mb-1">Reorder (Priority)</h3>
          <p className="text-xs text-gray-400 mb-4">Drag the <span className="font-semibold text-gray-500">⠿</span> handle — first card shows first when multiple are active.</p>
          <SortableGrid items={data} onReorder={handleReorder} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.map(a => (
              <SortableItem key={a.id} id={a.id} className="flex items-center gap-3 bg-gray-50 rounded-xl border border-gray-100 p-3 pr-9">
                {a.imageUrl ? (
                  <CoverImage src={a.imageUrl} className="w-10 h-10 rounded-lg shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-[#1655c3] flex items-center justify-center text-white shrink-0"><Megaphone size={16} /></div>
                )}
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[#1a1a1a] truncate">{a.title}</div>
                  <div className="text-[11px] text-gray-400 truncate">{isAnnouncementActive(a) ? 'Active' : 'Not showing'}</div>
                </div>
              </SortableItem>
            ))}
          </SortableGrid>
        </div>
      )}

      <DataTable title="All Announcements" columns={columns} data={data} searchKey="title" emptyMessage="No announcements yet — click Add Announcement to create one"
        actions={<AdminButton size="sm" onClick={openAdd}>+ Add Announcement</AdminButton>}
      />

      {modal && (
        <Modal title={modal === 'add' ? 'Add Announcement' : 'Edit Announcement'} onClose={closeModal} wide>
          <div className="space-y-4">
            <ImageUpload value={form.imageUrl} onChange={setImg} folder="medweb/announcements" label="Banner Image" />

            <FormField label="Title">
              <input className={inputCls} value={form.title} onChange={set('title')} placeholder="e.g. National Medical Conference 2026" />
            </FormField>

            <FormField label="Short Description (shown on the homepage banner)">
              <textarea className={`${inputCls} resize-none`} rows={2} value={form.shortDescription} onChange={set('shortDescription')} placeholder="One or two lines that grab attention…" />
            </FormField>

            <FormField label="Call-to-Action Button Text">
              <input className={inputCls} value={form.ctaLabel} onChange={set('ctaLabel')} placeholder="Learn More" />
            </FormField>

            <FormField label="Link Type">
              <select className={inputCls} value={form.linkType} onChange={set('linkType')}>
                <option value="internal">Internal page (auto-generated on this site)</option>
                <option value="external">External URL (a separate website)</option>
              </select>
            </FormField>

            {form.linkType === 'external' ? (
              <FormField label="External URL">
                <input className={inputCls} value={form.externalUrl} onChange={set('externalUrl')} placeholder="https://conference.example.com" />
              </FormField>
            ) : (
              <>
                <FormField label="URL Slug (auto-generated from title — edit to customize)">
                  <input className={inputCls} value={form.slug} onChange={set('slug')} placeholder="national-medical-conference-2026" />
                  {form.slug && <p className="text-[11px] text-gray-400 mt-1">/announcements/{form.slug}</p>}
                </FormField>
                <FormField label="Full Content (shown on the announcement's own page)">
                  <textarea className={`${inputCls} resize-none`} rows={6} value={form.content} onChange={set('content')} placeholder="The complete announcement details…" />
                </FormField>
              </>
            )}

            <FormField label="Auto-hide After Date (optional — leave blank to control manually only)">
              <input className={inputCls} type="date" value={form.autoHideDate} onChange={set('autoHideDate')} />
            </FormField>

            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input type="checkbox" checked={form.enabled} onChange={e => setForm(prev => ({ ...prev, enabled: e.target.checked }))} className="w-4 h-4 accent-[#1655c3]" />
              <span className="text-sm font-semibold text-gray-700">Enabled (show on homepage)</span>
            </label>

            <div className="flex gap-3 pt-2">
              <AdminButton variant="ghost" className="flex-1" onClick={closeModal}>Cancel</AdminButton>
              <AdminButton variant="primary" className="flex-1" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : modal === 'add' ? 'Add Announcement' : 'Save Changes'}
              </AdminButton>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
