import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Facebook, Instagram, Linkedin, MessageCircle, Mail, Phone, MapPin, ArrowRight, Check, Loader2 } from 'lucide-react'
import { newsletterService } from '../firebase/services'
import { useSiteSettings } from '../hooks/useSiteSettings'
import logo from '../assets/medweb.png'

const DEFAULTS = {
  footerAbout: "Pakistan's premier medical education platform for pharmacy, biotech, psychology, and allied health sciences students.",
  footerEmail: 'info@medweb.pk',
  footerPhone: '03291692899',
  footerFacebook: 'https://facebook.com',
  footerInstagram: 'https://instagram.com',
  footerLinkedin: 'https://linkedin.com',
  footerWhatsapp: 'https://wa.me/923291692899',
  footerAddress: 'Islamabad, Pakistan',
  quickLinks: [
    { label: 'Home', url: '#home' },
    { label: 'Courses', url: '#courses-highlight' },
    { label: 'Webinars', url: '#webinars' },
    { label: 'Ambassador Program', url: '#ambassadors' },
    { label: 'Our Team', url: '/team' },
    { label: 'Advisory Board', url: '#advisory' },
    { label: 'Certificates', url: '#certificates' },
    { label: 'Blog', url: '#blog' },
    { label: 'Announcements', url: '/announcements' },
    { label: 'Contact', url: '#contact' },
  ],
  footerPrograms: [
    'Clinical Pharmacy Masterclass',
    'Drug Therapy Series',
    'Ambassador Program',
    'Certificate Verification',
    'Our Team'
  ],
}

const PROGRAM_LINK_OVERRIDES = {
  'Ambassador Program': '#ambassadors',
  'Certificate Verification': '#certificates',
  'Our Team': '/team',
}

