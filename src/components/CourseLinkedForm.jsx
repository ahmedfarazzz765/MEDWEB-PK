import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle } from 'lucide-react'
import { formsService, courseEnrollmentsService } from '../firebase/services'
import { sendCourseEnrollmentReceivedEmail } from '../firebase/email'
import { applyNameTitleCase, resolveFormField } from '../lib/formFieldResolve'
import { getCoursePricing } from '../lib/coursePricing'
import DynamicFormFields, { visibleFields } from './DynamicFormFields'
import FormSuccessLinks from './FormSuccessLinks'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// The Form-Builder-linked registration path (course.registrationFormId
// set) — same renderer (DynamicFormFields) and the same field-resolution
// helpers WebinarRegister.jsx already uses, not a second one built for
// courses. Paid courses write into the existing courseEnrollments
// collection (so Approve/Reject, emails, the enrollment ID, and the
// duplicate-email check all keep working exactly as they do for the
// built-in form); Free courses just record a plain form submission —
// there's no payment to verify, so none of that machinery applies.
export default function CourseLinkedForm({ course }) {
  const [fields, setFields] = useState([])
  const [successConfig, setSuccessConfig] = useState({ message: '', links: [] })
  const [loading, setLoading] = useState(true)
  const [values, setValues] = useState({})
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [enrollmentId, setEnrollmentId] = useState('')
  const { amountDue } = getCoursePricing(course)

  useEffect(() => {
    let mounted = true
    formsService.getOne(course.registrationFormId).then(f => {
      if (!mounted) return
      if (f?.fields?.length) setFields(f.fields)
      if (f?.successConfig) setSuccessConfig(f.successConfig)
      setLoading(false)
    }).catch(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [course.registrationFormId])

  const setField = (key, val) => setValues(prev => ({ ...prev, [key]: val }))

  const handleSubmit = async () => {
    const checkable = visibleFields(fields, values)
    const missing = checkable.filter(f => f.required && f.type !== 'checkbox' && !String(values[f.key] || '').trim())
    if (missing.length) { setError(`Please fill: ${missing.map(m => m.label).join(', ')}`); return }
    const emailFieldCheck = checkable.find(f => f.type === 'email' && values[f.key])
    if (emailFieldCheck && !EMAIL_RE.test(values[emailFieldCheck.key])) {
      setError('Please enter a valid email address.'); return
    }
    setError('')
    setStatus('loading')
    try {
      let clean = {}
      Object.keys(values).forEach(k => { if (!k.endsWith('__uploading')) clean[k] = values[k] })
      clean = applyNameTitleCase(fields, clean)
      const fullName = resolveFormField(fields, clean, { labelRegex: /name/i, flatKeys: ['name', 'fullName', 'full_name'] })
      const email = resolveFormField(fields, clean, { type: 'email', labelRegex: /email/i, flatKeys: ['email'] })
      const whatsapp = resolveFormField(fields, clean, { type: 'phone', labelRegex: /phone|whatsapp|contact/i, flatKeys: ['phone', 'whatsapp', 'contact'] })
      // Label -> value map, per the required courseEnrollments shape —
      // file-type fields already hold the uploaded Cloudinary URL as
      // their value (DynamicFormFields' own file-upload handling).
      const responses = {}
      checkable.forEach(f => { if (clean[f.key] !== undefined) responses[f.label || f.key] = clean[f.key] })

      if (course.type === 'Paid') {
        const { enrollmentId: newId } = await courseEnrollmentsService.add(course.id, {
          fullName, email, whatsapp, responses, formId: course.registrationFormId, amountDue, consent: true,
        })
        setEnrollmentId(newId)
        sendCourseEnrollmentReceivedEmail({ name: fullName, email, courseTitle: course.title, enrollmentId: newId, amountDue }).catch(() => {})
      } else {
        // Free course, linked form — a plain submission, same shape
        // DynamicForm.jsx's own /form/:id pages already save (`values`
        // keyed by field.key), not courseEnrollments — there's no
        // payment step here that needs that collection's approval flow.
        await formsService.addSubmission({
          formId: course.registrationFormId, values: clean, courseId: course.id, courseTitle: course.title,
          submittedAt: new Date().toISOString(),
        })
      }
      setStatus('success')
    } catch (e) {
      setStatus('error')
      setError(e?.message || 'Something went wrong. Please try again.')
    }
  }

  if (loading) return <p className="text-sm text-gray-400 text-center py-8">Loading form…</p>

  if (status === 'success') {
    return (
      <motion.div
        className="bg-green-50 border border-green-100 rounded-2xl p-8 text-center"
        initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
      >
        <CheckCircle size={40} className="text-[#64ac37] mx-auto mb-3" />
        <h3 className="text-xl font-black text-[#1a1a1a] mb-2">
          {course.type === 'Paid' ? 'Registration Received!' : 'Registered!'}
        </h3>
        {successConfig.message?.trim() ? (
          <p className="text-gray-600 text-sm mb-4">{successConfig.message}</p>
        ) : course.type === 'Paid' ? (
          <p className="text-gray-600 text-sm mb-4">We will verify your payment and email you once it's confirmed.</p>
        ) : (
          <p className="text-gray-600 text-sm mb-4">Thank you for registering.</p>
        )}
        {course.type === 'Paid' && (
          <div className="inline-flex flex-wrap justify-center gap-3">
            <div className="bg-white rounded-xl border border-green-200 px-5 py-2.5">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Enrollment ID</div>
              <div className="font-mono font-black text-[#1655c3] text-lg">{enrollmentId}</div>
            </div>
            {amountDue > 0 && (
              <div className="bg-white rounded-xl border border-green-200 px-5 py-2.5">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Amount Due</div>
                <div className="font-black text-[#1655c3] text-lg">PKR {amountDue.toLocaleString()}</div>
              </div>
            )}
          </div>
        )}
        <FormSuccessLinks links={successConfig.links} />
      </motion.div>
    )
  }

  return (
    <div className="space-y-5">
      <DynamicFormFields fields={fields} values={values} setField={setField} onUploadError={msg => setError('Upload failed: ' + msg)} />
      {error && <p className="text-red-500 text-xs">{error}</p>}
      <motion.button
        onClick={handleSubmit}
        disabled={status === 'loading'}
        whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
        className="w-full py-3.5 rounded-xl font-bold text-sm text-white disabled:opacity-60 disabled:cursor-not-allowed"
        style={{ background: 'linear-gradient(135deg, #1655c3, #64ac37)', boxShadow: '0 4px 15px rgba(22,85,195,0.25)' }}
      >
        {status === 'loading' ? 'Submitting…' : 'Register Now →'}
      </motion.button>
    </div>
  )
}
