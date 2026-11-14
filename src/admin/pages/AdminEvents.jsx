import { useState, useEffect } from 'react'
import { Newspaper, CheckCircle, Edit as EditIcon, Plus, X } from 'lucide-react'
import StatCard    from '../components/StatCard'
import DataTable   from '../components/DataTable'
import Modal       from '../components/Modal'
import FormField, { inputCls } from '../components/FormField'
import ImageUpload from '../components/ImageUpload'
import GalleryUpload from '../components/GalleryUpload'
import AdminButton from '../components/AdminButton'
import ActionButtons from '../components/ActionButtons'
import TagInput from '../components/TagInput'
import BlogContentEditor from '../components/BlogContentEditor'
import useAdminPermissions from '../hooks/useAdminPermissions'
import { newsService } from '../../firebase/services'
import { toOptimizedUrl } from '../../firebase/cloudinary'
import CoverImage from '../../components/CoverImage'

const CATEGORIES = ['Conference', 'Seminar', 'Webinar', 'Medical Camp', 'Workshop', 'Awareness', 'News']

// Step 1 popup's fields; body/content stays owned by the step-2 full-page
// editor (BlogContentEditor.jsx, reused as-is from Blog/the old News page
// — fully generic, no changes needed there).
const emptyReference = () => ({ id: crypto.randomUUID(), label: '', url: '' })
const emptyHighlight = () => ({ id: crypto.randomUUID(), label: '', value: '' })
const emptySpeaker = () => ({ id: crypto.randomUUID(), name: '', title: '', image: '' })
const emptyPartner = () => ({ id: crypto.randomUUID(), name: '', logoUrl: '' })
const emptyVideo = () => ({ id: crypto.randomUUID(), type: 'youtube', url: '', title: '' })

const emptyForm = () => ({
  title: '', slug: '', category: 'News',
  startDate: '', endDate: '', city: '', venue: '',
  organisers: [], partners: [emptyPartner()], chiefGuests: [], speakers: [emptySpeaker()],
  highlights: [emptyHighlight()], summary: '',
  coverImage: '', gallery: [], videos: [emptyVideo()],
  tags: [], featured: false, seoTitle: '', seoDescription: '', shareImage: '',
  references: [emptyReference()],
})

function slugify(str) {
  return String(str || '').toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'event'
}
function uniqueSlug(base, existingSlugs) {
  let slug = base, n = 2
  while (existingSlugs.has(slug)) { slug = `${base}-${n}`; n++ }
  return slug
}

// Pre-this-round docs have none of the new fields — this backfills sane
// defaults for exactly the ones missing, in place, the first time this
// admin page loads them. Checks `category` as the canary (every doc this
// round creates always has one; nothing pre-existing ever did), so it
// only ever touches a given doc once and is safe to run on every load.
// coverImage defaults from the old `imageUrl` field, which is also kept
// (not deleted) — no data loss either way.
function needsMigration(row) {
  return row.category === undefined
}
function migratedFields(row) {
  return {
    category: 'News',
    coverImage: row.coverImage || row.imageUrl || '',
    startDate: row.startDate || '', endDate: row.endDate || '', city: row.city || '', venue: row.venue || '',
    organisers: row.organisers || [], partners: row.partners || [], chiefGuests: row.chiefGuests || [], speakers: row.speakers || [],
    highlights: row.highlights || [], summary: row.summary || '',
    gallery: row.gallery || [], videos: row.videos || [],
    tags: row.tags || [], featured: !!row.featured,
    seoTitle: row.seoTitle || '', seoDescription: row.seoDescription || '', shareImage: row.shareImage || '',
    publishDate: row.publishDate || row.published || null,
  }
}

