import { createContext, useCallback, useContext, useState } from 'react'
import { CheckCircle, XCircle, X } from 'lucide-react'

const ToastContext = createContext(null)

// Shared admin toast system — mounted once at AdminPanel's root. Call
// useToast() from any admin component to get { success, error } instead of
// window.alert()/confirm() for a result message. Auto-dismisses after 4s,
// stacks multiple toasts, and is keyboard-dismissible via its own close
// button (no reliance on a native dialog an automated test or screen
// reader would announce differently).
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback(id => setToasts(prev => prev.filter(t => t.id !== id)), [])

  const push = useCallback((type, message) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => dismiss(id), 4000)
  }, [dismiss])

  const api = {
    success: message => push('success', message),
    error: message => push('error', message),
  }

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 w-full max-w-sm px-4 sm:px-0">
        {toasts.map(t => (
          <div key={t.id}
            className={`flex items-start gap-2.5 bg-white rounded-xl shadow-xl border px-4 py-3 animate-card-in ${t.type === 'error' ? 'border-red-100' : 'border-green-100'}`}>
            {t.type === 'error'
              ? <XCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
              : <CheckCircle size={18} className="text-[#64ac37] shrink-0 mt-0.5" />}
            <p className="flex-1 text-sm text-gray-700">{t.message}</p>
            <button onClick={() => dismiss(t.id)} className="text-gray-300 hover:text-gray-500 shrink-0">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// Falls back to window.alert() if no provider is mounted above it (e.g. a
// component rendered outside AdminPanel) — so adopting this hook in a
// given page is always a safe, incremental change, never a hard dependency.
export function useToast() {
  const ctx = useContext(ToastContext)
  if (ctx) return ctx
  return { success: m => alert(m), error: m => alert(m) }
}
