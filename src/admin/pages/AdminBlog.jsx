import { useState, useEffect, useMemo } from 'react'
import { FileText, Eye, CheckCircle, Edit as EditIcon, Trash2, Edit2, Tag } from 'lucide-react'
import StatCard    from '../components/StatCard'
import DataTable   from '../components/DataTable'
import Modal       from '../components/Modal'
import FormField, { inputCls } from '../components/FormField'
import ImageUpload from '../components/ImageUpload'
import AdminButton from '../components/AdminButton'
import ActionButtons from '../components/ActionButtons'
import NewsletterSendModal from '../components/NewsletterSendModal'
import RichTextEditor from '../components/RichTextEditor'
import { blogService, blogCategoriesService, newsletterService } from '../../firebase/services'
import { sendNewsletterEmail, getRemainingEmailQuota } from '../../firebase/email'
import { DEFAULT_BLOG_CATEGORIES } from '../../constants/blogCategories'
import CoverImage from '../../components/CoverImage'

// `content` is now rich-text HTML (see RichTextEditor.jsx) — this fallback
// (used only when the admin left Excerpt blank) strips tags first so a
// stray "<p><strong>" never leaks into a plain-text newsletter email body.
function truncateExcerpt(content, max = 200) {
  const text = String(content || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  return text.length > max ? text.slice(0, max).trim() + '…' : text
}

const emptyForm = () => ({
  title: '', author: '', category: '',
  excerpt: '', content: '', status: 'Draft',
  views: 0, imageUrl: '', slug: '',
})

const emptyCatForm = () => ({ name: '' })

function slugify(str) {
  return String(str || '').toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'post'
}

// Appends -2, -3, … until the slug doesn't collide with any other post's.
function uniqueSlug(base, existingSlugs) {
  let slug = base, n = 2
  while (existingSlugs.has(slug)) { slug = `${base}-${n}`; n++ }
  return slug
}

function makeColumns(openEdit, handlePublish, handleDelete) {
  return [
    { key: 'imageUrl', label: '',          render: v => v ? <CoverImage src={v} className="w-8 h-8 rounded-lg" /> : <div className="w-8 h-8 rounded-lg bg-blue-50" /> },
    { key: 'title',    label: 'Title',     render: v => <span className="font-semibold text-[#1a1a1a]">{v}</span> },
    { key: 'author',   label: 'Author',    render: v => <span className="text-gray-500 text-xs">{v}</span> },
    { key: 'category', label: 'Category',  render: v => <span className="text-xs font-medium text-[#1655c3] bg-blue-50 px-2 py-0.5 rounded-full">{v}</span> },
    { key: 'published',label: 'Published', render: v => v || <span className="text-gray-300 text-xs">—</span> },
    { key: 'views',    label: 'Views',     render: v => <span className="font-bold text-[#1655c3]">{v > 0 ? (v || 0).toLocaleString() : '—'}</span> },
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

export default function AdminBlog() {
  const [activeTab, setActiveTab] = useState('posts') // 'posts' | 'categories'
  const [data,    setData]    = useState([])
  const [dbCategories, setDbCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(false)
  const [form,    setForm]    = useState(emptyForm)
  const [editId,  setEditId]  = useState(null)
  const [saving,  setSaving]  = useState(false)
  const [sendModal, setSendModal] = useState(null)
  // { phase: 'confirm-quota'|'confirm'|'sending'|'done', total, remaining, sent, failed, failedEmails, job }

  // Category CRUD modal state
  const [catModal,  setCatModal]  = useState(false)
  const [catForm,   setCatForm]   = useState(emptyCatForm)
  const [catEditId, setCatEditId] = useState(null)
  const [catSaving, setCatSaving] = useState(false)

  useEffect(() => {
    const unsub = blogService.listen(rows => { setData(rows); setLoading(false) })
    return unsub
  }, [])

  useEffect(() => {
    const unsub = blogCategoriesService.listen(setDbCategories)
    return unsub
  }, [])

  // Baseline defaults + admin-created categories, deduped by name — keeps
  // posts saved before this feature existed pointing at a real category.
  const categoryNames = useMemo(() => {
    const set = new Set(DEFAULT_BLOG_CATEGORIES)
    dbCategories.forEach(c => { if (c.name?.trim()) set.add(c.name.trim()) })
    data.forEach(p => { if (p.category?.trim()) set.add(p.category.trim()) })
    return Array.from(set)
  }, [dbCategories, data])

  // Backfill: any post saved before the slug field existed gets one
  // generated automatically the next time this admin list loads. Each pass
  // only touches posts still missing a slug, so once they're all backfilled
  // this naturally stops re-running.
  useEffect(() => {
    if (loading) return
    const missing = data.filter(p => !p.slug)
    if (missing.length === 0) return
    const existing = new Set(data.map(p => p.slug).filter(Boolean))
    ;(async () => {
      for (const p of missing) {
        const slug = uniqueSlug(slugify(p.title), existing)
        existing.add(slug)
        try { await blogService.update(p.id, { slug }) } catch (e) { console.error('Slug backfill failed for', p.id, e) }
      }
    })()
  }, [data, loading])

  const openAdd  = () => { setForm({ ...emptyForm(), category: categoryNames[0] || '' }); setEditId(null); setModal('add') }
  const openEdit = row => {
    setForm({ title: row.title, author: row.author, category: row.category, excerpt: row.excerpt || '', content: row.content || '', status: row.status, views: row.views || 0, imageUrl: row.imageUrl || '', slug: row.slug || '' })
    setEditId(row.id); setModal('edit')
  }
  const closeModal = () => { setModal(false); setEditId(null) }
  const set = field => e => setForm(prev => {
    const next = { ...prev, [field]: e.target.value }
    // Auto-fill the slug from the title only while it's still empty — once
    // the admin has typed anything into the slug field directly, further
    // title edits stop overwriting their choice.
    if (field === 'title' && !prev.slug) next.slug = slugify(e.target.value)
    return next
  })
  const setImg = url => setForm(prev => ({ ...prev, imageUrl: url }))

  const handleSave = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    try {
      const existingSlugs = new Set(data.filter(p => p.id !== editId).map(p => p.slug).filter(Boolean))
      const payload = { ...form, slug: uniqueSlug(slugify(form.slug || form.title), existingSlugs) }
      const prevStatus = editId ? data.find(p => p.id === editId)?.status : null
      if (modal === 'add') await blogService.add(payload)
      else                 await blogService.update(editId, payload)
      closeModal()
      // Only on the genuine transition INTO Published — editing an
      // already-published post's typo must never re-blast subscribers.
      if (prevStatus !== 'Published' && payload.status === 'Published') {
        maybeNotifySubscribers(payload)
      }
    } catch (e) { alert('Error: ' + e.message) }
    finally { setSaving(false) }
  }

  const handlePublish = async id => {
    try {
      await blogService.publish(id)
      const post = data.find(p => p.id === id)
      if (post) maybeNotifySubscribers({ ...post, status: 'Published' })
    } catch (e) { alert('Error: ' + e.message) }
  }
  const handleDelete = async id => {
    if (!confirm('Delete post?')) return
    try { await blogService.delete(id) } catch (e) { alert('Error: ' + e.message) }
  }

  // --- Category Handlers ---
  const openAddCategory = () => { setCatForm(emptyCatForm()); setCatEditId(null); setCatModal('add') }
  const openEditCategory = cat => { setCatForm({ name: cat.name || '' }); setCatEditId(cat.id); setCatModal('edit') }
  const closeCatModal = () => { setCatModal(false); setCatEditId(null) }

  const handleSaveCategory = async () => {
    if (!catForm.name.trim()) return
    setCatSaving(true)
    try {
      if (catModal === 'add') await blogCategoriesService.add({ name: catForm.name.trim() })
      else                     await blogCategoriesService.update(catEditId, { name: catForm.name.trim() })
      closeCatModal()
    } catch (e) { alert('Error: ' + e.message) }
    finally { setCatSaving(false) }
  }

  const handleDeleteCategory = async id => {
    if (!confirm('Delete this category? Posts already assigned to it keep their category text.')) return
    try { await blogCategoriesService.delete(id) } catch (e) { alert('Error: ' + e.message) }
  }

  // Runs entirely in this admin's own open tab — loops through active
  // (non-unsubscribed) subscribers and sends each an EmailJS email. Warns
  // first if the subscriber count looks likely to exceed what's left of
  // EmailJS's shared monthly quota, since there's no server to queue/retry
  // the rest tomorrow the way the old Cloud Function version could.
  const maybeNotifySubscribers = async post => {
    const subs = await newsletterService.getAll().catch(() => [])
    const active = subs.filter(s => s.email && s.unsubscribed !== true)
    if (active.length === 0) return

    const remaining = await getRemainingEmailQuota().catch(() => Infinity)
    const excerpt = (post.excerpt || '').trim() || truncateExcerpt(post.content)
    const postUrl = `${window.location.origin}/blog/${post.slug}`
    const job = { post: { title: post.title, excerpt, postUrl }, subscribers: active }

    setSendModal({
      phase: active.length > remaining ? 'confirm-quota' : 'confirm',
      total: active.length, remaining, sent: 0, failed: 0, failedEmails: [], job,
    })
  }

  const startSending = async () => {
    setSendModal(prev => ({ ...prev, phase: 'sending' }))
    const { post, subscribers } = sendModal.job
    let sent = 0, failed = 0
    const failedEmails = []
    for (const sub of subscribers) {
      const unsubscribeUrl = `${window.location.origin}/unsubscribe?email=${encodeURIComponent(sub.email)}`
      try {
        const res = await sendNewsletterEmail({ toEmail: sub.email, title: post.title, excerpt: post.excerpt, postUrl: post.postUrl, unsubscribeUrl })
        if (res?.sent) sent++
        else { failed++; failedEmails.push(sub.email) }
      } catch {
        failed++; failedEmails.push(sub.email)
      }
      setSendModal(prev => prev ? { ...prev, sent, failed, failedEmails: [...failedEmails] } : prev)
    }
    setSendModal(prev => prev ? { ...prev, phase: 'done', sent, failed, failedEmails } : prev)
  }

  const columns   = makeColumns(openEdit, handlePublish, handleDelete)
  const published = data.filter(b => b.status === 'Published').length
  const drafts    = data.filter(b => b.status === 'Draft').length
  const totalViews= data.reduce((a, b) => a + (b.views || 0), 0)

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FileText}    label="Total Posts"  value={loading ? '…' : data.length} color="#1655c3" bg="#eff6ff" />
        <StatCard icon={CheckCircle} label="Published"    value={loading ? '…' : published}   color="#64ac37" bg="#f0fdf4" />
        <StatCard icon={EditIcon}    label="Drafts"       value={loading ? '…' : drafts}       color="#f59e0b" bg="#fffbeb" />
        <StatCard icon={Eye}         label="Total Views"  value={loading ? '…' : totalViews.toLocaleString()} color="#1655c3" bg="#eff6ff" />
      </div>

      {data.filter(b => b.views > 0).length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-bold text-[#1a1a1a] text-sm mb-4">Top Posts by Views</h3>
          <div className="space-y-3">
            {[...data].filter(b => b.views > 0).sort((a, b) => b.views - a.views).slice(0, 5).map((post, i) => {
              const max = Math.max(...data.map(b => b.views || 0))
              return (
                <div key={i} className="flex items-center gap-4">
                  <span className="text-xs font-black text-gray-300 w-4">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-[#1a1a1a] truncate mb-1">{post.title}</div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-[#1655c3]" style={{ width: `${(post.views / max) * 100}%` }} />
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#1655c3] w-12 text-right">{(post.views || 0).toLocaleString()}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Posts / Categories Tab Switcher */}
      <div className="flex items-center bg-white p-2 rounded-2xl border border-gray-100 shadow-sm gap-2 w-fit">
        <button
          onClick={() => setActiveTab('posts')}
          className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'posts' ? 'bg-[#1655c3] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Posts ({data.length})
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'categories' ? 'bg-[#1655c3] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Categories ({categoryNames.length})
        </button>
      </div>

      {activeTab === 'posts' ? (
        <DataTable title="All Blog Posts" columns={columns} data={data} searchKey="title" emptyMessage="No blog posts yet — click New Post to write one"
          actions={<AdminButton size="sm" onClick={openAdd}>+ New Post</AdminButton>}
        />
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-[#1a1a1a] text-sm">Blog Categories</h3>
            <AdminButton size="sm" onClick={openAddCategory}>+ Add Category</AdminButton>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {categoryNames.map(name => {
              const dbCat = dbCategories.find(c => c.name === name)
              const count = data.filter(p => p.category === name).length
              return (
                <div key={name} className="flex items-center justify-between gap-3 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                  <div className="flex items-center gap-2 min-w-0">
                    <Tag size={14} className="text-[#1655c3] shrink-0" />
                    <span className="text-sm font-semibold text-[#1a1a1a] truncate">{name}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#1655c3] shrink-0">{count}</span>
                  </div>
                  {dbCat ? (
                    <ActionButtons onEdit={() => openEditCategory(dbCat)} onDelete={() => handleDeleteCategory(dbCat.id)} />
                  ) : (
                    <span className="text-[10px] text-gray-400 shrink-0">Default</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {modal && (
        <Modal title={modal === 'add' ? 'New Blog Post' : 'Edit Post'} onClose={closeModal} wide>
          <div className="space-y-4">
            <ImageUpload value={form.imageUrl} onChange={setImg} folder="medweb/blog" label="Cover Image" />
            <FormField label="Title">
              <input className={inputCls} value={form.title} onChange={set('title')} placeholder="Post title…" />
            </FormField>
            <FormField label="URL Slug (auto-generated from title — edit to customize)">
              <input className={inputCls} value={form.slug} onChange={set('slug')} placeholder="post-title" />
              {form.slug && <p className="text-[11px] text-gray-400 mt-1">/blog/{form.slug}</p>}
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Author">
                <input className={inputCls} value={form.author} onChange={set('author')} placeholder="Dr. Name" />
              </FormField>
              <FormField label="Category">
                <select className={inputCls} value={form.category} onChange={set('category')}>
                  {categoryNames.map(c => <option key={c}>{c}</option>)}
                </select>
              </FormField>
            </div>
            <FormField label="Excerpt (shown on cards)">
              <textarea className={inputCls} rows={2} value={form.excerpt} onChange={set('excerpt')} placeholder="Short summary…" />
            </FormField>
            <FormField label="Full Content">
              <RichTextEditor value={form.content} onChange={html => setForm(prev => ({ ...prev, content: html }))} />
            </FormField>
            <FormField label="Status">
              <select className={inputCls} value={form.status} onChange={set('status')}>
                <option>Draft</option><option>Published</option>
              </select>
            </FormField>
            <div className="flex gap-3 pt-2">
              <AdminButton variant="ghost" className="flex-1" onClick={closeModal}>Cancel</AdminButton>
              <AdminButton variant="primary" className="flex-1" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : modal === 'add' ? 'Create Post' : 'Save Changes'}
              </AdminButton>
            </div>
          </div>
        </Modal>
      )}

      {catModal && (
        <Modal title={catModal === 'add' ? 'Add Category' : 'Edit Category'} onClose={closeCatModal}>
          <div className="space-y-4">
            <FormField label="Category Name">
              <input
                className={inputCls}
                value={catForm.name}
                onChange={e => setCatForm({ name: e.target.value })}
                placeholder="e.g. Clinical Pharmacy, Career Advice, Research"
              />
            </FormField>
            <div className="flex gap-3 pt-2">
              <AdminButton variant="ghost" className="flex-1" onClick={closeCatModal}>Cancel</AdminButton>
              <AdminButton variant="primary" className="flex-1" onClick={handleSaveCategory} disabled={catSaving}>
                {catSaving ? 'Saving…' : catModal === 'add' ? 'Add Category' : 'Save Changes'}
              </AdminButton>
            </div>
          </div>
        </Modal>
      )}

      {sendModal && (
        <NewsletterSendModal
          phase={sendModal.phase}
          total={sendModal.total}
          remaining={sendModal.remaining}
          sent={sendModal.sent}
          failed={sendModal.failed}
          failedEmails={sendModal.failedEmails}
          onConfirm={startSending}
          onCancel={() => setSendModal(null)}
          onClose={() => setSendModal(null)}
        />
      )}
    </div>
  )
}
