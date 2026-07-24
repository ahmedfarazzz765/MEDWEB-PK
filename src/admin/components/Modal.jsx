import { useEffect } from 'react'
import { X } from 'lucide-react'

// ── Modal — fixed backdrop/focus issues ──────────────────────────────────────
export default function Modal({ title, onClose, children, wide }) {
  // Close on Escape key
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      // Only close when clicking the dark backdrop itself, NOT children
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full overflow-hidden flex flex-col max-h-[90vh]"
        style={{ maxWidth: wide ? 720 : 520 }}
        // Stop clicks inside from bubbling to backdrop
        onMouseDown={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0 bg-[#1655c3]">
          <h2 className="text-white font-black text-base">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-6">
          {children}
        </div>
      </div>
    </div>
  )
}
