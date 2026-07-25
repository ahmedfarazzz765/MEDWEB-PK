import { useState, useEffect } from 'react'
import {
  Plus, X, Image, PanelTop, Building2, Quote, Info, Sparkles, ShieldCheck, Layout, Scale,
  Award, UserCheck, DollarSign, Headphones, BookOpen, GraduationCap, Shield, Heart, Star, Users, Video, CheckCircle, Radio,
} from 'lucide-react'
import FormField, { inputCls } from '../components/FormField'
import ImageUpload from '../components/ImageUpload'
import AdminButton from '../components/AdminButton'
import { settingsService } from '../../firebase/services'

// Matches what's actually live on the homepage today (verified against the
// real Firestore-saved whyCards, not WhyMedweb.jsx's own local fallback —
// that fallback only flashes briefly before the real Firestore data loads
// and overrides it, so it isn't what real visitors see).
const DEFAULT_WHY = [
  { icon: 'Award',     title: 'Verified Certificates', desc: 'Earn industry-recognized digital certificates with unique verification codes accepted by top hospitals and universities.', image: '', enabled: true },
  { icon: 'UserCheck', title: 'Expert Instructors',    desc: 'Learn directly from practicing pharmacists, physicians, and healthcare professionals with real clinical experience.', image: '', enabled: true },
  { icon: 'DollarSign',title: 'Free + Paid Programs',  desc: 'Access hundreds of free resources and premium structured programs — education for every budget.', image: '', enabled: true },
  { icon: 'Headphones',title: 'Student Support 24/7',  desc: 'Our dedicated student support team is always available to guide you through your learning journey.', image: '', enabled: true },
]

const ICON_OPTIONS = ['Award', 'UserCheck', 'DollarSign', 'Headphones', 'BookOpen', 'GraduationCap', 'Shield', 'Heart', 'Star', 'Users', 'Video', 'CheckCircle', 'Radio', 'ShieldCheck']
const ICON_MAP = { Award, UserCheck, DollarSign, Headphones, BookOpen, GraduationCap, Shield, Heart, Star, Users, Video, CheckCircle, Radio, ShieldCheck }

const DEFAULT_FULL = `As the founder of MEDWEB-PK, I strongly believe that accessible, evidence-based medical education is the right of every student — not a privilege available to a few.

This realization became the driving force behind MEDWEB-PK. I envision a Pakistan where every healthcare student can learn from expert instructors, attend high-quality webinars, and earn verified certifications.

Through modern digital learning tools and a growing library of educational resources, MEDWEB aims to prepare the next generation of healthcare professionals.`

const DEFAULT_NAV_LINKS = [
  { label: 'Home', href: '#home' }, { label: 'Courses', href: '#courses' },
  { label: 'Webinars', href: '#webinars' }, { label: 'Ambassador Program', href: '#ambassadors' },
  { label: 'Team', href: '/team' },
  { label: 'Certificates', href: '#certificates' }, { label: 'Blog', href: '#blog' }, { label: 'Contact', href: '#contact' },
]
const DEFAULT_PARTNERS = [
  { name: 'Partner University', logoImage: '' }, { name: 'Medical Institute', logoImage: '' },
  { name: 'Teaching Hospital', logoImage: '' }, { name: 'Health Sciences College', logoImage: '' },
  { name: 'Partner University', logoImage: '' }, { name: 'Medical Institute', logoImage: '' },
  { name: 'Teaching Hospital', logoImage: '' },
]
const DEFAULT_TRUST_POINTS = ['Secure & Trusted', 'Instant Verification', 'Recognized Across Pakistan', 'Tamper Proof']

