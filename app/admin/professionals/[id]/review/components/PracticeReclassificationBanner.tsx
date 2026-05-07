'use client'

import { useState } from 'react'
import { PracticePicker } from '@/app/components/PracticePicker'
import type { Practice } from '@/lib/practices'
import { logError } from '@/lib/monitoring'

interface Props {
  professionalId: string
  practices: Practice[]
  needsReview: boolean
  /** Pre-fill the picker with the professional's current practices (if any). */
  initialSelected?: string[]
  /** Called after a successful PATCH so the parent can refetch. */
  onSaved: () => void
}

export function PracticeReclassificationBanner({
  professionalId,
  practices,
  needsReview,
  initialSelected = [],
  onSaved,
}: Props) {
  const [selected, setSelected] = useState<string[]>(initialSelected)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  if (!needsReview) return null

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch(`/api/admin/professionals/${professionalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ practices: selected }),
      })
      const body = await res.json()
      if (!res.ok) {
        setSaveError(body.error || 'Error al guardar')
        return
      }
      onSaved()
    } catch (err) {
      logError(err instanceof Error ? err : new Error(String(err)), {
        source: 'PracticeReclassificationBanner.handleSave',
      })
      setSaveError('Error inesperado al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-warning-weak border border-warning/30 rounded-2xl p-5 mb-4">
      <h3 className="text-sm font-semibold text-warning mb-1">Re-clasificación pendiente</h3>
      <p className="text-xs text-warning/80 mb-4">
        Esta profesional necesita re-clasificación al nuevo catálogo holístico.
        Seleccioná las prácticas que ofrece y guardá.
      </p>

      <PracticePicker
        practices={practices}
        selected={selected}
        onChange={setSelected}
        label="Prácticas"
      />

      {saveError && (
        <p className="text-xs text-danger mt-2">{saveError}</p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving || selected.length === 0}
        className="mt-4 px-4 py-2 bg-brand text-white text-sm font-medium rounded-full shadow-soft btn-press-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? 'Guardando...' : 'Guardar prácticas'}
      </button>
    </div>
  )
}
