// Hara UI - Modal Component (admin, design 13)
// Purpose: Dialog overlay for admin actions; a centered sheet on desktop, a bottom sheet on phones
// Accessibility: focus trap, ESC to close, click outside to close, role=dialog + aria-modal

'use client'

import { ReactNode, useEffect, useRef } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
  footer?: ReactNode
  className?: string
}

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

export function Modal({ open, onClose, title, children, footer, className = '' }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  // ESC + focus trap (Tab / Shift+Tab cycling within the modal)
  useEffect(() => {
    if (!open) return

    function getFocusable(): HTMLElement[] {
      if (!modalRef.current) return []
      return Array.from(
        modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => !el.hasAttribute('disabled'))
    }

    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab') return

      const focusable = getFocusable()
      if (focusable.length === 0) return

      const first = focusable[0]
      const last  = focusable[focusable.length - 1]
      const active = document.activeElement as HTMLElement | null

      if (e.shiftKey) {
        if (active === first || !modalRef.current?.contains(active)) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (active === last || !modalRef.current?.contains(active)) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'

    // Move initial focus to the first focusable element inside the modal
    const focusables = getFocusable()
    if (focusables.length > 0) {
      focusables[0].focus()
    } else {
      modalRef.current?.focus()
    }

    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = 'unset'
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center font-almanac sm:items-center sm:p-4">
      <div data-testid="modal-backdrop" className="absolute inset-0 bg-foreground/40" onClick={onClose} />

      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        className={`relative max-h-[88vh] w-full overflow-y-auto rounded-t-[26px] bg-gray-50 px-[30px] pb-[26px] pt-7 text-foreground shadow-strong outline-none sm:max-w-[560px] sm:rounded-[26px] ${className}`}
      >
        <h2 id="modal-title" className="font-almanac-serif mb-0 text-[30px] leading-[1.05] tracking-[-0.3px]">
          {title}
        </h2>
        <div className="mt-2">{children}</div>
        {footer && <div className="mt-[18px]">{footer}</div>}
      </div>
    </div>
  )
}
