import { AlertTriangle, Loader2, CheckCircle } from 'lucide-react'
import Modal from './Modal'
import AdminButton from './AdminButton'

// Shown from AdminBlog.jsx right after a post transitions into "Published".
// Two phases: a quota-warning confirmation (if the subscriber count looks
// like it could exceed what's left of EmailJS's shared monthly quota), then
// a live progress view while sending — this all runs in the admin's own
// open tab (no server), so the copy is explicit about not closing it.
export default function NewsletterSendModal({ phase, total, remaining, sent, failed, failedEmails, onConfirm, onCancel, onClose }) {
  return (
    <Modal title="Newsletter — Notify Subscribers" onClose={phase === 'sending' ? () => {} : onClose}>
      <div className="space-y-4">
        {phase === 'confirm-quota' && (
          <>
            <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-100 rounded-xl p-4">
              <AlertTriangle size={18} className="text-yellow-600 shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-800">
                You have <strong>{total}</strong> active subscribers but only about <strong>{remaining}</strong> EmailJS sends left this month (shared 200/month free-plan quota, used across every email feature). Sending will likely stop partway through — the rest won't be notified until next month.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <AdminButton variant="ghost" className="flex-1" onClick={onCancel}>Don't Send</AdminButton>
              <AdminButton variant="primary" className="flex-1" onClick={onConfirm}>Send Anyway</AdminButton>
            </div>
          </>
        )}

        {phase === 'confirm' && (
          <>
            <p className="text-sm text-gray-600">
              Send a "new post" email to <strong>{total}</strong> active subscribers now?
            </p>
            <div className="flex gap-3 pt-2">
              <AdminButton variant="ghost" className="flex-1" onClick={onCancel}>Skip</AdminButton>
              <AdminButton variant="primary" className="flex-1" onClick={onConfirm}>Send Now</AdminButton>
            </div>
          </>
        )}

        {phase === 'sending' && (
          <>
            <div className="flex items-center gap-3">
              <Loader2 size={18} className="text-[#1655c3] animate-spin shrink-0" />
              <p className="text-sm font-semibold text-[#1a1a1a]">Sending {sent + failed} of {total}…</p>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-[#1655c3] transition-all duration-200" style={{ width: `${total ? ((sent + failed) / total) * 100 : 0}%` }} />
            </div>
            <p className="text-xs text-red-500 font-semibold">Keep this tab open until sending completes — closing it stops the send with no way to resume automatically.</p>
          </>
        )}

        {phase === 'done' && (
          <>
            <div className="flex items-center gap-3">
              <CheckCircle size={20} className="text-green-600 shrink-0" />
              <p className="text-sm font-bold text-[#1a1a1a]">{sent} sent, {failed} failed</p>
            </div>
            {failedEmails?.length > 0 && (
              <div className="max-h-32 overflow-y-auto text-xs text-gray-500 bg-gray-50 rounded-xl p-3 space-y-1">
                <p className="font-semibold text-gray-600 mb-1">Follow up manually with:</p>
                {failedEmails.map(e => <div key={e}>{e}</div>)}
              </div>
            )}
            <AdminButton variant="primary" className="w-full" onClick={onClose}>Done</AdminButton>
          </>
        )}
      </div>
    </Modal>
  )
}
