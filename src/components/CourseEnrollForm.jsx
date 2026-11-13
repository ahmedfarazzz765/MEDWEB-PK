import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Copy, Check, CheckCircle, Lock } from 'lucide-react'
import { courseEnrollmentsService } from '../firebase/services'
import { sendCourseEnrollmentReceivedEmail } from '../firebase/email'
import PaymentProofUpload from './PaymentProofUpload'

const inputCls =
  'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1655c3]/30 focus:border-[#1655c3] transition-all placeholder:text-gray-400 bg-gray-50'

function CopyField({ label, value }) {
  const [copied, setCopied] = useState(false)
  if (!value) return null
  const copy = () => {
    navigator.clipboard?.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div className="flex items-center justify-between gap-3 bg-white rounded-lg px-3 py-2 border border-gray-100">
      <div className="min-w-0">
        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</div>
        <div className="text-sm font-semibold text-[#1a1a1a] truncate">{value}</div>
      </div>
      <button type="button" onClick={copy} className="shrink-0 flex items-center gap-1 text-[11px] font-bold text-[#1655c3] hover:underline">
        {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
      </button>
    </div>
  )
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Embedded directly on /courses/[slug] (not a separate route) — only ever
// rendered for a Paid course. Handles its own seat/enrollment-open check,
// payment instructions display, validation, duplicate-enrollment error
// (surfaced from courseEnrollmentsService.add's own check), and success
// screen with the real Enrollment ID.
export default function CourseEnrollForm({ course }) {
  const [seatCount, setSeatCount] = useState(null) // null = still loading
  const [status, setStatus] = useState('idle') // idle | loading | success | error
  const [error, setError] = useState('')
  const [enrollmentId, setEnrollmentId] = useState('')
  const [form, setForm] = useState({
    name: '', email: '', whatsapp: '', institution: '', qualification: '', city: '',
    paymentMethod: 'Bank Transfer', transactionId: '', amountPaid: course.fee || '', paymentDate: '',
    paymentProofUrl: '', consent: false,
  })

  useEffect(() => {
    if (!course.seatLimit) { setSeatCount(0); return }
    courseEnrollmentsService.getByCourse(course.id)
      .then(rows => setSeatCount(rows.filter(r => r.status !== 'Rejected').length))
      .catch(() => setSeatCount(0))
  }, [course.id, course.seatLimit])

  const set = field => e => setForm(p => ({ ...p, [field]: e.target.value }))

  const enrollmentClosed = course.enrollmentOpen === false
  const seatsFull = course.seatLimit > 0 && seatCount !== null && seatCount >= course.seatLimit

  if (enrollmentClosed || seatsFull) {
    return (
      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 text-center">
        <Lock size={22} className="text-amber-500 mx-auto mb-2" />
        <p className="text-amber-700 font-semibold text-sm">
          {enrollmentClosed ? 'Enrollment for this workshop is currently closed.' : 'This workshop is fully booked — all seats have been taken.'}
        </p>
        <p className="text-amber-600/80 text-xs mt-1">Contact us on WhatsApp at +92 329 1692899 if you have questions.</p>
      </div>
    )
  }

  const payment = {
    bankName: course.paymentBankName, accountTitle: course.paymentAccountTitle,
    accountNumber: course.paymentAccountNumber, iban: course.paymentIban,
    jazzcashEasypaisa: course.paymentJazzcashEasypaisa,
  }
  const hasPaymentInfo = Object.values(payment).some(Boolean)

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
        amountPaid: form.amountPaid, paymentDate: form.paymentDate, paymentProofUrl: form.paymentProofUrl,
        consent: true,
      })
      setEnrollmentId(newId)
      sendCourseEnrollmentReceivedEmail({ name: form.name.trim(), email: form.email.trim(), courseTitle: course.title, enrollmentId: newId }).catch(() => {})
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
        <div className="inline-block bg-white rounded-xl border border-green-200 px-5 py-2.5">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Enrollment ID</div>
          <div className="font-mono font-black text-[#1655c3] text-lg">{enrollmentId}</div>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="space-y-5">
      {hasPaymentInfo && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
          <h4 className="font-black text-[#1a1a1a] text-sm mb-3">Payment Instructions</h4>
          <div className="space-y-2">
            <CopyField label="Bank" value={payment.bankName} />
            <CopyField label="Account Title" value={payment.accountTitle} />
            <CopyField label="Account Number" value={payment.accountNumber} />
            <CopyField label="IBAN" value={payment.iban} />
            <CopyField label="JazzCash / Easypaisa" value={payment.jazzcashEasypaisa} />
          </div>
          {course.fee > 0 && (
            <p className="text-sm text-[#1655c3] font-bold mt-3">Fee: PKR {Number(course.fee).toLocaleString()}</p>
          )}
        </div>
      )}

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
