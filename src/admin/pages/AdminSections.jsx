import { useState, useEffect } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import AdminButton from '../components/AdminButton'
import { sectionVisibilityService } from '../../firebase/services'

const SECTIONS = [
  { key: 'welcomeBar',               label: 'Welcome Bar',              hint: 'Thin announcement strip at the very top' },
  { key: 'hero',                     label: 'Hero',                     hint: 'Main banner with headline & buttons' },
  { key: 'trustedPartners',          label: 'Trusted Partners',         hint: 'University / partner logo strip' },
  { key: 'stats',                    label: 'Stats',                    hint: 'Students / webinars / certificates numbers' },
  { key: 'founderMessage',           label: "Founder's Message",        hint: 'Founder photo, quote & bio panel' },
  { key: 'webinars',                 label: 'Upcoming Webinars',        hint: 'Webinar carousel' },
  { key: 'courses',                  label: 'Featured Courses',         hint: 'Course carousel' },
  { key: 'whyMedweb',                label: 'Why MEDWEB?',              hint: 'Dark feature-card section' },
  { key: 'testimonials',             label: 'Testimonials',             hint: '"What Our Students Say"' },
  { key: 'team',                     label: 'Our Team',                 hint: 'Team member carousel' },
  { key: 'advisoryBoard',            label: 'Advisory Board',           hint: 'Advisory board carousel' },
  { key: 'ambassadors',              label: 'Ambassadors',              hint: 'Ambassador grid & apply CTA' },
  { key: 'certificateVerification',  label: 'Certificate Verification', hint: 'Blue verify-code card' },
  { key: 'latestBlog',               label: 'Latest Articles',          hint: 'Blog post carousel' },
  { key: 'footer',                   label: 'Footer',                   hint: 'Bottom navy footer (Navbar always stays visible)' },
]

export default function AdminSections() {
  const [v, setV] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    sectionVisibilityService.get().then(d => {
      const init = {}
      SECTIONS.forEach(s => { init[s.key] = d?.[s.key] !== false })
      setV(init)
    }).catch(() => {
      const init = {}
      SECTIONS.forEach(s => { init[s.key] = true })
      setV(init)
    })
  }, [])

  if (!v) return <div className="p-6 text-gray-400">Loading…</div>

  const toggle = key => setV(p => ({ ...p, [key]: !p[key] }))

  const save = async () => {
    setSaving(true)
    try { await sectionVisibilityService.update(v); setSaved(true); setTimeout(() => setSaved(false), 2000) }
    catch (e) { alert(e.message) } finally { setSaving(false) }
  }

  const visibleCount = SECTIONS.filter(s => v[s.key]).length

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h3 className="font-black text-[#1a1a1a]">Homepage Sections</h3>
            <p className="text-xs text-gray-500 mt-1">Turn any section off to hide it from the live site instantly — its content stays saved, nothing is deleted.</p>
          </div>
          <AdminButton variant="primary" size="sm" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save Changes'}
          </AdminButton>
        </div>
        <p className="text-xs text-gray-400 mt-3 mb-5">{visibleCount} of {SECTIONS.length} sections visible</p>

        <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
          {SECTIONS.map(s => {
            const on = v[s.key]
            return (
              <div key={s.key} className="flex items-center justify-between px-4 py-3.5 bg-white hover:bg-gray-50/60 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${on ? 'bg-blue-50 text-[#1655c3]' : 'bg-gray-100 text-gray-400'}`}>
                    {on ? <Eye size={15} /> : <EyeOff size={15} />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#1a1a1a] truncate">{s.label}</div>
                    <div className="text-[11px] text-gray-400 truncate">{s.hint}</div>
                  </div>
                </div>
                <button
                  onClick={() => toggle(s.key)}
                  className="relative w-11 h-6 rounded-full flex-shrink-0 transition-colors duration-200"
                  style={{ background: on ? '#1655c3' : '#d1d5db' }}
                  aria-label={`Toggle ${s.label}`}
                >
                  <span
                    className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200"
                    style={{ left: on ? '22px' : '2px' }}
                  />
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
