import { useState } from 'react'
import * as XLSX from 'xlsx'
import { Download, Trash2 } from 'lucide-react'
import Modal from './Modal'
import { inputCls } from './FormField'
import AdminButton from './AdminButton'
import { toIsoString, formsService } from '../../firebase/services'
import useAdminPermissions from '../hooks/useAdminPermissions'
import { useToast } from './Toast'
import { useConfirm } from './ConfirmDialog'

const formatDateStr = (val) => {
  const str = toIsoString(val)
  return str ? str.split('T')[0] : '-'
}

// Shared full-submission viewer — one column per field, labeled from the
// owning form's own schema (so it works even though Form Builder field keys
// are random uids, not semantic names). Originally built for Form Builder's
// own "Responses" view (AdminForms.jsx); also used by AdminCertificates.jsx
// to show the feedback submission behind an auto-issued certificate — pass
// `subs` as a single-item array to view just one submission.
// certificateStatus/certificateError live as top-level fields on the
// submission doc (written by src/lib/certificateGenerator.js), not inside
// `values` — so they need their own column rather than falling out of the
// generic per-field key loop below.
const CERT_STATUS_STYLES = {
  issued:               { label: 'Issued',              cls: 'bg-green-50 text-green-600' },
  issued_email_failed:  { label: 'Email Failed',         cls: 'bg-red-50 text-red-500' },
  issued_email_skipped: { label: 'Email Not Configured', cls: 'bg-amber-50 text-amber-600' },
  failed:               { label: 'Generation Failed',    cls: 'bg-red-50 text-red-500' },
}

export default function ResponsesModal({ form, subs: initialSubs, onClose }) {
  const { canDelete } = useAdminPermissions()
  const toast = useToast()
  const confirmDialog = useConfirm()
  const [q, setQ] = useState('')
  const [subs, setSubs] = useState(initialSubs)
  const [deletingId, setDeletingId] = useState(null)
  const keys = Array.from(new Set(subs.flatMap(s => Object.keys(s.values || {}))))
  const labelFor = k => (form.fields || []).find(f => f.key === k)?.label || k
  const showCertColumn = subs.some(s => s.certificateStatus)

  const filtered = subs.filter(s => {
    if (!q) return true
    return JSON.stringify(s.values || {}).toLowerCase().includes(q.toLowerCase())
  })

  const exportCsv = () => {
    const header = ['Submitted At', ...keys.map(labelFor)]
    const rows = filtered.map(s => [s.submittedAt || '', ...keys.map(k => String(s.values?.[k] ?? '').replace(/"/g, '""'))])
    const csv = [header, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${form.title.replace(/\s+/g, '_')}_responses.csv`
    a.click()
  }

  const exportExcel = () => {
    const header = ['Submitted At', ...keys.map(labelFor)]
    const rows = filtered.map(s => [
      formatDateStr(s.submittedAt || s.createdAt),
      ...keys.map(k => (typeof s.values?.[k] === 'boolean' ? (s.values[k] ? 'Yes' : 'No') : (s.values?.[k] ?? ''))),
    ])
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Responses')
    XLSX.writeFile(wb, `${form.title.replace(/\s+/g, '_')}_responses.xlsx`)
  }

  // Hidden entirely when showCertColumn is true (AdminCertificates.jsx's
  // own use of this modal, to show the feedback submission behind an
  // issued certificate) — deleting that submission from here would orphan
  // the certificate's own detail view for no reason; only shown for
  // AdminForms.jsx's real "Responses" use of this modal.
  const canDeleteHere = canDelete && !showCertColumn
  const handleDelete = async sub => {
    if (!await confirmDialog('Delete this response? This cannot be undone.')) return
    setDeletingId(sub.id)
    try {
      await formsService.deleteSubmission(sub.id)
      setSubs(prev => prev.filter(s => s.id !== sub.id))
    } catch (e) { toast.error('Error: ' + e.message) }
    finally { setDeletingId(null) }
  }

  return (
    <Modal title={`Responses — ${form.title}`} onClose={onClose} wide>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <input className={`${inputCls} sm:max-w-xs`} placeholder="Search responses…" value={q} onChange={e => setQ(e.target.value)} />
          <div className="flex items-center gap-2">
            <AdminButton size="sm" onClick={exportCsv} disabled={!filtered.length}>
              <Download size={13} className="mr-1.5" /> CSV ({filtered.length})
            </AdminButton>
            <AdminButton size="sm" onClick={exportExcel} disabled={!filtered.length}>
              <Download size={13} className="mr-1.5" /> Excel
            </AdminButton>
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">No responses yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-500">
                  <th className="px-3 py-2 font-semibold whitespace-nowrap">Date</th>
                  {showCertColumn && <th className="px-3 py-2 font-semibold whitespace-nowrap">Certificate</th>}
                  {keys.map(k => <th key={k} className="px-3 py-2 font-semibold whitespace-nowrap">{labelFor(k)}</th>)}
                  {canDeleteHere && <th className="px-3 py-2 font-semibold whitespace-nowrap"></th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => (
                  <tr key={s.id || i} className="border-t border-gray-100">
                    <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{formatDateStr(s.submittedAt || s.createdAt)}</td>
                    {showCertColumn && (
                      <td className="px-3 py-2 whitespace-nowrap">
                        {s.certificateStatus ? (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${CERT_STATUS_STYLES[s.certificateStatus]?.cls || 'bg-gray-100 text-gray-500'}`}
                            title={s.certificateError || s.certificateEmailError || ''}>
                            {CERT_STATUS_STYLES[s.certificateStatus]?.label || s.certificateStatus}
                          </span>
                        ) : '—'}
                      </td>
                    )}
                    {keys.map(k => (
                      <td key={k} className="px-3 py-2 text-gray-700 max-w-[200px] truncate">
                        {typeof s.values?.[k] === 'boolean' ? (s.values[k] ? 'Yes' : 'No')
                          : String(s.values?.[k]).startsWith('http') ? <a href={s.values[k]} target="_blank" rel="noreferrer" className="text-[#1655c3] underline">file</a>
                          : (s.values?.[k] ?? '—')}
                      </td>
                    ))}
                    {canDeleteHere && (
                      <td className="px-3 py-2 whitespace-nowrap">
                        <button onClick={() => handleDelete(s)} disabled={deletingId === s.id} className="p-1 rounded-lg hover:bg-red-50 text-red-500 disabled:opacity-40" title="Delete this response">
                          <Trash2 size={13} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  )
}
