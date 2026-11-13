import { useState, useEffect } from 'react'
import { ScrollText, Clock } from 'lucide-react'
import StatCard from '../components/StatCard'
import DataTable from '../components/DataTable'
import AccessDenied from '../components/AccessDenied'
import useAdminPermissions from '../hooks/useAdminPermissions'
import { activityLogService, toIsoString } from '../../firebase/services'

// Human-readable label for each `action` string activityLogService.log()
// is called with — see services.js's own comment on what's actually
// instrumented (admin-user management + webinar CRUD + submission
// edit/merge, not literally every write in the panel).
const ACTION_LABELS = {
  admin_user_invited: 'Invited admin',
  admin_user_updated: 'Updated admin access',
  admin_user_removed: 'Removed admin access',
  webinar_created: 'Created webinar',
  webinar_updated: 'Updated webinar',
  webinar_deleted: 'Deleted webinar',
  registration_edited: 'Edited registration',
  registrations_merged: 'Merged registrations',
}

function formatDetails(details) {
  if (!details || typeof details !== 'object') return '-'
  const parts = Object.entries(details).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') || 'none' : v}`)
  return parts.join(' · ') || '-'
}

export default function AdminActivityLog() {
  const { loading: permLoading, isSuperAdmin } = useAdminPermissions()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = activityLogService.listen(data => { setRows(data); setLoading(false) })
    return unsub
  }, [])

  if (!permLoading && !isSuperAdmin) {
    return <AccessDenied message="Only the Super Admin can view the activity log." />
  }

  const columns = [
    { key: 'actorEmail', label: 'Admin', render: v => <span className="font-semibold text-[#1a1a1a]">{v}</span> },
    { key: 'action', label: 'Action', render: v => <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#1655c3]">{ACTION_LABELS[v] || v}</span> },
    { key: 'details', label: 'Details', render: v => <span className="text-gray-500 text-xs">{formatDetails(v)}</span> },
    { key: 'createdAt', label: 'When', render: v => <span className="text-gray-400 whitespace-nowrap text-xs">{toIsoString(v).replace('T', ' ').slice(0, 19) || '-'}</span> },
  ]

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={ScrollText} label="Logged Actions" value={loading ? '…' : rows.length} color="#1655c3" bg="#eff6ff" />
        <StatCard icon={Clock} label="Most Recent" value={loading ? '…' : (rows[0] ? toIsoString(rows[0].createdAt).slice(0, 10) : '-')} color="#64ac37" bg="#f0fdf4" />
      </div>
      <DataTable title="Activity Log" columns={columns} data={rows} searchKey="actorEmail" emptyMessage="No activity logged yet" />
    </div>
  )
}
