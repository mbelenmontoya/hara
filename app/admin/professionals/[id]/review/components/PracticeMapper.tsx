// PracticeMapper: maps a professional's free-text specialty entries to
// canonical practice keys from the catalog.
//
// Each row the professional wrote (e.g. "terapia reiki", "péndulo hebreo")
// gets a dropdown of catalog practices. Amber dropdown = unmapped. Auto-matches
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
    return <p className="text-[14px] italic text-gray-500">No escribió prácticas propias.</p>
  }

  const unmapped = mappings.filter(m => m === '').length

  return (
    <div className="flex flex-col gap-[7px]">
      {freeTextEntries.map((entry, i) => {
        const mapped = mappings[i]

        return (
          <div key={`${entry}-${i}`} className="grid grid-cols-[minmax(0,1fr)_20px_minmax(0,1.1fr)] items-center gap-2.5">
            {/* Free-text entry the professional wrote */}
            <span className="font-almanac-serif min-w-0 break-words text-[18px] italic">
              “<span>{entry}</span>”
            </span>
            <span className="text-center text-gray-500" aria-hidden="true">→</span>
            <div className="min-w-0">
              <select
                value={mapped}
                onChange={(e) => handleChange(i, e.target.value)}
                className={`w-full cursor-pointer rounded-[13px] px-[13px] py-3 text-[14.5px] text-foreground outline-none ${
                  mapped === '' ? 'bg-warning-weak' : 'bg-background'
                }`}
                aria-label={`Mapear "${entry}" a una práctica del catálogo`}
              >
                <option value="">Mapear…</option>
                <option value="__skip__">No aplica</option>
                <optgroup label="Catálogo de prácticas">
                  {catalogPractices.map(p => (
                    <option key={p.key} value={p.key}>{p.label}</option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>
        )
      })}

      <p className="mt-1 text-[12.5px] text-muted">
        {unmapped > 0 ? `${unmapped} sin mapear` : 'Todas mapeadas.'}
      </p>
    </div>
  )
}
