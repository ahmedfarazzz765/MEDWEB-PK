import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle, ArrowLeft, Star, AlertCircle } from 'lucide-react'
import { formsService, webinarsService, settingsService, studentsDbService, certificatesService } from '../firebase/services'
import { uploadToCloudinary } from '../firebase/cloudinary'
import { generateAndIssueCertificate } from '../lib/certificateGenerator'
import { resolveFormField, applyNameTitleCase } from '../lib/formFieldResolve'
import FormSuccessLinks from '../components/FormSuccessLinks'
import Navbar from '../components/Navbar'
import Footer from '../sections/Footer'

const inputCls =
  'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1655c3]/30 focus:border-[#1655c3] transition-all placeholder:text-gray-400 bg-gray-50'

export default function DynamicForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [values, setValues]   = useState({})
  const [status, setStatus]   = useState('idle')
  const [error, setError]     = useState('')
  const [successMessage, setSuccessMessage] = useState('Thank you — your response has been recorded.')
  const [existingCert, setExistingCert] = useState(null) // set when a duplicate submission is caught

  useEffect(() => {
    window.scrollTo(0, 0)
    formsService.getOne(id)
      .then(f => { setForm(f); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

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
      // Normalize casing on whichever field is the name field before it's
      // ever stored — so "SHAHROZ ABBAS" / "shahroz abbas" are both saved
      // as "Shahroz Abbas" everywhere downstream (submission doc, Students
      // database, certificates), not just at certificate-render time.
      clean = applyNameTitleCase(form.fields, clean)

      // Look up (once) whether this form is some webinar's feedback form —
      // done BEFORE creating the submission now, so a duplicate resubmission
      // (see below) can be caught before any new record — or certificate —
      // ever gets created, not just checked after the fact.
      const webinar = await webinarsService.getByFeedbackFormId(id).catch(() => null)

      let rawName = '', email = '', phone = ''
      if (webinar) {
        // Field keys in a Form-Builder-built form are random uids, not
        // semantic names — resolve name/email by searching the schema.
        // Priority order: field type match → label contains keyword → key contains keyword → flat key fallback.
        const fields = form.fields || []

        // Resolve NAME field: prefer a non-email field whose label or key contains "name"
        const nameField =
          fields.find(f => f.type !== 'email' && /name/i.test(f.label || '')) ||
          fields.find(f => f.type !== 'email' && /name/i.test(f.key || '')) ||
          fields.find(f => f.type === 'text' && /full|student|participant/i.test(f.label || ''))
        rawName =
          (nameField && clean[nameField.key]) ||
          clean.name || clean.fullName || clean.full_name ||
          clean.Name || clean.FullName || clean.studentName || ''

        // Resolve EMAIL field: prefer type=email, then label/key containing "email"
        const emailField =
          fields.find(f => f.type === 'email') ||
          fields.find(f => /email/i.test(f.label || '')) ||
          fields.find(f => /email/i.test(f.key || ''))
        email =
          (emailField && clean[emailField.key]) ||
          clean.email || clean.Email || clean.emailAddress || clean.email_address || ''

        // Resolve PHONE — the primary student-identity key now (see
        // studentsDbService/upsertStudent in services.js): unlike email,
        // it's collected consistently across every form and doesn't
        // collide across students the way names do. Same resolver used
        // for the ambassador-application branch below, and for detecting
        // a duplicate resubmission just below.
        phone = resolveFormField(fields, clean, { type: 'phone', labelRegex: /phone|whatsapp|contact/i, flatKeys: ['phone', 'whatsapp', 'contact'] })

        // Duplicate guard — a student who fills this exact webinar's
        // feedback form twice (e.g. double-tapping Submit, or reopening the
        // link) must not get a second submission record or a second
        // certificate. Matched by phone number against every prior
        // submission to THIS form (a feedback form belongs to exactly one
        // webinar), re-resolved with the same field logic since submissions
        // don't store a normalized phone of their own.
        if (phone) {
          const priorSubmissions = await formsService.getSubmissions(id).catch(() => [])
          const isDuplicate = priorSubmissions.some(s =>
            resolveFormField(fields, s.values || {}, { type: 'phone', labelRegex: /phone|whatsapp|contact/i, flatKeys: ['phone', 'whatsapp', 'contact'] }) === phone
          )
          if (isDuplicate) {
            const certs = await certificatesService.getByPhone(phone).catch(() => [])
            setExistingCert(certs.find(c => c.webinarId === webinar.id) || null)
            setStatus('duplicate')
            window.scrollTo({ top: 0, behavior: 'smooth' })
            return
          }
        }
      }

      const submissionId = await formsService.addSubmission({
        formId: id,
        formTitle: form.title,
        values: clean,
        submittedAt: new Date().toISOString(),
      })

      const hasCertTemplate = !!webinar?.certTemplate?.imageUrl
      const customMessage = form.successConfig?.message?.trim()
      setSuccessMessage(
        customMessage || (
          !webinar
            ? 'Thank you — your response has been recorded.'
            : hasCertTemplate
            ? 'Thank you for giving your feedback! Please check your email — your certificate is on its way to your inbox.'
            : 'Thank you for your feedback.'
        )
      )
      setStatus('success')
      window.scrollTo({ top: 0, behavior: 'smooth' })

      if (webinar) {
        // Ensures the student's record exists / gets enriched even when the
        // webinar has no certificate template configured (upsertFromCertificate
        // below only fires once a certificate is actually issued).
        studentsDbService.upsertFromFeedback({ email, name: rawName, phone }).catch(() => {})

        generateAndIssueCertificate({ submissionId, webinar, rawName, email, phone }).catch(() => {})
      } else {
        // Not a webinar feedback form — check whether it's the Ambassador
        // Program's public application form, and if so feed it into the same
        // Students database (per scope: Ambassador registrations are a source).
        settingsService.get().then(s => {
          if (!s?.ambassadorApplyFormId || s.ambassadorApplyFormId !== id) return
          const fields = form.fields || []
          const name = resolveFormField(fields, clean, { labelRegex: /name/i, flatKeys: ['name', 'fullName', 'full_name', 'Name'] })
          const email = resolveFormField(fields, clean, { type: 'email', labelRegex: /email/i, flatKeys: ['email', 'Email', 'emailAddress'] })
          const phone = resolveFormField(fields, clean, { type: 'phone', labelRegex: /phone|whatsapp|contact/i, flatKeys: ['phone', 'whatsapp', 'contact'] })
          const university = resolveFormField(fields, clean, { labelRegex: /university|institute|college/i, flatKeys: ['university', 'institute'] })
          const degree = resolveFormField(fields, clean, { type: 'qualification', labelRegex: /degree|qualification|program/i, flatKeys: ['degree', 'qualification', 'degreeProgram'] })
          if (email) studentsDbService.upsertFromAmbassador({ email, name, phone, university, degree }).catch(() => {})
        }).catch(() => {})
      }
    } catch (e) { setStatus('error'); setError(e.message) }
  }

  const renderField = (f) => {
    const v = values[f.key] || ''
    switch (f.type) {
      case 'textarea':
        return <textarea rows={4} placeholder={f.placeholder} value={v} onChange={e => setField(f.key, e.target.value)} className={`${inputCls} resize-none`} />
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
      case 'rating':
        return (
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} type="button" onClick={() => setField(f.key, n)} className="p-0.5">
                <Star size={26} className={n <= (Number(v) || 0) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'} />
              </button>
            ))}
          </div>
        )
      default:
        return <input type={f.type === 'email' ? 'email' : f.type === 'phone' ? 'tel' : 'text'} placeholder={f.placeholder} value={v} onChange={e => setField(f.key, e.target.value)} className={inputCls} />
    }
  }

  return (
    <div className="font-poppins bg-[#f7f9fc] min-h-screen">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-10 sm:py-16">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#1655c3] mb-6 transition-colors">
          <ArrowLeft size={16} /> Back
        </button>

        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading form…</div>
        ) : !form ? (
          <div className="text-center py-20 text-gray-400">Form not found or no longer available.</div>
        ) : status === 'duplicate' ? (
          <motion.div className="bg-white rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.06)] p-8 sm:p-12 text-center"
            initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
            <div className="w-20 h-20 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={44} className="text-amber-500" />
            </div>
            <h1 className="text-2xl font-black text-[#1a1a1a] mb-2">Already Submitted</h1>
            <p className="text-gray-500 mb-2">
              You've already submitted this form for this webinar — your certificate has already been issued and won't be generated again.
            </p>
            {existingCert && (
              <button onClick={() => navigate(`/certificate/${existingCert.certCode}`)}
                className="mt-4 inline-block px-8 py-3 rounded-xl text-sm font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #1655c3, #64ac37)' }}>
                View Your Certificate
              </button>
            )}
            <button onClick={() => navigate('/')} className="mt-4 block mx-auto px-8 py-3 rounded-xl text-sm font-semibold text-[#1655c3]">
              Back to Home
            </button>
          </motion.div>
        ) : status === 'success' ? (
          <motion.div className="bg-white rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.06)] p-8 sm:p-12 text-center"
            initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
            <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={44} className="text-[#64ac37]" />
            </div>
            <h1 className="text-2xl font-black text-[#1a1a1a] mb-2">Submitted! 🎉</h1>
            <p className="text-gray-500 mb-2">{successMessage}</p>
            <FormSuccessLinks links={form.successConfig?.links} />
            <button onClick={() => navigate('/')} className="mt-6 px-8 py-3 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #1655c3, #64ac37)' }}>Back to Home</button>
          </motion.div>
        ) : (
          <motion.div className="bg-white rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.06)] overflow-hidden"
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
            <div className="px-6 sm:px-10 pt-8 pb-6" style={{ background: 'linear-gradient(135deg, #1655c3, #64ac37)' }}>
              <h1 className="text-white font-black text-xl sm:text-2xl">{form.title}</h1>
              {form.description && <p className="text-white/85 text-sm mt-2">{form.description}</p>}
            </div>
            <div className="px-6 sm:px-10 py-8 space-y-5">
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
                className="w-full py-3.5 rounded-xl font-bold text-sm text-white disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #1655c3, #64ac37)', boxShadow: '0 4px 15px rgba(22,85,195,0.25)' }}>
                {status === 'loading' ? 'Submitting…' : 'Submit →'}
              </motion.button>
            </div>
          </motion.div>
        )}
      </div>
      <Footer />
    </div>
  )
}
