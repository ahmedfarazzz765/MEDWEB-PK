import { getLinkIcon } from '../constants/linkIcons'

// Renders the admin-configured "Success Screen" link buttons (Form Builder →
// a form's successConfig.links) after any form submission — shared by
// DynamicForm.jsx and WebinarRegisterModal.jsx so registration, feedback,
// and ambassador-application forms all get this for free. Links marked
// "prominent" render as one big highlighted button each (e.g. "Join our
// Groups"); the rest render as a row of small social icon buttons.
export default function FormSuccessLinks({ links }) {
  const usable = (links || []).filter(l => l.url)
  if (usable.length === 0) return null

  const prominent = usable.filter(l => l.prominent)
  const regular = usable.filter(l => !l.prominent)

  return (
    <div className="mt-6 space-y-4">
      {prominent.map(l => {
        const { Icon } = getLinkIcon(l.icon)
        return (
          <a
            key={l.id}
            href={l.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-bold text-sm text-white shadow-md hover:shadow-lg hover:scale-[1.02] transition-all"
            style={{ background: 'linear-gradient(135deg, #1655c3, #64ac37)' }}
          >
            <Icon size={18} /> {l.label || 'Join Now'}
          </a>
        )
      })}

      {regular.length > 0 && (
        <div className="flex items-center justify-center gap-3 flex-wrap pt-1">
          {regular.map(l => {
            const { Icon, color } = getLinkIcon(l.icon)
            return (
              <a
                key={l.id}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                title={l.label || undefined}
                className="w-10 h-10 rounded-full flex items-center justify-center border border-gray-200 bg-white hover:scale-110 hover:shadow-md transition-all"
                style={{ color }}
              >
                <Icon size={18} />
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}
