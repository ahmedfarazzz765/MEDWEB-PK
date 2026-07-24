import { ShieldOff } from 'lucide-react'

export default function AccessDenied({ message = "You don't have access to this section." }) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-24 text-center px-6">
      <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
        <ShieldOff size={28} className="text-red-400" />
      </div>
      <h2 className="text-lg font-black text-[#1a1a1a] mb-1.5">Access Denied</h2>
      <p className="text-gray-500 text-sm max-w-xs">{message}</p>
    </div>
  )
}
