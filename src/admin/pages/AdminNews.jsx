import { useState, useEffect } from 'react'
import { Newspaper, CheckCircle, Edit as EditIcon, Trash2, Edit2, Plus, X } from 'lucide-react'
import StatCard    from '../components/StatCard'
import DataTable   from '../components/DataTable'
import Modal       from '../components/Modal'
import FormField, { inputCls } from '../components/FormField'
import ImageUpload from '../components/ImageUpload'
import AdminButton from '../components/AdminButton'
import BlogContentEditor from '../components/BlogContentEditor'
import { newsService } from '../../firebase/services'
import CoverImage from '../../components/CoverImage'

// Step 1 popup's fields only — content/status are owned by the step-2
// full-page editor (BlogContentEditor.jsx, reused as-is from Blog — it's
// fully generic: post/content/onChangeContent/callbacks, no Blog-specific
// assumptions baked in), same two-step pattern AdminBlog.jsx established.
const emptyReference = () => ({ id: crypto.randomUUID(), label: '', url: '' })
const emptyForm = () => ({
  title: '', imageUrl: '', slug: '',
  references: [emptyReference()],
})

function slugify(str) {
  return String(str || '').toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'news'
}

// Appends -2, -3, … until the slug doesn't collide with any other item's.
function uniqueSlug(base, existingSlugs) {
  let slug = base, n = 2
  while (existingSlugs.has(slug)) { slug = `${base}-${n}`; n++ }
  return slug
}

function makeColumns(openEdit, handlePublish, handleDelete) {
  return [
    { key: 'imageUrl', label: '',          render: v => v ? <CoverImage src={v} className="w-8 h-8 rounded-lg" /> : <div className="w-8 h-8 rounded-lg bg-blue-50" /> },
    { key: 'title',    label: 'Title',     render: v => <span className="font-semibold text-[#1a1a1a]">{v}</span> },
    { key: 'references', label: 'Sources', render: v => <span className="text-gray-500 text-xs">{(v || []).filter(r => r.url?.trim()).length || '—'}</span> },
    { key: 'published',label: 'Published', render: v => v || <span className="text-gray-300 text-xs">—</span> },
    { key: 'status',   label: 'Status',    render: v => <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${v === 'Published' ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'}`}>{v}</span> },
    { key: 'id',       label: 'Actions',   render: (v, row) => (
      <div className="flex gap-1">
        <button onClick={() => openEdit(row)} className="p-1.5 rounded-lg hover:bg-blue-50 text-[#1655c3]"><Edit2 size={13} /></button>
        {row.status === 'Draft' && <button onClick={() => handlePublish(v)} className="px-2 py-1 rounded-lg hover:bg-green-50 text-green-600 text-[10px] font-bold">Pub</button>}
        <button onClick={() => handleDelete(v)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 size={13} /></button>
      </div>
    )},
  ]
}

export default function AdminNews() {
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(false)
  const [form,    setForm]    = useState(emptyForm)
  const [editId,  setEditId]  = useState(null)
  const [saving,  setSaving]  = useState(false)

  // Step 2: full-page content editor — same pattern/component as AdminBlog.jsx.
  const [contentEditorOpen, setContentEditorOpen] = useState(false)
  const [editorPost, setEditorPost] = useState(null)
  const [editorContent, setEditorContent] = useState('')
  const [editorSaving, setEditorSaving] = useState(false)

  useEffect(() => {
    const unsub = newsService.listen(rows => { setData(rows); setLoading(false) })
    return unsub
  }, [])

  const openAdd  = () => { setForm(emptyForm()); setEditId(null); setModal('add') }
  const openEdit = row => {
    setForm({
      title: row.title, imageUrl: row.imageUrl || '', slug: row.slug || '',
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
  const setImg = url => setForm(prev => ({ ...prev, imageUrl: url }))

  const addReference = () => setForm(prev => ({ ...prev, references: [...prev.references, emptyReference()] }))
  const removeReference = id => setForm(prev => ({ ...prev, references: prev.references.filter(r => r.id !== id) }))
  const setReference = (id, key, value) => setForm(prev => ({
    ...prev, references: prev.references.map(r => r.id === id ? { ...r, [key]: value } : r),
  }))

  const validReferences = form.references.filter(r => r.url?.trim())

  const handleSaveBasics = async () => {
    if (!form.title.trim()) { alert('Title is required'); return }
    if (validReferences.length === 0) { alert('At least one reference/source URL is required — proper attribution matters for medical content.'); return }
    setSaving(true)
    try {
      const existingSlugs = new Set(data.filter(p => p.id !== editId).map(p => p.slug).filter(Boolean))
      const basics = {
        title: form.title.trim(),
        slug: uniqueSlug(slugify(form.slug || form.title), existingSlugs),
        imageUrl: form.imageUrl,
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

  const openEditDetailsFromEditor = () => {
    setForm({
      title: editorPost.title, imageUrl: editorPost.imageUrl || '', slug: editorPost.slug || '',
      references: editorPost.references?.length ? editorPost.references.map(r => ({ id: crypto.randomUUID(), ...r })) : [emptyReference()],
    })
    setEditId(editorPost.id)
    setModal('edit')
  }

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
  const handleDelete = async id => {
    if (!confirm('Delete this news item?')) return
    try { await newsService.delete(id) } catch (e) { alert('Error: ' + e.message) }
  }

  const columns   = makeColumns(openEdit, handlePublish, handleDelete)
  const published = data.filter(b => b.status === 'Published').length
  const drafts    = data.filter(b => b.status === 'Draft').length

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={Newspaper}   label="Total Items"  value={loading ? '…' : data.length} color="#1655c3" bg="#eff6ff" />
        <StatCard icon={CheckCircle} label="Published"    value={loading ? '…' : published}   color="#64ac37" bg="#f0fdf4" />
        <StatCard icon={EditIcon}    label="Drafts"       value={loading ? '…' : drafts}       color="#f59e0b" bg="#fffbeb" />
      </div>

      <DataTable title="Medical News" columns={columns} data={data} searchKey="title" emptyMessage="No news items yet — click New Item to write one"
        actions={<AdminButton size="sm" onClick={openAdd}>+ New Item</AdminButton>}
      />

      {modal && (
        <Modal title={contentEditorOpen ? 'Edit News Details' : modal === 'add' ? 'New News Item — Basic Details' : 'Edit News Item — Basic Details'} onClose={closeModal} wide>
          <div className="space-y-4">
            <ImageUpload value={form.imageUrl} onChange={setImg} folder="medweb/news" label="Thumbnail Image" />
            <FormField label="Title">
              <input className={inputCls} value={form.title} onChange={set('title')} placeholder="News item title…" />
            </FormField>
            <FormField label="URL Slug (auto-generated from title — edit to customize)">
              <input className={inputCls} value={form.slug} onChange={set('slug')} placeholder="news-item-title" />
              {form.slug && <p className="text-[11px] text-gray-400 mt-1">/news/{form.slug}</p>}
            </FormField>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">References / Sources (at least one required)</label>
                <button type="button" onClick={addReference} className="flex items-center gap-1 text-xs font-semibold text-[#1655c3] hover:underline">
                  <Plus size={13} /> Add Reference
                </button>
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
