import { useEffect, useState } from 'react'
import { Mail, Save, Send, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react'
import { settingsService } from '../../firebase/services'
import { sendTestEmail } from '../../firebase/email'
import FormField, { inputCls } from '../components/FormField'
import AdminButton from '../components/AdminButton'

const emptyEmail = () => ({
  enabled: false,
  publicKey: '',
  serviceId: '',
  templateId: '',
  fromName: 'MEDWEB',
  replyTo: '',
})

export default function AdminEmailSettings() {
  const [email, setEmail] = useState(emptyEmail())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [testTo, setTestTo] = useState('')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)

  useEffect(() => {
    settingsService.get()
      .then(s => { if (s?.email) setEmail({ ...emptyEmail(), ...s.email }) })
      .finally(() => setLoading(false))
  }, [])

  const set = field => e =>
    setEmail(prev => ({ ...prev, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      await settingsService.update({ email })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      console.error(err)
      alert('Failed to save: ' + (err?.message || err))
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    if (!testTo.trim()) { setTestResult({ ok: false, msg: 'Enter an email to send the test to.' }); return }
    setTesting(true)
    setTestResult(null)
    // Save current config first so the test uses the latest values
    await settingsService.update({ email }).catch(() => {})
    const res = await sendTestEmail(testTo.trim())
    if (res.sent) setTestResult({ ok: true, msg: 'Test email sent! Check the inbox.' })
    else if (res.skipped) setTestResult({ ok: false, msg: 'Email is disabled or not fully configured.' })
    else setTestResult({ ok: false, msg: res.error || 'Failed to send test email.' })
    setTesting(false)
  }

  if (loading) return <div className="p-6 text-gray-400">Loading email settings…</div>

  return (
    <div className="p-4 sm:p-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white bg-[#1655c3]">
          <Mail size={20} />
        </div>
        <div>
          <h1 className="text-xl font-black text-[#1a1a1a]">Email Settings</h1>
          <p className="text-sm text-gray-500">Automated emails via EmailJS — no backend required.</p>
        </div>
      </div>

      {/* Setup help */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-6 text-sm text-gray-600">
        <p className="font-semibold text-[#1655c3] mb-1.5">How to set up (one time):</p>
        <ol className="list-decimal ml-5 space-y-1">
          <li>Create a free account at <a href="https://www.emailjs.com" target="_blank" rel="noreferrer" className="text-[#1655c3] font-medium inline-flex items-center gap-0.5">emailjs.com <ExternalLink size={11} /></a></li>
          <li>Add an Email Service → copy the <b>Service ID</b></li>
          <li>Create a Template using variables <code className="bg-white px-1 rounded">{'{{to_name}} {{to_email}} {{subject}} {{message}}'}</code> → copy the <b>Template ID</b></li>
          <li>Account → API Keys → copy your <b>Public Key</b></li>
          <li>Paste all three below, enable, and Save.</li>
        </ol>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6 space-y-4">
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input type="checkbox" checked={email.enabled} onChange={set('enabled')} className="w-4 h-4 accent-[#1655c3]" />
          <span className="text-sm font-semibold text-gray-700">Enable automatic emails</span>
        </label>

        <FormField label="EmailJS Public Key">
          <input className={inputCls} value={email.publicKey} onChange={set('publicKey')} placeholder="e.g. abc123XYZ..." />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Service ID">
            <input className={inputCls} value={email.serviceId} onChange={set('serviceId')} placeholder="service_xxxx" />
          </FormField>
          <FormField label="Template ID">
            <input className={inputCls} value={email.templateId} onChange={set('templateId')} placeholder="template_xxxx" />
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="From Name">
            <input className={inputCls} value={email.fromName} onChange={set('fromName')} placeholder="MEDWEB" />
          </FormField>
          <FormField label="Reply-To Email">
            <input className={inputCls} value={email.replyTo} onChange={set('replyTo')} placeholder="info@medweb.pk" />
          </FormField>
        </div>

        <AdminButton variant={saved ? 'success' : 'primary'} className="w-full" onClick={handleSave} disabled={saving}>
          {saved ? <><CheckCircle size={16} className="mr-2" /> Saved!</> : <><Save size={16} className="mr-2" /> {saving ? 'Saving…' : 'Save Settings'}</>}
        </AdminButton>
      </div>

      {/* Test */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6 mt-5">
        <h3 className="font-bold text-[#1a1a1a] mb-1">Send a test email</h3>
        <p className="text-xs text-gray-500 mb-3">Saves your settings, then sends a test to confirm everything works.</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input className={inputCls} type="email" value={testTo} onChange={e => setTestTo(e.target.value)} placeholder="your@email.com" />
          <button onClick={handleTest} disabled={testing}
            className="px-5 py-3 rounded-xl text-sm font-bold text-[#1655c3] border-2 border-[#1655c3] hover:bg-[#1655c3] hover:text-white transition-all flex items-center justify-center gap-2 disabled:opacity-60 flex-shrink-0">
            <Send size={15} /> {testing ? 'Sending…' : 'Send Test'}
          </button>
        </div>
        {testResult && (
          <div className={`mt-3 text-sm flex items-center gap-1.5 ${testResult.ok ? 'text-green-600' : 'text-red-500'}`}>
            {testResult.ok ? <CheckCircle size={15} /> : <AlertCircle size={15} />} {testResult.msg}
          </div>
        )}
      </div>
    </div>
  )
}
