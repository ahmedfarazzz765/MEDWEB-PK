import { createContext, useCallback, useContext, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import AdminButton from './AdminButton'

const ConfirmContext = createContext(null)

// Promise-based replacement for window.confirm() — same call shape at the
// use site (`if (!(await confirmDialog('message'))) return`), so adopting
// it is a near-mechanical swap, but renders as a real modal matching the
// admin design system instead of a native browser dialog.
export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null) // { message, resolve } | null

  const confirmDialog = useCallback((message) => {
    return new Promise(resolve => {
      setState({ message, resolve })
    })
  }, [])

  const close = (result) => {
    state?.resolve(result)
    setState(null)
  }

  return (
    <ConfirmContext.Provider value={confirmDialog}>
      {children}
      {state && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/40 px-4" onClick={() => close(false)}>
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6" onClick={e => e.stopPropagation()}>
            <div className="w-11 h-11 rounded-2xl bg-amber-50 flex items-center justify-center mb-4">
              <AlertTriangle size={20} className="text-amber-500" />
            </div>
            <p className="text-sm text-gray-700 mb-6 whitespace-pre-line">{state.message}</p>
            <div className="flex gap-3">
              <AdminButton variant="ghost" className="flex-1" onClick={() => close(false)}>Cancel</AdminButton>
              <AdminButton variant="primary" className="flex-1" onClick={() => close(true)}>Confirm</AdminButton>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

// Falls back to window.confirm() if no provider is mounted above it — same
// safety-net pattern as useToast(), so adopting this hook per-page is
// always incremental, never a hard dependency.
export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (ctx) return ctx
  return message => Promise.resolve(window.confirm(message))
}
