import { useState } from 'react'
import { Download } from 'lucide-react'
import Modal from './Modal'
import { inputCls } from './FormField'
import AdminButton from './AdminButton'

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

export default function ResponsesModal({ form, subs, onClose }) {
  const [q, setQ] = useState('')
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

  return (
    <Modal title={`Responses — ${form.title}`} onClose={onClose} wide>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <input className={`${inputCls} sm:max-w-xs`} placeholder="Search responses…" value={q} onChange={e => setQ(e.target.value)} />
          <AdminButton size="sm" onClick={exportCsv} disabled={!filtered.length}>
            <Download size={13} className="mr-1.5" /> Export CSV ({filtered.length})
          </AdminButton>
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
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => (
                  <tr key={s.id || i} className="border-t border-gray-100">
                    <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{(s.submittedAt || '').split('T')[0]}</td>
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