function NewsletterForm() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const isValidEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())

  const handleSubmit = async e => {
    e.preventDefault()
    if (!isValidEmail(email)) {
      setState('error')
      setErrorMsg('Enter a valid email address.')
      return
    }
    setState('loading')
    try {
      await newsletterService.subscribe(email)
      setState('success')
      setEmail('')
    } catch (err) {
      setState('error')
      setErrorMsg(err.code === 'already-subscribed' ? "You're already subscribed!" : 'Something went wrong. Please try again.')
    }
  }

  if (state === 'success') {
    return (
      <div className="flex items-center gap-2 text-[#64ac37] text-sm font-semibold">
        <Check size={16} /> Subscribed! Thanks for joining.
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex gap-2">
        <input
          type="email"
          placeholder="Your email"
          value={email}
          onChange={e => { setEmail(e.target.value); if (state === 'error') setState('idle') }}
          className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-white/40 outline-none focus:border-[#64ac37] transition-colors"
        />
        <button
          type="submit"
          disabled={state === 'loading'}
          className="px-3 py-2 rounded-lg bg-[#64ac37] hover:bg-[#1655c3] transition-colors disabled:opacity-60 flex-shrink-0 text-white font-bold"
        >
          {state === 'loading' ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
        </button>
      </div>
      {state === 'error' && <p className="text-red-400 text-xs mt-1.5">{errorMsg}</p>}
    </form>
  )
}

export default function Footer() {
  const f = useSiteSettings(DEFAULTS)
  const navigate = useNavigate()
  const location = useLocation()

  const handleLinkClick = (e, url) => {
    if (url.startsWith('/')) {
      e.preventDefault()
      navigate(url)
      return
    }

    if (!url.startsWith('#')) return
    if (location.pathname === '/') return
    e.preventDefault()
    navigate('/' + url)
  }

  const socials = [
    { Icon: Facebook, href: f.footerFacebook },
    { Icon: MessageCircle, href: f.footerWhatsapp },
    { Icon: Instagram, href: f.footerInstagram },
    { Icon: Linkedin, href: f.footerLinkedin },
  ].filter(s => s.href)

  return (
    <footer id="contact" className="text-white bg-[#0B1220] relative">
      {/* Top Tilted Dual Color Accent (Green #64ac37 + Blue #1655c3) */}
      <div className="w-full h-1.5 relative overflow-hidden bg-[#64ac37]">
        <div
          className="absolute inset-0 bg-[#1655c3]"
          style={{ clipPath: 'polygon(45% 0, 100% 0, 100% 100%, 55% 100%)' }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* About */}
          <div>
            <div className="flex items-center gap-2.5 mb-5">
              <img src={logo} alt="MEDWEB Logo" className="w-11 h-11 object-contain" />
              <div>
                <span className="font-black text-white text-xl tracking-tight">MED</span>
                <span className="font-black text-[#64ac37] text-xl tracking-tight">WEB</span>
              </div>
            </div>
            <p className="text-white/70 text-sm leading-relaxed mb-5">{f.footerAbout}</p>
            <div className="flex gap-3">
              {socials.map(({ Icon, href }, i) => (
                <a
                  key={i}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center hover:bg-[#64ac37] transition-all duration-200 hover:scale-110"
                >
                  <Icon size={14} />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-bold text-base mb-5 flex items-center gap-2">
              <span className="w-6 h-0.5 bg-[#64ac37]" /> Quick Links
            </h4>
            <ul className="space-y-2.5">
              {(f.quickLinks || DEFAULTS.quickLinks).map((link, i) => (
                <li key={i}>
                  <a
                    href={link.url || '/'}
                    onClick={e => handleLinkClick(e, link.url || '/')}
                    className="text-white/70 text-sm hover:text-[#64ac37] transition-colors flex items-center gap-2 group"
                  >
                    <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity -ml-1" />
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Programs */}
          <div>
            <h4 className="font-bold text-base mb-5 flex items-center gap-2">
              <span className="w-6 h-0.5 bg-[#64ac37]" /> Programs & Community
            </h4>
            <ul className="space-y-2.5">
              {(f.footerPrograms || DEFAULTS.footerPrograms).map((p) => {
                const href = PROGRAM_LINK_OVERRIDES[p] || '#courses-highlight'
                return (
                  <li key={p}>
                    <a
                      href={href}
                      onClick={e => handleLinkClick(e, href)}
                      className="text-white/70 text-sm hover:text-[#64ac37] transition-colors flex items-center gap-2 group"
                    >
                      <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity -ml-1" />
                      {p}
                    </a>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-bold text-base mb-5 flex items-center gap-2">
              <span className="w-6 h-0.5 bg-[#64ac37]" /> Contact Us
            </h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin size={15} className="text-[#64ac37] flex-shrink-0 mt-0.5" />
                <span className="text-white/70 text-sm">{f.footerAddress}</span>
              </li>
              <li className="flex items-start gap-3">
                <Mail size={15} className="text-[#64ac37] flex-shrink-0 mt-0.5" />
                <a href={`mailto:${f.footerEmail}`} className="text-white/70 text-sm hover:text-[#64ac37] transition-colors">
                  {f.footerEmail}
                </a>
              </li>
              <li className="flex items-start gap-3">
                <Phone size={15} className="text-[#64ac37] flex-shrink-0 mt-0.5" />
                <a href={`tel:${f.footerPhone}`} className="text-white/70 text-sm hover:text-[#64ac37] transition-colors">
                  {f.footerPhone}
                </a>
              </li>
              <li className="flex items-start gap-3">
                <MessageCircle size={15} className="text-[#64ac37] flex-shrink-0 mt-0.5" />
                <a href={f.footerWhatsapp} target="_blank" rel="noreferrer" className="text-white/70 text-sm hover:text-[#64ac37] transition-colors">
                  WhatsApp Support
                </a>
              </li>
            </ul>

            <div className="mt-6">
              <p className="text-xs text-white/50 mb-2 font-medium">Newsletter</p>
              <NewsletterForm />
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-white/50 text-xs">
            © {new Date().getFullYear()} <strong className="text-white/70">MEDWEB-PK</strong> — All Rights Reserved
          </p>
          <div className="flex gap-5 text-xs text-white/40">
            <a href="/privacy-policy" className="hover:text-white/70 transition-colors">Privacy Policy</a>
            <a href="/terms-of-service" className="hover:text-white/70 transition-colors">Terms of Service</a>
            <a href="/refund-policy" className="hover:text-white/70 transition-colors">Refund Policy</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
