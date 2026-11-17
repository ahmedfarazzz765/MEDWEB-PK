import { useState, useEffect, useMemo } from 'react'
import * as XLSX from 'xlsx'
import { Inbox, Download, Video, Mail, Eye, ArrowLeft, AlertTriangle, Edit2, Combine, Trash2 } from 'lucide-react'
import StatCard from '../components/StatCard'
import DataTable from '../components/DataTable'
import FolderGrid from '../components/FolderGrid'
import ResponsesModal from '../components/ResponsesModal'
import AdminButton from '../components/AdminButton'
import Modal from '../components/Modal'
import FormField, { inputCls } from '../components/FormField'
import useAdminPermissions from '../hooks/useAdminPermissions'
import {
  submissionsService, webinarsService, formsService, settingsService, activityLogService,
  toIsoString, DEFAULT_WEBINAR_FORM_FIELDS,
} from '../../firebase/services'
import { resolveFormField } from '../../lib/formFieldResolve'

const PAGE_SIZE = 500

// A record is "flagged" for admin attention when the name couldn't be
// resolved at all, or the email doesn't even look like an email —
// Prompt 5: "flag records with empty name or mismatched email". Doesn't
// try to verify the email is deliverable, just that it has the shape of
// one — a typo'd/garbage value from a free-text form field is the actual
// problem this is meant to catch.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const isFlagged = s => !s.name || s.name === '-' || !s.email || s.email === '-' || !EMAIL_RE.test(s.email)

