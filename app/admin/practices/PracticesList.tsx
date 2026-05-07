// PracticesList — client component for /admin/practices.
// Renders the catalog as glass-card rows with an inline active toggle.
// Deactivating an active practice opens a confirm modal showing the
// number of professionals using it; re-activating fires immediately.

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Alert } from '@/app/components/ui/Alert'
import { GlassCard } from '@/app/components/ui/GlassCard'
import { Button } from '@/app/components/ui/Button'
import { Modal } from '@/app/components/ui/Modal'
import { EmptyState } from '@/app/components/ui/EmptyState'
import type { PracticeWithCount } from '@/lib/admin-practices'

interface PracticesListProps {
  practices: PracticeWithCount[]
}

function usageMessage(count: number): string {
  if (count === 0) return 'Ningún profesional usa esta práctica todavía.'
  if (count === 1) return '1 profesional activo/pendiente usa esta práctica.'
  return `${count} profesionales activos/pendientes usan esta práctica.`
}

export function PracticesList({ practices }: PracticesListProps) {
  const router = useRouter()
  const [pendingDeactivate, setPendingDeactivate] = useState<PracticeWithCount | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (practices.length === 0) {
    return (
      <EmptyState
        title="No hay prácticas en el catálogo"
        description="Creá la primera práctica para empezar."
        action={
          <Link href="/admin/practices/new">
            <Button>Nueva práctica</Button>
          </Link>
        }
      />
    )
  }

  async function patchActive(key: string, active: boolean) {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/practices/${key}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active }),
      })
      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as { error?: string }
        setError(errBody.error ?? 'Error al actualizar la práctica')
        setSubmitting(false)
        return
      }
      setPendingDeactivate(null)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de red')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {error && (
        <div className="mb-3">
          <Alert variant="error">{error}</Alert>
        </div>
      )}
      <div className="flex flex-col gap-3">
        {practices.map(p => (
          <GlassCard key={p.key}>
            <div data-testid={`practice-row-${p.key}`} className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-foreground font-medium">{p.label}</span>
                  <code className="text-xs text-muted bg-surface-2 px-1.5 py-0.5 rounded">
                    {p.key}
                  </code>
                  {!p.active && (
                    <span className="text-xs uppercase tracking-wide text-muted">
                      Inactiva
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted">
                  slug: {p.slug} · orden: {p.sort_order} · {p.usage_count} profesional
                  {p.usage_count === 1 ? '' : 'es'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/admin/practices/${p.key}/edit`}>
                  <Button variant="secondary">Editar</Button>
                </Link>
                {p.active ? (
                  <Button
                    variant="secondary"
                    onClick={() => setPendingDeactivate(p)}
                    disabled={submitting}
                  >
                    Desactivar
                  </Button>
                ) : (
                  <Button
                    onClick={() => patchActive(p.key, true)}
                    disabled={submitting}
                  >
                    Activar
                  </Button>
                )}
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {pendingDeactivate && (
        <Modal
          open={!!pendingDeactivate}
          onClose={() => setPendingDeactivate(null)}
          title={`Desactivar: ${pendingDeactivate.label}`}
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setPendingDeactivate(null)}>
                Cancelar
              </Button>
              <Button
                onClick={() => patchActive(pendingDeactivate.key, false)}
                disabled={submitting}
              >
                Confirmar desactivación
              </Button>
            </div>
          }
        >
          <p className="text-foreground">
            {usageMessage(pendingDeactivate.usage_count)}
          </p>
          <p className="text-sm text-muted mt-2">
            La práctica desaparece del picker público. Los profesionales que ya la tienen
            asignada conservan la etiqueta en su perfil.
          </p>
        </Modal>
      )}
    </>
  )
}
