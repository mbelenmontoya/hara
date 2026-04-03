// Specialty selection for the professional registration form.
// Handles 12 curated toggles + up to 2 custom "otra" specialty fields.

'use client'

import { useState } from 'react'
import { SPECIALTY_MAP, CURATED_SPECIALTY_KEYS } from '@/lib/design-constants'

const SPECIALTIES = [
  { value: 'anxiety', label: 'Ansiedad' },
  { value: 'depression', label: 'Depresión' },
  { value: 'stress', label: 'Estrés' },
  { value: 'trauma', label: 'Trauma' },
  { value: 'relationships', label: 'Relaciones' },
  { value: 'self-esteem', label: 'Autoestima' },
  { value: 'grief', label: 'Duelo' },
  { value: 'addiction', label: 'Adicciones' },
  { value: 'eating-disorders', label: 'Trastornos alimentarios' },
  { value: 'couples', label: 'Terapia de pareja' },
  { value: 'family', label: 'Terapia familiar' },
  { value: 'children', label: 'Niños y adolescentes' },
]

// Spanish labels for curated specialties (for duplicate detection)
const CURATED_LABELS = Object.values(SPECIALTY_MAP).map(l => l.toLowerCase())

const MAX_CUSTOM = 2
const CUSTOM_MIN_CHARS = 3
const CUSTOM_MAX_CHARS = 50
// Letters (including accented), spaces, and hyphens
const VALID_CUSTOM_PATTERN = /^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s\-]+$/

interface Props {
  selected: string[]
  onChange: (specialties: string[]) => void
}

export function SpecialtySelector({ selected, onChange }: Props) {
  // Initialize custom inputs from any non-curated entries already in selected
  // (handles multi-step form navigation: going back to Step 1 preserves custom entries)
  const [customInputs, setCustomInputs] = useState<string[]>(
    () => selected.filter(s => !CURATED_SPECIALTY_KEYS.includes(s))
  )
  const [customErrors, setCustomErrors] = useState<(string | null)[]>(
    () => selected.filter(s => !CURATED_SPECIALTY_KEYS.includes(s)).map(() => null)
  )

  // Curated keys in the selected array
  const selectedCurated = selected.filter(s => CURATED_SPECIALTY_KEYS.includes(s))
  // Custom entries in the selected array (not curated keys)
  const selectedCustom = selected.filter(s => !CURATED_SPECIALTY_KEYS.includes(s))

  function toggleCurated(key: string) {
    const next = selectedCurated.includes(key)
      ? selectedCurated.filter(s => s !== key)
      : [...selectedCurated, key]
    onChange([...next, ...selectedCustom])
  }

  function validateCustom(value: string, index: number): string | null {
    const trimmed = value.trim()
    if (trimmed.length < CUSTOM_MIN_CHARS) return `Mínimo ${CUSTOM_MIN_CHARS} caracteres`
    if (trimmed.length > CUSTOM_MAX_CHARS) return `Máximo ${CUSTOM_MAX_CHARS} caracteres`
    if (!VALID_CUSTOM_PATTERN.test(trimmed)) return 'Solo letras, espacios y guiones'
    if (CURATED_LABELS.includes(trimmed.toLowerCase())) return 'Esta especialidad ya está en la lista'
    // Check for duplicates across other custom inputs
    const others = customInputs.filter((_, i) => i !== index).map(v => v.trim().toLowerCase())
    if (others.includes(trimmed.toLowerCase())) return 'Ya la agregaste'
    return null
  }

  function handleCustomChange(value: string, index: number) {
    const next = [...customInputs]
    next[index] = value
    setCustomInputs(next)

    const errors = [...customErrors]
    errors[index] = value.trim() ? validateCustom(value, index) : null
    setCustomErrors(errors)

    // Update parent with valid custom entries
    const validCustom = next
      .map((v, i) => ({ value: v.trim(), error: errors[i] }))
      .filter(({ value, error }) => value && !error)
      .map(({ value }) => value)
    onChange([...selectedCurated, ...validCustom])
  }

  function addCustomField() {
    if (customInputs.length >= MAX_CUSTOM) return
    setCustomInputs([...customInputs, ''])
    setCustomErrors([...customErrors, null])
  }

  function removeCustomField(index: number) {
    const next = customInputs.filter((_, i) => i !== index)
    const errors = customErrors.filter((_, i) => i !== index)
    setCustomInputs(next)
    setCustomErrors(errors)

    const validCustom = next
      .map((v, i) => ({ value: v.trim(), error: errors[i] }))
      .filter(({ value, error }) => value && !error)
      .map(({ value }) => value)
    onChange([...selectedCurated, ...validCustom])
  }

  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-3">
        Especialidades * <span className="text-muted font-normal">(seleccioná al menos una)</span>
      </label>

      {/* Curated toggles */}
      <div className="flex flex-wrap gap-2 mb-3">
        {SPECIALTIES.map(s => (
          <button
            key={s.value}
            type="button"
            aria-pressed={selectedCurated.includes(s.value)}
            onClick={() => toggleCurated(s.value)}
            className={`px-3 py-1.5 rounded-full text-sm transition-all ${
              selectedCurated.includes(s.value)
                ? 'bg-brand text-white'
                : 'bg-surface border border-outline text-foreground hover:border-brand/50'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Custom specialty inputs */}
      {customInputs.map((value, index) => (
        <div key={index} className="flex gap-2 mb-2">
          <div className="flex-1">
            <input
              type="text"
              value={value}
              onChange={(e) => handleCustomChange(e.target.value, index)}
              placeholder="Ej: Mindfulness, EMDR..."
              maxLength={CUSTOM_MAX_CHARS}
              className={`w-full px-4 py-3 bg-surface border rounded-xl text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all text-sm ${
                customErrors[index] ? 'border-danger' : 'border-outline'
              }`}
            />
            {customErrors[index] && (
              <p className="text-xs text-danger mt-1">{customErrors[index]}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => removeCustomField(index)}
            className="px-3 py-2 text-muted hover:text-danger transition-colors text-sm"
            aria-label="Eliminar especialidad"
          >
            ✕
          </button>
        </div>
      ))}

      {/* Add custom button */}
      {customInputs.length < MAX_CUSTOM && (
        <button
          type="button"
          onClick={addCustomField}
          className="text-sm text-brand hover:text-brand-hover transition-colors mt-1"
        >
          + Agregar otra especialidad
        </button>
      )}
    </div>
  )
}
