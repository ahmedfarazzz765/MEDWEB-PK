import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ClipboardCheck, ArrowLeft, Clock, CheckCircle, XCircle, Award, Download, ShieldCheck } from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../sections/Footer'
import { mocktestApi, getStoredToken, storeToken, clearStoredToken } from '../lib/mocktestClient'
import { compositeCertificateCanvas, canvasToCompressedBlob } from '../lib/certificateGenerator'
import { uploadToCloudinary } from '../firebase/cloudinary'

const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 outline-none focus:border-[#1655c3] focus:ring-2 focus:ring-blue-100 transition-all bg-gray-50'

function Header({ title, subtitle, icon: Icon = ClipboardCheck }) {
  return (
    <div className="px-6 sm:px-10 pt-8 pb-6" style={{ background: 'linear-gradient(135deg, #1655c3, #64ac37)' }}>
      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white bg-white/20 px-3 py-1 rounded-full mb-3">
        <Icon size={11} /> Mock Test
      </span>
      <h1 className="text-white font-black text-xl sm:text-2xl leading-snug">{title}</h1>
      {subtitle && <p className="text-white/85 text-sm mt-2">{subtitle}</p>}
    </div>
  )
}

export default function MockTestPage() {
  const { courseSlug } = useParams()
  const navigate = useNavigate()

  const [phase, setPhase] = useState('loading') // loading | entry | instructions | question | result | fatal
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [token, setToken] = useState(null)
  const [testTitle, setTestTitle] = useState('')
  const [courseTitle, setCourseTitle] = useState('')

  const [form, setForm] = useState({ registrationId: '', fullName: '', phone: '' })

  const [question, setQuestion] = useState(null) // { position, total, text, options, seconds }
  const [selected, setSelected] = useState(null)
  // Mirrors `selected` for the auto-advance timeout below, which is set up
  // once per question (effect deps are [phase, question?.position]) — reading
  // the `selected` state directly there would close over its value at
  // mount time and silently ignore whatever the student picks afterward.
  const selectedRef = useRef(null)
  const pickOption = i => { selectedRef.current = i; setSelected(i) }
  const [secondsLeft, setSecondsLeft] = useState(0)
  const timerRef = useRef(null)
  const autoAdvanceRef = useRef(null)

  const [result, setResult] = useState(null)
  const [certState, setCertState] = useState('idle') // idle | generating | done | failed

  // ── Resume on mount ──────────────────────────────────────────────────
  useEffect(() => {
    const stored = getStoredToken(courseSlug)
    if (!stored) { setPhase('entry'); return }
    setToken(stored)
    mocktestApi.state(stored).then(res => applyState(res, stored)).catch(() => {
      clearStoredToken(courseSlug)
      setPhase('entry')
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseSlug])

  function applyState(res, tok) {
    if (res.status === 'entered') { setPhase('instructions'); return }
    if (res.status === 'in_progress') {
      setQuestion(res.question)
      selectedRef.current = null
      setSelected(null)
      setSecondsLeft(res.secondsRemaining)
      setPhase('question')
      return
    }
    if (res.status === 'completed') { loadResult(tok); return }
    setPhase('instructions')
  }

  // ── Question timer — server is authoritative; this is display-only and
  //    auto-triggers Next when it hits 0 so an idle student still advances
  //    without having to click anything ───────────────────────────────────
  useEffect(() => {
    if (phase !== 'question' || !question) return
    clearInterval(timerRef.current)
    clearTimeout(autoAdvanceRef.current)
    timerRef.current = setInterval(() => {
      setSecondsLeft(s => (s > 0 ? s - 1 : 0))
    }, 1000)
    autoAdvanceRef.current = setTimeout(() => {
      submitAnswer(question.position, selectedRef.current)
    }, (secondsLeft + 1) * 1000)
    return () => { clearInterval(timerRef.current); clearTimeout(autoAdvanceRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, question?.position])

  const handleEntrySubmit = async e => {
    e.preventDefault()
    if (!form.registrationId.trim() || !form.fullName.trim() || !form.phone.trim()) {
      setError('Please fill in all fields.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      const res = await mocktestApi.enter(courseSlug, form.registrationId.trim(), form.fullName.trim(), form.phone.trim())
      storeToken(courseSlug, res.token)
      setToken(res.token)
      setTestTitle(res.testTitle || '')
      setCourseTitle(res.courseTitle || '')
      if (res.status === 'completed') { await loadResult(res.token); return }
      if (res.status === 'in_progress') {
        const s = await mocktestApi.start(res.token)
        applyState(s, res.token)
        return
      }
      setPhase('instructions')
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleStart = async () => {
    setSubmitting(true)
    setError('')
    try {
      const res = await mocktestApi.start(token)
      applyState(res, token)
    } catch (err) {
      setError(err.message || 'Could not start the test.')
    } finally {
      setSubmitting(false)
    }
  }

  async function submitAnswer(position, selectedIndex) {
    clearInterval(timerRef.current)
    clearTimeout(autoAdvanceRef.current)
    setSubmitting(true)
    try {
      const res = await mocktestApi.answer(token, position, selectedIndex)
      if (res.status === 'completed') { await loadResult(token); return }
      setQuestion(res.question)
      selectedRef.current = null
      setSelected(null)
      setSecondsLeft(res.secondsRemaining)
      setPhase('question')
    } catch (err) {
      setError(err.message || 'Could not submit your answer. Please check your connection.')
    } finally {
      setSubmitting(false)
    }
  }

  async function loadResult(tok) {
    try {
      const res = await mocktestApi.result(tok)
      if (res.status !== 'completed') { setPhase('instructions'); return }
      setResult(res)
      setPhase('result')
    } catch (err) {
      setError(err.message || 'Could not load your result.')
      setPhase('fatal')
    }
  }

  // ── Certificate generation — same canvas pipeline the admin panel uses
  //    (compositeCertificateCanvas/canvasToCompressedBlob, unchanged),
  //    then the SERVER creates the actual certificates record once it sees
  //    the uploaded URL (issue-cert.php) — this browser never asserts
  //    eligibility or the cert code itself, both already decided server-
  //    side before this even runs. ───────────────────────────────────────
  useEffect(() => {
    if (phase !== 'result' || !result?.eligible || result.certificateStatus === 'issued' || !result.certTemplate?.imageUrl) return
    let cancelled = false
    setCertState('generating')
    ;(async () => {
      try {
        // result.certCode is server-computed (HMAC-keyed, not derivable
        // client-side — see derive_mock_test_cert_code() in
        // public/api/mocktest/_lib/util.php) so it has to come from
        // result.php rather than being computed here.
        const canvas = await compositeCertificateCanvas({
          templateUrl: result.certTemplate.imageUrl,
          studentName: result.studentName,
          certCode: result.certCode,
          namePos: result.certTemplate.namePos,
          idPos: result.certTemplate.idPos,
          elements: result.certTemplate.elements,
        })
        const blob = await canvasToCompressedBlob(canvas)
        const imageUrl = await uploadToCloudinary(blob, 'medweb/certificates/generated')
        const issued = await mocktestApi.issueCert(token, imageUrl)
        if (cancelled) return
        setResult(r => ({ ...r, certificateStatus: 'issued', certCode: issued.certCode, certificateImageUrl: issued.certificateImageUrl }))
        setCertState('done')
      } catch (err) {
        if (!cancelled) setCertState('failed')
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, result?.eligible, result?.certificateStatus])

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const ss = String(secondsLeft % 60).padStart(2, '0')

  return (
    <div className="font-poppins bg-[#f7f9fc] min-h-screen">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-10 sm:py-16">
        {phase === 'entry' && (
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#1655c3] mb-6 transition-colors">
            <ArrowLeft size={16} /> Back
          </button>
        )}

        {phase === 'loading' && <div className="text-center py-20 text-gray-400">Loading…</div>}

        {phase === 'fatal' && (
          <div className="bg-white rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.06)] p-10 text-center">
            <XCircle size={44} className="text-red-400 mx-auto mb-4" />
            <p className="text-gray-600">{error || 'Something went wrong.'}</p>
          </div>
        )}

        {phase === 'entry' && (
          <motion.div className="bg-white rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.06)] overflow-hidden" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
            <Header title="Mock Test" subtitle="Enter your registration details to begin." />
            <form onSubmit={handleEntrySubmit} className="p-6 sm:p-10 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Registration ID</label>
                <input className={inputCls} value={form.registrationId} onChange={e => setForm(f => ({ ...f, registrationId: e.target.value }))} placeholder="e.g. MW-AMR-0019" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Full Name</label>
                <input className={inputCls} value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} placeholder="As entered during registration" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">WhatsApp / Phone Number</label>
                <input className={inputCls} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="03XX-XXXXXXX" />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button type="submit" disabled={submitting} className="w-full py-3.5 rounded-xl text-sm font-bold text-white disabled:opacity-60" style={{ background: 'linear-gradient(135deg, #1655c3, #64ac37)' }}>
                {submitting ? 'Checking…' : 'Continue'}
              </button>
            </form>
          </motion.div>
        )}

        {phase === 'instructions' && (
          <motion.div className="bg-white rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.06)] overflow-hidden" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
            <Header title={testTitle || 'Mock Test'} subtitle={courseTitle} />
            <div className="p-6 sm:p-10 space-y-4">
              <ul className="space-y-2.5 text-sm text-gray-600">
                <li className="flex gap-2"><ClipboardCheck size={16} className="text-[#1655c3] shrink-0 mt-0.5" /> Questions are shown one at a time, in a random order.</li>
                <li className="flex gap-2"><Clock size={16} className="text-[#1655c3] shrink-0 mt-0.5" /> Each question has its own time limit — it auto-advances when time runs out.</li>
                <li className="flex gap-2"><ArrowLeft size={16} className="text-[#1655c3] shrink-0 mt-0.5 rotate-180" /> Once you click Next, you can't go back to change an earlier answer.</li>
                <li className="flex gap-2"><Award size={16} className="text-[#1655c3] shrink-0 mt-0.5" /> Score the required percentage to receive a certificate.</li>
              </ul>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button onClick={handleStart} disabled={submitting} className="w-full py-3.5 rounded-xl text-sm font-bold text-white disabled:opacity-60" style={{ background: 'linear-gradient(135deg, #1655c3, #64ac37)' }}>
                {submitting ? 'Starting…' : 'Start Test'}
              </button>
            </div>
          </motion.div>
        )}

        {phase === 'question' && question && (
          <motion.div className="bg-white rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.06)] overflow-hidden" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="px-6 sm:px-10 pt-6 pb-4 border-b border-gray-100 flex items-center justify-between">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Question {question.position + 1} of {question.total}</span>
              <span className={`flex items-center gap-1.5 text-sm font-bold px-3 py-1 rounded-full ${secondsLeft <= 10 ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-[#1655c3]'}`}>
                <Clock size={13} /> {mm}:{ss}
              </span>
            </div>
            <AnimatePresence mode="wait">
              <motion.div key={question.position} className="p-6 sm:p-10 space-y-5" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
                <h2 className="text-lg font-bold text-[#1a1a1a] leading-snug">{question.text}</h2>
                <div className="space-y-2.5">
                  {question.options.map((opt, i) => (
                    <button key={i} onClick={() => pickOption(i)}
                      className={`w-full text-left px-4 py-3.5 rounded-xl border text-sm font-medium transition-all ${selected === i ? 'border-[#1655c3] bg-blue-50 text-[#1655c3]' : 'border-gray-200 hover:border-gray-300 text-gray-700'}`}>
                      <span className="font-bold mr-2">{'ABCD'[i]}.</span> {opt}
                    </button>
                  ))}
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <button onClick={() => submitAnswer(question.position, selected)} disabled={submitting}
                  className="w-full py-3.5 rounded-xl text-sm font-bold text-white disabled:opacity-60" style={{ background: 'linear-gradient(135deg, #1655c3, #64ac37)' }}>
                  {question.position + 1 === question.total ? 'Finish' : 'Next'}
                </button>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}

        {phase === 'result' && result && (
          <motion.div className="bg-white rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.06)] overflow-hidden" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
            <div className="px-6 sm:px-10 pt-8 pb-6 text-center" style={{ background: result.eligible ? 'linear-gradient(135deg, #1655c3, #64ac37)' : 'linear-gradient(135deg, #64748b, #475569)' }}>
              {result.eligible ? <CheckCircle size={44} className="text-white mx-auto mb-3" /> : <XCircle size={44} className="text-white mx-auto mb-3" />}
              <h1 className="text-white font-black text-xl sm:text-2xl">{result.eligible ? "You're Eligible! 🎉" : 'Test Completed'}</h1>
              <p className="text-white/85 text-sm mt-1">{result.testTitle} {result.courseTitle ? `· ${result.courseTitle}` : ''}</p>
            </div>
            <div className="p-6 sm:p-10 space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                {[
                  ['Correct', result.correctCount], ['Incorrect', result.incorrectCount],
                  ['Unanswered', result.unansweredCount], ['Score', `${result.percent}%`],
                ].map(([label, value]) => (
                  <div key={label} className="bg-gray-50 rounded-xl py-3">
                    <div className="text-xl font-black text-[#1a1a1a]">{value}</div>
                    <div className="text-[11px] text-gray-400 font-semibold">{label}</div>
                  </div>
                ))}
              </div>

              {result.eligible ? (
                <div className="rounded-2xl border border-green-100 bg-green-50 p-5 text-center">
                  {certState === 'generating' && <p className="text-sm text-gray-500">Generating your certificate…</p>}
                  {result.certificateStatus === 'issued' && result.certificateImageUrl ? (
                    <>
                      <img src={result.certificateImageUrl} alt="Your MEDWEB-PK mock test certificate" loading="lazy" className="rounded-xl mx-auto mb-4 max-w-full shadow-md" />
                      <div className="flex flex-wrap items-center justify-center gap-3">
                        <a href={result.certificateImageUrl} download className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: '#1655c3' }}>
                          <Download size={14} /> Download
                        </a>
                        <a href={`/certificate/${result.certCode}`} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-[#1655c3] border border-[#1655c3]">
                          <ShieldCheck size={14} /> Verify
                        </a>
                      </div>
                    </>
                  ) : certState === 'failed' ? (
                    <p className="text-sm text-gray-500">We couldn't generate your certificate right now — you'll receive it by email shortly.</p>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 text-center">
                  <p className="text-sm font-semibold text-gray-600">You are not eligible for a certificate.</p>
                  <p className="text-xs text-gray-400 mt-1">A minimum of {result.passPercent}% is required.</p>
                </div>
              )}
              <p className="text-center text-xs text-gray-400">A copy of this result has been emailed to you.</p>
            </div>
          </motion.div>
        )}
      </div>
      <Footer />
    </div>
  )
}
