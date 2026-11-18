import { useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { Download, Eye, RotateCcw, Mail, Award, X } from 'lucide-react'
import DataTable from './DataTable'
import AdminButton from './AdminButton'
import { useToast } from './Toast'
import { useConfirm } from './ConfirmDialog'
import { mockAttemptsService } from '../../firebase/services'
import { callMockTestAdminApi } from '../lib/mocktestApi'
import { compositeCertificateCanvas, canvasToCompressedBlob, deriveMockTestCertCode } from '../../lib/certificateGenerator'
import { uploadToCloudinary } from '../../firebase/cloudinary'

const STATUS_LABEL = { entered: 'Not started', in_progress: 'In progress', completed: 'Completed' }

function fmtDateTime(iso) {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleString() } catch { return iso }
}

// Admin-side certificate render — same canvas pipeline the student's own
// browser uses on the result page (compositeCertificateCanvas /
// canvasToCompressedBlob, unchanged), for the "student left before their
// own browser rendered it" case. Only the create-the-Firestore-doc step
// differs (admin-generate-cert.php, Firebase-ID-token-gated, vs the
// student's issue-cert.php, attempt-token-gated).
async function renderAndGenerateCert(mockTest, attempt) {
  const tpl = mockTest.certTemplate
  if (!tpl?.imageUrl) throw new Error('This mock test has no certificate template configured.')
  const certCode = await deriveMockTestCertCode(attempt.id)
  const canvas = await compositeCertificateCanvas({
    templateUrl: tpl.imageUrl,
    studentName: attempt.studentName,
    certCode,
    namePos: tpl.namePos,
    idPos: tpl.idPos,
    elements: tpl.elements,
  })
  const blob = await canvasToCompressedBlob(canvas)
  const imageUrl = await uploadToCloudinary(blob, 'medweb/certificates/generated')
  return callMockTestAdminApi('admin-generate-cert.php', { attemptId: attempt.id, imageUrl })
}

