import { useState, useEffect } from 'react'
import ImageUpload from './ImageUpload'
import FormField from './FormField'
import LetterBodyRichEditor from './LetterBodyRichEditor'
import LetterPositionEditor, { DEFAULT_BODY_POS, DEFAULT_DATE_POS } from './LetterPositionEditor'
import { settingsService } from '../../firebase/services'

const DEFAULT_BODY_TEXT =
`<p>Dear {name},</p>
<p>This is to certify that <strong>{name}</strong> is a recognized Ambassador of MEDWEB-PK, currently representing {university} as a {role}.</p>
<p>Ambassador Code: <strong>{code}</strong></p>
<p>We appreciate their continued dedication to advancing medical education and student engagement, and look forward to their continued contribution to the MEDWEB community.</p>
<p>Issued on {date}.</p>`

// Settings saved before this rich-text/resizable upgrade stored bodyText as
// plain text and bodyPos with no heightPct, with xPct meaning the box's
// *horizontal center* (the old preview centered it via a CSS transform).
// react-rnd positions by top-left corner instead, so an old xPct has to be
// converted to a left edge, and a sane default height/HTML wrapper added —
// otherwise an admin who already configured this would see their box jump
// to the wrong spot and their plain text silently vanish (dangerouslySetInnerHTML
// would render literal text fine, but the rich toolbar couldn't edit it as
// paragraphs). Runs once, transparently, on load.
function migrateLegacyConfig(cfg) {
  let { bodyText, bodyPos } = cfg
  let wasLegacy = false
  if (bodyPos && bodyPos.heightPct == null) {
    wasLegacy = true
    bodyPos = {
      ...bodyPos,
      xPct: Math.max(0, bodyPos.xPct - (bodyPos.widthPct || 0) / 2),
      heightPct: 40,
    }
  }
  if (typeof bodyText === 'string' && bodyText.trim() && !/^\s*</.test(bodyText)) {
    wasLegacy = true
    bodyText = bodyText.split(/\n{2,}/).map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('\n')
  }
  return { cfg: { ...cfg, bodyText, bodyPos }, wasLegacy }
}

// Kept in sync with the same key set fillTokens() substitutes in
// ambassadorLetterGenerator.js — every ambassador field available to the
// admin while writing the letter body.
export const LETTER_PLACEHOLDERS = [
  { token: '{name}', label: 'Full name' },
  { token: '{code}', label: 'Ambassador Code' },
  { token: '{university}', label: 'University' },
  { token: '{role}', label: 'Rank / role' },
  { token: '{degreeProgram}', label: 'Degree Program' },
  { token: '{semester}', label: 'Semester' },
  { token: '{city}', label: 'City' },
  { token: '{status}', label: 'Status' },
  { token: '{points}', label: 'Points' },
  { token: '{date}', label: "Today's date" },
]

const emptyCfg = () => ({
  templateUrl: '',
  bodyText: DEFAULT_BODY_TEXT,
  bodyPos: DEFAULT_BODY_POS,
  datePos: DEFAULT_DATE_POS,
})

// Global (not per-ambassador) settings for the downloadable Ambassador
// Letter — one shared letterhead template + boilerplate text + text
// positions, reused by src/lib/ambassadorLetterGenerator.js for every
// ambassador's download.
export default function AmbassadorLetterSettings() {
  const [cfg, setCfg] = useState(emptyCfg())
  const [saved, setSaved] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    settingsService.get().then(s => {
      if (s?.ambassadorLetter) {
        const { cfg: migrated, wasLegacy } = migrateLegacyConfig({ ...emptyCfg(), ...s.ambassadorLetter })
        setCfg(migrated)
        // Persist immediately (not on next edit) so a real ambassador
        // downloading a letter right now doesn't hit the pre-migration
        // config just because no admin has touched this page yet.
        if (wasLegacy) settingsService.update({ ambassadorLetter: migrated }).catch(() => {})
      }
      setLoaded(true)
    }).catch(() => setLoaded(true))
  }, [])

  const save = async next => {
    setCfg(next)
    try {
      await settingsService.update({ ambassadorLetter: next })
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    } catch (e) { alert(e.message) }
  }

  if (!loaded) return null

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-black text-[#1a1a1a] text-sm">Ambassador Letter Settings</h3>
        {saved && <span className="text-xs font-bold text-green-600">Saved ✓</span>}
      </div>
      <p className="text-xs text-gray-500 mb-3">
        One shared letterhead + full letter body, used to generate every ambassador's downloadable letter. Write the whole letter yourself below — every ambassador's real data is substituted in for the placeholders when their letter is generated.
      </p>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {LETTER_PLACEHOLDERS.map(p => (
          <span key={p.token} className="text-[11px] bg-gray-50 border border-gray-200 rounded-lg px-2 py-1" title={p.label}>
            <code className="font-bold text-[#1655c3]">{p.token}</code> <span className="text-gray-400">{p.label}</span>
          </span>
        ))}
      </div>

      <ImageUpload label="Letterhead Template" folder="medweb/ambassadors/letterhead" value={cfg.templateUrl} onChange={v => save({ ...cfg, templateUrl: v })} />

      <div className="mt-4">
        <FormField label="Letter Body (write the full letter — use the placeholders above wherever you want an ambassador's data inserted)">
          <LetterBodyRichEditor
            value={cfg.bodyText}
            onChange={html => setCfg(p => ({ ...p, bodyText: html }))}
            onBlur={() => save(cfg)}
          />
        </FormField>
      </div>

      {cfg.templateUrl && (
        <div className="mt-4">
          <p className="text-xs font-bold text-gray-500 mb-2">Live Preview — drag or resize the blue box to position/size the letter body, and drag the green box for the date; formatting is shown exactly as typed (placeholders are not substituted here)</p>
          <LetterPositionEditor
            bodyHtml={cfg.bodyText}
            imageUrl={cfg.templateUrl}
            bodyPos={cfg.bodyPos}
            datePos={cfg.datePos}
            onChange={({ bodyPos, datePos }) => save({ ...cfg, bodyPos, datePos })}
          />
        </div>
      )}
    </div>
  )
}
