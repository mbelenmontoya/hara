'use client'

import type { Practice } from '@/lib/practices'

interface PracticePickerProps {
  practices: Practice[]
  selected: string[]
  onChange: (next: string[]) => void
  label: string
  helperText?: string
  /** When true, renders a "No tengo preferencia" pill that clears all selections.
   *  Selecting it calls onChange([]); selecting any practice while it is active
   *  starts the multi-select (mutual exclusion). */
  includeNoPreference?: boolean
}

export function PracticePicker({
  practices,
  selected,
  onChange,
  label,
  helperText,
  includeNoPreference = false,
}: PracticePickerProps) {
  const isNoPreference = selected.length === 0 && includeNoPreference

  function handleChipClick(key: string) {
    if (selected.includes(key)) {
      onChange(selected.filter(k => k !== key))
    } else {
      onChange([...selected, key])
    }
  }

  function handleNoPreferenceClick() {
    onChange([])
  }

  const selectedClass = 'bg-brand-dark text-white border-brand-dark'
  const unselectedClass = 'bg-surface-2 text-foreground border-outline hover:border-brand/50'

  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-3">
        {label}
      </label>

      <div className="flex flex-wrap gap-2">
        {includeNoPreference && (
          <button
            type="button"
            aria-pressed={isNoPreference}
            onClick={handleNoPreferenceClick}
            className={`min-h-11 px-3 py-2 text-sm font-medium rounded-full border transition-all focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${
              isNoPreference ? selectedClass : unselectedClass
            }`}
          >
            No tengo preferencia
          </button>
        )}

        {practices.map(p => {
          const isSelected = selected.includes(p.key)
          return (
            <button
              key={p.key}
              type="button"
              aria-pressed={isSelected}
              onClick={() => handleChipClick(p.key)}
              className={`min-h-11 px-3 py-2 text-sm font-medium rounded-full border transition-all focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${
                isSelected ? selectedClass : unselectedClass
              }`}
            >
              {p.label}
            </button>
          )
        })}
      </div>

      {helperText && (
        <p className="text-xs text-muted mt-1.5">{helperText}</p>
      )}
    </div>
  )
}
