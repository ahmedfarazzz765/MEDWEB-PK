import { useState, useEffect } from 'react'
import { Award, CheckCircle, XCircle, Eye, Edit2, Download, Copy, ExternalLink, FileText, Plus, X } from 'lucide-react'
import StatCard   from '../components/StatCard'
import DataTable  from '../components/DataTable'
import Modal      from '../components/Modal'
import FormField, { inputCls } from '../components/FormField'
import ImageUpload from '../components/ImageUpload'
import CertPositionEditor from '../components/CertPositionEditor'
import CertificateTemplate, { TEMPLATES } from '../../components/CertificateTemplate'
import AdminButton from '../components/AdminButton'
import ResponsesModal from '../components/ResponsesModal'
import { certificatesService, webinarsService, coursesService, formsService, settingsService } from '../../firebase/services'
import { issueManualCertificate } from '../../lib/certificateGenerator'
import { DEFAULT_CERT_FONT } from '../../constants/certificateFonts'

const genCode = () => `CERT-MW-${new Date().getFullYear()}-${Math.random().toString(36).substring(2,7).toUpperCase()}`

// Manual "Issue Certificate" — rebuilt to match the automatic
// webinar-feedback flow exactly (template image + drag-to-position editor
// + font picker, see CertPositionEditor), instead of the old
// design-picker/signatory form below (kept only for editing legacy
// records that don't have a certificateImageUrl).
const emptyIssueForm = () => ({
  imageUrl: '', namePos: null, idPos: null,
  recipient: '', recipientEmail: '', description: '',
  customFields: [],
})

const emptyForm = () => ({
  certCode: genCode(),
  template: 'classic',
  recipient: '',
  recipientEmail: '',
  sourceType: 'manual',   // 'webinar' | 'course' | 'manual'
  sourceId: '',
  title: '',
  body: 'has demonstrated outstanding commitment to medical excellence.',
  issued: new Date().toISOString().split('T')[0],
  signatoryName: 'Dr. Shahroz Abbas',
  signatoryTitle: 'Founder & CEO, MEDWEB-PK',
  status: 'Valid',
  verifications: 0,
})

