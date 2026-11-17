import { useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle } from 'lucide-react'
import { courseEnrollmentsService, studentsDbService } from '../firebase/services'
import { sendCourseEnrollmentReceivedEmail } from '../firebase/email'
import { getCoursePricing } from '../lib/coursePricing'
import PaymentProofUpload from './PaymentProofUpload'

const inputCls =
  'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1655c3]/30 focus:border-[#1655c3] transition-all placeholder:text-gray-400 bg-gray-50'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Built-in enrollment form — the fallback used when a course has no
// Form-Builder form linked (see CourseLinkedForm.jsx for that path).
// Registration-open/seat/deadline checks and the payment-instructions
// block are the caller's job now (CourseRegistrationGate /
// PaymentInstructions), not this component's — both are shared with the
// linked-form path, so they only exist once.
export default function CourseEnrollForm({ course }) {
  const [status, setStatus] = useState('idle') // idle | loading | success | error
  const [error, setError] = useState('')
  const [enrollmentId, setEnrollmentId] = useState('')
  const { amountDue } = getCoursePricing(course)
  const [form, setForm] = useState({
    name: '', email: '', whatsapp: '', institution: '', qualification: '', city: '',
    paymentMethod: 'Bank Transfer', transactionId: '', amountPaid: amountDue || '', paymentDate: '',
    paymentProofUrl: '', consent: false,
  })

  const set = field => e => setForm(p => ({ ...p, [field]: e.target.value }))

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.whatsapp.trim()) {
      setError('Please fill in your name, email and WhatsApp number.'); return
    }
    if (!EMAIL_RE.test(form.email)) { setError('Please enter a valid email address.'); return }
    if (!form.transactionId.trim() || !form.amountPaid || !form.paymentDate) {
      setError('Please fill in your transaction ID, amount paid and payment date.'); return
    }
    if (!form.paymentProofUrl) { setError('Please upload your payment proof.'); return }
    if (!form.consent) { setError('Please confirm the consent checkbox to continue.'); return }
    setError('')
    setStatus('loading')
    try {
      const { enrollmentId: newId } = await courseEnrollmentsService.add(course.id, {
        name: form.name.trim(), email: form.email.trim(), whatsapp: form.whatsapp.trim(),
        institution: form.institution.trim(), qualification: form.qualification.trim(), city: form.city.trim(),
        paymentMethod: form.paymentMethod, transactionId: form.transactionId.trim(),
        amountPaid: form.amountPaid, amountDue, paymentDate: form.paymentDate, paymentProofUrl: form.paymentProofUrl,
        consent: true,
      })
      setEnrollmentId(newId)
      sendCourseEnrollmentReceivedEmail({ name: form.name.trim(), email: form.email.trim(), courseTitle: course.title, enrollmentId: newId, amountDue }).catch(() => {})
      studentsDbService.upsertFromCourseEnrollment({
        email: form.email.trim(), name: form.name.trim(), phone: form.whatsapp.trim(),
        university: form.institution.trim(), degree: form.qualification.trim(), city: form.city.trim(),
        courseId: course.id, courseTitle: course.title, enrolledAt: new Date().toISOString(),
      }).catch(() => {})
      setStatus('success')
    } catch (e) {
      setStatus('error')
      setError(e?.message || 'Something went wrong. Please try again.')
    }
  }

  if (status === 'success') {
    return (
      <motion.div
        className="bg-green-50 border border-green-100 rounded-2xl p-8 text-center"
        initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
      >
        <CheckCircle size={40} className="text-[#64ac37] mx-auto mb-3" />
        <h3 className="text-xl font-black text-[#1a1a1a] mb-2">Registration Received!</h3>
        <p className="text-gray-600 text-sm mb-4">We will verify your payment and email you once it's confirmed.</p>
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
      </motion.div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Full Name (as on certificate) <span className="text-red-500">*</span></label>
          <input className={inputCls} value={form.name} onChange={set('name')} placeholder="As you want it on your certificate" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email <span className="text-red-500">*</span></label>
          <input className={inputCls} type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">WhatsApp Number <span className="text-red-500">*</span></label>
          <input className={inputCls} value={form.whatsapp} onChange={set('whatsapp')} placeholder="03XXXXXXXXX" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">City</label>
          <input className={inputCls} value={form.city} onChange={set('city')} placeholder="e.g. Lahore" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Institution</label>
          <input className={inputCls} value={form.institution} onChange={set('institution')} placeholder="University / College" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Qualification / Semester</label>
          <input className={inputCls} value={form.qualification} onChange={set('qualification')} placeholder="e.g. Pharm-D, 6th Semester" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Payment Method</label>
          <select className={inputCls} value={form.paymentMethod} onChange={set('paymentMethod')}>
            <option>Bank Transfer</option><option>JazzCash</option><option>Easypaisa</option><option>Other</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Transaction ID / Reference <span className="text-red-500">*</span></label>
          <input className={inputCls} value={form.transactionId} onChange={set('transactionId')} placeholder="e.g. TRX123456" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Amount Paid (PKR) <span className="text-red-500">*</span></label>
          <input className={inputCls} type="number" min="0" value={form.amountPaid} onChange={set('amountPaid')} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Payment Date <span className="text-red-500">*</span></label>
          <input className={inputCls} type="date" value={form.paymentDate} onChange={set('paymentDate')} />
        </div>
      </div>

      <PaymentProofUpload value={form.paymentProofUrl} onChange={url => setForm(p => ({ ...p, paymentProofUrl: url }))} />

      <label className="flex items-start gap-3 cursor-pointer select-none">
        <input type="checkbox" checked={form.consent} onChange={e => setForm(p => ({ ...p, consent: e.target.checked }))} className="w-4 h-4 mt-0.5 accent-[#1655c3]" />
        <span className="text-xs text-gray-500">I confirm the details above are accurate and I consent to MEDWEB-PK contacting me regarding this enrollment.</span>
      </label>

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
