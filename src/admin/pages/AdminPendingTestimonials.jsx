import { useState, useEffect, useMemo } from 'react'
import { Star, Youtube, MapPin, RefreshCw, Check, X, Inbox, Plus } from 'lucide-react'
import StatCard from '../components/StatCard'
import AdminButton from '../components/AdminButton'
import FormField, { inputCls } from '../components/FormField'
import { pendingTestimonialsService, testimonialsService, youtubeFetchStateService } from '../../firebase/services'
import { fetchYouTubeReviews } from '../lib/reviewFetchers'
import CoverImage from '../../components/CoverImage'

function StarPicker({ value, onChange }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" onClick={() => onChange(n)} className="p-0.5">
          <Star size={22} className={n <= value ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'} />
        </button>
      ))}
    </div>
  )
}

const emptyGoogleForm = () => ({ name: '', text: '', stars: 5, reviewLink: '' })

// The admin is manually copy-pasting a review they've already vetted, unlike
// the automated feeds — so this publishes straight into testimonialsService
// (the same collection Approve writes into), skipping the Pending queue.
function AddGoogleReviewForm() {
  const [form, setForm] = useState(emptyGoogleForm())
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }))

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.text.trim()) return
    setSaving(true)
    try {
      await testimonialsService.add({
        name: form.name.trim(),
        uni: '', role: '',
        text: form.text.trim(),
        img: '',
        stars: form.stars,
        category: 'Google Review',
        reviewLink: form.reviewLink.trim(),
      })
      setForm(emptyGoogleForm())
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) { alert(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MapPin size={16} className="text-[#1655c3]" />
          <h3 className="font-black text-[#1a1a1a] text-sm">Add Google Review</h3>
        </div>
        {saved && <span className="text-xs font-bold text-green-600">Published ✓</span>}
      </div>
      <p className="text-xs text-gray-500 mb-4">
        Copy-paste a real Google Review here — since you're curating it yourself, it publishes immediately to "What Our Students Say", no approval step needed.
      </p>
      <div className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <FormField label="Reviewer Name">
            <input className={inputCls} value={form.name} onChange={set('name')} placeholder="Ali Khan" />
          </FormField>
          <FormField label="Star Rating">
            <StarPicker value={form.stars} onChange={n => setForm(p => ({ ...p, stars: n }))} />
          </FormField>
        </div>
        <FormField label="Review Text">
          <textarea rows={3} className={`${inputCls} resize-none`} value={form.text} onChange={set('text')} placeholder="What they said…" />
        </FormField>
        <FormField label="Original Review Link (optional)">
          <input className={inputCls} value={form.reviewLink} onChange={set('reviewLink')} placeholder="https://g.co/kgs/..." />
        </FormField>
        <AdminButton onClick={handleSubmit} disabled={saving || !form.name.trim() || !form.text.trim()}>
          <Plus size={14} className="mr-1.5" /> {saving ? 'Publishing…' : 'Publish Review'}
        </AdminButton>
      </div>
    </div>
  )
}

