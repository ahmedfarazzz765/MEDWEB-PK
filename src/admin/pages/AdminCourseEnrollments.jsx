import { useState, useEffect, useMemo } from 'react'
import { Download, Eye, Check, X as XIcon, FileText, ListChecks, Contact, RefreshCw } from 'lucide-react'
import StatCard from '../components/StatCard'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import AdminButton from '../components/AdminButton'
import useAdminPermissions from '../hooks/useAdminPermissions'
import { useToast } from '../components/Toast'
import { useConfirm } from '../components/ConfirmDialog'
import { courseEnrollmentsService, coursesService, courseJoiningLinksService, activityLogService } from '../../firebase/services'
import { sendCourseEnrollmentApprovedEmail, sendCourseEnrollmentRejectedEmail } from '../../firebase/email'
import {
  onGoogleContactsAuthChange, connectGoogleContacts, saveEnrollmentContact,
} from '../../lib/googleContacts'

function downloadCsv(filename, header, rows) {
  const csv = [header, ...rows]
    .map(line => line.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
}

// Rendered inside a wide Modal from AdminCourses.jsx, scoped to one course
// — "each course gets an Enrollments view" (Prompt text) is satisfied by
// opening this from that course's own row/card rather than a separate
// top-level admin page, since every enrollment already belongs to exactly
// one course and there's no cross-course view asked for.
export default function AdminCourseEnrollments({ course, onClose }) {
  const { canWrite } = useAdminPermissions()
  const toast = useToast()
  const confirmDialog = useConfirm()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('All')
  const [proofUrl, setProofUrl] = useState(null)
  const [detailRow, setDetailRow] = useState(null) // enrollment row with `responses` being viewed
  const [rejectTarget, setRejectTarget] = useState(null) // enrollment row being rejected
  const [rejectReason, setRejectReason] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [pageSize, setPageSize] = useState(50)
  const [counts, setCounts] = useState({ Pending: 0, Approved: 0, Rejected: 0 })
  const [googleAuth, setGoogleAuth] = useState({ connected: false, email: null })
  const [connecting, setConnecting] = useState(false)
  const [gcBanner, setGcBanner] = useState(null) // { text, retryRow } | null
  const [bulkSyncing, setBulkSyncing] = useState(false)
  const [contactBusyId, setContactBusyId] = useState(null)

  useEffect(() => onGoogleContactsAuthChange(setGoogleAuth), [])

  const handleConnectGoogle = async () => {
    setConnecting(true)
    try { await connectGoogleContacts() }
    catch (e) { setGcBanner({ text: 'Google Contacts connection failed: ' + e.message }) }
    finally { setConnecting(false) }
  }

  // Create/update the Google Contact for one enrollment — never blocks or
  // undoes the approval/email that already happened; a failure here only
  // ever surfaces as a toast with a Retry action.
  const saveContactForEnrollment = async row => {
    setContactBusyId(row.id)
    try {
      const { resourceName } = await saveEnrollmentContact({
        enrollmentId: row.enrollmentId, fullName: nameOf(row), phone: row.whatsapp || row.phone,
        email: row.email, courseTitle: course.title,
      })
      await courseEnrollmentsService.saveContactInfo(row.id, { contactResourceName: resourceName })
      setRows(prev => prev.map(r => r.id === row.id ? { ...r, contactSaved: true, contactResourceName: resourceName } : r))
    } catch (e) {
      setGcBanner({ text: `Couldn't save contact for ${nameOf(row)}: ${e.message}`, retryRow: row })
    } finally {
      setContactBusyId(null)
    }
  }

  const retryToast = () => {
    if (gcBanner?.retryRow) saveContactForEnrollment(gcBanner.retryRow)
    setGcBanner(null)
  }

  // Sequential with a 300ms gap between each — the People API has
  // per-minute write quotas that a tight loop of 50+ approved enrollments
  // could otherwise trip.
  const bulkSyncContacts = async () => {
    setBulkSyncing(true)
    try {
      const all = await courseEnrollmentsService.getByCourse(course.id)
      const targets = all.filter(r => r.status === 'Approved' && !r.contactSaved)
      for (const row of targets) {
        await saveContactForEnrollment(row)
        await new Promise(res => setTimeout(res, 300))
      }
      setGcBanner({ text: `Synced ${targets.length} contact${targets.length === 1 ? '' : 's'}.` })
    } finally {
      setBulkSyncing(false)
    }
  }

  // A linked-form enrollment has no top-level `paymentProofUrl` — its
  // proof (if the form has a file field) lives inside `responses`
  // instead, keyed by whatever label the admin gave that field.
  const findProofUrl = row => {
    if (row.paymentProofUrl) return row.paymentProofUrl
    return Object.values(row.responses || {}).find(v => typeof v === 'string' && v.startsWith('http')) || null
  }
  const nameOf = row => row.name || row.fullName || '—'

  useEffect(() => {
    setLoading(true)
    const unsub = courseEnrollmentsService.listenByCourse(course.id, data => { setRows(data); setLoading(false) }, pageSize)
    return unsub
  }, [course.id, pageSize])

  const refreshCounts = () => {
    courseEnrollmentsService.getStatusCountsByCourse(course.id).then(setCounts).catch(() => {})
  }
  // Independent of `rows`/pagination — these StatCards must stay accurate
  // even when not every enrollment is loaded yet (see "Load more" below).
  useEffect(() => { refreshCounts() }, [course.id])

  const filtered = (statusFilter === 'All' ? rows : rows.filter(r => r.status === statusFilter))
    // `name` always set here (never just `fullName`) so DataTable's own
    // search-by-"name" keeps working for linked-form enrollments too.
    .map(r => ({ ...r, name: nameOf(r) }))

  // Keeps the course's own `students` counter (already shown everywhere
  // else in the admin/public UI) in sync with real approved enrollments —
  // same shape as every other "update the course's student count" field,
  // just driven by this collection instead of a manual admin edit.
  // Re-queries the 3 status counts once and uses them for both the
  // course's `students` field and the StatCards above — avoids querying
  // twice per approve/reject action.
  const syncStudentCount = async () => {
    const counts = await courseEnrollmentsService.getStatusCountsByCourse(course.id)
    setCounts(counts)
    await coursesService.update(course.id, { students: counts.Approved }).catch(() => {})
  }

  const handleApprove = async row => {
    setBusyId(row.id)
    try {
      await courseEnrollmentsService.updateStatus(row.id, 'Approved')
      await syncStudentCount()
      activityLogService.log('course_enrollment_approved', { courseId: course.id, enrollmentId: row.enrollmentId, email: row.email })
      // Only place the real joining link is ever read — straight from its
      // admin-only doc, straight into the one email that's allowed to
      // carry it. Never passed through component state/props beyond this.
      const joiningLinkDoc = await courseJoiningLinksService.get(course.id).catch(() => null)
      sendCourseEnrollmentApprovedEmail({
        name: nameOf(row), email: row.email, courseTitle: course.title,
        eventDate: course.eventDate, startTime: course.startTime, endTime: course.endTime,
        platform: course.platform, joiningLink: joiningLinkDoc?.joiningLink || '', enrollmentId: row.enrollmentId,
        amountDue: row.amountDue,
        communityLink: course.communityLink || '', communityName: course.communityName || '',
      }).catch(() => {})
      saveContactForEnrollment(row).catch(() => {})
    } catch (e) { toast.error('Error: ' + e.message) }
    finally { setBusyId(null) }
  }

  const openReject = row => { setRejectTarget(row); setRejectReason('') }
  const confirmReject = async () => {
    if (!rejectReason.trim()) { toast.error('Please enter a reason for rejecting this enrollment.'); return }
    setBusyId(rejectTarget.id)
    try {
      await courseEnrollmentsService.updateStatus(rejectTarget.id, 'Rejected', { rejectionReason: rejectReason.trim() })
      await syncStudentCount()
      activityLogService.log('course_enrollment_rejected', { courseId: course.id, enrollmentId: rejectTarget.enrollmentId, email: rejectTarget.email, reason: rejectReason.trim() })
      sendCourseEnrollmentRejectedEmail({
        name: nameOf(rejectTarget), email: rejectTarget.email, courseTitle: course.title,
        reason: rejectReason.trim(), enrollmentId: rejectTarget.enrollmentId,
      }).catch(() => {})
      setRejectTarget(null)
    } catch (e) { toast.error('Error: ' + e.message) }
    finally { setBusyId(null) }
  }

  // Union of every distinct response label across the filtered rows —
  // a linked form's fields vary per-course, so the CSV's extra columns
  // can't be a fixed list the way the built-in form's fields are.
  const responseKeys = useMemo(() => Array.from(new Set(filtered.flatMap(r => Object.keys(r.responses || {})))), [filtered])

  // Fetches the FULL enrollment list on demand, independent of the
  // `pageSize` cap above — exporting a partial CSV because the admin
  // hadn't clicked "Load more" yet would be a silent data-loss trap.
  const [exporting, setExporting] = useState(false)
  const exportCsv = async () => {
    setExporting(true)
    try {
      const all = (await courseEnrollmentsService.getByCourse(course.id))
        .filter(r => statusFilter === 'All' || r.status === statusFilter)
        .map(r => ({ ...r, name: nameOf(r) }))
      const allResponseKeys = Array.from(new Set(all.flatMap(r => Object.keys(r.responses || {}))))
      downloadCsv(
        `${(course.title || 'course').replace(/\s+/g, '_')}_enrollments.csv`,
        ['Enrollment ID', 'Name', 'Email', 'WhatsApp', 'Institution', 'Transaction ID', 'Amount Paid', 'Amount Due', 'Payment Date', 'Status', ...allResponseKeys],
        all.map(r => [
          r.enrollmentId, r.name, r.email, r.whatsapp, r.institution, r.transactionId,
          r.amountPaid, r.amountDue, r.paymentDate, r.status,
          ...allResponseKeys.map(k => r.responses?.[k] ?? ''),
        ])
      )
    } finally {
      setExporting(false)
    }
  }

  const columns = [
    { key: 'enrollmentId', label: 'ID', render: v => <span className="font-mono text-xs font-bold text-[#1655c3]">{v}</span> },
    { key: 'name', label: 'Name', render: (v, row) => <span className="font-semibold text-[#1a1a1a]">{nameOf(row)}</span> },
    { key: 'email', label: 'Email', render: v => <span className="text-gray-500 text-xs">{v}</span> },
    { key: 'whatsapp', label: 'WhatsApp' },
    { key: 'amountPaid', label: 'Amount Paid', render: (v, row) => v ? <span className="font-bold text-[#64ac37]">PKR {Number(v).toLocaleString()}</span> : <span className="text-gray-300">—</span> },
    { key: 'amountDue', label: 'Amount Due', render: v => v ? <span className="font-bold text-[#1655c3]">PKR {Number(v).toLocaleString()}</span> : <span className="text-gray-300">—</span> },
    { key: 'status', label: 'Status', render: v => {
      const m = { Pending: 'bg-yellow-50 text-yellow-600', Approved: 'bg-green-50 text-green-600', Rejected: 'bg-red-50 text-red-500' }
      return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${m[v] || 'bg-gray-100 text-gray-500'}`}>{v}</span>
    }},
    { key: 'contactSaved', label: 'Contact', render: (v, row) => {
      if (row.status !== 'Approved') return <span className="text-gray-300">—</span>
      if (row.contactSaved) return <span className="inline-flex items-center gap-1 text-xs font-bold text-[#64ac37]"><Check size={12} /> Saved</span>
      return (
        <button onClick={() => saveContactForEnrollment(row)} disabled={contactBusyId === row.id}
          className="inline-flex items-center gap-1 text-xs font-bold text-[#1655c3] hover:underline disabled:opacity-40" title="Retry save contact">
          <RefreshCw size={12} className={contactBusyId === row.id ? 'animate-spin' : ''} /> {contactBusyId === row.id ? 'Saving…' : 'Retry save contact'}
        </button>
      )
    }},
    { key: 'actions', label: 'Actions', render: (v, row) => (
      <div className="flex items-center gap-1.5">
        <button onClick={() => setDetailRow(row)} className="p-1.5 rounded-lg hover:bg-blue-50 text-[#1655c3]" title="View full submission">
          <ListChecks size={13} />
        </button>
        {findProofUrl(row) && (
          <button onClick={() => setProofUrl(findProofUrl(row))} className="p-1.5 rounded-lg hover:bg-blue-50 text-[#1655c3]" title="View payment proof">
            <Eye size={13} />
          </button>
        )}
        {canWrite && row.status === 'Pending' && (
          <>
            <button onClick={() => handleApprove(row)} disabled={busyId === row.id} className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 disabled:opacity-40" title="Approve">
              <Check size={13} />
            </button>
            <button onClick={() => openReject(row)} disabled={busyId === row.id} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 disabled:opacity-40" title="Reject">
              <XIcon size={13} />
            </button>
          </>
        )}
      </div>
    )},
  ]

  const isPdf = url => /\.pdf(\?|$)/i.test(url || '')

  return (
    <Modal title={`Enrollments — ${course.title}`} onClose={onClose} wide>
      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-3">
          <StatCard icon={FileText} label="Pending" value={loading ? '…' : counts.Pending} color="#d97706" bg="#fffbeb" />
          <StatCard icon={Check} label="Approved" value={loading ? '…' : counts.Approved} color="#64ac37" bg="#f0fdf4" />
          <StatCard icon={XIcon} label="Rejected" value={loading ? '…' : counts.Rejected} color="#ef4444" bg="#fef2f2" />
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            {googleAuth.connected ? (
              <>
                <span className="text-xs font-semibold text-gray-500 flex items-center gap-1.5">
                  <Contact size={14} className="text-[#64ac37]" /> Contacts: {googleAuth.email || 'connected'}
                </span>
                <AdminButton variant="ghost" size="sm" onClick={bulkSyncContacts} disabled={bulkSyncing || !counts.Approved}>
                  <RefreshCw size={13} className={`mr-1.5 ${bulkSyncing ? 'animate-spin' : ''}`} />
                  {bulkSyncing ? 'Syncing…' : 'Sync contacts for all approved'}
                </AdminButton>
              </>
            ) : (
              <AdminButton variant="ghost" size="sm" onClick={handleConnectGoogle} disabled={connecting}>
                <Contact size={13} className="mr-1.5" /> {connecting ? 'Connecting…' : 'Connect Google Contacts'}
              </AdminButton>
            )}
          </div>
        </div>

        {gcBanner && (
          <div className="flex items-center justify-between gap-3 text-xs font-semibold bg-amber-50 text-amber-700 rounded-xl px-4 py-2.5">
            <span>{gcBanner.text}</span>
            <div className="flex items-center gap-3 shrink-0">
              {gcBanner.retryRow && <button onClick={retryToast} className="underline">Retry save contact</button>}
              <button onClick={() => setGcBanner(null)} className="text-amber-400 hover:text-amber-600"><XIcon size={13} /></button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-2">
            {['All', 'Pending', 'Approved', 'Rejected'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${statusFilter === s ? 'text-white bg-[#1655c3]' : 'text-gray-500 bg-gray-100 hover:bg-gray-200'}`}>
                {s}
              </button>
            ))}
          </div>
          <AdminButton variant="ghost" size="sm" onClick={exportCsv} disabled={!filtered.length || exporting}>
            <Download size={13} className="mr-1.5" /> {exporting ? 'Exporting…' : 'Export CSV'}
          </AdminButton>
        </div>

        <DataTable columns={columns} data={filtered} searchKey="name" emptyMessage="No enrollments yet" />
        {/* `rows.length === pageSize` is a heuristic for "there might be
            more" (exactly pageSize loaded could also mean that's all of
            them) — clicking this re-subscribes with a bigger limit, and
            the button simply disappears next render if that was in fact
            everything. */}
        {!loading && rows.length === pageSize && (
          <div className="flex justify-center py-4">
            <AdminButton variant="secondary" onClick={() => setPageSize(n => n + 50)}>Load more</AdminButton>
          </div>
        )}
      </div>

      {proofUrl && (
        <Modal title="Payment Proof" onClose={() => setProofUrl(null)}>
          {isPdf(proofUrl) ? (
            <a href={proofUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[#1655c3] font-semibold">
              <FileText size={18} /> Open PDF in a new tab
            </a>
          ) : (
            <img src={proofUrl} alt="Payment proof" className="w-full rounded-xl" />
          )}
        </Modal>
      )}

      {detailRow && (
        <Modal title={`Submission — ${nameOf(detailRow)}`} onClose={() => setDetailRow(null)}>
          <div className="space-y-3">
            {/* Fixed fields the built-in form always has */}
            {[
              ['Enrollment ID', detailRow.enrollmentId], ['Email', detailRow.email], ['WhatsApp', detailRow.whatsapp],
              ['Institution', detailRow.institution], ['Qualification', detailRow.qualification], ['City', detailRow.city],
              ['Payment Method', detailRow.paymentMethod], ['Transaction ID', detailRow.transactionId],
              ['Amount Paid', detailRow.amountPaid ? `PKR ${Number(detailRow.amountPaid).toLocaleString()}` : ''],
              ['Amount Due', detailRow.amountDue ? `PKR ${Number(detailRow.amountDue).toLocaleString()}` : ''],
              ['Payment Date', detailRow.paymentDate],
            ].filter(([, v]) => v).map(([label, v]) => (
              <div key={label} className="flex items-start justify-between gap-3 border-b border-gray-100 pb-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider shrink-0">{label}</span>
                <span className="text-sm text-gray-700 text-right">{v}</span>
              </div>
            ))}
            {/* Every answer from a linked Form Builder form, label -> value */}
            {Object.entries(detailRow.responses || {}).map(([label, value]) => (
              <div key={label} className="flex items-start justify-between gap-3 border-b border-gray-100 pb-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider shrink-0">{label}</span>
                {typeof value === 'string' && value.startsWith('http') ? (
                  <button onClick={() => setProofUrl(value)} className="text-sm text-[#1655c3] font-semibold hover:underline shrink-0">View file</button>
                ) : (
                  <span className="text-sm text-gray-700 text-right">{typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}</span>
                )}
              </div>
            ))}
            {!Object.keys(detailRow.responses || {}).length && !detailRow.transactionId && (
              <p className="text-sm text-gray-400 text-center py-6">No submission details recorded.</p>
            )}
          </div>
        </Modal>
      )}

      {rejectTarget && (
        <Modal title="Reject Enrollment" onClose={() => setRejectTarget(null)}>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Rejecting <strong>{rejectTarget.name}</strong>'s enrollment ({rejectTarget.enrollmentId}). This reason will be included in the email sent to them.</p>
            <textarea
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 outline-none focus:border-[#1655c3] focus:ring-2 focus:ring-blue-100"
              rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)}
              placeholder="e.g. Payment amount doesn't match the course fee"
            />
            <div className="flex gap-3">
              <AdminButton variant="ghost" className="flex-1" onClick={() => setRejectTarget(null)}>Cancel</AdminButton>
              <AdminButton variant="danger" className="flex-1" onClick={confirmReject} disabled={busyId === rejectTarget.id}>
                {busyId === rejectTarget.id ? 'Rejecting…' : 'Reject & Notify'}
              </AdminButton>
            </div>
          </div>
        </Modal>
      )}
    </Modal>
  )
}
