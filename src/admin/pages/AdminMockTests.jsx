import { useEffect, useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import {
  Plus, ArrowLeft, Upload, Download, Trash2,
  FileText, Settings2, Image as ImageIcon, BarChart3,
} from 'lucide-react'
import DataTable from '../components/DataTable'
import AdminButton from '../components/AdminButton'
import FormField, { inputCls } from '../components/FormField'
import ImageUpload from '../components/ImageUpload'
import CertPositionEditor from '../components/CertPositionEditor'
import MockTestResults from '../components/MockTestResults'
import { useToast } from '../components/Toast'
import { useConfirm } from '../components/ConfirmDialog'
import useAdminPermissions from '../hooks/useAdminPermissions'
import { mockTestsService } from '../../firebase/services'

const EXPECTED_HEADERS = ['Question', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct Answer']

function emptyTest() {
  return { title: '', description: '', passPercent: 70, defaultSeconds: 60, questions: [], certTemplate: null, status: 'Draft' }
}

function isReady(test) {
  return (test.questions || []).length > 0 && !!test.certTemplate?.imageUrl
}

// Parses an imported .xlsx/.csv sheet into { questions, errors }. errors is
// a list of { row, message } — a non-empty list blocks the import entirely
// (the caller never applies a partially-valid set). Re-importing REPLACES
// the test's whole question list, it never appends/dedupes.
function parseQuestionSheet(rows) {
  const errors = []
  if (!rows.length) return { questions: [], errors: [{ row: 0, message: 'The file is empty.' }] }

  const header = rows[0].map(h => String(h || '').trim().toLowerCase())
  const idx = {
    question: header.indexOf('question'),
    a: header.indexOf('option a'),
    b: header.indexOf('option b'),
    c: header.indexOf('option c'),
    d: header.indexOf('option d'),
    correct: header.indexOf('correct answer'),
  }
  if (Object.values(idx).some(i => i === -1)) {
    return { questions: [], errors: [{ row: 1, message: `Header row must be exactly: ${EXPECTED_HEADERS.join(' | ')}` }] }
  }

  const questions = []
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]
    if (!row || row.every(c => c === undefined || c === null || String(c).trim() === '')) continue // skip blank rows
    const rowNum = r + 1
    const questionText = String(row[idx.question] ?? '').trim()
    const options = [idx.a, idx.b, idx.c, idx.d].map(i => String(row[i] ?? '').trim())
    const correctRaw = String(row[idx.correct] ?? '').trim().toUpperCase()

    if (!questionText) { errors.push({ row: rowNum, message: 'Question text is empty.' }); continue }
    if (options.some(o => !o)) { errors.push({ row: rowNum, message: 'One or more options (A–D) are empty.' }); continue }
    if (!['A', 'B', 'C', 'D'].includes(correctRaw)) { errors.push({ row: rowNum, message: `Correct Answer must be A, B, C or D — got "${row[idx.correct] ?? ''}".` }); continue }

    questions.push({ questionText, options, correctIndex: 'ABCD'.indexOf(correctRaw) })
  }

  if (questions.length === 0 && errors.length === 0) {
    errors.push({ row: 0, message: 'No question rows found below the header.' })
  }
  return { questions, errors }
}

function downloadSample() {
  const ws = XLSX.utils.aoa_to_sheet([
    EXPECTED_HEADERS,
    ['AMR stands for?', 'Antimicrobial Resistance', 'Acute Medical Response', 'Advanced Medical Research', 'Automated Medicine Review', 'A'],
    ['Which organ primarily metabolizes most drugs?', 'Kidney', 'Liver', 'Heart', 'Lungs', 'B'],
  ])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Questions')
  XLSX.writeFile(wb, 'mock_test_questions_sample.xlsx')
}

