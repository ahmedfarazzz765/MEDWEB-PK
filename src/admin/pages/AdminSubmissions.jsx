import { useState, useEffect, useMemo } from 'react'
import { Inbox, Download, Video, Mail, Eye, ArrowLeft } from 'lucide-react'
import StatCard from '../components/StatCard'
import DataTable from '../components/DataTable'
import FolderGrid from '../components/FolderGrid'
import ResponsesModal from '../components/ResponsesModal'
import AdminButton from '../components/AdminButton'
import {
  submissionsService, webinarsService, formsService, settingsService,
  toIsoString, DEFAULT_WEBINAR_FORM_FIELDS,
} from '../../firebase/services'
import { resolveFormField } from '../../lib/formFieldResolve'

const formatDateStr = (dateVal) => {
  const str = toIsoString(dateVal)
  return str ? str.split('T')[0] : '-'
}

function downloadCsv(filename, header, rows) {
  const csv = [header, ...rows]
    .map(line => line.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
}

export default function AdminSubmissions() {
  const [rows, setRows] = useState([])
  const [webinars, setWebinars] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('webinars') // 'webinars' | 'newsletter'
  const [activeFolderKey, setActiveFolderKey] = useState(null) // webinarId, or null = folder grid
  // Each webinar's registration form can differ (and may use random
  // Form-Builder field keys, not literal "name"/"email"/"phone") — fields
  // are resolved once per folder, lazily, the same way WebinarRegister.jsx
  // itself resolves them at submission time, and cached so reopening a
  // folder doesn't re-fetch.
  const [fieldsCache, setFieldsCache] = useState({}) // webinarId -> fields[]
  const [viewStudent, setViewStudent] = useState(null) // the student row currently open in the detail modal

  useEffect(() => {
    const unsub = submissionsService.listen(data => { setRows(data); setLoading(false) })
    return unsub
  }, [])

  useEffect(() => {
    const unsub = webinarsService.listen(setWebinars)
    return unsub
  }, [])

  const webinarRows = useMemo(() => rows.filter(r => r.type === 'Webinar'), [rows])
  const newsletterRows = useMemo(() => rows.filter(r => r.type === 'Newsletter'), [rows])

  // One folder per distinct webinarId — same grouping idea as Admin >
  // Certificates' folders, just keyed by webinar instead of by
  // webinarId/sourceId/manual. A registration with no webinarId at all
  // (shouldn't normally happen — addRegistration always sets one) falls
  // into a single "Unassigned" bucket rather than being dropped.
  const folders = useMemo(() => {
    const map = new Map()
    for (const r of webinarRows) {
      const webinarId = r.raw?.webinarId || 'unassigned'
      if (!map.has(webinarId)) {
        const w = webinars.find(w => w.id === webinarId)
        map.set(webinarId, {
          key: webinarId,
          label: r.raw?.webinarTopic || w?.topic || w?.title || 'Unassigned Registrations',
          date: w?.date || '',
          rows: [],
          latest: '',
        })
      }
      const f = map.get(webinarId)
      f.rows.push(r)
      if (r.date && r.date > f.latest) f.latest = r.date
    }
    return Array.from(map.values()).sort((a, b) => b.latest.localeCompare(a.latest))
  }, [webinarRows, webinars])

  const activeFolder = folders.find(f => f.key === activeFolderKey) || null

  // Lazily resolves the registration form's own field schema for whichever
  // folder is open — same resolution order WebinarRegister.jsx uses: the
  // webinar's own linked form, else the sitewide default form, else the
  // built-in fallback fields.
  useEffect(() => {
    if (!activeFolderKey || fieldsCache[activeFolderKey]) return
    let cancelled = false
    const webinar = webinars.find(w => w.id === activeFolderKey)
    const resolve = async () => {
      const formId = webinar?.registrationFormId || (await settingsService.get().catch(() => null))?.webinarDefaultFormId
      let fields = DEFAULT_WEBINAR_FORM_FIELDS
      if (formId) {
        const f = await formsService.getOne(formId).catch(() => null)
        if (f?.fields?.length) fields = f.fields
      }
      if (!cancelled) setFieldsCache(prev => ({ ...prev, [activeFolderKey]: fields }))
    }
    resolve()
    return () => { cancelled = true }
  }, [activeFolderKey, webinars, fieldsCache])

  const activeFields = activeFolderKey ? (fieldsCache[activeFolderKey] || DEFAULT_WEBINAR_FORM_FIELDS) : []

  // Name/Phone/Email resolved the same way DynamicForm.jsx/WebinarRegister.jsx
  // already do (random Form-Builder keys aren't literal "name"/"email"/
  // "phone") — University is already a flat field on the registration doc
  // itself (WebinarRegister.jsx resolves and saves it at submission time),
  // same fields covered by the earlier Admin Students columns fix.
  const students = useMemo(() => {
    if (!activeFolder) return []
    return activeFolder.rows.map(r => {
      const raw = r.raw || {}
      const name = resolveFormField(activeFields, raw, { labelRegex: /name/i, flatKeys: ['name', 'fullName', 'full_name'] }) || r.name || '-'
      const phone = resolveFormField(activeFields, raw, { type: 'phone', labelRegex: /phone|whatsapp|contact/i, flatKeys: ['phone', 'whatsapp', 'contact'] }) || r.whatsapp || '-'
      const email = resolveFormField(activeFields, raw, { type: 'email', labelRegex: /email/i, flatKeys: ['email'] }) || r.email || '-'
      return { id: r.id, name, phone, email, university: raw.university || '-', registeredAt: raw.registeredAt || r.date, raw }
    })
  }, [activeFolder, activeFields])

  const studentColumns = [
    { key: 'name', label: 'Name', render: v => <span className="font-semibold text-[#1a1a1a]">{v}</span> },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email', render: v => <span className="text-gray-500 text-xs">{v}</span> },
    { key: 'university', label: 'University' },
    { key: 'registeredAt', label: 'Registered', render: v => <span className="text-gray-400 whitespace-nowrap">{formatDateStr(v)}</span> },
    { key: 'id', label: 'Actions', render: (v, row) => (
      <button onClick={() => setViewStudent(row)} className="p-1.5 rounded-lg hover:bg-blue-50 text-[#1655c3]" title="View full submission">
        <Eye size={13} />
      </button>
    )},
  ]

  // Reuses ResponsesModal exactly as AdminCertificates.jsx's "View
  // Submission" action already does — pass a single-item `subs` array.
  // Its field labels come from the SAME resolved form schema; values are
  // filtered down to just that form's own field keys (not the webinarId/
  // webinarTopic/registeredAt/etc. bookkeeping fields also on the doc).
  // ResponsesModal's own built-in "Export CSV" button covers downloading
  // this one student's full answers.
  const viewForm = activeFolder ? { title: activeFolder.label, fields: activeFields } : null
  const viewSub = viewStudent ? (() => {
    const raw = viewStudent.raw
    const values = {}
    for (const f of activeFields) {
      if (raw[f.key] !== undefined) values[f.key] = raw[f.key]
    }
    return { id: viewStudent.id, submittedAt: raw.registeredAt, values }
  })() : null

  // Columns are driven entirely by this webinar's own registration form
  // schema (activeFields) — not the fixed Name/Phone/Email/University
  // summary columns shown on screen — so a custom field added via Form
  // Builder for this specific webinar (e.g. "T-Shirt Size", "Dietary
  // Requirements") shows up as its own column with real data, not just
  // the 4 fixed ones. Still reuses the same downloadCsv() helper the
  // Newsletter export already uses, not a second exporter — only the
  // header/rows fed into it are built dynamically per-folder instead of
  // hardcoded. Same boolean-to-Yes/No formatting ResponsesModal already
  // uses for a checkbox field's raw `true`/`false` value.
  const exportFolderCsv = () => {
    if (!activeFolder) return
    const formatValue = v => (typeof v === 'boolean' ? (v ? 'Yes' : 'No') : (v ?? ''))
    downloadCsv(
      `${activeFolder.label.replace(/\s+/g, '_')}_registrations.csv`,
      [...activeFields.map(f => f.label), 'Registered'],
      students.map(s => [...activeFields.map(f => formatValue(s.raw[f.key])), formatDateStr(s.registeredAt)])
    )
  }
  const exportNewsletterCsv = () => {
    downloadCsv('newsletter_signups.csv', ['Email', 'Date'], newsletterRows.map(r => [r.email, formatDateStr(r.date)]))
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={Inbox} label="Total Submissions" value={loading ? '…' : rows.length} color="#1655c3" bg="#eff6ff" />
        <StatCard icon={Video} label="Webinar Registrations" value={loading ? '…' : webinarRows.length} color="#64ac37" bg="#f0fdf4" />
        <StatCard icon={Mail} label="Newsletter Signups" value={loading ? '…' : newsletterRows.length} color="#64ac37" bg="#f0fdf4" />
      </div>

      <div className="flex gap-2">
        {[['webinars', 'Webinars'], ['newsletter', 'Newsletter']].map(([key, label]) => (
          <button key={key} onClick={() => { setTab(key); setActiveFolderKey(null) }}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${tab === key ? 'text-white bg-[#1655c3]' : 'text-gray-500 bg-gray-100 hover:bg-gray-200'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'webinars' ? (
        activeFolder ? (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <button onClick={() => setActiveFolderKey(null)} className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-[#1655c3] transition-colors w-fit">
                <ArrowLeft size={16} /> All Webinars
              </button>
              <AdminButton variant="ghost" size="sm" onClick={exportFolderCsv} disabled={!students.length}>
                <Download size={14} className="mr-1.5" /> Export CSV
              </AdminButton>
            </div>
            <DataTable title={activeFolder.label} columns={studentColumns} data={students} searchKey="name"
              emptyMessage="No registrations in this folder" />
          </div>
        ) : (
          <FolderGrid
            title="Registrations by Webinar"
            items={folders.map(f => ({
              key: f.key, label: f.label,
              sublabel: f.date ? `Webinar date: ${f.date}` : (f.latest ? `Latest: ${formatDateStr(f.latest)}` : 'No date set'),
              count: f.rows.length,
            }))}
            onOpen={setActiveFolderKey}
            emptyMessage="No webinar registrations yet"
          />
        )
      ) : (
        <DataTable
          title="Newsletter Signups"
          columns={[
            { key: 'email', label: 'Email', render: v => <span className="text-gray-700">{v}</span> },
            { key: 'date', label: 'Date', render: v => <span className="text-gray-400 whitespace-nowrap">{formatDateStr(v)}</span> },
          ]}
          data={newsletterRows}
          searchKey="email"
          emptyMessage="No newsletter signups yet"
          actions={
            <AdminButton size="sm" onClick={exportNewsletterCsv} disabled={!newsletterRows.length}>
              <Download size={13} className="mr-1.5" /> Export CSV
            </AdminButton>
          }
        />
      )}

      {viewStudent && viewForm && viewSub && (
        <ResponsesModal form={viewForm} subs={[viewSub]} onClose={() => setViewStudent(null)} />
      )}
    </div>
  )
}
