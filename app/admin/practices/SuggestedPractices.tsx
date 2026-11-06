// SuggestedPractices (design 13): free-text practices professionals wrote that are not in the catalog.
// Each one can become a new practice, an alias of an existing one, or be discarded (after confirming).

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Modal } from '@/app/components/ui/Modal'
import { useAdminToast } from '@/app/admin/components/AdminToast'
import { ADMIN_BTN_SECONDARY, AdminError } from '@/app/admin/components/AdminUI'
import type { PracticeSuggestion, PracticeWithCount } from '@/lib/admin-practices'

interface Props {
  suggestions: PracticeSuggestion[]
  practices: PracticeWithCount[]
}

function writtenBy(count: number): string {
  return count === 1 ? 'Escrita por 1 profesional' : `Escrita por ${count} profesionales`
}

export function SuggestedPractices({ suggestions, practices }: Props) {
  const router = useRouter()
  const toast = useAdminToast()
  const [open, setOpen] = useState(true)
  const [aliasFor, setAliasFor] = useState<string | null>(null)
  const [selectedKey, setSelectedKey] = useState('')
  const [discarding, setDiscarding] = useState<PracticeSuggestion | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (suggestions.length === 0) {
    return <p className="mb-3.5 text-[13.5px] text-muted">No hay prácticas sugeridas pendientes.</p>
  }

  async function send(url: string, init: RequestInit, done: string) {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json' } })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        setError(data.error ?? 'No pudimos guardar el cambio.')
        return
      }
      setDiscarding(null)
      setAliasFor(null)
      toast.show(done)
      router.refresh()
    } catch {
      setError('Error de red')
    } finally {
      setSaving(false)
    }
  }

  function discard(entry: string) {
    send('/api/admin/practices/dismiss', { method: 'POST', body: JSON.stringify({ entry }) }, `Descartamos “${entry}” y la quitamos de los perfiles.`)
  }

  function addAlias(entry: string) {
    if (!selectedKey) return toast.show('Elegí a qué práctica sumarla.', 'err')
    const target = practices.find((p) => p.key === selectedKey)
    send(
      `/api/admin/practices/${selectedKey}`,
      { method: 'PATCH', body: JSON.stringify({ append_alias: entry.toLowerCase().trim() }) },
      `“${entry}” ahora es alias de ${target?.label ?? selectedKey}.`
    )
  }

  const sorted = practices.slice().sort((a, b) => a.label.localeCompare(b.label))

  return (
    <div className="mb-4 rounded-[20px] bg-warning-light px-[18px] py-1 shadow-[inset_0_0_0_1.5px] shadow-warning-weak">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-2.5 py-[13px] text-left">
        <span className="h-[18px] w-[18px] flex-none rounded-full bg-warning-dark text-center text-[12px] font-semibold leading-[18px] text-gray-50" aria-hidden="true">
          !
        </span>
        <span className="flex-1 text-[14.5px] font-medium text-warning-dark">Prácticas sugeridas por los profesionales ({suggestions.length})</span>
        <span className="text-[20px] font-light leading-none text-warning-dark" aria-hidden="true">
          {open ? '−' : '+'}
        </span>
      </button>

      {open && (
        <div className="flex flex-col pb-3">
          {error && !discarding && <AdminError text={error} />}
          {suggestions.map(({ entry, count }) => (
            <div key={entry} className="border-t border-warning-dark/20 py-3">
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-almanac-serif text-[20px] italic">“{entry}”</p>
                  <p className="mt-0.5 text-[12.5px] text-warning-dark">{writtenBy(count)}</p>
                </div>
                {aliasFor !== entry && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Link
                      href={`/admin/practices/new?label=${encodeURIComponent(entry)}`}
                      className="rounded-xl bg-brand-dark px-[13px] py-2 text-[13px] font-medium text-gray-50"
                    >
                      Crear práctica
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setAliasFor(entry)
                        setSelectedKey('')
                        setError(null)
                      }}
                      className="rounded-xl border-[1.5px] border-foreground/20 px-3 py-[6.5px] text-[13px] font-medium"
                    >
                      Agregar como alias
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscarding({ entry, count })}
                      title="Descartar"
                      aria-label={`Descartar "${entry}"`}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-danger-dark/10 text-[15px] leading-none text-danger-dark"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
              {aliasFor === entry && (
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <select
                    value={selectedKey}
                    onChange={(e) => setSelectedKey(e.target.value)}
                    aria-label={`Práctica para el alias "${entry}"`}
                    className="min-w-[180px] flex-1 cursor-pointer rounded-[13px] bg-background px-[13px] py-3 text-[14.5px] outline-none"
                  >
                    <option value="">¿Alias de qué práctica?</option>
                    {sorted.map((p) => (
                      <option key={p.key} value={p.key}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                  <button type="button" onClick={() => setAliasFor(null)} className="px-1.5 text-[13px] font-medium text-gray-700">
                    Cancelar
                  </button>
                  <button type="button" disabled={saving} onClick={() => addAlias(entry)} className="rounded-xl bg-brand-dark px-3.5 py-2.5 text-[13px] font-medium text-gray-50 disabled:opacity-60">
                    {saving ? 'Guardando…' : 'Agregar'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {discarding && (
        <Modal open onClose={() => !saving && setDiscarding(null)} title={`Descartar “${discarding.entry}”`}
          footer={
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setDiscarding(null)} disabled={saving} className={ADMIN_BTN_SECONDARY}>
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => discard(discarding.entry)}
                disabled={saving}
                className="inline-flex flex-none rounded-[14px] bg-danger-dark px-[17px] py-[11px] text-[14px] font-medium text-gray-50 disabled:opacity-60"
              >
                Descartar
              </button>
            </div>
          }
        >
          <p className="text-[14px] leading-normal text-gray-700">La quitamos también de los perfiles. {writtenBy(discarding.count)}.</p>
          {error && <AdminError text={error} />}
        </Modal>
      )}
    </div>
  )
}
