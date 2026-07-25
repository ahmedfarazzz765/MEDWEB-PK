import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, Clock, Video, X, User, Phone, Mail, BookOpen, CheckCircle } from 'lucide-react'
import { webinarsService, studentsDbService } from '../firebase/services'

// ── Static fallback data (shown when Firebase is empty / loading) ─────────────
const STATIC_WEBINARS = [
  {
    id: 's1',
    topic: 'Rational Drug Use in Clinical Practice',
    speaker: 'Dr. Amina Khan',
    role: 'Senior Clinical Pharmacist',
    date: 'May 20, 2026',
    time: '7:00 PM PKT',
    registered: 245,
    type: 'Free',
    status: 'Live',
    color: '#1655c3',
  },
  {
    id: 's2',
    topic: 'Antibiotic Stewardship in Pakistan',
    speaker: 'Dr. Bilal Akhtar',
    role: 'Infectious Disease Specialist',
    date: 'May 22, 2026',
    time: '6:30 PM PKT',
    registered: 198,
    type: 'Free',
    status: 'Upcoming',
    color: '#64ac37',
  },
  {
    id: 's3',
    topic: 'Drug Interactions: What Every Pharmacist Must Know',
    speaker: 'Dr. Sara Malik',
    role: 'Pharmacologist, PMDC Registered',
    date: 'May 25, 2026',
    time: '7:30 PM PKT',
    registered: 320,
    type: 'Paid',
    status: 'Upcoming',
    color: '#1655c3',
  },
  {
    id: 's4',
    topic: 'Clinical Assessment for Allied Health Professionals',
    speaker: 'Dr. Usman Farooq',
    role: 'Internal Medicine Specialist',
    date: 'June 1, 2026',
    time: '6:00 PM PKT',
    registered: 150,
    type: 'Free',
    status: 'Upcoming',
    color: '#64ac37',
  },
]

// ── Speaker avatar ────────────────────────────────────────────────────────────
function SpeakerAvatar({ name, color }) {
  const initials = name?.split(' ').map(n => n[0]).slice(1, 3).join('') || '?'
  return (
    <div
      className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-md flex-shrink-0"
      style={{ background: `linear-gradient(135deg, ${color}, ${color}99)` }}
    >
      {initials}
    </div>
  )
}

// ── Live badge ────────────────────────────────────────────────────────────────
function LiveBadge() {
  return (
    <span className="flex items-center gap-1.5 text-[10px] font-bold text-white bg-red-500 px-2.5 py-1 rounded-full shadow-sm">
      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse inline-block" />
      LIVE NOW
    </span>
  )
}

