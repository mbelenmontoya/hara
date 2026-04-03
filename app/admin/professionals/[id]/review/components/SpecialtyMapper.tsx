// Admin — Specialty Mapper
// Shows curated specialties as colored chips.
// Shows custom specialties with a dropdown to map them to a curated specialty or approve as-is.

'use client'

import { Chip } from '@/app/components/ui/Chip'
import { SPECIALTY_MAP, CURATED_SPECIALTY_KEYS } from '@/lib/design-constants'

interface Props {
  specialties: string[]
  onChange: (specialties: string[]) => void
}

const CURATED_OPTIONS = CURATED_SPECIALTY_KEYS.map(key => ({
  key,
  label: SPECIALTY_MAP[key],
}))

export function SpecialtyMapper({ specialties, onChange }: Props) {
  function handleMap(index: number, value: string) {
    const next = [...specialties]
    if (value === '__keep__') {
      // Keep as-is — no change
      return
    }
    next[index] = value
    onChange(next)
  }

  return (
    <div className="flex flex-wrap gap-2">
      {specialties.map((s, index) => {
        const isCurated = CURATED_SPECIALTY_KEYS.includes(s)

        if (isCurated) {
          return <Chip key={`${s}-${index}`} specialty={s} />
        }

        // Custom specialty — show neutral chip + mapping dropdown
        return (
          <div key={`${s}-${index}`} className="flex items-center gap-1.5 bg-surface-2 border border-outline rounded-full pl-3 pr-1 py-1">
            <span className="text-xs font-medium text-foreground">{s}</span>
            <select
              defaultValue=""
              onChange={(e) => handleMap(index, e.target.value)}
              className="text-xs text-muted bg-transparent border-none outline-none cursor-pointer pr-1 max-w-[120px]"
              aria-label={`Mapear "${s}" a una especialidad curada`}
            >
              <option value="" disabled>Mapear…</option>
              <option value="__keep__">Aprobar como está</option>
              <optgroup label="Especialidades">
                {CURATED_OPTIONS.map(opt => (
                  <option key={opt.key} value={opt.key}>{opt.label}</option>
                ))}
              </optgroup>
            </select>
          </div>
        )
      })}
    </div>
  )
}
