// Shared admin button — solid colors only (no gradients), matching the
// public site's design language. Variants:
//   primary  — solid blue,  for Save / Add / primary actions
//   success  — solid green, for Publish / Confirm / approve actions
//   danger   — solid red,   for Delete / destructive actions
//   ghost    — outline,     for Cancel / secondary actions
const VARIANTS = {
  primary: 'text-white bg-[#1655c3] hover:bg-[#123f8f] disabled:hover:bg-[#1655c3]',
  success: 'text-white bg-[#64ac37] hover:bg-[#4f8c29] disabled:hover:bg-[#64ac37]',
  danger:  'text-white bg-[#ef4444] hover:bg-[#dc2626] disabled:hover:bg-[#ef4444]',
  ghost:   'text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300',
}

const SIZES = {
  sm: 'text-xs px-3 py-2 gap-1.5',
  md: 'text-sm px-5 py-2.5 gap-2',
}

export default function AdminButton({
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  children,
  ...props
}) {
  return (
    <button
      disabled={disabled}
      className={`inline-flex items-center justify-center font-bold rounded-xl transition-all duration-200
        ${VARIANTS[variant]} ${SIZES[size]}
        ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:-translate-y-0.5 hover:shadow-md active:translate-y-0'}
        ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
