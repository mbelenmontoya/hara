// PracticeMapper — maps a professional's free-text specialty entries to
// canonical practice keys from the catalog.
//
// Each row the professional wrote (e.g. "terapia reiki", "péndulo hebreo")
// gets a dropdown of catalog practices. Yellow = unmapped. Auto-matches
// when the entry key is an exact case-insensitive hit on a practice key.
// onChange fires with the deduplicated list of mapped practice keys.

'use client'

import { useState, useEffect } from 'react'
import type { Practice } from '@/lib/practices'

interface Props {
  freeTextEntries: string[]
  catalogPractices: Practice[]
  initialPractices: string[]
  onChange: (practiceKeys: string[]) => void
}

function normalize(s: string): string {
  return s.toLowerCase().trim().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[\s-]+/g, ' ').trim()
}

function autoMatch(entry: string, catalog: Practice[]): string {
  const n = normalize(entry)
  const stripped = n.replace(/\s/g, '')
  const hit = catalog.find(p => {
    // key match (exact or stripped of hyphens/spaces)
    if (normalize(p.key) === n || p.key.replace(/-/g, '') === stripped) return true
    // label match
    if (normalize(p.label) === n) return true
    // alias match
    return (p.aliases ?? []).some(a => normalize(a) === n)
  })
  return hit?.key ?? ''
}

export function PracticeMapper({ freeTextEntries, catalogPractices, initialPractices, onChange }: Props) {
  // One mapping slot per free-text entry: '' = unmapped, '__skip__' = no aplica, or a practice key
  const [mappings, setMappings] = useState<string[]>(() =>
    freeTextEntries.map(entry => autoMatch(entry, catalogPractices))
  )

  // If initialPractices arrives after mount (async), sync unmapped slots
  useEffect(() => {
    if (!initialPractices.length) return
    setMappings(prev =>
      prev.map((m, i) => {
        if (m !== '') return m
        // Try to match from existing practices based on the entry
        return autoMatch(freeTextEntries[i], catalogPractices)
      })
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPractices.join(',')])

  function handleChange(index: number, value: string) {
    const next = [...mappings]
    next[index] = value
    setMappings(next)
    const keys = [...new Set(next.filter(v => v !== '' && v !== '__skip__'))]
    onChange(keys)
  }

  if (!freeTextEntries.length) {
    return <p className="text-xs text-muted">Este profesional no ingresó prácticas libres.</p>
  }

  return (
    <div className="flex flex-col gap-2">
      {freeTextEntries.map((entry, i) => {
        const mapped = mappings[i]
        const isUnmapped = mapped === ''
        const isSkipped = mapped === '__skip__'
        const selectedPractice = catalogPractices.find(p => p.key === mapped)

        return (
          <div
            key={`${entry}-${i}`}
            className={`flex items-center gap-3 rounded-xl px-3 py-2 border text-sm ${
              isUnmapped
                ? 'bg-warning-weak border-warning/30'
                : isSkipped
                ? 'bg-surface-2 border-outline/50 opacity-60'
                : 'bg-surface border-outline/50'
            }`}
          >
            {/* Free-text entry the professional wrote */}
            <span className="text-foreground font-medium min-w-0 flex-1 truncate">{entry}</span>

            <span className="text-muted text-xs flex-shrink-0">→</span>

            {/* Mapping dropdown */}
            <select
              value={mapped}
              onChange={(e) => handleChange(i, e.target.value)}
              className="text-xs bg-transparent border-none outline-none cursor-pointer text-brand font-medium flex-shrink-0 max-w-[180px]"
              aria-label={`Mapear "${entry}" a una práctica del catálogo`}
            >
              <option value="">Mapear...</option>
              <option value="__skip__">No aplica</option>
              <optgroup label="Catálogo de prácticas">
                {catalogPractices.map(p => (
                  <option key={p.key} value={p.key}>{p.label}</option>
                ))}
              </optgroup>
            </select>

            {/* Confirmation label when mapped */}
            {selectedPractice && (
              <span className="text-xs text-success font-medium flex-shrink-0">✓ {selectedPractice.label}</span>
            )}
          </div>
        )
      })}

      <p className="text-xs text-muted mt-1">
        {mappings.filter(m => m === '').length > 0
          ? `${mappings.filter(m => m === '').length} entrada(s) sin mapear`
          : 'Todas las entradas mapeadas.'
        }
      </p>
    </div>
  )
}