// Every section that uses the shared SectionHeading component — grouped into
// one compact editor instead of a full card each, since the shape is identical.
const HEADING_SECTIONS = [
  { key: 'webinars',     label: 'Upcoming Webinars',    hasSubtitle: true  },
  { key: 'courses',      label: 'Featured Courses',     hasSubtitle: true  },
  { key: 'testimonials', label: 'What Our Students Say', hasSubtitle: true },
  { key: 'team',         label: 'Our Team',             hasSubtitle: true  },
  { key: 'advisory',     label: 'Advisory Board',       hasSubtitle: true  },
  { key: 'ambassadors',  label: 'Ambassadors',          hasSubtitle: true  },
  { key: 'blog',         label: 'Latest Articles',      hasSubtitle: false },
]

const DEFAULTS = {
  founderName:        'Dr. Shahroz Abbas',
  founderDesignation: 'Founder & CEO, MEDWEB-PK',
  founderImage:       '',
  founderQuote:       'Accessible, evidence-based medical education is the right of every student — not a privilege available to a few.',
  founderShortMessage:'As the founder of MEDWEB-PK, I strongly believe that accessible, evidence-based medical education is the right of every student.',
  founderFullMessage: DEFAULT_FULL,
  founderHeading1:    'A Vision for',
  founderHeading2:    'Every Student',
  whyTitle:           'Why MEDWEB?',
  whySubtitle:        "We're committed to delivering world-class medical education for every Pakistani healthcare student.",
  whyHeading1:         'WHY',
  whyHeading2:         'MEDWEB?',
  whyCards:            DEFAULT_WHY,
  studentsCount:       '15,000+', webinarsCount: '100+', instructorsCount: '20+',
  citiesCount:         '50+', certificatesCount: '25,000+', coursesCount: '15+',
  // About Us page (repurposed from the pre-existing "Who We Are" fields — that
  // section isn't rendered on the homepage anymore, but /about uses these
  // exact fields already, so this is the same data under its real current use)
  wwaTitle:            "Building Pakistan's Healthcare Future",
  wwaFull:             "MEDWEB is Pakistan's premier medical education platform dedicated to pharmacy, biotech, psychology, and allied health sciences students. We bridge the gap between academic knowledge and clinical practice through structured, expert-led programs.",
  wwaImage:            '',
  // Hero
  heroBadge:             "Pakistan's Leading Platform for Medical Education",
  heroHeadingPart1:      'Transforming',
  heroHeadingHighlight:  'Medical',
  heroHeadingPart2:      'Education in Pakistan',
  heroSubtext:           'Evidence-based courses, expert-led webinars, and certified programs for medical & healthcare students.',
  heroPrimaryBtnLabel:   'Explore Courses',
  heroSecondaryBtnLabel: 'Join Webinar',
  heroImage:             '',
  // Navbar
  navTagline: 'Connecting Medical Minds',
  navLinks:   DEFAULT_NAV_LINKS,
  communityLink: '', // WhatsApp channel/group link behind the Navbar's "Join MEDWEB Community" button
  // Welcome bar
  welcomeMessage: "🎓 Welcome to MEDWEB — Pakistan's Fastest Growing Medical Education Platform",
  // Trusted partners
  partnersHeading: 'Trusted by Leading Universities & Healthcare Partners',
  partners:        DEFAULT_PARTNERS,
  // Certificate verification
  certHeading1:    'Certificate',
  certHeading2:    'Verification',
  certSubtitle:    'Verify the authenticity of any MEDWEB certificate instantly using its unique verification code.',
  certTrustPoints: DEFAULT_TRUST_POINTS,
  // Legal pages — intentionally blank; real policy text must come from the user
  privacyPolicyContent: '',
  termsContent:         '',
  refundContent:        '',
}
// Per-section heading fields (webinarsHeading1, coursesSubtitle, etc.)
HEADING_SECTIONS.forEach(({ key, hasSubtitle }) => {
  DEFAULTS[`${key}Heading1`] = ''
  DEFAULTS[`${key}Heading2`] = ''
  if (hasSubtitle) DEFAULTS[`${key}Subtitle`] = ''
})
const HEADING_FALLBACKS = {
  webinarsHeading1: 'Upcoming', webinarsHeading2: 'Webinars', webinarsSubtitle: 'Join expert-led live sessions and earn verified certificates. Seats fill fast!',
  coursesHeading1: 'Featured', coursesHeading2: 'Courses', coursesSubtitle: 'Expert-designed programs to elevate your clinical knowledge and professional skills.',
  testimonialsHeading1: 'What Our Students', testimonialsHeading2: 'Say', testimonialsSubtitle: 'Thousands of students across Pakistan trust MEDWEB for their medical education journey.',
  teamHeading1: 'Our', teamHeading2: 'Team', teamSubtitle: 'Meet the experts behind the MEDWEB platform',
  advisoryHeading1: 'Advisory', advisoryHeading2: 'Board', advisorySubtitle: "Distinguished advisors guiding MEDWEB's vision",
  ambassadorsHeading1: 'Ambassadors &', ambassadorsHeading2: 'Student Community', ambassadorsSubtitle: 'Join our growing network of student leaders representing MEDWEB across Pakistan.',
  blogHeading1: 'Latest', blogHeading2: 'Articles',
}

