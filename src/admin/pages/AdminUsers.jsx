import { useState, useEffect } from 'react'
import { Users, ShieldCheck, Plus, Trash2, Edit2, Copy, CheckCircle, Link2, Clock } from 'lucide-react'
import StatCard from '../components/StatCard'
import Modal from '../components/Modal'
import FormField, { inputCls } from '../components/FormField'
import AdminButton from '../components/AdminButton'
import AccessDenied from '../components/AccessDenied'
import useAdminPermissions from '../hooks/useAdminPermissions'
import { adminUsersService, adminInvitesService } from '../../firebase/services'
import { ADMIN_SECTIONS, ADMIN_SECTION_GROUPS } from '../data/adminSections'

const emptyForm = () => ({ name: '', email: '', allowedSections: [] })

function PermissionChecklist({ selected, onToggle }) {
  return (
    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
      {ADMIN_SECTION_GROUPS.map(group => (
        <div key={group}>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{group}</p>
          <div className="grid grid-cols-2 gap-2">
            {ADMIN_SECTIONS.filter(s => s.group === group).map(s => (
              <label key={s.key} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-[#1655c3]"
                  checked={selected.includes(s.key)}
                  onChange={() => onToggle(s.key)}
                />
                {s.label}
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function AdminUsers() {
  const { loading: permLoading, isSuperAdmin } = useAdminPermissions()
  const [data, setData] = useState([])
  const [invites, setInvites] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editEmail, setEditEmail] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [justInvited, setJustInvited] = useState(null) // { name, link } | null
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const unsub = adminUsersService.listen(rows => { setData(rows); setLoading(false) })
    const unsub2 = adminInvitesService.listen(rows => setInvites(rows.filter(i => !i.claimed)))
    return () => { unsub(); unsub2() }
  }, [])

  if (!permLoading && !isSuperAdmin) {
    return <AccessDenied message="Only the Super Admin can manage admin users." />
  }

  const openAdd = () => { setForm(emptyForm()); setEditEmail(null); setError(''); setModal('invite') }
  const openEdit = row => { setForm({ name: row.name || '', email: row.email, allowedSections: row.allowedSections || [] }); setEditEmail(row.email); setError(''); setModal('edit') }
  const close = () => { setModal(false); setEditEmail(null) }

  const toggleSection = key => setForm(p => ({
    ...p,
    allowedSections: p.allowedSections.includes(key)
      ? p.allowedSections.filter(k => k !== key)
      : [...p.allowedSections, key],
  }))

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) { setError('Name and email are required.'); return }
    setSaving(true)
    setError('')
    try {
      if (editEmail) {
        await adminUsersService.update(editEmail, { name: form.name, allowedSections: form.allowedSections })
        close()
      } else {
        const token = await adminInvitesService.create({ name: form.name, email: form.email, allowedSections: form.allowedSections })
        const link = `${window.location.origin}/admin/invite/${token}`
        setJustInvited({ name: form.name, link })
        close()
      }
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async email => {
    if (!confirm(`Remove admin access for ${email}?`)) return
    try { await adminUsersService.delete(email) } catch (e) { alert(e.message) }
  }

  const handleRevokeInvite = async token => {
    if (!confirm('Revoke this invite? The link will stop working.')) return
    try { await adminInvitesService.delete(token) } catch (e) { alert(e.message) }
  }

  const copyLink = () => {
    navigator.clipboard?.writeText(justInvited.link)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {justInvited && (
        <div className="bg-green-50 border border-green-100 rounded-2xl px-5 py-4">
          <div className="flex items-start gap-3">
            <CheckCircle size={18} className="text-green-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-green-700 mb-1">Invite created for {justInvited.name}</p>
              <p className="text-xs text-green-700/80 mb-2">Send this link to them yourself (WhatsApp, email, etc.) — they'll set their own password when they open it. The link only works once.</p>
              <div className="bg-white rounded-xl border border-green-200 px-4 py-2.5 font-mono text-xs text-[#1a1a1a] flex items-center justify-between gap-3">
                <span className="truncate">{justInvited.link}</span>
                <button onClick={copyLink} className="shrink-0 flex items-center gap-1 text-[11px] font-bold text-[#1655c3] hover:underline">
                  <Copy size={12} /> {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
            <button onClick={() => setJustInvited(null)} className="text-gray-400 hover:text-gray-600 text-xs font-bold shrink-0">Dismiss</button>
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4 text-sm text-[#1655c3]">
        <strong>Add Admin</strong> creates a one-time invite link — the invited person opens it in their own browser and sets their own password there. Nothing happens to your own session. (Admins who already had a Firebase Auth account from before this feature — or the Super Admin's own account — don't need anything here; the "no record = full access" rule still applies.)
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={Users} label="Sub-Admins" value={loading ? '…' : data.length} color="#1655c3" bg="#eff6ff" />
        <StatCard icon={Clock} label="Pending Invites" value={loading ? '…' : invites.length} color="#f59e0b" bg="#fffbeb" />
        <StatCard icon={ShieldCheck} label="Total Sections" value={ADMIN_SECTIONS.length} color="#64ac37" bg="#f0fdf4" />
      </div>

      {invites.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-black text-[#1a1a1a] text-sm mb-4">Pending Invites</h3>
          <div className="space-y-3">
            {invites.map(inv => (
              <div key={inv.id} className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-gray-200">
                <div className="w-9 h-9 rounded-full bg-yellow-50 text-yellow-600 flex items-center justify-center text-xs font-bold shrink-0">
                  <Link2 size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[#1a1a1a] text-sm">{inv.name}</div>
                  <div className="text-xs text-gray-400">{inv.email} · not yet claimed</div>
                </div>
                <button onClick={() => {
                  navigator.clipboard?.writeText(`${window.location.origin}/admin/invite/${inv.id}`)
                  alert('Invite link copied!')
                }} className="p-1.5 rounded-lg hover:bg-blue-50 text-[#1655c3]" title="Copy link"><Copy size={13} /></button>
                <button onClick={() => handleRevokeInvite(inv.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400" title="Revoke"><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-[#1a1a1a] text-sm">Admin Users</h3>
          <AdminButton size="sm" onClick={openAdd}><Plus size={13} className="mr-1" /> Add Admin</AdminButton>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400 text-center py-8">Loading…</p>
        ) : data.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No sub-admins yet — every other signed-in admin currently has full Super Admin access. Click "Add Admin" to invite someone with restricted access.</p>
        ) : (
          <div className="space-y-3">
            {data.map(row => (
              <div key={row.id} className="flex items-start gap-3 p-3 rounded-xl border border-gray-100">
                <div className="w-9 h-9 rounded-full bg-blue-50 text-[#1655c3] flex items-center justify-center text-xs font-bold shrink-0">
                  {(row.name || row.email || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[#1a1a1a] text-sm">{row.name}</div>
                  <div className="text-xs text-gray-400 mb-1.5">{row.email}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {(row.allowedSections || []).length === 0 ? (
                      <span className="text-[11px] text-gray-400 italic">No sections granted</span>
                    ) : (row.allowedSections || []).map(key => {
                      const s = ADMIN_SECTIONS.find(s => s.key === key)
                      return <span key={key} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#1655c3]">{s?.label || key}</span>
                    })}
                  </div>
                </div>
                {row.role === 'superadmin' ? (
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-green-50 text-green-600 shrink-0">Super Admin</span>
                ) : (
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => openEdit(row)} className="p-1.5 rounded-lg hover:bg-blue-50 text-[#1655c3]"><Edit2 size={13} /></button>
                    <button onClick={() => handleDelete(row.email)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 size={13} /></button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <Modal title={modal === 'edit' ? 'Edit Admin Access' : 'Invite Admin'} onClose={close} wide>
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <FormField label="Name">
                <input className={inputCls} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Dr. Jane Doe" />
              </FormField>
              <FormField label="Email">
                <input
                  className={inputCls}
                  type="email"
                  value={form.email}
                  disabled={!!editEmail}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="jane@medweb.pk"
                />
              </FormField>
            </div>

            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Granted Sections</p>
              <PermissionChecklist selected={form.allowedSections} onToggle={toggleSection} />
            </div>

            {error && <p className="text-red-500 text-xs">{error}</p>}

            <div className="flex gap-3 pt-2">
              <AdminButton variant="ghost" className="flex-1" onClick={close}>Cancel</AdminButton>
              <AdminButton variant="primary" className="flex-1" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : editEmail ? 'Save' : 'Create Invite Link'}
              </AdminButton>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
