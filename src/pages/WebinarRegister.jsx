import { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Calendar, Clock, User, CheckCircle, ArrowLeft } from 'lucide-react'
import { webinarsService, formsService, settingsService, studentsDbService, ambassadorsService, DEFAULT_WEBINAR_FORM_FIELDS, normalizePhone } from '../firebase/services'
import { sendWebinarConfirmation } from '../firebase/email'
import { applyNameTitleCase, resolveFormField } from '../lib/formFieldResolve'
import FormSuccessLinks from '../components/FormSuccessLinks'
import Navbar from '../components/Navbar'
import Footer from '../sections/Footer'
import CoverImage from '../components/CoverImage'
import DynamicFormFields, { visibleFields } from '../components/DynamicFormFields'

export default function WebinarRegister() {
  // Accepts either the shareable slug or an old /webinar/<doc-id>/register
  // link — resolved to the real webinar object below; every write further
  // down uses webinar.id (the real doc ID), never this raw param, since a
  // slug isn't a valid doc ID to update/increment against.
  const { id: slugOrId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const refCode = searchParams.get('ref')
  const [webinar, setWebinar] = useState(null)
  const [referrer, setReferrer] = useState(null) // ambassador doc matching ?ref=, if any
  const [fields, setFields] = useState(DEFAULT_WEBINAR_FORM_FIELDS)
  const [successConfig, setSuccessConfig] = useState({ message: '', links: [] })
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [values, setValues] = useState({})

  useEffect(() => {
    if (!refCode) return
    ambassadorsService.getByReferralCode(refCode).then(a => setReferrer(a)).catch(() => {})
  }, [refCode])

  useEffect(() => {
    let mounted = true

    async function load() {
      const w = await webinarsService.getBySlug(slugOrId).catch(() => null) || await webinarsService.getOne(slugOrId).catch(() => null)
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
        if (mounted && f?.successConfig) setSuccessConfig(f.successConfig)
      }
      if (mounted) setLoading(false)
    }
    load()

    return () => { mounted = false }
  }, [slugOrId])

  const setField = (key, val) => setValues(prev => ({ ...prev, [key]: val }))

  const handleSubmit = async () => {
    // Only fields actually visible under the current values (a
    // conditional field hidden by its own showIf never blocks submit as
    // "required but empty") are checked — same `visibleFields` helper
    // the render below uses, so what's validated always matches what's
    // on screen.
    const checkable = visibleFields(fields, values)
    const missing = checkable.filter(f => f.required && f.type !== 'checkbox' && !String(values[f.key] || '').trim())
    if (missing.length) { setError(`Please fill: ${missing.map(m => m.label).join(', ')}`); return }
    const emailField = fields.find(f => f.type === 'email' && values[f.key])
    if (emailField && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values[emailField.key])) {
      setError('Please enter a valid email address.')
      return
    }
    // A malformed phone number (wrong digit count, typo) silently fails to
    // fold into the canonical 92-prefixed form in studentsDbService and
    // creates a stray duplicate student record instead of joining the
    // person's real one — catching it here, before submission, is the
    // only reliable place to prevent that (fixing it after the fact means
    // merging two Firestore docs by hand). Pakistani mobile numbers are
    // always 11 digits locally (03XX-XXXXXXX) or 12 with the country code.
    const rawPhone = resolveFormField(fields, values, { type: 'phone', labelRegex: /phone|whatsapp|contact/i, flatKeys: ['phone', 'whatsapp', 'contact'] })
    if (rawPhone && !/^92\d{10}$/.test(normalizePhone(rawPhone))) {
      setError('Please enter a valid phone number (e.g. 0300-1234567).')
      return
    }
    setError('')
    setStatus('loading')
    try {
      let clean = {}
      Object.keys(values).forEach(k => { if (!k.endsWith('__uploading')) clean[k] = values[k] })
      clean = applyNameTitleCase(fields, clean)
      const webinarTitle = webinar?.topic || webinar?.title || ''
      const university = resolveFormField(fields, clean, { labelRegex: /university|institute|college/i, flatKeys: ['university', 'institute'] })
      const city = resolveFormField(fields, clean, { labelRegex: /city|town/i, flatKeys: ['city'] })
      // Resolved the same way as everywhere else this app captures a
      // student's identity now — a custom registration form built via Form
      // Builder won't always key its phone field literally "whatsapp", so
      // this matters, not just the built-in default form.
      const resolvedPhone = resolveFormField(fields, clean, { type: 'phone', labelRegex: /phone|whatsapp|contact/i, flatKeys: ['phone', 'whatsapp', 'contact'] })
      // Same reasoning as phone/university above — `clean.qualification` only
      // matches the built-in default registration form's literal field key;
      // a custom Form-Builder registration form (random uid keys) needs the
      // same resolver, or Degree silently never gets captured.
      const degree = resolveFormField(fields, clean, { type: 'qualification', labelRegex: /degree|qualification|program/i, flatKeys: ['degree', 'qualification', 'degreeProgram'] })
      await webinarsService.addRegistration({
        webinarId: webinar?.id,
        webinarTopic: webinarTitle,
        speaker: webinar?.speakers?.[0]?.name || '',
        ...clean,
        university,
        // Referral attribution — `referredByUid` (set only once the
        // ambassador has claimed a login) is what the Firestore rule checks
        // for the ambassador's own restricted dashboard read;
        // `referredBy` (the human-readable code) is for admin display.
        ...(referrer ? { referredBy: referrer.referralCode, referredByUid: referrer.authUid || null } : {}),
        registeredAt: new Date().toISOString(),
      })
      if (referrer) ambassadorsService.addReferralPoint(referrer.id).catch(() => {})
      if (webinar && !webinar.isStatic) {
        await webinarsService.register(webinar.id).catch(() => {})
      }
      // Auto-email confirmation (silently skips if EmailJS not configured)
      sendWebinarConfirmation({ name: clean.name || values.name, email: clean.email || values.email, webinar }).catch(() => {})
      studentsDbService.upsertFromRegistration({
        email: clean.email || values.email, name: clean.name || values.name, phone: resolvedPhone || clean.whatsapp, degree, university, city,
        webinarId: webinar?.id, webinarTitle, registeredAt: new Date().toISOString(),
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
            {successConfig.message?.trim() ? (
              <p className="text-gray-500 mb-1">{successConfig.message}</p>
            ) : (
              <p className="text-gray-500 mb-1">
                Thank you{values.name ? <>, <span className="font-semibold text-[#1655c3]">{values.name}</span></> : ''}.
              </p>
            )}
            {values.email && (
              <p className="text-gray-400 text-sm mb-1">
                A confirmation has been sent to <span className="font-medium">{values.email}</span>.
              </p>
            )}
            <FormSuccessLinks links={successConfig.links} />
            <button
              onClick={() => navigate('/')}
              className="mt-6 px-8 py-3 rounded-xl text-sm font-semibold text-white"
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
                  {webinar.date && <span className="flex items-center gap-1.5"><Calendar size={12} />{webinar.date}</span>}
                  {webinar.time && <span className="flex items-center gap-1.5"><Clock size={12} />{webinar.time}</span>}
                </div>
              )}
            </div>

            {/* SPEAKERS — full roster, one card per speaker */}
            {Array.isArray(webinar?.speakers) && webinar.speakers.length > 0 && (
              <div className="px-6 sm:px-10 pt-6">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                  {webinar.speakers.length > 1 ? 'Speakers' : 'Speaker'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {webinar.speakers.map((s, i) => (
                    <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                      <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-white shadow-sm" style={{ background: '#eef2f7' }}>
                        {s.image
                          ? <CoverImage src={s.image} alt={s.name} bias="center 25%" className="w-full h-full" />
                          : <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm bg-[#1655c3]"><User size={18} /></div>}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-[#1a1a1a] truncate">{s.name}</div>
                        <div className="text-xs text-gray-400 truncate">{s.qualification}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Form — rendered from the resolved Form Builder document */}
            <div className="px-6 sm:px-10 py-8 space-y-5">
              <p className="text-gray-500 text-sm mb-1">
                Fill in the details below to reserve your seat. Fields marked <span className="text-red-500">*</span> are required.
              </p>

              <DynamicFormFields fields={fields} values={values} setField={setField} onUploadError={msg => setError('Upload failed: ' + msg)} />

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