// ── Join Form Modal ───────────────────────────────────────────────────────────
function JoinModal({ webinar, onClose }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', profession: '' })
  const [status, setStatus] = useState('idle') // idle | loading | success | error
  const [error, setError] = useState('')

  const set = field => e => setForm(prev => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = async () => {
    const { name, email, phone, profession } = form
    if (!name.trim() || !email.trim() || !phone.trim() || !profession.trim()) {
      setError('Please fill in all fields.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.')
      return
    }
    setError('')
    setStatus('loading')
    try {
      await webinarsService.addRegistration({
        webinarId:    webinar.id,
        webinarTopic: webinar.topic,
        speaker:      webinar.speaker,
        name, email, phone, profession,
        joinedAt:     new Date().toISOString(),
      })
      await webinarsService.register(webinar.id).catch(() => {})
      studentsDbService.upsertFromRegistration({
        email, name, phone, webinarId: webinar.id, webinarTitle: webinar.topic, registeredAt: new Date().toISOString(),
      }).catch(() => {})
      setStatus('success')
    } catch (err) {
      console.error(err)
      setStatus('error')
    }
  }

  const inputCls = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1655c3]/30 focus:border-[#1655c3] transition-all placeholder:text-gray-400"

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        />

        {/* Modal */}
        <motion.div
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          initial={{ scale: 0.92, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 300 }}
        >
          {/* Header */}
          <div className="relative px-6 pt-6 pb-4" style={{ background: 'linear-gradient(135deg, #1655c3, #64ac37)' }}>
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-all"
            >
              <X size={16} />
            </button>
            <div className="flex items-center gap-2 mb-3">
              <LiveBadge />
            </div>
            <h3 className="text-white font-bold text-lg leading-snug pr-8">{webinar.topic}</h3>
            <p className="text-white/80 text-xs mt-1">{webinar.speaker} · {webinar.time}</p>
          </div>

          {/* Body */}
          <div className="px-6 py-5">
            {status === 'success' ? (
              <motion.div
                className="flex flex-col items-center text-center py-6"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-4">
                  <CheckCircle size={32} className="text-[#64ac37]" />
                </div>
                <h4 className="font-bold text-[#1a1a1a] text-lg mb-1">You're Registered!</h4>
                <p className="text-gray-500 text-sm mb-1">
                  Thank you, <span className="font-semibold text-[#1655c3]">{form.name}</span>.
                </p>
                <p className="text-gray-400 text-xs">A confirmation will be sent to <span className="font-medium">{form.email}</span>.</p>
                <button
                  onClick={onClose}
                  className="mt-6 px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg, #1655c3, #64ac37)' }}
                >
                  Close
                </button>
              </motion.div>
            ) : status === 'error' ? (
              <motion.div className="flex flex-col items-center text-center py-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <p className="text-red-500 font-semibold mb-2">Something went wrong.</p>
                <p className="text-gray-400 text-sm mb-4">Please try again or contact support.</p>
                <button onClick={() => setStatus('idle')} className="px-5 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Try Again</button>
              </motion.div>
            ) : (
              <>
                <p className="text-gray-500 text-sm mb-5">Fill in your details to join this live session.</p>

                <div className="space-y-3">
                  {/* Name */}
                  <div className="relative">
                    <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Full Name"
                      value={form.name}
                      onChange={set('name')}
                      className={`${inputCls} pl-10`}
                    />
                  </div>

                  {/* Email */}
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                      type="email"
                      placeholder="Email Address"
                      value={form.email}
                      onChange={set('email')}
                      className={`${inputCls} pl-10`}
                    />
                  </div>

                  {/* Phone */}
                  <div className="relative">
                    <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                      type="tel"
                      placeholder="Phone Number"
                      value={form.phone}
                      onChange={set('phone')}
                      className={`${inputCls} pl-10`}
                    />
                  </div>

                  {/* Profession */}
                  <div className="relative">
                    <BookOpen size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <select
                      value={form.profession}
                      onChange={set('profession')}
                      className={`${inputCls} pl-10 appearance-none bg-white cursor-pointer`}
                    >
                      <option value="">Select Profession</option>
                      <option>Medical Doctor (MBBS)</option>
                      <option>Pharmacist (Pharm-D)</option>
                      <option>Dentist (BDS)</option>
                      <option>Nurse / Midwife</option>
                      <option>Allied Health Professional</option>
                      <option>Medical Student</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>

                {error && (
                  <p className="text-red-500 text-xs mt-3 flex items-center gap-1">
                    <X size={12} /> {error}
                  </p>
                )}

                <motion.button
                  onClick={handleSubmit}
                  disabled={status === 'loading'}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="mt-5 w-full py-3 rounded-xl font-bold text-sm text-white disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                  style={{ background: 'linear-gradient(135deg, #1655c3, #64ac37)', boxShadow: '0 4px 15px rgba(22,85,195,0.25)' }}
                >
                  {status === 'loading' ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Submitting…
                    </span>
                  ) : 'Join Live Webinar →'}
                </motion.button>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ── Main Webinars Section ─────────────────────────────────────────────────────
export default function Webinars() {
  const swiperRef  = useRef(null)
  const [webinars, setWebinars] = useState(STATIC_WEBINARS)
  const [selected, setSelected] = useState(null)   // webinar for modal

  // Try to load from Firebase; fall back to static if empty / error
  useEffect(() => {
    webinarsService.getAll()
      .then(rows => { if (rows.length > 0) setWebinars(rows) })
      .catch(() => {})
  }, [])

  // Init Swiper
  useEffect(() => {
    if (!webinars.length) return
    const initSwiper = async () => {
      const { Swiper }                         = await import('swiper')
      const { Navigation, Pagination, Autoplay } = await import('swiper/modules')
      if (swiperRef.current && !swiperRef.current.swiper) {
        new Swiper(swiperRef.current, {
          modules: [Navigation, Pagination, Autoplay],
          slidesPerView: 1,
          spaceBetween: 24,
          loop: webinars.length > 1,
          autoplay: { delay: 4500, disableOnInteraction: false },
          pagination: { clickable: true, el: '.webinar-pagination' },
          navigation: { nextEl: '.webinar-next', prevEl: '.webinar-prev' },
          breakpoints: { 640: { slidesPerView: 2 }, 1024: { slidesPerView: 3 } },
        })
      }
    }
    initSwiper()
  }, [webinars])

  const isLive = w => w.status === 'Live'

  return (
    <>
      <section id="webinars" className="section-padding">
        <div className="max-w-7xl mx-auto">

          {/* Section heading */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div>
              <span className="badge-green mb-3 inline-block">Live Webinars</span>
              <h2 className="section-title mb-2">
                Upcoming <span className="text-[#64ac37]">Expert Webinars</span>
              </h2>
              <p className="text-gray-500 text-sm">Register now — seats fill up fast.</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="webinar-prev w-10 h-10 rounded-full border-2 border-[#1655c3] text-[#1655c3] flex items-center justify-center hover:bg-[#1655c3] hover:text-white transition-all duration-200 font-bold text-lg">‹</button>
              <button className="webinar-next w-10 h-10 rounded-full border-2 border-[#1655c3] text-[#1655c3] flex items-center justify-center hover:bg-[#1655c3] hover:text-white transition-all duration-200 font-bold text-lg">›</button>
            </div>
          </div>

          {/* Swiper */}
          <div className="swiper" ref={swiperRef}>
            <div className="swiper-wrapper pb-10">
              {webinars.map((w, i) => {
                const live  = isLive(w)
                const color = w.color || (live ? '#1655c3' : '#64ac37')

                return (
                  <div key={w.id || i} className="swiper-slide">
                    <motion.div
                      whileHover={{ y: -6, boxShadow: '0 20px 40px rgba(0,0,0,0.10)' }}
                      className={`bg-white rounded-2xl shadow-md border flex flex-col gap-4 h-full transition-all duration-300 overflow-hidden ${live ? 'border-red-300 ring-1 ring-red-300' : 'border-gray-100'}`}
                    >
                      {/* Live stripe */}
                      {live && (
                        <div className="h-1.5 w-full bg-gradient-to-r from-red-500 to-orange-400" />
                      )}

                      <div className="px-6 pb-6 pt-2 flex flex-col gap-4 flex-1">
                        {/* Header */}
                        <div className="flex items-center gap-4">
                          <SpeakerAvatar name={w.speaker} color={color} />
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-sm text-[#1a1a1a] truncate">{w.speaker}</div>
                            <div className="text-xs text-gray-400 truncate">{w.role}</div>
                          </div>
                        </div>

                        {/* Badges */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {live && <LiveBadge />}
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${w.type === 'Free' ? 'bg-green-100 text-[#64ac37]' : 'bg-blue-100 text-[#1655c3]'}`}>
                            {w.type || 'Free'}
                          </span>
                          {!live && w.status && (
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-[#1655c3]">
                              {w.status}
                            </span>
                          )}
                        </div>

                        {/* Topic */}
                        <h3 className="font-bold text-[#1a1a1a] text-base leading-snug">{w.topic}</h3>

                        {/* Meta */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-gray-500 text-sm">
                            <Calendar size={14} className="text-[#1655c3] flex-shrink-0" />
                            {w.date}
                          </div>
                          <div className="flex items-center gap-2 text-gray-500 text-sm">
                            <Clock size={14} className="text-[#64ac37] flex-shrink-0" />
                            {w.time}
                          </div>
                          <div className="flex items-center gap-2 text-gray-500 text-sm">
                            <Video size={14} className="text-[#1655c3] flex-shrink-0" />
                            {w.registered || 0} Registered
                          </div>
                        </div>

                        {/* CTA */}
                        {live ? (
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => setSelected(w)}
                            className="mt-auto w-full py-2.5 rounded-xl font-bold text-sm text-white transition-all duration-300 flex items-center justify-center gap-2"
                            style={{ background: 'linear-gradient(135deg, #ef4444, #f97316)', boxShadow: '0 4px 15px rgba(239,68,68,0.3)' }}
                          >
                            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                            Join Now — Live
                          </motion.button>
                        ) : (
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                            className="mt-auto w-full py-2.5 rounded-xl font-semibold text-sm text-white transition-all duration-300"
                            style={{ background: color }}
                          >
                            Register Now
                          </motion.button>
                        )}
                      </div>
                    </motion.div>
                  </div>
                )
              })}
            </div>
            <div className="webinar-pagination flex justify-center gap-2 mt-2" />
          </div>
        </div>
      </section>

      {/* Join Modal */}
      {selected && <JoinModal webinar={selected} onClose={() => setSelected(null)} />}
    </>
  )
}