// scale helper for the live preview (cert is 1000x707). An auto-generated
// webinar certificate is a real composited image (certificateImageUrl) —
// showing it here instead of always falling back to the generic
// CertificateTemplate design is what makes this match the actual uploaded
// template (background, signatures, layout) rather than a plain default.
// Mirrors the exact same branching CertificatePage.jsx already uses for the
// public verification view.
function PreviewBox({ form, scale = 0.46 }) {
  if (form.certificateImageUrl) {
    return (
      <img
        src={form.certificateImageUrl}
        alt={`Certificate ${form.certCode || ''}`}
        style={{ width: 1000 * scale, height: 'auto', display: 'block', borderRadius: 8 }}
      />
    )
  }
  return (
    <div style={{ width: 1000 * scale, height: 707 * scale, overflow: 'hidden' }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
        <CertificateTemplate {...form} />
      </div>
    </div>
  )
}

export default function AdminCertificates() {
  const [data,    setData]    = useState([])
  const [webinars,setWebinars]= useState([])
  const [courses, setCourses] = useState([])
  const [forms,   setForms]   = useState([])
  const [subs,    setSubs]    = useState([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(false)        // 'edit' only now — 'add' replaced by issueModal below
  const [form,    setForm]    = useState(emptyForm)
  const [editId,  setEditId]  = useState(null)
  const [saving,  setSaving]  = useState(false)
  const [issueModal, setIssueModal] = useState(false)
  const [issueForm,  setIssueForm]  = useState(emptyIssueForm)
  const [issueSaving, setIssueSaving] = useState(false)
  const [preview, setPreview] = useState(null)         // cert row for full preview modal
  const [viewSubCert, setViewSubCert] = useState(null) // cert row whose submission is being viewed
  const [verifyCode,   setVerifyCode]   = useState('')
  const [verifyResult, setVerifyResult] = useState(null)
  const [verifying,    setVerifying]    = useState(false)
  // The last template (image + Name/ID/custom-field positions & fonts) the
  // admin actually issued a certificate with — so re-opening "Issue
  // Certificate" for the next recipient doesn't force a re-upload every
  // time. Persisted on settings/site, so it also carries across sessions.
  const [lastTemplate, setLastTemplate] = useState(null)

  useEffect(() => {
    const u1 = certificatesService.listen(rows => { setData(rows); setLoading(false) })
    const u2 = webinarsService.listen(rows => setWebinars(rows))
    const u3 = coursesService.listen(rows => setCourses(rows))
    const u4 = formsService.listen(rows => setForms(rows))
    const u5 = formsService.listenSubmissions(rows => setSubs(rows))
    return () => { u1(); u2(); u3(); u4(); u5() }
  }, [])

  useEffect(() => {
    settingsService.get().then(s => { if (s?.lastManualCertTemplate) setLastTemplate(s.lastManualCertTemplate) }).catch(() => {})
  }, [])

  // The submission a certificate was auto-issued from, plus the form that
  // defines its field labels (for ResponsesModal, reused as-is from Form
  // Builder — passed a single-item `subs` array to show just this one).
  const viewSubData = (() => {
    if (!viewSubCert?.submissionId) return null
    const sub = subs.find(s => s.id === viewSubCert.submissionId)
    if (!sub) return null
    const parentForm = forms.find(f => f.id === sub.formId) || { title: viewSubCert.title || 'Submission', fields: [] }
    return { sub, parentForm }
  })()

  const openEdit = row => { setForm({ ...emptyForm(), ...row }); setEditId(row.id); setModal('edit') }
  const closeModal = () => { setModal(false); setEditId(null) }
  const set = field => e => setForm(p => ({ ...p, [field]: e.target.value }))

  // --- Manual "Issue Certificate" (rebuilt to match the automatic flow) ---
  // Pre-fills the template/positions/fonts from the last-used template (if
  // any) — only Recipient Name/Email/Description and custom field VALUES
  // start blank, since those are naturally different per recipient.
  const openIssue = () => {
    setIssueForm(lastTemplate ? {
      ...emptyIssueForm(),
      imageUrl: lastTemplate.imageUrl || '',
      namePos: lastTemplate.namePos || null,
      idPos: lastTemplate.idPos || null,
      customFields: (lastTemplate.customFields || []).map(f => ({ ...f, value: '' })),
    } : emptyIssueForm())
    setIssueModal(true)
  }
  const closeIssue = () => setIssueModal(false)
  const setIssueField = field => e => setIssueForm(p => ({ ...p, [field]: e.target.value }))

  const handleIssueSave = async () => {
    setIssueSaving(true)
    try {
      await issueManualCertificate({
        templateUrl: issueForm.imageUrl,
        namePos: issueForm.namePos,
        idPos: issueForm.idPos,
        recipientName: issueForm.recipient,
        recipientEmail: issueForm.recipientEmail,
        description: issueForm.description,
        customFields: issueForm.customFields,
      })
      const usedTemplate = {
        imageUrl: issueForm.imageUrl,
        namePos: issueForm.namePos,
        idPos: issueForm.idPos,
        customFields: issueForm.customFields.map(({ value, ...rest }) => rest),
      }
      setLastTemplate(usedTemplate)
      settingsService.update({ lastManualCertTemplate: usedTemplate }).catch(() => {})
      closeIssue()
    } catch (e) { alert('Error: ' + e.message) }
    finally { setIssueSaving(false) }
  }

  // Custom fields (Score, Grade, Duration, etc.) — fully optional, each gets
  // its own draggable box on the template via CertPositionEditor.
  const addCustomField = () => setIssueForm(p => ({
    ...p,
    customFields: [...p.customFields, { id: crypto.randomUUID(), label: '', value: '', xPct: 50, yPct: 50, fontSize: 28, color: '#1a1a1a', fontFamily: DEFAULT_CERT_FONT }],
  }))
  const removeCustomField = id => setIssueForm(p => ({ ...p, customFields: p.customFields.filter(f => f.id !== id) }))
  const setCustomFieldText = (id, key) => e => setIssueForm(p => ({
    ...p,
    customFields: p.customFields.map(f => f.id === id ? { ...f, [key]: e.target.value } : f),
  }))
  const setCustomFieldPos = (id, patch) => setIssueForm(p => ({
    ...p,
    customFields: p.customFields.map(f => f.id === id ? { ...f, ...patch } : f),
  }))

  // when admin links a webinar/course, auto-fill the title
  const onSourceChange = (type, id) => {
    let title = form.title
    if (type === 'webinar') title = webinars.find(w => w.id === id)?.topic || webinars.find(w => w.id === id)?.title || ''
    if (type === 'course')  title = courses.find(c => c.id === id)?.title || ''
    setForm(p => ({ ...p, sourceType: type, sourceId: id, title }))
  }

  // Metadata-only edit for legacy (pre-image-template) certificate records —
  // recompositing an already-issued image-based certificate isn't supported
  // here; those are edited by revoking and issuing a new one.
  const handleSave = async () => {
    if (!form.recipient.trim()) { alert('Recipient name is required'); return }
    if (!form.title.trim())     { alert('Certificate title is required'); return }
    setSaving(true)
    try {
      await certificatesService.update(editId, form)
      closeModal()
    } catch (e) { alert('Error: ' + e.message) }
    finally { setSaving(false) }
  }

  const handleRevoke = async id => {
    if (!confirm('Revoke this certificate? It will fail verification afterwards.')) return
    try { await certificatesService.revoke(id) } catch (e) { alert('Error: ' + e.message) }
  }

  const handleVerify = async () => {
    if (!verifyCode.trim()) return
    setVerifying(true); setVerifyResult(null)
    try {
      const cert = await certificatesService.verify(verifyCode.trim())
      setVerifyResult(cert ? { found: true, ...cert } : { found: false })
    } catch { setVerifyResult({ found: false }) }
    finally { setVerifying(false) }
  }

  const copyLink = code => {
    const url = `${window.location.origin}/certificate/${code}`
    navigator.clipboard?.writeText(url)
    alert('Public certificate link copied:\n' + url)
  }

  // Print just the certificate (opens a clean print window → user picks "Save as PDF")
  const printCert = (cert) => {
    const w = window.open(`${window.location.origin}/certificate/${cert.certCode}?print=1`, '_blank')
    if (!w) alert('Please allow popups to download the certificate.')
  }

  const columns = [
    { key: 'certCode', label: 'Certificate ID', render: v => <span className="font-mono text-xs text-[#1655c3] font-bold">{v}</span> },
    { key: 'recipient', label: 'Recipient', render: (v, row) => <span className="font-semibold text-[#1a1a1a]">{v || row.student}</span> },
    { key: 'title', label: 'For', render: (v, row) => <span className="text-xs text-gray-600 max-w-[180px] truncate block">{v || row.course}</span> },
    { key: 'sourceType', label: 'Source', render: v => (
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${v === 'manual' ? 'bg-purple-50 text-purple-600' : v === 'webinar' ? 'bg-blue-50 text-[#1655c3]' : 'bg-gray-100 text-gray-500'}`}>
        {v === 'manual' ? 'Manual' : v === 'webinar' ? 'Webinar' : v === 'course' ? 'Course' : '—'}
      </span>
    )},
    { key: 'template', label: 'Design', render: (v, row) => row.certificateImageUrl
      ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-[#64ac37]">Custom Template</span>
      : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#1655c3]">{TEMPLATES.find(t => t.id === v)?.name || 'Classic'}</span>
    },
    { key: 'issued', label: 'Issued' },
    { key: 'verifications', label: 'Verified', render: v => <span className="font-bold text-[#1655c3]">{v || 0}×</span> },
    { key: 'status', label: 'Status', render: v => <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${v === 'Valid' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>{v}</span> },
    { key: 'id', label: 'Actions', render: (v, row) => (
      <div className="flex gap-1.5">
        <button onClick={() => setPreview(row)} className="p-1.5 rounded-lg hover:bg-blue-50 text-[#1655c3]" title="Preview"><Eye size={13} /></button>
        <button onClick={() => copyLink(row.certCode)} className="p-1.5 rounded-lg hover:bg-blue-50 text-[#64ac37]" title="Copy public link"><Copy size={13} /></button>
        <button onClick={() => printCert(row)} className="p-1.5 rounded-lg hover:bg-blue-50 text-[#1655c3]" title="Download / Print"><Download size={13} /></button>
        <button onClick={() => openEdit(row)} className="p-1.5 rounded-lg hover:bg-blue-50 text-[#1655c3]" title="Edit"><Edit2 size={13} /></button>
        {row.submissionId && (
          <button onClick={() => setViewSubCert(row)} className="p-1.5 rounded-lg hover:bg-blue-50 text-[#1655c3]" title="View Submission"><FileText size={13} /></button>
        )}
        {row.status === 'Valid' && <button onClick={() => handleRevoke(v)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400" title="Revoke"><XCircle size={13} /></button>}
      </div>
    )},
  ]

  const valid    = data.filter(c => c.status === 'Valid').length
  const revoked  = data.filter(c => c.status === 'Revoked').length
  const totalVer = data.reduce((a, c) => a + (c.verifications || 0), 0)

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Award}       label="Total Certificates" value={loading ? '…' : data.length} color="#1655c3" bg="#eff6ff" />
        <StatCard icon={CheckCircle} label="Valid"              value={loading ? '…' : valid}       color="#64ac37" bg="#f0fdf4" />
        <StatCard icon={XCircle}     label="Revoked"            value={loading ? '…' : revoked}     color="#ef4444" bg="#fef2f2" />
        <StatCard icon={Eye}         label="Verifications"      value={loading ? '…' : totalVer}    color="#1655c3" bg="#eff6ff" />
      </div>

      {/* Live verify tool */}
      <div className="rounded-3xl p-6 relative overflow-hidden bg-[#1655c3]">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0"><Award size={24} className="text-white" /></div>
          <div className="text-white flex-1">
            <div className="font-black text-lg">Certificate Verification</div>
            <div className="text-white/70 text-sm">Enter a CERT-MW code to verify</div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <input type="text" placeholder="CERT-MW-2025-XXXXX" value={verifyCode}
              onChange={e => { setVerifyCode(e.target.value); setVerifyResult(null) }}
              onKeyDown={e => e.key === 'Enter' && handleVerify()}
              className="flex-1 sm:w-64 px-4 py-2.5 rounded-xl bg-white text-gray-700 text-sm outline-none font-mono" />
            <button onClick={handleVerify} disabled={verifying}
              className="px-5 py-2.5 bg-white text-[#1655c3] font-bold rounded-xl text-sm hover:bg-gray-50 shrink-0 disabled:opacity-60">
              {verifying ? '…' : 'Verify'}
            </button>
          </div>
        </div>
        {verifyResult && (
          <div className={`mt-4 rounded-xl p-3 flex items-center gap-3 max-w-lg ${verifyResult.found ? 'bg-white/20' : 'bg-red-500/20'}`}>
            {verifyResult.found ? <CheckCircle size={18} className="text-green-300" /> : <XCircle size={18} className="text-red-300" />}
            <div className="text-white text-sm">
              {verifyResult.found
                ? <><span className="font-bold">✅ Valid</span> — {verifyResult.recipient || verifyResult.student} · {verifyResult.title || verifyResult.course}</>
                : <span className="font-bold">❌ Certificate not found</span>}
            </div>
          </div>
        )}
      </div>

      <DataTable title="All Certificates" columns={columns} data={data} searchKey="recipient" emptyMessage="No certificates yet — click Issue Certificate to create one"
        actions={<AdminButton size="sm" onClick={openIssue}>+ Issue Certificate</AdminButton>}
      />

      {/* EDIT MODAL (legacy design-picker records only) with live preview */}
      {modal && (
        <Modal title="Edit Certificate" onClose={closeModal} wide>
          <div className="grid lg:grid-cols-2 gap-6">
            {/* LEFT — form */}
            <div className="space-y-4">
              {/* Template picker */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">Certificate Design</label>
                <div className="grid grid-cols-2 gap-2">
                  {TEMPLATES.map(t => (
                    <button key={t.id} onClick={() => setForm(p => ({ ...p, template: t.id }))}
                      className={`text-xs font-bold px-3 py-2 rounded-xl border-2 transition-all ${form.template === t.id ? 'border-[#1655c3] text-[#1655c3] bg-blue-50' : 'border-gray-200 text-gray-500'}`}>
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>

              <FormField label="Certificate Code">
                <input className={`${inputCls} font-mono`} value={form.certCode} onChange={set('certCode')} />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Recipient Name">
                  <input className={inputCls} value={form.recipient} onChange={set('recipient')} placeholder="Fatima Zahra" />
                </FormField>
                <FormField label="Recipient Email (optional)">
                  <input className={inputCls} value={form.recipientEmail} onChange={set('recipientEmail')} placeholder="name@email.com" />
                </FormField>
              </div>

              {/* Source link */}
              <FormField label="Award for">
                <select className={inputCls} value={form.sourceType} onChange={e => onSourceChange(e.target.value, '')}>
                  <option value="manual">Custom title (type below)</option>
                  <option value="webinar">A Webinar</option>
                  <option value="course">A Course</option>
                </select>
              </FormField>
              {form.sourceType === 'webinar' && (
                <FormField label="Select Webinar">
                  <select className={inputCls} value={form.sourceId} onChange={e => onSourceChange('webinar', e.target.value)}>
                    <option value="">— choose —</option>
                    {webinars.map(w => <option key={w.id} value={w.id}>{w.topic || w.title}</option>)}
                  </select>
                </FormField>
              )}
              {form.sourceType === 'course' && (
                <FormField label="Select Course">
                  <select className={inputCls} value={form.sourceId} onChange={e => onSourceChange('course', e.target.value)}>
                    <option value="">— choose —</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </FormField>
              )}

              <FormField label="Certificate Title">
                <input className={inputCls} value={form.title} onChange={set('title')} placeholder="Clinical Pharmacy Masterclass" />
              </FormField>
              <FormField label="Body / Description line">
                <textarea rows={2} className={inputCls} value={form.body} onChange={set('body')} placeholder="has demonstrated outstanding commitment…" />
              </FormField>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Signatory Name">
                  <input className={inputCls} value={form.signatoryName} onChange={set('signatoryName')} />
                </FormField>
                <FormField label="Signatory Title">
                  <input className={inputCls} value={form.signatoryTitle} onChange={set('signatoryTitle')} />
                </FormField>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Issue Date">
                  <input className={inputCls} type="date" value={form.issued} onChange={set('issued')} />
                </FormField>
                <FormField label="Status">
                  <select className={inputCls} value={form.status} onChange={set('status')}>
                    <option>Valid</option><option>Revoked</option>
                  </select>
                </FormField>
              </div>

              <div className="flex gap-3 pt-2">
                <AdminButton variant="ghost" className="flex-1" onClick={closeModal}>Cancel</AdminButton>
                <AdminButton variant="primary" className="flex-1" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving…' : 'Save'}
                </AdminButton>
              </div>
            </div>

            {/* RIGHT — live preview */}
            <div className="lg:sticky lg:top-0">
              <label className="block text-xs font-semibold text-gray-600 mb-2">Live Preview</label>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 overflow-auto flex justify-center">
                <PreviewBox form={form} scale={0.42} />
              </div>
              <p className="text-[11px] text-gray-400 mt-2">The recipient can view & download this at <span className="font-mono">/certificate/{form.certCode}</span></p>
            </div>
          </div>
        </Modal>
      )}

      {/* MANUAL "ISSUE CERTIFICATE" MODAL — rebuilt to match the automatic
          webinar-feedback flow exactly: template image upload + the same
          drag-to-position editor (with its built-in font picker, including
          Alex Brush) used in Admin > Webinars > Certificate Template. On
          submit this calls issueManualCertificate() in
          src/lib/certificateGenerator.js — the SAME composite/upload/
          record/email pipeline the automatic flow uses, not a second
          copy of it. */}
      {issueModal && (
        <Modal title="Issue Certificate" onClose={closeIssue} wide>
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 p-4 space-y-3">
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Certificate Template</p>
              <ImageUpload
                label="Certificate Template Image"
                folder="medweb/certificates/templates"
                value={issueForm.imageUrl}
                onChange={v => setIssueForm(p => ({ ...p, imageUrl: v }))}
              />
              {issueForm.imageUrl && (
                <CertPositionEditor
                  imageUrl={issueForm.imageUrl}
                  namePos={issueForm.namePos}
                  idPos={issueForm.idPos}
                  onChange={({ namePos, idPos }) => setIssueForm(p => ({ ...p, namePos, idPos }))}
                  customFields={issueForm.customFields}
                  onChangeCustomField={setCustomFieldPos}
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Recipient Name">
                <input className={inputCls} value={issueForm.recipient} onChange={setIssueField('recipient')} placeholder="Fatima Zahra" />
              </FormField>
              <FormField label="Recipient Email">
                <input className={inputCls} type="email" value={issueForm.recipientEmail} onChange={setIssueField('recipientEmail')} placeholder="name@email.com" />
              </FormField>
            </div>

            <FormField label="Description (the reason / course / achievement)">
              <textarea rows={2} className={inputCls} value={issueForm.description} onChange={setIssueField('description')}
                placeholder="e.g. For successfully completing the Clinical Pharmacy Masterclass" />
            </FormField>

            <div className="rounded-xl border border-gray-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Custom Fields (optional)</p>
                <button type="button" onClick={addCustomField} className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border border-dashed border-[#a855f7]/50 text-[#a855f7] hover:bg-purple-50">
                  <Plus size={13} /> Add Custom Field
                </button>
              </div>
              {issueForm.customFields.length === 0 ? (
                <p className="text-[11px] text-gray-400">Add extra fields like Score, Grade, or Duration — each gets its own draggable position on the template above.</p>
              ) : (
                <div className="space-y-2">
                  {issueForm.customFields.map(f => (
                    <div key={f.id} className="flex gap-2 items-center">
                      <input className={`${inputCls} flex-1`} value={f.label} onChange={setCustomFieldText(f.id, 'label')} placeholder="Field Label (e.g. Score)" />
                      <input className={`${inputCls} flex-1`} value={f.value} onChange={setCustomFieldText(f.id, 'value')} placeholder="Field Value (e.g. 95/100)" />
                      <button onClick={() => removeCustomField(f.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-400 flex-shrink-0"><X size={16} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <p className="text-[11px] text-gray-400">
              The Certificate ID is generated automatically (same MEDWEB-XXXXXXXXXX system used for auto-issued certificates), composited onto the template above, uploaded, and emailed to the recipient immediately on save.
            </p>

            <div className="flex gap-3 pt-2">
              <AdminButton variant="ghost" className="flex-1" onClick={closeIssue}>Cancel</AdminButton>
              <AdminButton variant="primary" className="flex-1" onClick={handleIssueSave} disabled={issueSaving || !issueForm.imageUrl}>
                {issueSaving ? 'Generating & Emailing…' : 'Issue Certificate'}
              </AdminButton>
            </div>
          </div>
        </Modal>
      )}

      {/* FULL PREVIEW MODAL */}
      {preview && (
        <Modal title={`Certificate — ${preview.recipient || preview.student}`} onClose={() => setPreview(null)} wide>
          <div className="space-y-4">
            <div className="overflow-auto flex justify-center bg-gray-50 rounded-xl p-4">
              <PreviewBox form={preview} scale={0.62} />
            </div>
            <div className="flex flex-wrap gap-3 justify-center">
              <button onClick={() => copyLink(preview.certCode)} className="flex items-center gap-1.5 text-sm font-bold text-[#1655c3] border-2 border-[#1655c3] px-4 py-2 rounded-xl hover:bg-blue-50">
                <Copy size={14} /> Copy Public Link
              </button>
              <a href={`/certificate/${preview.certCode}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm font-bold text-[#64ac37] border-2 border-[#64ac37] px-4 py-2 rounded-xl hover:bg-green-50">
                <ExternalLink size={14} /> Open Page
              </a>
              <AdminButton onClick={() => printCert(preview)}>
                <Download size={14} className="mr-1.5" /> Download / Print
              </AdminButton>
            </div>
          </div>
        </Modal>
      )}

      {/* VIEW SUBMISSION — the full feedback-form answers behind an auto-issued certificate */}
      {viewSubCert && (
        viewSubData
          ? <ResponsesModal form={viewSubData.parentForm} subs={[viewSubData.sub]} onClose={() => setViewSubCert(null)} />
          : <Modal title="Submission" onClose={() => setViewSubCert(null)}>
              <p className="text-sm text-gray-400 text-center py-6">This submission is no longer available (it may have been deleted).</p>
            </Modal>
      )}
    </div>
  )
}
