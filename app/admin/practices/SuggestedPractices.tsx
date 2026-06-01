'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { PracticeSuggestion, PracticeWithCount } from '@/lib/admin-practices'

interface Props {
  suggestions: PracticeSuggestion[]
  practices: PracticeWithCount[]
}

export function SuggestedPractices({ suggestions, practices }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(true)
  const [hidden, setHidden] = useState<string[]>([])
  const [mappingEntry, setMappingEntry] = useState<string | null>(null)
  const [selectedKey, setSelectedKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const visible = suggestions.filter(s => !hidden.includes(s.entry))

  if (visible.length === 0) return null

  function hide(entry: string) {
    setHidden(prev => [...prev, entry])
    setMappingEntry(null)
    setSelectedKey('')
    setSaveError(null)
    setSaving(false)
  }

  async function handleMap(entry: string) {
    if (!selectedKey) return
    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch(`/api/admin/practices/${selectedKey}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ append_alias: entry.toLowerCase().trim() }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        setSaveError(data.error ?? 'Error al guardar')
        setSaving(false)
        return
      }
      hide(entry)
      router.refresh()
    } catch {
      setSaveError('Error de red')
      setSaving(false)
    }
  }

  const sorted = practices.slice().sort((a, b) => a.label.localeCompare(b.label))

  return (
    <div className="rounded-2xl border border-warning/40 bg-warning-weak overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-warning">
            Prácticas sugeridas por los profesionales
          </span>
          <span className="text-xs bg-warning/20 text-warning font-medium rounded-full px-2 py-0.5">
            {visible.length}
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-warning transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-warning/20 px-5 py-3 space-y-1">
          <p className="text-xs text-warning/80 mb-3">
            Entradas de los perfiles que no están en el catálogo.
            <strong> ✕</strong> descarta. <strong> Nueva práctica</strong> la agrega al catálogo. <strong> Agregar a práctica</strong> la guarda como alias de una existente.
          </p>

          {visible.map(({ entry, count }) => {
            const isMapping = mappingEntry === entry

            return (
              <div key={entry} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3 py-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm text-foreground truncate">{entry}</span>
                    <span className="text-xs text-muted flex-shrink-0">
                      × {count} {count === 1 ? 'profesional' : 'profesionales'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => hide(entry)}
                      className="text-xs text-muted/60 hover:text-danger transition-colors"
                      title="Descartar"
                      aria-label={`Descartar "${entry}"`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    <Link
                      href={`/admin/practices/new?label=${encodeURIComponent(entry)}`}
                      className="text-xs text-brand font-medium hover:underline"
                    >
                      Nueva práctica
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        if (isMapping) {
                          setMappingEntry(null)
                          setSelectedKey('')
                          setSaveError(null)
                        } else {
                          setMappingEntry(entry)
                          setSelectedKey('')
                          setSaveError(null)
                        }
                      }}
                      className="text-xs text-brand/70 hover:text-brand font-medium"
                    >
                      {isMapping ? 'Cancelar' : 'Agregar a práctica →'}
                    </button>
                  </div>
                </div>

                {isMapping && (
                  <div className="flex items-center gap-2 pb-2">
                    <select
                      value={selectedKey}
                      onChange={e => { setSelectedKey(e.target.value); setSaveError(null) }}
                      className="flex-1 text-sm border border-outline rounded-xl px-3 py-1.5 bg-surface focus:outline-none focus:ring-2 focus:ring-brand"
                    >
                      <option value="">Elegir práctica existente…</option>
                      {sorted.map(p => (
                        <option key={p.key} value={p.key}>{p.label}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={!selectedKey || saving}
                      onClick={() => handleMap(entry)}
                      className="text-xs font-medium px-3 py-1.5 bg-brand text-white rounded-xl disabled:opacity-40 hover:bg-brand/90 transition-colors flex-shrink-0"
                    >
                      {saving ? 'Guardando…' : 'Guardar'}
                    </button>
                  </div>
                )}

                {isMapping && saveError && (
                  <p className="text-xs text-danger pb-1">{saveError}</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
