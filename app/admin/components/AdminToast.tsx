// Admin toasts (almanac design 13): one short message at the bottom after every action.
// AdminLayout renders the provider; pages call useAdminToast().show(text, kind).

'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

const TOAST_MS = 3800 // How long a toast stays, from the design

type ToastKind = 'ok' | 'err'

interface Toast {
  id: number
  text: string
  kind: ToastKind
}

interface ToastApi {
  show: (text: string, kind?: ToastKind) => void
}

const ToastContext = createContext<ToastApi>({ show: () => {} })

/** Show a toast from any admin page. */
export function useAdminToast(): ToastApi {
  return useContext(ToastContext)
}

/** Holds the current toast and renders it in a polite live region. */
export function AdminToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = useCallback((text: string, kind: ToastKind = 'ok') => {
    if (timer.current) clearTimeout(timer.current)
    setToast({ id: Date.now(), text, kind })
    timer.current = setTimeout(() => setToast(null), TOAST_MS)
  }, [])

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-7 z-[60] flex justify-center px-4">
        {toast && (
          <div
            key={toast.id}
            role={toast.kind === 'err' ? 'alert' : 'status'}
            className={`max-w-[560px] rounded-[14px] px-[18px] py-3 font-almanac text-[14px] font-medium leading-[1.45] text-background shadow-strong ${
              toast.kind === 'err' ? 'bg-danger-dark' : 'bg-foreground'
            }`}
          >
            {toast.text}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  )
}
