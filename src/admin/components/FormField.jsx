// ── FormField — defined at module level so React never remounts it ────────────
// The root cause of "input loses focus after one keystroke" is defining
// component functions INSIDE another component's render body. React then
// treats them as new component types on every render and unmounts/remounts.
// Keep this in its own file and import it everywhere.

export const inputCls =
  'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 ' +
  'outline-none focus:border-[#1655c3] focus:ring-2 focus:ring-blue-100 ' +
  'transition-all bg-gray-50'

export default function FormField({ label, children }) {
  return (
    <div>
      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
        {label}
      </label>
      {children}
    </div>
  )
}
