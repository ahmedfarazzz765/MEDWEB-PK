import { useState, useEffect } from 'react'
import { Plus, X } from 'lucide-react'
import FormField, { inputCls } from '../components/FormField'
import AdminButton from '../components/AdminButton'
import { settingsService } from '../../firebase/services'

const DEFAULT_LINKS = [
  { label: 'Home', url: '#home' },
  { label: 'About Us', url: '/about' },
  { label: 'Courses', url: '#courses' },
  { label: 'Webinars', url: '#webinars' },
  { label: 'Blog', url: '#blog' },
  { label: 'Announcements', url: '/announcements' },
  { label: 'Contact', url: '#contact' },
]
const DEFAULT_PROGRAMS = ['Clinical Pharmacy Masterclass', 'Drug Therapy Series', '100 Vital Drugs', 'How to Treat Series', 'Ambassador Program', 'Certificate Verification']

export default function AdminFooter() {
  const [s, setS] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState('')

  useEffect(() => {
    settingsService.get().then(d => {
      setS({
        footerAbout: d?.footerAbout || "Pakistan's premier medical education platform for pharmacy, biotech, psychology, and allied health sciences students.",
        footerEmail: d?.footerEmail || 'info@medweb.pk',
        footerPhone: d?.footerPhone || '03291692899',
        footerFacebook: d?.footerFacebook || 'https://facebook.com',
        footerTwitter: d?.footerTwitter || '',
        footerInstagram: d?.footerInstagram || 'https://instagram.com',
        footerLinkedin: d?.footerLinkedin || 'https://linkedin.com',
        footerWhatsapp: d?.footerWhatsapp || 'https://wa.me/923291692899',
        footerAddress: d?.footerAddress || 'Islamabad, Pakistan',
        quickLinks: Array.isArray(d?.quickLinks) && d.quickLinks.length ? d.quickLinks : DEFAULT_LINKS,
        footerPrograms: Array.isArray(d?.footerPrograms) && d.footerPrograms.length ? d.footerPrograms : DEFAULT_PROGRAMS,
      })
    }).catch(() => {})
  }, [])

  if (!s) return <div className="p-6 text-gray-400">Loading…</div>
  const set = (k, v) => setS(p => ({ ...p, [k]: v }))

  const save = async (tab) => {
    setSaving(true)
    try { await settingsService.update(s); setSaved(tab); setTimeout(() => setSaved(''), 2000) }
    catch (e) { alert(e.message) } finally { setSaving(false) }
  }

  const setLink = (i, patch) => setS(p => ({ ...p, quickLinks: p.quickLinks.map((l, idx) => idx === i ? { ...l, ...patch } : l) }))
  const addLink = () => setS(p => ({ ...p, quickLinks: [...p.quickLinks, { label: 'New Link', url: '#' }] }))
  const delLink = i => setS(p => ({ ...p, quickLinks: p.quickLinks.filter((_, idx) => idx !== i) }))

  const setProgram = (i, v) => setS(p => ({ ...p, footerPrograms: p.footerPrograms.map((x, idx) => idx === i ? v : x) }))
  const addProgram = () => setS(p => ({ ...p, footerPrograms: [...p.footerPrograms, 'New Program'] }))
  const delProgram = i => setS(p => ({ ...p, footerPrograms: p.footerPrograms.filter((_, idx) => idx !== i) }))

  const SaveBtn = ({ tab }) => (
    <AdminButton variant="primary" size="sm" onClick={() => save(tab)} disabled={saving}>
      {saving ? 'Saving…' : saved === tab ? 'Saved ✓' : 'Save Changes'}
    </AdminButton>
  )

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-black text-[#1a1a1a]">Footer Content</h3>
          <SaveBtn tab="footer" />
        </div>
        <div className="space-y-4">
          <FormField label="About Text"><textarea rows={3} className={inputCls} value={s.footerAbout} onChange={e => set('footerAbout', e.target.value)} /></FormField>
          <div className="grid sm:grid-cols-2 gap-4">
            <FormField label="Email"><input className={inputCls} value={s.footerEmail} onChange={e => set('footerEmail', e.target.value)} /></FormField>
            <FormField label="Phone"><input className={inputCls} value={s.footerPhone} onChange={e => set('footerPhone', e.target.value)} /></FormField>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <FormField label="Facebook URL"><input className={inputCls} value={s.footerFacebook} onChange={e => set('footerFacebook', e.target.value)} /></FormField>
            <FormField label="Instagram URL"><input className={inputCls} value={s.footerInstagram} onChange={e => set('footerInstagram', e.target.value)} /></FormField>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <FormField label="LinkedIn URL"><input className={inputCls} value={s.footerLinkedin} onChange={e => set('footerLinkedin', e.target.value)} /></FormField>
            <FormField label="WhatsApp URL"><input className={inputCls} value={s.footerWhatsapp} onChange={e => set('footerWhatsapp', e.target.value)} /></FormField>
          </div>
          <FormField label="Address"><input className={inputCls} value={s.footerAddress} onChange={e => set('footerAddress', e.target.value)} /></FormField>
        </div>
      </section>

      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-black text-[#1a1a1a]">Quick Links</h3>
          <SaveBtn tab="links" />
        </div>
        <div className="space-y-3">
          {s.quickLinks.map((l, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input className={`${inputCls} flex-1`} value={l.label} onChange={e => setLink(i, { label: e.target.value })} placeholder="Label" />
              <input className={`${inputCls} flex-[2]`} value={l.url} onChange={e => setLink(i, { url: e.target.value })} placeholder="URL or #section" />
              <button onClick={() => delLink(i)} className="p-2 rounded-lg hover:bg-red-50 text-red-400 flex-shrink-0"><X size={16} /></button>
            </div>
          ))}
          <button onClick={addLink} className="flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-lg border border-dashed border-[#1655c3]/40 text-[#1655c3] hover:bg-blue-50">
            <Plus size={13} /> Add Link
          </button>
        </div>
      </section>

      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-black text-[#1a1a1a]">Programs & Courses (Footer List)</h3>
          <SaveBtn tab="programs" />
        </div>
        <div className="space-y-3">
          {s.footerPrograms.map((p, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input className={`${inputCls} flex-1`} value={p} onChange={e => setProgram(i, e.target.value)} placeholder="Program name" />
              <button onClick={() => delProgram(i)} className="p-2 rounded-lg hover:bg-red-50 text-red-400 flex-shrink-0"><X size={16} /></button>
            </div>
          ))}
          <button onClick={addProgram} className="flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-lg border border-dashed border-[#1655c3]/40 text-[#1655c3] hover:bg-blue-50">
            <Plus size={13} /> Add Program
          </button>
        </div>
      </section>
    </div>
  )
}
