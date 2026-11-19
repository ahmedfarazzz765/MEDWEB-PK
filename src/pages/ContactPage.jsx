import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, MapPin, Mail, Phone, CheckCircle, Send } from 'lucide-react'
import { settingsService, contactMessagesService } from '../firebase/services'
import Navbar from '../components/Navbar'
import Footer from '../sections/Footer'
import SEO from '../components/SEO'

const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 outline-none focus:border-[#1655c3] focus:ring-2 focus:ring-blue-100 transition-all bg-gray-50'

const DEFAULT_ADDRESS = 'Islamabad, Pakistan'
const DEFAULT_PHONE = '+92 329 1692899'
const DEFAULT_EMAIL = 'medwebpk@gmail.com'

export default function ContactPage() {
  const navigate = useNavigate()
  const [info, setInfo] = useState({ address: DEFAULT_ADDRESS, phone: DEFAULT_PHONE, email: DEFAULT_EMAIL })
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')

  useEffect(() => {
    window.scrollTo(0, 0)
    settingsService.get().then(s => {
      if (!s) return
      setInfo(prev => ({
        address: s.footerAddress || prev.address,
        phone: s.footerPhone || prev.phone,
        email: s.footerEmail || prev.email,
      }))
    }).catch(() => {})
  }, [])

  const setField = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setError('Please fill in your name, email and message.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('Please enter a valid email address.')
      return
    }
    setError('')
    setStatus('loading')
    try {
      await contactMessagesService.add({
        name: form.name.trim(), email: form.email.trim().toLowerCase(),
        subject: form.subject.trim(), message: form.message.trim(),
      })
      setStatus('success')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      console.error(err)
      setStatus('error')
      setError(err?.message || 'Failed to send your message. Please try again.')
    }
  }

  return (
    <div className="font-poppins bg-[#f7f9fc] min-h-screen">
      <SEO title="Contact Us" description="Get in touch with MEDWEB-PK — Pakistan's medical education platform. Reach out for support, partnerships, or questions about our courses and webinars." path="/contact" />
      <Navbar />

      <div className="px-4 pt-10 pb-20 sm:pt-14 sm:pb-28" style={{ background: 'linear-gradient(135deg, #1655c3, #64ac37)' }}>
        <div className="max-w-4xl mx-auto">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-white/80 hover:text-white mb-6 transition-colors">
            <ArrowLeft size={16} /> Back
          </button>
          <span className="inline-block text-[11px] font-bold text-white bg-white/20 px-3 py-1 rounded-full mb-4">GET IN TOUCH</span>
          <h1 className="text-white font-black text-3xl sm:text-4xl lg:text-5xl leading-tight">Contact Us</h1>
          <p className="text-white/85 text-sm sm:text-base mt-3 max-w-xl">Have a question about our courses, webinars, or partnerships? We'd love to hear from you.</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 -mt-12 sm:-mt-16 pb-20">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Contact info cards */}
          <div className="space-y-4">
            {[
              { icon: MapPin, label: 'Address', value: info.address, href: null },
              { icon: Phone, label: 'Phone', value: info.phone, href: `tel:${info.phone.replace(/\s+/g, '')}` },
              { icon: Mail, label: 'Email', value: info.email, href: `mailto:${info.email}` },
            ].map(({ icon: Icon, label, value, href }) => (
              <motion.div key={label} className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.06)] p-5 flex items-start gap-3"
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  <Icon size={18} className="text-[#1655c3]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
                  {href ? (
                    <a href={href} className="text-sm font-semibold text-[#1a1a1a] hover:text-[#1655c3] transition-colors break-words">{value}</a>
                  ) : (
                    <p className="text-sm font-semibold text-[#1a1a1a]">{value}</p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Contact form */}
          <motion.div className="lg:col-span-2 bg-white rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.06)] overflow-hidden"
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
            {status === 'success' ? (
              <div className="p-8 sm:p-12 text-center">
                <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle size={44} className="text-[#64ac37]" />
                </div>
                <h2 className="text-2xl font-black text-[#1a1a1a] mb-2">Message Sent! 🎉</h2>
                <p className="text-gray-500">Thank you for reaching out — we'll get back to you soon.</p>
                <button onClick={() => navigate('/')} className="mt-6 px-8 py-3 rounded-xl text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, #1655c3, #64ac37)' }}>
                  Back to Home
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6 sm:p-10 space-y-4">
                <h2 className="text-xl font-black text-[#1a1a1a] mb-1">Send Us a Message</h2>
                <p className="text-sm text-gray-500 mb-4">We usually respond within 1-2 business days.</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Your Name</label>
                    <input className={inputCls} value={form.name} onChange={e => setField('name', e.target.value)} placeholder="Full name" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Email Address</label>
                    <input type="email" className={inputCls} value={form.email} onChange={e => setField('email', e.target.value)} placeholder="you@example.com" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Subject</label>
                  <input className={inputCls} value={form.subject} onChange={e => setField('subject', e.target.value)} placeholder="What's this about?" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Message</label>
                  <textarea rows={5} className={inputCls} value={form.message} onChange={e => setField('message', e.target.value)} placeholder="Tell us more…" />
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <button type="submit" disabled={status === 'loading'} className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-sm font-bold text-white disabled:opacity-60" style={{ background: 'linear-gradient(135deg, #1655c3, #64ac37)' }}>
                  <Send size={15} /> {status === 'loading' ? 'Sending…' : 'Send Message'}
                </button>
              </form>
            )}
          </motion.div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