export default function MockTestResults({ mockTest }) {
  const toast = useToast()
  const confirmDialog = useConfirm()
  const [attempts, setAttempts] = useState([])
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState(null)
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    if (!mockTest?.id) return
    const unsub = mockAttemptsService.listenByMockTest(mockTest.id, rows => {
      setAttempts(rows)
      setLoading(false)
    })
    return unsub
  }, [mockTest?.id])

  const stats = useMemo(() => {
    const completed = attempts.filter(a => a.status === 'completed')
    return {
      total: attempts.length,
      completed: completed.length,
      inProgress: attempts.filter(a => a.status === 'in_progress').length,
      eligible: completed.filter(a => a.eligible).length,
    }
  }, [attempts])

  const handleGenerateCert = async attempt => {
    setBusyId(attempt.id)
    try {
      await renderAndGenerateCert(mockTest, attempt)
      toast.success('Certificate generated and emailed.')
    } catch (e) {
      toast.error('Could not generate certificate: ' + e.message)
    } finally {
      setBusyId(null)
    }
  }

  const handleResend = async attempt => {
    setBusyId(attempt.id)
    try {
      await callMockTestAdminApi('admin-resend.php', { attemptId: attempt.id })
      toast.success('Result email resent.')
    } catch (e) {
      toast.error('Could not resend email: ' + e.message)
    } finally {
      setBusyId(null)
    }
  }

  const handleReset = async attempt => {
    const ok = await confirmDialog(`Reset ${attempt.studentName}'s attempt? They'll be able to retake the test from the start — this does not revoke an already-issued certificate.`)
    if (!ok) return
    setBusyId(attempt.id)
    try {
      await callMockTestAdminApi('admin-reset.php', { attemptId: attempt.id })
      toast.success('Attempt reset.')
    } catch (e) {
      toast.error('Could not reset attempt: ' + e.message)
    } finally {
      setBusyId(null)
    }
  }

  const exportCsv = () => {
    const rows = attempts.map(a => ({
      Name: a.studentName, 'Registration ID': a.enrollmentId, Status: STATUS_LABEL[a.status] || a.status,
      'Correct': a.correctCount ?? '', 'Total': a.totalQuestions ?? '', 'Percent': a.percent ?? '',
      Eligible: a.status === 'completed' ? (a.eligible ? 'Yes' : 'No') : '',
      'Certificate': a.certificateStatus || '', 'Email': a.emailStatus || '',
      Started: a.startedAt || '', Finished: a.finishedAt || '',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Results')
    XLSX.writeFile(wb, `${mockTest.title || 'MockTest'}_Results.xlsx`)
  }

  const columns = [
    { key: 'studentName', label: 'Name' },
    { key: 'enrollmentId', label: 'Registration ID' },
    { key: 'status', label: 'Status', render: v => (
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${v === 'completed' ? 'bg-green-50 text-green-600' : v === 'in_progress' ? 'bg-blue-50 text-[#1655c3]' : 'bg-gray-100 text-gray-500'}`}>
        {STATUS_LABEL[v] || v}
      </span>
    )},
    { key: 'percent', label: 'Score', numeric: true, render: (v, row) => row.status === 'completed' ? `${row.correctCount}/${row.totalQuestions} (${v}%)` : '—' },
    { key: 'eligible', label: 'Eligible', render: (v, row) => row.status !== 'completed' ? '—' : (
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${v ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>{v ? 'Yes' : 'No'}</span>
    )},
    { key: 'certificateStatus', label: 'Certificate', render: v => v || '—' },
    { key: 'emailStatus', label: 'Email', render: v => v || '—' },
    { key: 'finishedAt', label: 'Finished', render: v => <span className="whitespace-nowrap text-xs">{fmtDateTime(v)}</span> },
    { key: 'id', label: 'Actions', render: (v, row) => (
      <div className="flex gap-1.5">
        <button onClick={() => setDetail(row)} className="p-1.5 rounded-lg hover:bg-blue-50 text-[#1655c3]" title="View detail"><Eye size={13} /></button>
        {row.status === 'completed' && row.eligible && row.certificateStatus !== 'issued' && (
          <button disabled={busyId === row.id} onClick={() => handleGenerateCert(row)} className="p-1.5 rounded-lg hover:bg-green-50 text-[#64ac37] disabled:opacity-40" title="Generate certificate"><Award size={13} /></button>
        )}
        {row.status === 'completed' && (
          <button disabled={busyId === row.id} onClick={() => handleResend(row)} className="p-1.5 rounded-lg hover:bg-blue-50 text-[#1655c3] disabled:opacity-40" title="Resend email"><Mail size={13} /></button>
        )}
        <button disabled={busyId === row.id} onClick={() => handleReset(row)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 disabled:opacity-40" title="Reset attempt"><RotateCcw size={13} /></button>
      </div>
    )},
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          ['Total entries', stats.total], ['In progress', stats.inProgress],
          ['Completed', stats.completed], ['Eligible', stats.eligible],
        ].map(([label, value]) => (
          <div key={label} className="admin-card p-4">
            <div className="text-xs admin-text-secondary font-semibold">{label}</div>
            <div className="text-2xl font-extrabold admin-text">{loading ? '…' : value}</div>
          </div>
        ))}
      </div>

      <DataTable
        title="Attempts" columns={columns} data={attempts} searchKey="studentName"
        emptyMessage="No one has entered this test yet."
        actions={<AdminButton size="sm" onClick={exportCsv}><Download size={13} className="mr-1.5" /> Export CSV</AdminButton>}
      />

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }} onMouseDown={e => e.target === e.currentTarget && setDetail(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100" style={{ background: 'linear-gradient(135deg, #1655c3, #123f8f)' }}>
              <h2 className="text-white font-black text-base">{detail.studentName}</h2>
              <button onClick={() => setDetail(null)} className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white hover:bg-white/30"><X size={16} /></button>
            </div>
            <div className="overflow-y-auto flex-1 p-6 space-y-3 text-sm">
              <Row label="Registration ID" value={detail.enrollmentId} />
              <Row label="Email" value={detail.email} />
              <Row label="Phone" value={detail.phone} />
              <Row label="Status" value={STATUS_LABEL[detail.status] || detail.status} />
              {detail.status === 'completed' && <>
                <Row label="Score" value={`${detail.correctCount}/${detail.totalQuestions} (${detail.percent}%)`} />
                <Row label="Unanswered" value={detail.unansweredCount} />
                <Row label="Eligible" value={detail.eligible ? 'Yes' : 'No'} />
                <Row label="Pass mark" value={`${detail.passPercent}%`} />
                <Row label="Certificate" value={detail.certCode ? `${detail.certCode} (${detail.certificateStatus})` : detail.certificateStatus} />
                <Row label="Email status" value={detail.emailStatus} />
                <Row label="Started" value={fmtDateTime(detail.startedAt)} />
                <Row label="Finished" value={fmtDateTime(detail.finishedAt)} />
              </>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-gray-50 pb-2">
      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</span>
      <span className="font-semibold text-[#1a1a1a] text-right">{value ?? '—'}</span>
    </div>
  )
}
