// Specialty selection for the professional registration form.
// Handles 12 curated toggles + up to 2 custom "otra" specialty fields.

'use client'

import { useState } from 'react'
import { SPECIALTY_MAP, CURATED_SPECIALTY_KEYS } from '@/lib/design-constants'

const SPECIALTIES = Object.entries(SPECIALTY_MAP).map(([value, label]) => ({ value, label }))

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
    <div className="flex flex-col gap-2">
      <p className="flex items-baseline gap-1.5 text-[14px] font-medium">
        Especialidades <span className="text-brand">*</span>
      </p>
      <p className="-mt-0.5 text-[12.5px] text-muted">{selected.length ? `${selected.length} elegidas` : 'Elegí al menos una'}</p>

      {/* Curated toggles */}
      <div className="flex flex-wrap gap-[7px]">
        {SPECIALTIES.map(s => (
          <button
            key={s.value}
            type="button"
            aria-pressed={selectedCurated.includes(s.value)}
            onClick={() => toggleCurated(s.value)}
            className={`rounded-full border-[1.5px] px-[13px] py-2 text-[13.5px] font-medium ${
              selectedCurated.includes(s.value)
                ? 'border-foreground bg-foreground text-background'
                : 'border-foreground/12 bg-background'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Custom specialty inputs */}
      {customInputs.map((value, index) => (
        <div key={index} className="flex gap-2">
          <div className="flex-1">
            <input
              type="text"
              aria-label={`Otra especialidad ${index + 1}`}
              value={value}
              onChange={(e) => handleCustomChange(e.target.value, index)}
              placeholder="Ej: Mindfulness, EMDR..."
              maxLength={CUSTOM_MAX_CHARS}
              className={`w-full rounded-[14px] bg-background px-3.5 py-[13px] text-base text-foreground focus-visible:ring-2 focus-visible:ring-brand outline-none placeholder:text-gray-500 ${
                customErrors[index] ? 'shadow-[inset_0_0_0_1.5px] shadow-danger-dark' : ''
              }`}
            />
            {customErrors[index] && (
              <p className="mt-1 text-[12.5px] text-danger-dark">{customErrors[index]}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => removeCustomField(index)}
            className="flex h-[46px] w-[46px] flex-none items-center justify-center rounded-[14px] bg-surface-2 text-[14px] text-gray-700"
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
          className="w-fit rounded-[14px] bg-surface-2 px-[15px] py-2.5 text-[14px] font-medium text-brand-dark"
        >
          + Agregar otra especialidad
        </button>
      )}
      <p className="text-[12.5px] text-muted">{customInputs.length >= MAX_CUSTOM ? 'Ya sumaste las 2 propias.' : 'Podés sumar hasta 2 propias.'}</p>
    </div>
  )
}