// Same match order as resolveFormField (lib/formFieldResolve.js) but
// returns the KEY a value should be written to, instead of the value
// itself — so an edit/merge writes wherever the resolver will actually
// read it back from (a custom Form-Builder field's own key takes
// priority over the flat fallback keys, same as display already does).
function resolvedKeyFor(fields, raw, { type, labelRegex, flatKeys }) {
  const list = fields || []
  const field = (type && list.find(f => f.type === type)) || (labelRegex && list.find(f => labelRegex.test(f.label || '')))
  if (field) return field.key
  for (const k of flatKeys) if (raw?.[k] !== undefined) return k
  return flatKeys[0]
}

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
  const [editStudent, setEditStudent] = useState(null) // the student row currently open in the edit modal
  const [editForm, setEditForm] = useState({ name: '', phone: '', email: '', university: '' })
  const [savingEdit, setSavingEdit] = useState(false)
  const [selected, setSelected] = useState(new Set()) // student ids selected for merge, within the open folder
  const [merging, setMerging] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [counts, setCounts] = useState({ webinarRegs: null, newsletter: null })
  const { canWrite, canDelete } = useAdminPermissions()

  useEffect(() => {
    const unsub = submissionsService.listen(data => { setRows(data); setLoading(false) }, pageSize)
    return unsub
  }, [pageSize])

  // Independent of pagination — these StatCards must stay accurate even
  // when not every submission is loaded yet (see "Load more" below).
  useEffect(() => { submissionsService.getCounts().then(setCounts).catch(() => {}) }, [])

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
  const studentsUnfiltered = useMemo(() => {
    if (!activeFolder) return []
    return activeFolder.rows.map(r => {
      const raw = r.raw || {}
      const name = resolveFormField(activeFields, raw, { labelRegex: /name/i, flatKeys: ['name', 'fullName', 'full_name'] }) || r.name || '-'
      const phone = resolveFormField(activeFields, raw, { type: 'phone', labelRegex: /phone|whatsapp|contact/i, flatKeys: ['phone', 'whatsapp', 'contact'] }) || r.whatsapp || '-'
      const email = resolveFormField(activeFields, raw, { type: 'email', labelRegex: /email/i, flatKeys: ['email'] }) || r.email || '-'
      return { id: r.id, name, phone, email, university: raw.university || '-', registeredAt: raw.registeredAt || r.date, raw }
    })
  }, [activeFolder, activeFields])

  // Date range filter — compares just the date portion (YYYY-MM-DD) so a
  // <input type="date"> value matches regardless of what time of day the
  // registration itself happened.
  const students = useMemo(() => studentsUnfiltered.filter(s => {
    const d = formatDateStr(s.registeredAt)
    if (dateFrom && (d === '-' || d < dateFrom)) return false
    if (dateTo && (d === '-' || d > dateTo)) return false
    return true
  }), [studentsUnfiltered, dateFrom, dateTo])

  // Clears stale selections from whichever folder was open before —
  // merge only ever compares 2 rows within the SAME folder.
  useEffect(() => { setSelected(new Set()); setDateFrom(''); setDateTo('') }, [activeFolderKey])

  const toggleSelect = id => setSelected(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })

  const openEditStudent = row => {
    setEditForm({
      name: row.name === '-' ? '' : row.name,
      phone: row.phone === '-' ? '' : row.phone,
      email: row.email === '-' ? '' : row.email,
      university: row.university === '-' ? '' : row.university,
    })
    setEditStudent(row)
  }

  const saveEditStudent = async () => {
    if (!editStudent) return
    setSavingEdit(true)
    try {
      // Write to whichever field key resolveFormField actually reads for
      // this webinar's form (a custom Form-Builder field, or one of the
      // flat fallback keys) — not blindly to `name`/`email`/`whatsapp`,
      // or the correction would be silently shadowed by a still-present
      // custom-field value with higher resolution priority.
      const raw = editStudent.raw
      const nameKey  = resolvedKeyFor(activeFields, raw, { labelRegex: /name/i, flatKeys: ['name', 'fullName', 'full_name'] })
      const phoneKey = resolvedKeyFor(activeFields, raw, { type: 'phone', labelRegex: /phone|whatsapp|contact/i, flatKeys: ['phone', 'whatsapp', 'contact'] })
      const emailKey = resolvedKeyFor(activeFields, raw, { type: 'email', labelRegex: /email/i, flatKeys: ['email'] })
      await webinarsService.updateRegistration(editStudent.id, {
        [nameKey]: editForm.name, [phoneKey]: editForm.phone, [emailKey]: editForm.email, university: editForm.university,
      })
      activityLogService.log('registration_edited', { registrationId: editStudent.id, name: editForm.name, email: editForm.email })
      setEditStudent(null)
    } catch (e) { alert('Error: ' + e.message) }
    finally { setSavingEdit(false) }
  }

  // Merges the 2 selected registrations into one — keeps whichever field
  // value is actually filled in from either record (so merging a record
  // with a name but no email into one with an email but no name produces
  // one complete record, not a coin-flip), writes that onto the first
  // one's real field keys, then deletes the second. Restricted to
  // Super Admin (not Editor) since it deletes a record — same rule
  // ActionButtons.jsx already enforces for every other delete.
  const handleMerge = async () => {
    if (selected.size !== 2) return
    const [idA, idB] = Array.from(selected)
    const a = students.find(s => s.id === idA)
    const b = students.find(s => s.id === idB)
    if (!a || !b) return
    if (!confirm('Merge these 2 registrations into one record? The other will be deleted — this can\'t be undone.')) return
    setMerging(true)
    try {
      const pick = (x, y) => (x && x !== '-' ? x : (y && y !== '-' ? y : ''))
      const merged = {
        name: pick(a.name, b.name), phone: pick(a.phone, b.phone),
        email: pick(a.email, b.email), university: pick(a.university, b.university),
      }
      const nameKey  = resolvedKeyFor(activeFields, a.raw, { labelRegex: /name/i, flatKeys: ['name', 'fullName', 'full_name'] })
      const phoneKey = resolvedKeyFor(activeFields, a.raw, { type: 'phone', labelRegex: /phone|whatsapp|contact/i, flatKeys: ['phone', 'whatsapp', 'contact'] })
      const emailKey = resolvedKeyFor(activeFields, a.raw, { type: 'email', labelRegex: /email/i, flatKeys: ['email'] })
      await webinarsService.updateRegistration(a.id, {
        [nameKey]: merged.name, [phoneKey]: merged.phone, [emailKey]: merged.email, university: merged.university,
      })
      await webinarsService.deleteRegistration(b.id)
      activityLogService.log('registrations_merged', { kept: a.id, removed: b.id, name: merged.name, email: merged.email })
      setSelected(new Set())
    } catch (e) { alert('Error: ' + e.message) }
    finally { setMerging(false) }
  }

  // Standalone single-row delete — merge already deletes the losing side
  // as a side effect, but there was previously no way to remove ONE junk/
  // test/duplicate registration on its own. Super Admin only, same as
  // every other delete in this admin (ActionButtons.jsx already enforces
  // this rule for every other page, mirrored here manually since this
  // table doesn't use ActionButtons).
  const handleDeleteRegistration = async row => {
    if (!confirm(`Delete this registration (${row.name !== '-' ? row.name : row.email})? This can't be undone.`)) return
    setDeletingId(row.id)
    try {
      await webinarsService.deleteRegistration(row.id)
      activityLogService.log('registration_deleted', { registrationId: row.id, name: row.name, email: row.email })
    } catch (e) { alert('Error: ' + e.message) }
    finally { setDeletingId(null) }
  }

  const studentColumns = [
    { key: 'select', label: '', render: (v, row) => isFlagged(row) ? (
      <input type="checkbox" className="w-4 h-4 accent-[#1655c3]" checked={selected.has(row.id)} onChange={() => toggleSelect(row.id)} title="Select for merge" />
    ) : null },
    { key: 'name', label: 'Name', render: (v, row) => (
      <span className="font-semibold text-[#1a1a1a] flex items-center gap-1.5">
        {isFlagged(row) && <AlertTriangle size={12} className="text-amber-500 shrink-0" />}
        {v}
      </span>
    )},
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email', render: v => <span className="text-gray-500 text-xs">{v}</span> },
    { key: 'university', label: 'University' },
    { key: 'registeredAt', label: 'Registered', render: v => <span className="text-gray-400 whitespace-nowrap">{formatDateStr(v)}</span> },
    { key: 'actions', label: 'Actions', render: (v, row) => (
      <div className="flex items-center gap-1.5">
        <button onClick={() => setViewStudent(row)} className="p-1.5 rounded-lg hover:bg-blue-50 text-[#1655c3]" title="View full submission">
          <Eye size={13} />
        </button>
        {canWrite && (
          <button onClick={() => openEditStudent(row)} className="p-1.5 rounded-lg hover:bg-blue-50 text-[#1655c3]" title="Edit name/phone/email">
            <Edit2 size={13} />
          </button>
        )}
        {canDelete && (
          <button onClick={() => handleDeleteRegistration(row)} disabled={deletingId === row.id} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 disabled:opacity-40" title="Delete this registration">
            <Trash2 size={13} />
          </button>
        )}
      </div>
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
  const folderExportRows = () => {
    const formatValue = v => (typeof v === 'boolean' ? (v ? 'Yes' : 'No') : (v ?? ''))
    return {
      header: [...activeFields.map(f => f.label), 'Registered'],
      rows: students.map(s => [...activeFields.map(f => formatValue(s.raw[f.key])), formatDateStr(s.registeredAt)]),
    }
  }
  const exportFolderCsv = () => {
    if (!activeFolder) return
    const { header, rows } = folderExportRows()
    downloadCsv(`${activeFolder.label.replace(/\s+/g, '_')}_registrations.csv`, header, rows)
  }
  const exportFolderExcel = () => {
    if (!activeFolder) return
    const { header, rows } = folderExportRows()
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Registrations')
    XLSX.writeFile(wb, `${activeFolder.label.replace(/\s+/g, '_')}_registrations.xlsx`)
  }
  const exportNewsletterCsv = () => {
    downloadCsv('newsletter_signups.csv', ['Email', 'Date'], newsletterRows.map(r => [r.email, formatDateStr(r.date)]))
  }
  const exportNewsletterExcel = () => {
    const ws = XLSX.utils.aoa_to_sheet([['Email', 'Date'], ...newsletterRows.map(r => [r.email, formatDateStr(r.date)])])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Newsletter')
    XLSX.writeFile(wb, 'newsletter_signups.xlsx')
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={Inbox} label="Total Submissions" value={counts.webinarRegs === null ? '…' : counts.webinarRegs + counts.newsletter} color="#1655c3" bg="#eff6ff" />
        <StatCard icon={Video} label="Webinar Registrations" value={counts.webinarRegs === null ? '…' : counts.webinarRegs} color="#64ac37" bg="#f0fdf4" />
        <StatCard icon={Mail} label="Newsletter Signups" value={counts.newsletter === null ? '…' : counts.newsletter} color="#64ac37" bg="#f0fdf4" />
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
              <div className="flex flex-wrap items-center gap-2">
                <input type="date" className={`${inputCls} w-auto`} value={dateFrom} onChange={e => setDateFrom(e.target.value)} title="From date" />
                <input type="date" className={`${inputCls} w-auto`} value={dateTo} onChange={e => setDateTo(e.target.value)} title="To date" />
                {canDelete && selected.size === 2 && (
                  <AdminButton variant="primary" size="sm" onClick={handleMerge} disabled={merging}>
                    <Combine size={14} className="mr-1.5" /> {merging ? 'Merging…' : 'Merge Selected (2)'}
                  </AdminButton>
                )}
                <AdminButton variant="ghost" size="sm" onClick={exportFolderCsv} disabled={!students.length}>
                  <Download size={14} className="mr-1.5" /> CSV
                </AdminButton>
                <AdminButton variant="ghost" size="sm" onClick={exportFolderExcel} disabled={!students.length}>
                  <Download size={14} className="mr-1.5" /> Excel
                </AdminButton>
              </div>
            </div>
            {students.some(isFlagged) && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5 text-xs text-amber-700">
                <AlertTriangle size={14} className="shrink-0" />
                {canDelete
                  ? 'Rows with a warning icon have an empty name or an email that doesn\'t look valid — tick 2 of them and use "Merge Selected" if they\'re duplicates, or edit a row directly.'
                  : 'Rows with a warning icon have an empty name or an email that doesn\'t look valid.'}
              </div>
            )}
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
      ) : null}

      {/* `webinarRows.length + newsletterRows.length === pageSize` is a
          heuristic for "there might be more" — the two underlying queries
          are each capped at pageSize independently, so this isn't exact,
          but it only ever means the button stays visible one click longer
          than strictly necessary, never that real data goes missing. */}
      {!loading && (webinarRows.length + newsletterRows.length) >= pageSize && (
        <div className="flex justify-center">
          <AdminButton variant="secondary" onClick={() => setPageSize(n => n + PAGE_SIZE)}>Load more</AdminButton>
        </div>
      )}

      {tab === 'newsletter' && (
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
            <div className="flex items-center gap-2">
              <AdminButton size="sm" onClick={exportNewsletterCsv} disabled={!newsletterRows.length}>
                <Download size={13} className="mr-1.5" /> CSV
              </AdminButton>
              <AdminButton size="sm" onClick={exportNewsletterExcel} disabled={!newsletterRows.length}>
                <Download size={13} className="mr-1.5" /> Excel
              </AdminButton>
            </div>
          }
        />
      )}

      {viewStudent && viewForm && viewSub && (
        <ResponsesModal form={viewForm} subs={[viewSub]} onClose={() => setViewStudent(null)} />
      )}

      {editStudent && (
        <Modal title="Edit Registration" onClose={() => setEditStudent(null)}>
          <div className="space-y-4">
            <FormField label="Name">
              <input className={inputCls} value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} />
            </FormField>
            <FormField label="Phone">
              <input className={inputCls} value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} />
            </FormField>
            <FormField label="Email">
              <input className={inputCls} type="email" value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} />
            </FormField>
            <FormField label="University">
              <input className={inputCls} value={editForm.university} onChange={e => setEditForm(p => ({ ...p, university: e.target.value }))} />
            </FormField>
            <div className="flex gap-3 pt-2">
              <AdminButton variant="ghost" className="flex-1" onClick={() => setEditStudent(null)}>Cancel</AdminButton>
              <AdminButton variant="primary" className="flex-1" onClick={saveEditStudent} disabled={savingEdit}>
                {savingEdit ? 'Saving…' : 'Save'}
              </AdminButton>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