function makeColumns(openEdit, handlePublish, handleDelete, canWrite) {
  return [
    { key: 'coverImage', label: '', render: (v, row) => (v || row.imageUrl) ? <CoverImage src={v || row.imageUrl} alt={row.title || ''} className="w-8 h-8 rounded-lg" /> : <div className="w-8 h-8 rounded-lg bg-blue-50" /> },
    { key: 'title',    label: 'Title',     render: v => <span className="font-semibold text-[#1a1a1a]">{v}</span> },
    { key: 'category', label: 'Category',  render: v => <span className="text-xs font-medium text-[#1655c3] bg-blue-50 px-2 py-0.5 rounded-full">{v || 'News'}</span> },
    { key: 'published',label: 'Published', render: v => v || <span className="text-gray-300 text-xs">—</span> },
    { key: 'status',   label: 'Status',    render: v => <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${v === 'Published' ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'}`}>{v}</span> },
    { key: 'id',       label: 'Actions',   render: (v, row) => (
      <div className="flex gap-1">
        {canWrite && row.status === 'Draft' && <button onClick={() => handlePublish(v)} className="px-2 py-1 rounded-lg hover:bg-green-50 text-green-600 text-[10px] font-bold">Pub</button>}
        <ActionButtons onEdit={() => openEdit(row)} onDelete={() => handleDelete(v)} />
      </div>
    )},
  ]
}

export default function AdminEvents() {
  const { canWrite } = useAdminPermissions()
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(false)
  const [form,    setForm]    = useState(emptyForm)
  const [editId,  setEditId]  = useState(null)
  const [saving,  setSaving]  = useState(false)

  const [contentEditorOpen, setContentEditorOpen] = useState(false)
  const [editorPost, setEditorPost] = useState(null)
  const [editorContent, setEditorContent] = useState('')
  const [editorSaving, setEditorSaving] = useState(false)

  useEffect(() => {
    const unsub = newsService.listen(rows => { setData(rows); setLoading(false) })
    return unsub
  }, [])

  // One-time-per-doc backfill — see needsMigration()'s own comment.
  useEffect(() => {
    if (loading || !canWrite) return
    const stale = data.filter(needsMigration)
    stale.forEach(row => newsService.update(row.id, migratedFields(row)).catch(() => {}))
  }, [data, loading, canWrite])

  const openAdd  = () => { setForm(emptyForm()); setEditId(null); setModal('add') }
  const openEdit = row => {
    setForm({
      title: row.title, slug: row.slug || '', category: row.category || 'News',
      startDate: row.startDate || '', endDate: row.endDate || '', city: row.city || '', venue: row.venue || '',
      organisers: row.organisers || [], partners: row.partners?.length ? row.partners.map(p => ({ id: crypto.randomUUID(), ...p })) : [emptyPartner()],
      chiefGuests: row.chiefGuests || [],
      speakers: row.speakers?.length ? row.speakers.map(s => ({ id: crypto.randomUUID(), ...s })) : [emptySpeaker()],
      highlights: row.highlights?.length ? row.highlights.map(h => ({ id: crypto.randomUUID(), ...h })) : [emptyHighlight()],
      summary: row.summary || '',
      coverImage: row.coverImage || row.imageUrl || '', gallery: row.gallery || [],
      videos: row.videos?.length ? row.videos.map(v => ({ id: crypto.randomUUID(), ...v })) : [emptyVideo()],
      tags: row.tags || [], featured: !!row.featured,
      seoTitle: row.seoTitle || '', seoDescription: row.seoDescription || '', shareImage: row.shareImage || '',
      references: row.references?.length ? row.references.map(r => ({ id: r.id || crypto.randomUUID(), ...r })) : [emptyReference()],
    })
    setEditId(row.id); setModal('edit')
  }
  const closeModal = () => { setModal(false); if (!contentEditorOpen) setEditId(null) }
  const set = field => e => setForm(prev => {
    const next = { ...prev, [field]: e.target.value }
    if (field === 'title' && !prev.slug) next.slug = slugify(e.target.value)
    return next
  })
  const setCheck = field => e => setForm(prev => ({ ...prev, [field]: e.target.checked }))
  const setCover = url => setForm(prev => ({ ...prev, coverImage: url ? toOptimizedUrl(url) : url }))
  const setShareImage = url => setForm(prev => ({ ...prev, shareImage: url ? toOptimizedUrl(url) : url }))
  const setGallery = gallery => setForm(prev => ({ ...prev, gallery }))

  const addReference = () => setForm(prev => ({ ...prev, references: [...prev.references, emptyReference()] }))
  const removeReference = id => setForm(prev => ({ ...prev, references: prev.references.filter(r => r.id !== id) }))
  const setReference = (id, key, value) => setForm(prev => ({ ...prev, references: prev.references.map(r => r.id === id ? { ...r, [key]: value } : r) }))

  const addHighlight = () => setForm(prev => ({ ...prev, highlights: [...prev.highlights, emptyHighlight()] }))
  const removeHighlight = id => setForm(prev => ({ ...prev, highlights: prev.highlights.filter(h => h.id !== id) }))
  const setHighlight = (id, key, value) => setForm(prev => ({ ...prev, highlights: prev.highlights.map(h => h.id === id ? { ...h, [key]: value } : h) }))

  const addSpeaker = () => setForm(prev => ({ ...prev, speakers: [...prev.speakers, emptySpeaker()] }))
  const removeSpeaker = id => setForm(prev => ({ ...prev, speakers: prev.speakers.filter(s => s.id !== id) }))
  const setSpeaker = (id, key, value) => setForm(prev => ({ ...prev, speakers: prev.speakers.map(s => s.id === id ? { ...s, [key]: value } : s) }))

  const addPartner = () => setForm(prev => ({ ...prev, partners: [...prev.partners, emptyPartner()] }))
  const removePartner = id => setForm(prev => ({ ...prev, partners: prev.partners.filter(p => p.id !== id) }))
  const setPartner = (id, key, value) => setForm(prev => ({ ...prev, partners: prev.partners.map(p => p.id === id ? { ...p, [key]: value } : p) }))

  const addVideo = () => setForm(prev => ({ ...prev, videos: [...prev.videos, emptyVideo()] }))
  const removeVideo = id => setForm(prev => ({ ...prev, videos: prev.videos.filter(v => v.id !== id) }))
  const setVideo = (id, key, value) => setForm(prev => ({ ...prev, videos: prev.videos.map(v => v.id === id ? { ...v, [key]: value } : v) }))

  const validReferences = form.references.filter(r => r.url?.trim())

  const handleSaveBasics = async () => {
    if (!form.title.trim()) { alert('Title is required'); return }
    setSaving(true)
    try {
      const existingSlugs = new Set(data.filter(p => p.id !== editId).map(p => p.slug).filter(Boolean))
      const basics = {
        title: form.title.trim(),
        slug: uniqueSlug(slugify(form.slug || form.title), existingSlugs),
        category: form.category,
        startDate: form.startDate, endDate: form.endDate, city: form.city.trim(), venue: form.venue.trim(),
        organisers: form.organisers, chiefGuests: form.chiefGuests,
        partners: form.partners.filter(p => p.name.trim()).map(({ id, ...p }) => p),
        speakers: form.speakers.filter(s => s.name.trim()).map(({ id, ...s }) => s),
        highlights: form.highlights.filter(h => h.label.trim()).map(({ id, ...h }) => h),
        summary: form.summary.trim().slice(0, 280),
        coverImage: form.coverImage, imageUrl: form.coverImage, // imageUrl kept for the old card/NewsPostPage code path & back-compat
        gallery: form.gallery.map(({ id, ...g }) => g),
        videos: form.videos.filter(v => v.url.trim()).map(({ id, ...v }) => v),
        tags: form.tags, featured: form.featured,
        seoTitle: form.seoTitle.trim(), seoDescription: form.seoDescription.trim(), shareImage: form.shareImage,
        references: validReferences.map(({ label, url }) => ({ label: label.trim(), url: url.trim() })),
      }
      let id = editId
      if (modal === 'add') id = await newsService.add({ ...basics, status: 'Draft', content: '' })
      else                 await newsService.update(editId, basics)

      setModal(false)
      if (contentEditorOpen) {
        setEditorPost(prev => ({ ...prev, ...basics }))
      } else {
        const existing = editId ? data.find(p => p.id === editId) : null
        setEditId(id)
        setEditorPost({ id, ...basics, status: existing?.status || 'Draft' })
        setEditorContent(existing?.content || '')
        setContentEditorOpen(true)
      }
    } catch (e) { alert('Error: ' + e.message) }
    finally { setSaving(false) }
  }

  const openEditDetailsFromEditor = () => { openEdit(editorPost); setModal('edit') }

  const closeContentEditor = () => {
    setContentEditorOpen(false)
    setEditorPost(null)
    setEditorContent('')
    setEditId(null)
  }

  const handleSaveDraftFromEditor = async () => {
    setEditorSaving(true)
    try {
      await newsService.update(editorPost.id, { content: editorContent, status: 'Draft' })
      setEditorPost(prev => ({ ...prev, status: 'Draft' }))
    } catch (e) { alert('Error: ' + e.message) }
    finally { setEditorSaving(false) }
  }

  const handlePublishFromEditor = async () => {
    setEditorSaving(true)
    try {
      await newsService.update(editorPost.id, { content: editorContent })
      await newsService.publish(editorPost.id)
      closeContentEditor()
    } catch (e) { alert('Error: ' + e.message) }
    finally { setEditorSaving(false) }
  }

  const handlePublish = async id => {
    try { await newsService.publish(id) } catch (e) { alert('Error: ' + e.message) }
  }

  // Firebase Storage has no files to clean up here — every upload in this
  // app (including this module's cover/gallery images) goes through
  // Cloudinary, not Firebase Storage, and Cloudinary asset deletion needs
  // a signed, server-side (API-secret) request this client-only app has
  // never had anywhere else either. Deleting the event here only removes
  // its Firestore doc, same as every other admin delete in this codebase
  // — the Cloudinary images become orphaned, not deleted. Flagged
  // explicitly rather than silently claiming cleanup that isn't real.
  const handleDelete = async id => {
    if (!confirm('Delete this event/news item? Its uploaded images stay on Cloudinary (not deleted) — same as every other delete in this admin.')) return
    try { await newsService.delete(id) } catch (e) { alert('Error: ' + e.message) }
  }

  const columns   = makeColumns(openEdit, handlePublish, handleDelete, canWrite)
  const published = data.filter(b => b.status === 'Published').length
  const drafts    = data.filter(b => b.status === 'Draft').length

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={Newspaper}   label="Total Items"  value={loading ? '…' : data.length} color="#1655c3" bg="#eff6ff" />
        <StatCard icon={CheckCircle} label="Published"    value={loading ? '…' : published}   color="#64ac37" bg="#f0fdf4" />
        <StatCard icon={EditIcon}    label="Drafts"       value={loading ? '…' : drafts}       color="#f59e0b" bg="#fffbeb" />
      </div>

      <DataTable title="Events & News" columns={columns} data={data} searchKey="title" emptyMessage="No events or news yet — click New Item to create one"
        actions={canWrite && <AdminButton size="sm" onClick={openAdd}>+ New Item</AdminButton>}
      />

      {modal && (
        <Modal title={contentEditorOpen ? 'Edit Event Details' : modal === 'add' ? 'New Event/News — Details' : 'Edit Event/News — Details'} onClose={closeModal} wide>
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <FormField label="Title">
                <input className={inputCls} value={form.title} onChange={set('title')} placeholder="Event or news title…" />
              </FormField>
              <FormField label="Category">
                <select className={inputCls} value={form.category} onChange={set('category')}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </FormField>
            </div>
            <FormField label="URL Slug (auto-generated — edit to customize)">
              <input className={inputCls} value={form.slug} onChange={set('slug')} placeholder="event-title" />
              {form.slug && <p className="text-[11px] text-gray-400 mt-1">/events/{form.slug}</p>}
            </FormField>

            <div className="border-t border-gray-100 pt-4">
              <h4 className="font-bold text-[#1a1a1a] text-sm mb-3">When & Where</h4>
              <div className="grid grid-cols-2 gap-4 mb-3">
                <FormField label="Start Date"><input className={inputCls} type="date" value={form.startDate} onChange={set('startDate')} /></FormField>
                <FormField label="End Date (optional)"><input className={inputCls} type="date" value={form.endDate} onChange={set('endDate')} /></FormField>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="City"><input className={inputCls} value={form.city} onChange={set('city')} placeholder="Lahore" /></FormField>
                <FormField label="Venue"><input className={inputCls} value={form.venue} onChange={set('venue')} placeholder="Expo Centre" /></FormField>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <h4 className="font-bold text-[#1a1a1a] text-sm mb-3">People</h4>
              <TagInput value={form.organisers} onChange={v => setForm(p => ({ ...p, organisers: v }))} label="Organisers" placeholder="Type a name and press Enter…" />
              <div className="mt-3">
                <TagInput value={form.chiefGuests} onChange={v => setForm(p => ({ ...p, chiefGuests: v }))} label="Chief Guests" placeholder="Type a name and press Enter…" />
              </div>

              <div className="mt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-600">Speakers</span>
                  <button type="button" onClick={addSpeaker} className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-dashed border-[#1655c3]/40 text-[#1655c3] hover:bg-blue-50"><Plus size={13} /> Add Speaker</button>
                </div>
                <div className="space-y-2">
                  {form.speakers.map(s => (
                    <div key={s.id} className="flex gap-2 items-center bg-gray-50 rounded-lg p-2">
                      <input className={`${inputCls} flex-1`} value={s.name} onChange={e => setSpeaker(s.id, 'name', e.target.value)} placeholder="Name" />
                      <input className={`${inputCls} flex-1`} value={s.title} onChange={e => setSpeaker(s.id, 'title', e.target.value)} placeholder="Title / designation" />
                      <button onClick={() => removeSpeaker(s.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 shrink-0"><X size={14} /></button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-600">Partners</span>
                  <button type="button" onClick={addPartner} className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-dashed border-[#1655c3]/40 text-[#1655c3] hover:bg-blue-50"><Plus size={13} /> Add Partner</button>
                </div>
                <div className="space-y-2">
                  {form.partners.map(p => (
                    <div key={p.id} className="flex gap-2 items-center bg-gray-50 rounded-lg p-2">
                      <input className={`${inputCls} flex-1`} value={p.name} onChange={e => setPartner(p.id, 'name', e.target.value)} placeholder="Partner name" />
                      <input className={`${inputCls} flex-1`} value={p.logoUrl} onChange={e => setPartner(p.id, 'logoUrl', e.target.value)} placeholder="Logo URL (optional)" />
                      <button onClick={() => removePartner(p.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 shrink-0"><X size={14} /></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <h4 className="font-bold text-[#1a1a1a] text-sm mb-3">Content</h4>
              <ImageUpload value={form.coverImage} onChange={setCover} folder="medweb/events" label="Cover Image" />
              <FormField label={`Summary (${form.summary.length}/280)`}>
                <textarea className={inputCls} rows={2} maxLength={280} value={form.summary} onChange={set('summary')} placeholder="One or two sentences shown on the card and as the article standfirst…" />
              </FormField>
              <div className="mt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-600">Key Facts (shown in the sticky sidebar)</span>
                  <button type="button" onClick={addHighlight} className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-dashed border-[#1655c3]/40 text-[#1655c3] hover:bg-blue-50"><Plus size={13} /> Add Fact</button>
                </div>
                <div className="space-y-2">
                  {form.highlights.map(h => (
                    <div key={h.id} className="flex gap-2 items-center bg-gray-50 rounded-lg p-2">
                      <input className={`${inputCls} w-28 shrink-0`} value={h.label} onChange={e => setHighlight(h.id, 'label', e.target.value)} placeholder="Label" />
                      <input className={`${inputCls} flex-1`} value={h.value} onChange={e => setHighlight(h.id, 'value', e.target.value)} placeholder="Value" />
                      <button onClick={() => removeHighlight(h.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 shrink-0"><X size={14} /></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <h4 className="font-bold text-[#1a1a1a] text-sm mb-3">Media</h4>
              <GalleryUpload value={form.gallery} onChange={setGallery} folder="medweb/events" />
              <div className="mt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-600">Videos</span>
                  <button type="button" onClick={addVideo} className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-dashed border-[#1655c3]/40 text-[#1655c3] hover:bg-blue-50"><Plus size={13} /> Add Video</button>
                </div>
                <div className="space-y-2">
                  {form.videos.map(v => (
                    <div key={v.id} className="flex gap-2 items-center bg-gray-50 rounded-lg p-2">
                      <select className={`${inputCls} w-28 shrink-0`} value={v.type} onChange={e => setVideo(v.id, 'type', e.target.value)}>
                        <option value="youtube">YouTube</option>
                        <option value="upload">Direct URL</option>
                      </select>
                      <input className={`${inputCls} flex-1`} value={v.url} onChange={e => setVideo(v.id, 'url', e.target.value)} placeholder={v.type === 'youtube' ? 'https://youtube.com/watch?v=...' : 'https://.../video.mp4'} />
                      <input className={`${inputCls} w-40 shrink-0`} value={v.title} onChange={e => setVideo(v.id, 'title', e.target.value)} placeholder="Title" />
                      <button onClick={() => removeVideo(v.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 shrink-0"><X size={14} /></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">References / Sources</label>
                <button type="button" onClick={addReference} className="flex items-center gap-1 text-xs font-semibold text-[#1655c3] hover:underline"><Plus size={13} /> Add Reference</button>
              </div>
              <div className="space-y-2">
                {form.references.map(r => (
                  <div key={r.id} className="flex gap-2 items-center">
                    <input className={`${inputCls} w-32 shrink-0`} value={r.label} onChange={e => setReference(r.id, 'label', e.target.value)} placeholder="Source name" />
                    <input className={`${inputCls} flex-1`} value={r.url} onChange={e => setReference(r.id, 'url', e.target.value)} placeholder="https://source-url.com/article" />
                    {form.references.length > 1 && (
                      <button onClick={() => removeReference(r.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-400 flex-shrink-0"><X size={16} /></button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <h4 className="font-bold text-[#1a1a1a] text-sm mb-3">Publishing</h4>
              <TagInput value={form.tags} onChange={v => setForm(p => ({ ...p, tags: v }))} label="Tags" placeholder="e.g. AMR, Pharmacy — press Enter" />
              <label className="flex items-center gap-3 cursor-pointer select-none mt-3 mb-3">
                <input type="checkbox" checked={form.featured} onChange={setCheck('featured')} className="w-4 h-4 accent-[#1655c3]" />
                <span className="text-sm font-semibold text-gray-700">Featured (large frame at the top of /events)</span>
              </label>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="SEO Title (optional)"><input className={inputCls} value={form.seoTitle} onChange={set('seoTitle')} placeholder="Leave blank to use Title" /></FormField>
                <FormField label="SEO Description (optional)"><input className={inputCls} value={form.seoDescription} onChange={set('seoDescription')} placeholder="Leave blank to use Summary" /></FormField>
              </div>
              <ImageUpload value={form.shareImage} onChange={setShareImage} folder="medweb/events" label="Share Image (optional — leave blank to use Cover Image)" />
            </div>

            <div className="flex gap-3 pt-2">
              <AdminButton variant="ghost" className="flex-1" onClick={closeModal}>Cancel</AdminButton>
              <AdminButton variant="primary" className="flex-1" onClick={handleSaveBasics} disabled={saving}>
                {saving ? 'Saving…' : contentEditorOpen ? 'Save Details' : 'Next: Write Content →'}
              </AdminButton>
            </div>
          </div>
        </Modal>
      )}

      {contentEditorOpen && editorPost && (
        <BlogContentEditor
          post={editorPost}
          content={editorContent}
          onChangeContent={setEditorContent}
          onEditDetails={openEditDetailsFromEditor}
          onBack={closeContentEditor}
          onSaveDraft={handleSaveDraftFromEditor}
          onPublish={handlePublishFromEditor}
          saving={editorSaving}
        />
      )}
    </div>
  )
}
