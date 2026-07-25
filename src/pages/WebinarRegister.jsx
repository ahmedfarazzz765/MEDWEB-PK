import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Calendar, Clock, User, CheckCircle, ArrowLeft } from 'lucide-react'
import { webinarsService, formsService, settingsService, studentsDbService, DEFAULT_WEBINAR_FORM_FIELDS } from '../firebase/services'
import { sendWebinarConfirmation } from '../firebase/email'
import { uploadToCloudinary } from '../firebase/cloudinary'
import { applyNameTitleCase } from '../lib/formFieldResolve'
import Navbar from '../components/Navbar'
import Footer from '../sections/Footer'

const inputCls =
  'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1655c3]/30 focus:border-[#1655c3] transition-all placeholder:text-gray-400 bg-gray-50'

export default function WebinarRegister() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [webinar, setWebinar] = useState(null)
  const [fields, setFields] = useState(DEFAULT_WEBINAR_FORM_FIELDS)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [values, setValues] = useState({})

  useEffect(() => {
    let mounted = true

    async function load() {
      const w = await webinarsService.getOne(id).catch(() => null)
      if (!mounted) return
      setWebinar(w)

      // Resolve which Form-Builder form defines this page's fields:
      // this webinar's own linked form, else the sitewide default form,
      // else the built-in fallback fields (kept identical to the original
      // hardcoded shape so old data / behavior never breaks).
      const formId = w?.registrationFormId || (await settingsService.get().catch(() => null))?.webinarDefaultFormId
      if (formId) {
        const f = await formsService.getOne(formId).catch(() => null)
        if (mounted && f?.fields?.length) setFields(f.fields)
      }
      if (mounted) setLoading(false)
    }
    load()

    return () => { mounted = false }
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

  const renderField = (f) => {
    const v = values[f.key] ?? (f.type === 'checkbox' ? false : '')
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
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input type="checkbox" checked={!!values[f.key]} onChange={e => setField(f.key, e.target.checked)} className="w-4 h-4 accent-[#1655c3]" />
            <span className="text-sm text-gray-600">{f.placeholder || f.label}</span>
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

  const handleSubmit = async () => {
    const missing = fields.filter(f => f.required && f.type !== 'checkbox' && !String(values[f.key] || '').trim())
    if (missing.length) { setError(`Please fill: ${missing.map(m => m.label).join(', ')}`); return }
    const emailField = fields.find(f => f.type === 'email' && values[f.key])
    if (emailField && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values[emailField.key])) {
      setError('Please enter a valid email address.')
      return
    }
    setError('')
    setStatus('loading')
    try {
      let clean = {}
      Object.keys(values).forEach(k => { if (!k.endsWith('__uploading')) clean[k] = values[k] })
      clean = applyNameTitleCase(fields, clean)
      const webinarTitle = webinar?.topic || webinar?.title || ''
      await webinarsService.addRegistration({
        webinarId: id,
        webinarTopic: webinarTitle,
        speaker: webinar?.speaker || '',
        ...clean,
        registeredAt: new Date().toISOString(),
      })
      if (webinar && !webinar.isStatic) {
        await webinarsService.register(id).catch(() => {})
      }
      // Auto-email confirmation (silently skips if EmailJS not configured)
      sendWebinarConfirmation({ name: clean.name || values.name, email: clean.email || values.email, webinar }).catch(() => {})
      studentsDbService.upsertFromRegistration({
        email: clean.email || values.email, name: clean.name || values.name, phone: clean.whatsapp, degree: clean.qualification,
        webinarId: id, webinarTitle, registeredAt: new Date().toISOString(),
      }).catch(() => {})
      setStatus('success')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      console.error(err)
      setStatus('error')
      setError(err?.message || 'Failed to register. Please try again.')
    }
  }

  return (
    <div className="font-poppins bg-[#f7f9fc] min-h-screen">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 py-10 sm:py-16">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#1655c3] mb-6 transition-colors"
        >
          <ArrowLeft size={16} /> Back
        </button>

        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading webinar details…</div>
        ) : status === 'success' ? (
          <motion.div
            className="bg-white rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.06)] p-8 sm:p-12 text-center"
            initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
          >
            <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={44} className="text-[#64ac37]" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#1a1a1a] mb-2">You're Registered! 🎉</h1>
            <p className="text-gray-500 mb-1">
              Thank you{values.name ? <>, <span className="font-semibold text-[#1655c3]">{values.name}</span></> : ''}.
            </p>
            {values.email && (
              <p className="text-gray-400 text-sm mb-8">
                A confirmation has been sent to <span className="font-medium">{values.email}</span>.
              </p>
            )}
            <button
              onClick={() => navigate('/')}
              className="px-8 py-3 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #1655c3, #64ac37)' }}
            >
              Back to Home
            </button>
          </motion.div>
        ) : (
          <motion.div
            className="bg-white rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.06)] overflow-hidden"
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          >
            {/* Header */}
            <div className="px-6 sm:px-10 pt-8 pb-6" style={{ background: 'linear-gradient(135deg, #1655c3, #64ac37)' }}>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white bg-white/20 px-3 py-1 rounded-full mb-3">
                <Calendar size={11} /> Webinar Registration
              </span>
              <h1 className="text-white font-black text-xl sm:text-2xl leading-snug">
                {webinar?.topic || webinar?.title || 'Webinar Registration'}
              </h1>
              {webinar && (
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-white/85 text-xs sm:text-sm mt-3">
                  {webinar.speaker && <span className="flex items-center gap-1.5"><User size={12} />{webinar.speaker}</span>}
                  {webinar.date && <span className="flex items-center gap-1.5"><Calendar size={12} />{webinar.date}</span>}
                  {webinar.time && <span className="flex items-center gap-1.5"><Clock size={12} />{webinar.time}</span>}
                </div>
              )}
            </div>

            {/* Form — rendered from the resolved Form Builder document */}
            <div className="px-6 sm:px-10 py-8 space-y-5">
              <p className="text-gray-500 text-sm mb-1">
                Fill in the details below to reserve your seat. Fields marked <span className="text-red-500">*</span> are required.
              </p>

              {fields.map((f, i) => (
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

              <motion.button
                onClick={handleSubmit}
                disabled={status === 'loading'}
                whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                className="w-full py-3.5 rounded-xl font-bold text-sm text-white disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, #1655c3, #64ac37)', boxShadow: '0 4px 15px rgba(22,85,195,0.25)' }}
              >
                {status === 'loading' ? 'Submitting…' : 'Submit Registration →'}
              </motion.button>
            </div>
          </motion.div>
        )}
      </div>

      <Footer />
    </div>
  )
}