export default function AdminMockTests() {
  const toast = useToast()
  const confirmDialog = useConfirm()
  const { canWrite } = useAdminPermissions()
  const [tests, setTests] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null) // null = list view
  const [form, setForm] = useState(emptyTest())
  const [tab, setTab] = useState('details')
  const [saving, setSaving] = useState(false)
  const [importErrors, setImportErrors] = useState([])
  const fileInputRef = useRef(null)

  useEffect(() => {
    const unsub = mockTestsService.listen(rows => { setTests(rows); setLoading(false) })
    return unsub
  }, [])

  const openNew = () => { setForm(emptyTest()); setEditingId('new'); setTab('details') }
  const openEdit = test => { setForm({ ...emptyTest(), ...test }); setEditingId(test.id); setTab('details') }
  const closeEditor = () => { setEditingId(null); setImportErrors([]) }

  const setVal = (key, value) => setForm(f => ({ ...f, [key]: value }))

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Title is required.'); return }
    setSaving(true)
    try {
      if (editingId === 'new') {
        const id = await mockTestsService.add(form)
        setEditingId(id)
        toast.success('Mock test created.')
      } else {
        await mockTestsService.update(editingId, form)
        toast.success('Saved.')
      }
    } catch (e) {
      toast.error('Save failed: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async test => {
    const ok = await confirmDialog(`Delete "${test.title}"? This cannot be undone. Past attempts and certificates already issued are not affected.`)
    if (!ok) return
    try {
      await mockTestsService.delete(test.id)
      toast.success('Deleted.')
      if (editingId === test.id) closeEditor()
    } catch (e) {
      toast.error('Delete failed: ' + e.message)
    }
  }

  const toggleStatus = async () => {
    const next = form.status === 'Ready' ? 'Draft' : 'Ready'
    if (next === 'Ready' && !isReady(form)) {
      toast.error('Needs at least 1 valid question and a certificate template before it can go Ready.')
      return
    }
    setVal('status', next)
    if (editingId !== 'new') {
      try {
        await mockTestsService.update(editingId, { status: next })
        toast.success(next === 'Ready' ? 'Marked Ready — now selectable on a course.' : 'Marked Draft.')
      } catch (e) {
        toast.error('Could not update status: ' + e.message)
      }
    }
  }

  const handleFile = async e => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file
    if (!file) return
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
      toast.error('Please upload a .xlsx or .csv file.')
      return
    }
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false })
      const { questions, errors } = parseQuestionSheet(rows)
      setImportErrors(errors)
      if (errors.length > 0) {
        toast.error(`${errors.length} row(s) have errors — import blocked. See the list below.`)
        return
      }
      // Re-import REPLACES the question list entirely, carrying over each
      // existing question's per-question `seconds` override by matching on
      // exact question text — a pure text/option edit keeps its custom
      // timer, a genuinely new question gets the test's default.
      const prevByText = new Map((form.questions || []).map(q => [q.questionText, q]))
      const merged = questions.map(q => ({ ...q, seconds: prevByText.get(q.questionText)?.seconds }))
      setVal('questions', merged)
      toast.success(`Imported ${merged.length} question(s). Remember to Save.`)
    } catch (err) {
      toast.error('Could not read that file: ' + err.message)
    }
  }

  const updateQuestionSeconds = (index, seconds) => {
    setVal('questions', form.questions.map((q, i) => i === index ? { ...q, seconds: seconds || undefined } : q))
  }
  const deleteQuestion = index => {
    setVal('questions', form.questions.filter((_, i) => i !== index))
  }

  const questionColumns = [
    { key: 'questionText', label: 'Question' },
    { key: 'options', label: 'Options', render: v => <span className="text-xs text-gray-500">{v.join(' / ')}</span> },
    { key: 'correctIndex', label: 'Correct', render: v => <span className="font-bold text-[#64ac37]">{'ABCD'[v]}</span> },
    { key: 'seconds', label: 'Seconds', render: (v, row, i) => (
      <input type="number" min={5} className={inputCls + ' w-20'} placeholder={String(form.defaultSeconds)} value={v ?? ''}
        onChange={e => updateQuestionSeconds(form.questions.indexOf(row), e.target.value ? Number(e.target.value) : undefined)} />
    )},
    { key: 'idx', label: 'Actions', render: (v, row) => (
      <button onClick={() => deleteQuestion(form.questions.indexOf(row))} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 size={13} /></button>
    )},
  ]

  const listColumns = [
    { key: 'title', label: 'Title', render: v => <span className="font-semibold text-[#1a1a1a]">{v}</span> },
    { key: 'status', label: 'Status', render: v => (
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${v === 'Ready' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>{v}</span>
    )},
    { key: 'questions', label: 'Questions', numeric: true, render: v => (v || []).length },
    { key: 'passPercent', label: 'Pass %', numeric: true, render: v => `${v}%` },
    { key: 'id', label: 'Actions', render: (v, row) => (
      <div className="flex gap-1.5">
        <button onClick={() => openEdit(row)} className="p-1.5 rounded-lg hover:bg-blue-50 text-[#1655c3]"><Settings2 size={13} /></button>
        {canWrite && <button onClick={() => handleDelete(row)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 size={13} /></button>}
      </div>
    )},
  ]

  if (editingId === null) {
    return (
      <div className="p-4 sm:p-6 space-y-6">
        <DataTable
          title="Mock Tests" columns={listColumns} data={tests} searchKey="title"
          emptyMessage={loading ? 'Loading…' : 'No mock tests yet.'}
          actions={canWrite && <AdminButton size="sm" onClick={openNew}><Plus size={14} className="mr-1" /> New Mock Test</AdminButton>}
        />
      </div>
    )
  }

  const TABS = [
    { key: 'details', label: 'Details', icon: Settings2 },
    { key: 'questions', label: `Questions (${form.questions.length})`, icon: FileText },
    { key: 'certificate', label: 'Certificate', icon: ImageIcon },
    ...(editingId !== 'new' ? [{ key: 'results', label: 'Results', icon: BarChart3 }] : []),
  ]

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button onClick={closeEditor} className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-[#1655c3]">
          <ArrowLeft size={15} /> Back to Mock Tests
        </button>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${form.status === 'Ready' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>{form.status}</span>
          {canWrite && (
            <AdminButton size="sm" variant={form.status === 'Ready' ? 'ghost' : 'success'} onClick={toggleStatus}>
              Mark {form.status === 'Ready' ? 'Draft' : 'Ready'}
            </AdminButton>
          )}
          {canWrite && <AdminButton size="sm" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</AdminButton>}
        </div>
      </div>

      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${tab === t.key ? 'border-[#1655c3] text-[#1655c3]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'details' && (
        <div className="admin-card p-5 space-y-4 max-w-xl">
          <FormField label="Title"><input className={inputCls} value={form.title} onChange={e => setVal('title', e.target.value)} placeholder="e.g. AMR Fundamentals Mock Test" /></FormField>
          <FormField label="Description"><textarea rows={3} className={inputCls} value={form.description} onChange={e => setVal('description', e.target.value)} /></FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Pass % (eligibility ≥ this)">
              <input type="number" min={0} max={100} className={inputCls} value={form.passPercent} onChange={e => setVal('passPercent', Number(e.target.value))} />
            </FormField>
            <FormField label="Default seconds / question">
              <input type="number" min={5} className={inputCls} value={form.defaultSeconds} onChange={e => setVal('defaultSeconds', Number(e.target.value))} />
            </FormField>
          </div>
        </div>
      )}

      {tab === 'questions' && (
        <div className="space-y-4">
          <div className="admin-card p-5 flex flex-wrap items-center gap-3">
            <AdminButton size="sm" onClick={() => fileInputRef.current?.click()}><Upload size={13} className="mr-1.5" /> Import Excel/CSV</AdminButton>
            <AdminButton size="sm" variant="ghost" onClick={downloadSample}><Download size={13} className="mr-1.5" /> Download sample</AdminButton>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
            <span className="text-xs text-gray-400">Columns: {EXPECTED_HEADERS.join(' | ')}. Re-importing replaces all questions.</span>
          </div>
          {importErrors.length > 0 && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 space-y-1">
              <div className="font-bold">Import blocked — fix these rows and re-upload:</div>
              {importErrors.map((e, i) => <div key={i}>Row {e.row || '—'}: {e.message}</div>)}
            </div>
          )}
          <DataTable title="Questions" columns={questionColumns} data={form.questions} searchKey="questionText" emptyMessage="No questions yet — import an Excel/CSV file above." />
        </div>
      )}

      {tab === 'certificate' && (
        <div className="admin-card p-5 space-y-4 max-w-2xl">
          <p className="text-xs text-gray-500">Same template/position editor as webinar certificates — the name and certificate ID boxes work identically.</p>
          <ImageUpload
            label="Certificate Template Image" folder="medweb/certificates/templates"
            value={form.certTemplate?.imageUrl || ''}
            onChange={v => setVal('certTemplate', v ? { ...form.certTemplate, imageUrl: v } : null)}
          />
          {form.certTemplate?.imageUrl && (
            <CertPositionEditor
              imageUrl={form.certTemplate.imageUrl}
              namePos={form.certTemplate.namePos}
              idPos={form.certTemplate.idPos}
              onChange={({ namePos, idPos }) => setVal('certTemplate', { ...form.certTemplate, namePos, idPos })}
              elements={form.certTemplate.elements}
              onChangeElements={els => setVal('certTemplate', { ...form.certTemplate, elements: els })}
            />
          )}
        </div>
      )}

      {tab === 'results' && editingId !== 'new' && <MockTestResults mockTest={form} />}
    </div>
  )
}