function PendingCard({ item, onApprove, onReject, busy }) {
  const isGoogle = item.source === 'Google'
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${isGoogle ? 'bg-blue-50 text-[#1655c3]' : 'bg-red-50 text-red-500'}`}>
          {isGoogle ? <MapPin size={10} /> : <Youtube size={10} />} {item.source}
        </span>
        {isGoogle && item.stars > 0 && (
          <span className="text-amber-500 text-xs">{'★'.repeat(item.stars)}</span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {item.img ? (
          <CoverImage src={item.img} alt="" bias="center 25%" className="w-11 h-11 rounded-full shrink-0" />
        ) : (
          <div className="w-11 h-11 rounded-full bg-blue-50 text-[#1655c3] flex items-center justify-center text-sm font-bold shrink-0">{(item.name || '?')[0]}</div>
        )}
        <div className="min-w-0">
          <div className="font-bold text-[#1a1a1a] text-sm truncate">{item.name}</div>
          <div className="text-[11px] text-gray-400">
            {item.submittedAt ? new Date(item.submittedAt).toLocaleDateString() : ''}
          </div>
        </div>
      </div>

      <p className="text-gray-600 text-xs leading-relaxed line-clamp-4">{item.text}</p>

      {item.videoUrl && (
        <a href={item.videoUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] font-semibold text-[#1655c3] hover:underline">
          View comment on YouTube →
        </a>
      )}
      {item.reviewLink && (
        <a href={item.reviewLink} target="_blank" rel="noopener noreferrer" className="text-[11px] font-semibold text-[#1655c3] hover:underline">
          View on Google Maps →
        </a>
      )}

      <div className="flex gap-2 pt-1">
        <AdminButton size="sm" variant="success" className="flex-1" disabled={busy} onClick={() => onApprove(item)}>
          <Check size={13} className="mr-1" /> Approve
        </AdminButton>
        <AdminButton size="sm" variant="danger" className="flex-1" disabled={busy} onClick={() => onReject(item)}>
          <X size={13} className="mr-1" /> Reject
        </AdminButton>
      </div>
    </div>
  )
}

export default function AdminPendingTestimonials() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetching, setFetching] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')
  const [lastFetchSummary, setLastFetchSummary] = useState('')

  useEffect(() => {
    const unsub = pendingTestimonialsService.listen(rows => { setData(rows); setLoading(false) })
    return unsub
  }, [])

  const pending = useMemo(() => data.filter(d => d.status === 'Pending'), [data])
  const googleCount = pending.filter(d => d.source === 'Google').length
  const youtubeCount = pending.filter(d => d.source === 'YouTube Comment').length

  const handleFetch = async () => {
    setFetching(true)
    setError('')
    setLastFetchSummary('')
    const existingKeys = await pendingTestimonialsService.getAllDedupeKeys().catch(() => new Set())
    let added = 0
    const errors = []

    try {
      const fetchState = await youtubeFetchStateService.get().catch(() => null)
      const comments = await fetchYouTubeReviews(fetchState?.lastFetchedAt)
      for (const c of comments) {
        if (existingKeys.has(c.dedupeKey)) continue
        await pendingTestimonialsService.add(c)
        existingKeys.add(c.dedupeKey)
        added++
      }
      await youtubeFetchStateService.markFetched()
    } catch (e) { errors.push('YouTube: ' + e.message) }

    setLastFetchSummary(`Fetch complete — ${added} new item${added === 1 ? '' : 's'} added to the queue.`)
    if (errors.length) setError(errors.join(' | '))
    setFetching(false)
  }

  const handleApprove = async item => {
    setBusyId(item.id)
    try { await pendingTestimonialsService.approve(item) } catch (e) { alert(e.message) }
    finally { setBusyId(null) }
  }

  const handleReject = async item => {
    setBusyId(item.id)
    try { await pendingTestimonialsService.reject(item.id) } catch (e) { alert(e.message) }
    finally { setBusyId(null) }
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={Inbox} label="Pending" value={loading ? '…' : pending.length} color="#1655c3" bg="#eff6ff" />
        <StatCard icon={MapPin} label="Google Reviews" value={loading ? '…' : googleCount} color="#1655c3" bg="#eff6ff" />
        <StatCard icon={Youtube} label="YouTube Comments" value={loading ? '…' : youtubeCount} color="#ef4444" bg="#fef2f2" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-black text-[#1a1a1a] text-sm mb-1">Fetch New Reviews</h3>
            <p className="text-xs text-gray-500">
              Pulls new comments from <span className="font-semibold text-[#1655c3]">MEDWEB's own YouTube channel</span> (@medwebpk) into the queue below. Only checks for comments posted since the last fetch. Run manually whenever you want to check for new ones.
            </p>
          </div>
          <AdminButton onClick={handleFetch} disabled={fetching}>
            <RefreshCw size={14} className={`mr-1.5 ${fetching ? 'animate-spin' : ''}`} /> {fetching ? 'Fetching…' : 'Fetch New Reviews'}
          </AdminButton>
        </div>
        {lastFetchSummary && !error && <p className="text-xs text-green-600 font-semibold mt-3">{lastFetchSummary}</p>}
        {error && <p className="text-xs text-red-500 font-semibold mt-3">{error}</p>}
      </div>

      <AddGoogleReviewForm />

      {loading ? (
        <p className="text-sm text-gray-400 text-center py-10">Loading…</p>
      ) : pending.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
          <p className="text-sm text-gray-400">No pending items — click "Fetch New Reviews" above to check for new YouTube videos.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pending.map(item => (
            <PendingCard key={item.id} item={item} onApprove={handleApprove} onReject={handleReject} busy={busyId === item.id} />
          ))}
        </div>
      )}
    </div>
  )
}
