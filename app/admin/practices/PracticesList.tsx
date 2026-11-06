// PracticesList (design 13): the holistic practice catalog as a table in a cream card.
// Deactivating an active practice asks first and shows how many professionals use it;
// re-activating fires immediately.

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Modal } from '@/app/components/ui/Modal'
import { useAdminToast } from '@/app/admin/components/AdminToast'
import { ADMIN_BTN_PRIMARY, ADMIN_BTN_SECONDARY, AdminEmpty, AdminError, StatusBadge } from '@/app/admin/components/AdminUI'
import type { PracticeWithCount } from '@/lib/admin-practices'

interface PracticesListProps {
  practices: PracticeWithCount[]
}

const COLS = 'grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1.2fr)_56px_minmax(0,1fr)_86px_170px] items-center gap-3'

function usage(count: number): string {
  return count === 1 ? '1 profesional' : `${count} profesionales`
}

export function PracticesList({ practices }: PracticesListProps) {
  const router = useRouter()
  const toast = useAdminToast()
  const [pendingDeactivate, setPendingDeactivate] = useState<PracticeWithCount | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (practices.length === 0) {
    return (
      <AdminEmpty title="No hay prácticas en el catálogo" text="Creá la primera práctica para empezar.">
        <Link href="/admin/practices/new" className={ADMIN_BTN_PRIMARY}>
          Nueva práctica
        </Link>
      </AdminEmpty>
    )
  }

  async function patchActive(p: PracticeWithCount, active: boolean) {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/practices/${p.key}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active }),
      })
      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as { error?: string }
        setError(errBody.error ?? 'Error al actualizar la práctica')
        return
      }
      setPendingDeactivate(null)
      toast.show(active ? `${p.label} vuelve a estar visible en el selector.` : `${p.label} ya no aparece en el selector público.`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de red')
    } finally {
      setSubmitting(false)
    }
  }

  const sorted = practices.slice().sort((a, b) => a.sort_order - b.sort_order)

  return (
    <>
      {error && !pendingDeactivate && <AdminError text={error} />}
      <div className="mt-1 overflow-x-auto rounded-[22px] bg-gray-50 px-[22px] py-1.5">
        <div className="min-w-[820px]">
          <div className={`${COLS} border-b border-foreground/10 py-3 text-[10.5px] font-medium tracking-[1.8px] text-muted`}>
            <span>PRÁCTICA</span>
            <span>KEY</span>
            <span>SLUG</span>
            <span>ORDEN</span>
            <span>USO</span>
            <span>ESTADO</span>
            <span />
          </div>
          {sorted.map((p) => (
            <div key={p.key} data-testid={`practice-row-${p.key}`} className={`${COLS} border-b border-foreground/7 py-3 ${p.active ? '' : 'opacity-60'}`}>
              <span className="font-almanac-serif text-[19px]">{p.label}</span>
              <code className="truncate font-mono text-[13px] text-gray-700">{p.key}</code>
              <code className="truncate font-mono text-[13px] text-gray-700">{p.slug}</code>
              <span className="text-[14px]">{p.sort_order}</span>
              <span className="text-[13.5px] text-gray-700">{usage(p.usage_count)}</span>
              <span>
                <StatusBadge label={p.active ? 'Activa' : 'Inactiva'} />
              </span>
              <span className="flex justify-end gap-3 text-[13px] font-medium">
                <Link href={`/admin/practices/${p.key}/edit`} prefetch={false} className="text-brand-dark hover:underline">
                  Editar
                </Link>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => (p.active ? setPendingDeactivate(p) : patchActive(p, true))}
                  className="text-gray-700 hover:underline disabled:opacity-50"
                >
                  {p.active ? 'Desactivar' : 'Activar'}
                </button>
              </span>
            </div>
          ))}
        </div>
      </div>

      {pendingDeactivate && (
        <Modal
          open
          onClose={() => setPendingDeactivate(null)}
          title={
            <>
              ¿Desactivar <span className="italic">{pendingDeactivate.label}</span>?
            </>
          }
          footer={
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setPendingDeactivate(null)} className={ADMIN_BTN_SECONDARY}>
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => patchActive(pendingDeactivate, false)}
                disabled={submitting}
                className="inline-flex flex-none rounded-[14px] bg-danger-dark px-[17px] py-[11px] text-[14px] font-medium text-gray-50 disabled:opacity-60"
              >
                Desactivar
              </button>
            </div>
          }
        >
          <p className="text-[14px] leading-normal text-gray-700">
            Deja de aparecer en el selector público y en los filtros.{' '}
            {pendingDeactivate.usage_count === 1 ? '1 profesional la usa' : `${pendingDeactivate.usage_count} profesionales la usan`}: sus perfiles no
            cambian.
          </p>
          {error && <AdminError text={error} />}
        </Modal>
      )}
    </>
  )
}
