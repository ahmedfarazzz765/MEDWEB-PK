import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, CheckCircle, Mail } from 'lucide-react'
import { formsService, webinarsService, studentsDbService } from '../firebase/services'
import { uploadToCloudinary } from '../firebase/cloudinary'
import { generateAndIssueCertificate } from '../lib/certificateGenerator'
import { applyNameTitleCase } from '../lib/formFieldResolve'
import FormSuccessLinks from './FormSuccessLinks'

const inputCls =
  'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1655c3]/30 focus:border-[#1655c3] transition-all placeholder:text-gray-400 bg-gray-50'

// Public-facing animated registration popup — same Form Builder field types
// and the same formSubmissions storage as DynamicForm.jsx's full-page form,
// just presented as a modal instead of a page navigation.
// webinar prop is optional — pass the full webinar object when this modal
// is used for a feedback form so certificates can be auto-generated.
export default function WebinarRegisterModal({ formId, webinarTopic, webinar: webinarProp, onClose }) {
  const [form, setForm]             = useState(null)
  const [loading, setLoading]       = useState(true)
  const [values, setValues]         = useState({})
  const [status, setStatus]         = useState('idle')
  const [error, setError]           = useState('')
  const [certIssued, setCertIssued] = useState(false)

  useEffect(() => {
    formsService.getOne(formId)
      .then(f => { setForm(f); setLoading(false) })
      .catch(() => setLoading(false))
  }, [formId])

  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const setField = (key, val) => setValues(prev => ({ ...prev, [key]: val }))

  const handleFile = async (key, file) => {
    if (!file) return
    setField(key + '__uploading', true)
    try {
      const url = await uploadToCloudinary(file, 'medweb/form-uploads')
      setField(key, url)
    } catch (e) { setError('Upload failed: ' + e.message) }
    finally { setField(key + '__uploading', false) }
  }

  const handleSubmit = async () => {
    const missing = (form.fields || []).filter(f => f.required && !values[f.key] && f.type !== 'checkbox')
    if (missing.length) { setError(`Please fill: ${missing.map(m => m.label).join(', ')}`); return }
    setError(''); setStatus('loading')
    try {
      let clean = {}
      Object.keys(values).forEach(k => { if (!k.endsWith('__uploading')) clean[k] = values[k] })
      clean = applyNameTitleCase(form.fields, clean)
      const submissionId = await formsService.addSubmission({
        formId,
        formTitle: form.title,
        values: clean,
        submittedAt: new Date().toISOString(),
      })
      setStatus('success')

      // Auto-generate and email certificate if this modal is used for a
      // feedback form tied to a webinar that has a certificate template.
      // Fire-and-forget — never blocks or affects the success screen.
      const webinar = webinarProp || await webinarsService.getByFeedbackFormId(formId).catch(() => null)
      if (webinar) {
        const fields = form.fields || []
        const nameField =
          fields.find(f => f.type !== 'email' && /name/i.test(f.label || '')) ||
          fields.find(f => f.type !== 'email' && /name/i.test(f.key || '')) ||
          fields.find(f => f.type === 'text' && /full|student|participant/i.test(f.label || ''))
        const emailField =
          fields.find(f => f.type === 'email') ||
          fields.find(f => /email/i.test(f.label || '')) ||
          fields.find(f => /email/i.test(f.key || ''))
        const rawName =
          (nameField && clean[nameField.key]) ||
          clean.name || clean.fullName || clean.full_name || clean.Name || ''
        const email =
          (emailField && clean[emailField.key]) ||
          clean.email || clean.Email || clean.emailAddress || ''

        // Ensures the student's record exists / gets enriched even when the
        // webinar has no certificate template configured.
        studentsDbService.upsertFromFeedback({ email, name: rawName, phone: clean.whatsapp || clean.phone || '' }).catch(() => {})

        if (webinar.certTemplate?.imageUrl) {
          setCertIssued(true)
          generateAndIssueCertificate({ submissionId, webinar, rawName, email }).catch(() => {})
        }
      }
    } catch (e) { setStatus('error'); setError(e.message) }
  }

  const renderField = (f) => {
    const v = values[f.key] || ''
    switch (f.type) {
      case 'textarea':
        return <textarea rows={3} placeholder={f.placeholder} value={v} onChange={e => setField(f.key, e.target.value)} className={`${inputCls} resize-none`} />
      case 'dropdown':
      case 'qualification':
      case 'semester': {
        const opts = f.type === 'qualification'
          ? ['MBBS', 'BDS', 'Pharm-D', 'Nursing', 'Allied Health Sciences', 'Medical Student', 'Other']
          : f.type === 'semester'
          ? ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', 'Final Year', 'Graduated']
          : (f.options || [])
        return (
          <select value={v} onChange={e => setField(f.key, e.target.value)} className={`${inputCls} cursor-pointer`}>
            <option value="">Select {f.label}</option>
            {opts.map((o, i) => <option key={i} value={o}>{o}</option>)}
          </select>
        )
      }
      case 'radio':
        return (
          <div className="flex flex-wrap gap-3">
            {(f.options || []).map((o, i) => (
              <label key={i} className="flex items-center gap-2 cursor-pointer text-sm text-gray-600">
                <input type="radio" name={f.key} checked={v === o} onChange={() => setField(f.key, o)} className="accent-[#1655c3]" />{o}
              </label>
            ))}
          </div>
        )
      case 'checkbox':
        return (
          <label className="flex items-center gap-3 cursor-pointer text-sm text-gray-600">
            <input type="checkbox" checked={!!values[f.key]} onChange={e => setField(f.key, e.target.checked)} className="w-4 h-4 accent-[#1655c3]" />
            {f.placeholder || f.label}
          </label>
        )
      case 'file':
        return (
          <div>
            <input type="file" onChange={e => handleFile(f.key, e.target.files?.[0])} className="text-sm" />
            {values[f.key + '__uploading'] && <p className="text-xs text-[#1655c3] mt-1">Uploading…</p>}
            {values[f.key] && !values[f.key + '__uploading'] && <p className="text-xs text-green-600 mt-1">Uploaded ✓</p>}
          </div>
        )
      default:
        return <input type={f.type === 'email' ? 'email' : f.type === 'phone' ? 'tel' : 'text'} placeholder={f.placeholder} value={v} onChange={e => setField(f.key, e.target.value)} className={inputCls} />
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(11,18,32,0.55)', backdropFilter: 'blur(6px)' }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
      >
        <motion.div
          className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col"
          initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }}
          transition={{ type: 'spring', stiffness: 300, damping: 26 }}
          onMouseDown={e => e.stopPropagation()}
        >
          <div className="px-6 sm:px-8 pt-6 pb-5 relative shrink-0" style={{ background: 'linear-gradient(135deg, #1655c3, #64ac37)' }}>
            <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors">
              <X size={16} />
            </button>
            <h2 className="text-white font-black text-lg pr-10">{loading ? 'Register' : (form?.title || 'Register')}</h2>
            {webinarTopic && <p className="text-white/80 text-xs mt-1">{webinarTopic}</p>}
          </div>

          <div className="px-6 sm:px-8 py-6 space-y-4 overflow-y-auto">
            {loading ? (
              <div className="text-center py-10 text-gray-400 text-sm">Loading form…</div>
            ) : !form ? (
              <div className="text-center py-10 text-gray-400 text-sm">This form is no longer available.</div>
            ) : status === 'success' ? (
              <motion.div className="text-center py-6" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={32} className="text-[#64ac37]" />
                </div>
                <h3 className="text-lg font-black text-[#1a1a1a] mb-1">Submitted! 🎉</h3>
                {form.successConfig?.message?.trim() ? (
                  <p className="text-gray-500 text-sm mb-1">{form.successConfig.message}</p>
                ) : certIssued ? (
                  <>
                    <p className="text-gray-500 text-sm mb-1">Thank you for your feedback!</p>
                    <div className="flex items-center justify-center gap-1.5 text-[#1655c3] text-xs font-semibold mb-1">
                      <Mail size={13} />
                      Your certificate is on its way to your inbox.
                    </div>
                  </>
                ) : (
                  <p className="text-gray-500 text-sm mb-1">Thank you — your response has been recorded.</p>
                )}
                <FormSuccessLinks links={form.successConfig?.links} />
                <button onClick={onClose} className="mt-6 px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg, #1655c3, #64ac37)' }}>
                  Close
                </button>
              </motion.div>
            ) : (
              <>
                {(form.fields || []).map((f, i) => (
                  <div key={f.key || i}>
                    {f.type !== 'checkbox' && (
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        {f.label} {f.required && <span className="text-red-500">*</span>}
                      </label>
                    )}
                    {renderField(f)}
                  </div>
                ))}
                {error && <p className="text-red-500 text-xs">{error}</p>}
                <motion.button onClick={handleSubmit} disabled={status === 'loading'}
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                  className="w-full py-3 rounded-xl font-bold text-sm text-white disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #1655c3, #64ac37)', boxShadow: '0 4px 15px rgba(22,85,195,0.25)' }}>
                  {status === 'loading' ? 'Submitting…' : 'Submit →'}
                </motion.button>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
