import { useState, useEffect } from 'react'
import ImageUpload from './ImageUpload'
import FormField, { inputCls } from './FormField'
import LetterPositionEditor, { DEFAULT_BODY_POS, DEFAULT_DATE_POS } from './LetterPositionEditor'
import { settingsService } from '../../firebase/services'

const DEFAULT_BODY_TEXT =
`Dear {name},

This is to certify that {name} is a recognized Ambassador of MEDWEB-PK, currently representing {university} as a {role}.

Ambassador Code: {code}

We appreciate their continued dedication to advancing medical education and student engagement, and look forward to their continued contribution to the MEDWEB community.

Issued on {date}.`

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
      if (s?.ambassadorLetter) setCfg({ ...emptyCfg(), ...s.ambassadorLetter })
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
          <textarea
            className={`${inputCls} font-mono`}
            rows={12}
            value={cfg.bodyText}
            onChange={e => setCfg(p => ({ ...p, bodyText: e.target.value }))}
            onBlur={() => save(cfg)}
          />
        </FormField>
      </div>

      {cfg.templateUrl && (
        <div className="mt-4">
          <p className="text-xs font-bold text-gray-500 mb-2">Live Preview — drag the boxes to position them; text below is shown exactly as typed (placeholders are not substituted here)</p>
          <LetterPositionEditor
            bodyText={cfg.bodyText}
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