// Tab bar — mirrors the sidebar's Content-group deep links (Hero, Founder
// Message, Why MEDWEB, Trusted Partners, Certificate Verification, Navbar &
// WelcomeBar, Legal Pages) plus two fields groups that don't have a sidebar
// shortcut of their own (About Us Page, Section Headings) but still need a
// home — reachable by clicking the tab directly.
const TABS = [
  { id: 'hero',        label: 'Hero',                    icon: Image },
  { id: 'navbar',      label: 'Navbar & WelcomeBar',     icon: PanelTop },
  { id: 'partners',    label: 'Trusted Partners',        icon: Building2 },
  { id: 'founder',     label: 'Founder Message',         icon: Quote },
  { id: 'wwa',         label: 'About Us Page',           icon: Info },
  { id: 'why',         label: 'Why MEDWEB',              icon: Sparkles },
  { id: 'certificate', label: 'Certificate Verification',icon: ShieldCheck },
  { id: 'headings',    label: 'Section Headings',        icon: Layout },
  { id: 'legal',       label: 'Legal Pages',             icon: Scale },
]

export default function AdminContent({ initialTab }) {
  const [s, setS] = useState(null)
  const [saving, setSaving] = useState(false)
  const [savedTab, setSavedTab] = useState('')
  const [tab, setTab] = useState(initialTab || 'hero')

  // A sidebar click while already on this page changes `initialTab` without
  // remounting the component — pick that up here.
  useEffect(() => { if (initialTab) setTab(initialTab) }, [initialTab])

  useEffect(() => {
    settingsService.get().then(d => {
      const merged = { ...DEFAULTS }
      for (const key in DEFAULTS) {
        if (Array.isArray(DEFAULTS[key])) {
          if (Array.isArray(d?.[key]) && d[key].length) merged[key] = d[key]
        } else if (d?.[key] !== undefined && d?.[key] !== null && d?.[key] !== '') {
          merged[key] = d[key]
        } else if (HEADING_FALLBACKS[key] && !merged[key]) {
          merged[key] = HEADING_FALLBACKS[key]
        }
      }
      // founderImage/wwaImage genuinely can be empty (no image chosen yet)
      merged.founderImage = d?.founderImage ?? ''
      merged.wwaImage = d?.wwaImage ?? ''
      // Back-compat: partners used to be plain strings before Round 18 added logos
      merged.partners = merged.partners.map(p => (typeof p === 'string' ? { name: p, logoImage: '' } : p))
      setS(merged)
    }).catch(() => {})
  }, [])

  if (!s) return (
    <div className="p-6 space-y-4">
      <div className="h-10 w-64 bg-gray-100 rounded-xl animate-pulse" />
      <div className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
    </div>
  )

  const set = (k, v) => setS(p => ({ ...p, [k]: v }))
  const save = async (tabId) => {
    setSaving(true)
    try { await settingsService.update(s); setSavedTab(tabId); setTimeout(() => setSavedTab(''), 2000) }
    catch (e) { alert(e.message) } finally { setSaving(false) }
  }

  // Why cards helpers
  const setCard = (i, patch) => setS(p => ({ ...p, whyCards: p.whyCards.map((c, idx) => idx === i ? { ...c, ...patch } : c) }))
  const addCard = () => setS(p => ({ ...p, whyCards: [...p.whyCards, { icon: 'Star', title: 'New Card', desc: '', image: '', enabled: true }] }))
  const delCard = i => setS(p => ({ ...p, whyCards: p.whyCards.filter((_, idx) => idx !== i) }))
  const moveCard = (i, dir) => setS(p => {
    const arr = [...p.whyCards]; const j = i + dir
    if (j < 0 || j >= arr.length) return p
    ;[arr[i], arr[j]] = [arr[j], arr[i]]; return { ...p, whyCards: arr }
  })

  // Generic list-of-strings helpers (partners, trust points)
  const setListItem = (field, i, v) => setS(p => ({ ...p, [field]: p[field].map((x, idx) => idx === i ? v : x) }))

  // Nav links helpers
  const setNavLink = (i, patch) => setS(p => ({ ...p, navLinks: p.navLinks.map((l, idx) => idx === i ? { ...l, ...patch } : l) }))
  const addNavLink = () => setS(p => ({ ...p, navLinks: [...p.navLinks, { label: 'New Link', href: '#' }] }))
  const delNavLink = i => setS(p => ({ ...p, navLinks: p.navLinks.filter((_, idx) => idx !== i) }))

  // Partner logo helpers
  const setPartner = (i, patch) => setS(p => ({ ...p, partners: p.partners.map((x, idx) => idx === i ? { ...x, ...patch } : x) }))
  const addPartner = () => setS(p => ({ ...p, partners: [...p.partners, { name: 'New Partner', logoImage: '' }] }))
  const delPartner = i => setS(p => ({ ...p, partners: p.partners.filter((_, idx) => idx !== i) }))

  const SaveBtn = ({ tab: tabId }) => (
    <AdminButton variant="primary" size="sm" onClick={() => save(tabId)} disabled={saving}>
      {saving ? 'Saving…' : savedTab === tabId ? 'Saved ✓' : 'Save Changes'}
    </AdminButton>
  )

  const Card = ({ children }) => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6 animate-page-fade-in">{children}</div>
  )

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Tab bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 flex flex-wrap gap-1 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = tab === id
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors
                ${isActive ? 'bg-[#1655c3] text-white' : 'text-gray-500 hover:bg-gray-50 hover:text-[#1a1a1a]'}`}
            >
              <Icon size={15} />
              {label}
            </button>
          )
        })}
      </div>

      {/* HERO */}
      {tab === 'hero' && (
        <Card>
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-black text-[#1a1a1a]">Hero</h3>
            <SaveBtn tab="hero" />
          </div>
          <div className="grid lg:grid-cols-[200px_1fr] gap-6">
            <ImageUpload label="Background Photo" folder="medweb/hero" value={s.heroImage} onChange={v => set('heroImage', v)} />
            <div className="space-y-4">
              <FormField label="Badge Text (small pill above the headline)"><input className={inputCls} value={s.heroBadge} onChange={e => set('heroBadge', e.target.value)} /></FormField>
              <div className="grid sm:grid-cols-3 gap-4">
                <FormField label="Headline — Part 1"><input className={inputCls} value={s.heroHeadingPart1} onChange={e => set('heroHeadingPart1', e.target.value)} /></FormField>
                <FormField label="Headline — Highlighted Word (green)"><input className={inputCls} value={s.heroHeadingHighlight} onChange={e => set('heroHeadingHighlight', e.target.value)} /></FormField>
                <FormField label="Headline — Part 2"><input className={inputCls} value={s.heroHeadingPart2} onChange={e => set('heroHeadingPart2', e.target.value)} /></FormField>
              </div>
              <FormField label="Subtext"><textarea rows={2} className={inputCls} value={s.heroSubtext} onChange={e => set('heroSubtext', e.target.value)} /></FormField>
              <div className="grid sm:grid-cols-2 gap-4">
                <FormField label="Primary Button Label"><input className={inputCls} value={s.heroPrimaryBtnLabel} onChange={e => set('heroPrimaryBtnLabel', e.target.value)} /></FormField>
                <FormField label="Secondary Button Label"><input className={inputCls} value={s.heroSecondaryBtnLabel} onChange={e => set('heroSecondaryBtnLabel', e.target.value)} /></FormField>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* NAVBAR & WELCOME BAR */}
      {tab === 'navbar' && (
        <Card>
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-black text-[#1a1a1a]">Navbar & Welcome Bar</h3>
            <SaveBtn tab="navbar" />
          </div>
          <div className="space-y-4">
            <FormField label="Navbar Tagline (under the logo)"><input className={inputCls} value={s.navTagline} onChange={e => set('navTagline', e.target.value)} /></FormField>
            <FormField label="Welcome Bar Message (top strip)"><input className={inputCls} value={s.welcomeMessage} onChange={e => set('welcomeMessage', e.target.value)} /></FormField>
            <p className="text-[11px] text-gray-400">Social icons in the Welcome Bar reuse the Facebook / WhatsApp / Instagram / LinkedIn links from the Footer page — no need to set them twice.</p>
            <FormField label="Join MEDWEB Community — button link (replaces the Navbar search box)">
              <input className={inputCls} value={s.communityLink} onChange={e => set('communityLink', e.target.value)} placeholder="https://chat.whatsapp.com/... or https://whatsapp.com/channel/..." />
              <p className="text-[11px] text-gray-400 mt-1">Paste your WhatsApp channel or group invite link. Leave blank to hide the button.</p>
            </FormField>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-600">Nav Links</span>
                <button onClick={addNavLink} className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-dashed border-[#1655c3]/40 text-[#1655c3] hover:bg-blue-50">
                  <Plus size={13} /> Add Link
                </button>
              </div>
              <div className="space-y-2">
                {s.navLinks.map((l, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input className={`${inputCls} flex-1`} value={l.label} onChange={e => setNavLink(i, { label: e.target.value })} placeholder="Label" />
                    <input className={`${inputCls} flex-[2]`} value={l.href} onChange={e => setNavLink(i, { href: e.target.value })} placeholder="#section or URL" />
                    <button onClick={() => delNavLink(i)} className="p-2 rounded-lg hover:bg-red-50 text-red-400 flex-shrink-0"><X size={16} /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* TRUSTED PARTNERS */}
      {tab === 'partners' && (
        <Card>
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-black text-[#1a1a1a]">Trusted Partners Strip</h3>
            <SaveBtn tab="partners" />
          </div>
          <div className="space-y-4">
            <FormField label="Heading"><input className={inputCls} value={s.partnersHeading} onChange={e => set('partnersHeading', e.target.value)} /></FormField>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-600">Partner Logos (upload a logo per entry — entries without one show as a text chip instead)</span>
                <button onClick={addPartner} className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-dashed border-[#1655c3]/40 text-[#1655c3] hover:bg-blue-50">
                  <Plus size={13} /> Add
                </button>
              </div>
              <div className="space-y-3">
                {s.partners.map((p, i) => (
                  <div key={i} className="rounded-xl border border-gray-200 p-3 bg-gray-50/60 space-y-2">
                    <div className="flex gap-2 items-center">
                      <input className={`${inputCls} flex-1`} value={p.name} onChange={e => setPartner(i, { name: e.target.value })} placeholder="Partner name (alt text / fallback chip)" />
                      <button onClick={() => delPartner(i)} className="p-2 rounded-lg hover:bg-red-50 text-red-400 flex-shrink-0"><X size={16} /></button>
                    </div>
                    <ImageUpload label="Logo" folder="medweb/partners" value={p.logoImage} onChange={v => setPartner(i, { logoImage: v })} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* FOUNDER MESSAGE */}
      {tab === 'founder' && (
        <Card>
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-black text-[#1a1a1a]">Founder Message</h3>
            <SaveBtn tab="founder" />
          </div>
          <div className="grid lg:grid-cols-[200px_1fr] gap-6">
            <ImageUpload label="Founder Image" folder="medweb/founder" value={s.founderImage} onChange={v => set('founderImage', v)} />
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <FormField label="Heading — Line 1"><input className={inputCls} value={s.founderHeading1} onChange={e => set('founderHeading1', e.target.value)} /></FormField>
                <FormField label="Heading — Line 2 (green)"><input className={inputCls} value={s.founderHeading2} onChange={e => set('founderHeading2', e.target.value)} /></FormField>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <FormField label="Founder Name"><input className={inputCls} value={s.founderName} onChange={e => set('founderName', e.target.value)} /></FormField>
                <FormField label="Designation"><input className={inputCls} value={s.founderDesignation} onChange={e => set('founderDesignation', e.target.value)} /></FormField>
              </div>
              <FormField label="Pull Quote"><textarea rows={2} className={inputCls} value={s.founderQuote} onChange={e => set('founderQuote', e.target.value)} /></FormField>
              <FormField label="Short Message (shown on homepage)"><textarea rows={3} className={inputCls} value={s.founderShortMessage} onChange={e => set('founderShortMessage', e.target.value)} /></FormField>
              <FormField label="Full Message (shown on 'Read Full Message' page — separate paragraphs with blank lines)">
                <textarea rows={8} className={inputCls} value={s.founderFullMessage} onChange={e => set('founderFullMessage', e.target.value)} />
              </FormField>
            </div>
          </div>
        </Card>
      )}

      {/* ABOUT US PAGE (repurposed "Who We Are" fields — see note in code) */}
      {tab === 'wwa' && (
        <Card>
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-black text-[#1a1a1a]">About Us Page</h3>
            <SaveBtn tab="wwa" />
          </div>
          <p className="text-[11px] text-gray-400 -mt-3 mb-4">Content for the standalone /about page, linked from the Footer's "About Us" link.</p>
          <div className="grid lg:grid-cols-[200px_1fr] gap-6">
            <ImageUpload label="Page Image" folder="medweb/whoweare" value={s.wwaImage} onChange={v => set('wwaImage', v)} />
            <div className="space-y-4">
              <FormField label="Page Heading"><input className={inputCls} value={s.wwaTitle} onChange={e => set('wwaTitle', e.target.value)} /></FormField>
              <FormField label="Page Content (separate paragraphs with blank lines)"><textarea rows={6} className={inputCls} value={s.wwaFull} onChange={e => set('wwaFull', e.target.value)} /></FormField>
            </div>
          </div>
        </Card>
      )}

      {/* WHY MEDWEB (includes the homepage stat counters — those numbers are
          actually rendered inside the Why MEDWEB section, not Hero) */}
      {tab === 'why' && (
        <Card>
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-black text-[#1a1a1a]">Why MEDWEB Section</h3>
            <SaveBtn tab="why" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <FormField label="Heading — Line 1 (black)"><input className={inputCls} value={s.whyHeading1} onChange={e => set('whyHeading1', e.target.value)} /></FormField>
            <FormField label="Heading — Line 2 (green)"><input className={inputCls} value={s.whyHeading2} onChange={e => set('whyHeading2', e.target.value)} /></FormField>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 mb-5">
            <FormField label="Eyebrow Label"><input className={inputCls} value={s.whyTitle} onChange={e => set('whyTitle', e.target.value)} /></FormField>
            <FormField label="Subtitle"><input className={inputCls} value={s.whySubtitle} onChange={e => set('whySubtitle', e.target.value)} /></FormField>
          </div>
          <div className="space-y-3 mb-6">
            {s.whyCards.map((c, i) => {
              const CardIcon = ICON_MAP[c.icon] || Star
              return (
                <div key={i} className="rounded-xl border border-gray-200 p-3 bg-gray-50/60">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex flex-col">
                      <button onClick={() => moveCard(i, -1)} className="text-gray-300 hover:text-[#1655c3] leading-none text-xs">▲</button>
                      <button onClick={() => moveCard(i, 1)} className="text-gray-300 hover:text-[#1655c3] leading-none text-xs">▼</button>
                    </div>
                    <select className={`${inputCls} py-1.5 w-36`} value={c.icon} onChange={e => setCard(i, { icon: e.target.value })}>
                      {ICON_OPTIONS.map(ic => <option key={ic}>{ic}</option>)}
                    </select>
                    <input className={`${inputCls} py-1.5 flex-1`} value={c.title} onChange={e => setCard(i, { title: e.target.value })} placeholder="Card title" />
                    <label className="flex items-center gap-1 text-[11px] font-semibold text-gray-500 whitespace-nowrap">
                      <input type="checkbox" checked={c.enabled !== false} onChange={e => setCard(i, { enabled: e.target.checked })} className="accent-[#1655c3]" /> On
                    </label>
                    <button onClick={() => delCard(i)} className="p-1 rounded hover:bg-red-50 text-red-400"><X size={14} /></button>
                  </div>
                  <textarea rows={2} className={`${inputCls} py-1.5 text-xs mb-3`} value={c.desc} onChange={e => setCard(i, { desc: e.target.value })} placeholder="Card description" />

                  <div className="flex items-center gap-3">
                    {/* Live preview — shows the uploaded thumbnail if set, otherwise the
                        card's currently selected icon, matching exactly what the public
                        homepage card falls back to. */}
                    <div className="w-14 h-14 rounded-lg overflow-hidden flex items-center justify-center shrink-0 border border-gray-200 bg-white">
                      {c.image
                        ? <img src={c.image} alt="" className="w-full h-full object-cover" />
                        : <CardIcon size={22} className="text-gray-300" />}
                    </div>
                    <div className="flex-1">
                      <ImageUpload label="Card Thumbnail (optional — falls back to the icon above if empty)" folder="medweb/whymedweb" value={c.image} onChange={v => setCard(i, { image: v })} />
                    </div>
                  </div>
                </div>
              )
            })}
            <button onClick={addCard} className="flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-lg border border-dashed border-[#1655c3]/40 text-[#1655c3] hover:bg-blue-50">
              <Plus size={13} /> Add Card
            </button>
            <p className="text-[11px] text-gray-400">Note: the label split (e.g. "Live Webinars &" / "Masterclasses") shown on the homepage is derived automatically from the title above (splits off the last word) — not separately editable yet.</p>
          </div>

          <div className="pt-5 border-t border-gray-100">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Stats (shown in this section)</h4>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <FormField label="Students Trained"><input className={inputCls} value={s.studentsCount} onChange={e => set('studentsCount', e.target.value)} /></FormField>
              <FormField label="Webinars Hosted"><input className={inputCls} value={s.webinarsCount} onChange={e => set('webinarsCount', e.target.value)} /></FormField>
              <FormField label="Expert Instructors"><input className={inputCls} value={s.instructorsCount} onChange={e => set('instructorsCount', e.target.value)} /></FormField>
              <FormField label="Cities Reached"><input className={inputCls} value={s.citiesCount} onChange={e => set('citiesCount', e.target.value)} /></FormField>
              <FormField label="Certificates Issued"><input className={inputCls} value={s.certificatesCount} onChange={e => set('certificatesCount', e.target.value)} /></FormField>
              <FormField label="Courses Available"><input className={inputCls} value={s.coursesCount} onChange={e => set('coursesCount', e.target.value)} /></FormField>
            </div>
          </div>
        </Card>
      )}

      {/* CERTIFICATE VERIFICATION */}
      {tab === 'certificate' && (
        <Card>
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-black text-[#1a1a1a]">Certificate Verification Section</h3>
            <SaveBtn tab="certificate" />
          </div>
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <FormField label="Heading — Line 1"><input className={inputCls} value={s.certHeading1} onChange={e => set('certHeading1', e.target.value)} /></FormField>
              <FormField label="Heading — Line 2 (green)"><input className={inputCls} value={s.certHeading2} onChange={e => set('certHeading2', e.target.value)} /></FormField>
            </div>
            <FormField label="Subtitle"><textarea rows={2} className={inputCls} value={s.certSubtitle} onChange={e => set('certSubtitle', e.target.value)} /></FormField>
            <div>
              <span className="text-xs font-semibold text-gray-600 block mb-2">Trust Indicators (4 small labels)</span>
              <div className="grid sm:grid-cols-2 gap-2">
                {s.certTrustPoints.map((p, i) => (
                  <input key={i} className={inputCls} value={p} onChange={e => setListItem('certTrustPoints', i, e.target.value)} />
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* SECTION HEADINGS — shared shape across the remaining list sections */}
      {tab === 'headings' && (
        <Card>
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-black text-[#1a1a1a]">Section Headings</h3>
            <SaveBtn tab="headings" />
          </div>
          <p className="text-[11px] text-gray-400 -mt-3 mb-4">Heading/subtitle text for the sections whose list content (webinars, courses, etc.) is already managed on their own pages.</p>
          <div className="space-y-4">
            {HEADING_SECTIONS.map(({ key, label, hasSubtitle }) => (
              <div key={key} className="rounded-xl border border-gray-200 p-3 bg-gray-50/60">
                <div className="text-xs font-bold text-gray-500 mb-2">{label}</div>
                <div className="grid sm:grid-cols-2 gap-2 mb-2">
                  <input className={`${inputCls} py-1.5`} value={s[`${key}Heading1`]} onChange={e => set(`${key}Heading1`, e.target.value)} placeholder="Heading line 1" />
                  <input className={`${inputCls} py-1.5`} value={s[`${key}Heading2`]} onChange={e => set(`${key}Heading2`, e.target.value)} placeholder="Heading line 2 (green)" />
                </div>
                {hasSubtitle && (
                  <input className={`${inputCls} py-1.5`} value={s[`${key}Subtitle`]} onChange={e => set(`${key}Subtitle`, e.target.value)} placeholder="Subtitle" />
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* LEGAL PAGES */}
      {tab === 'legal' && (
        <Card>
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-black text-[#1a1a1a]">Legal Pages</h3>
            <SaveBtn tab="legal" />
          </div>
          <p className="text-[11px] text-gray-400 -mt-3 mb-4">These pages are empty until you add your own policy text here — write or paste your actual policy content (consult your legal advisor for wording). Separate paragraphs with blank lines.</p>
          <div className="space-y-4">
            <FormField label="Privacy Policy"><textarea rows={6} className={inputCls} value={s.privacyPolicyContent} onChange={e => set('privacyPolicyContent', e.target.value)} placeholder="Add your policy content in the admin panel." /></FormField>
            <FormField label="Terms of Service"><textarea rows={6} className={inputCls} value={s.termsContent} onChange={e => set('termsContent', e.target.value)} placeholder="Add your policy content in the admin panel." /></FormField>
            <FormField label="Refund Policy"><textarea rows={6} className={inputCls} value={s.refundContent} onChange={e => set('refundContent', e.target.value)} placeholder="Add your policy content in the admin panel." /></FormField>
          </div>
        </Card>
      )}
    </div>
  )
}
