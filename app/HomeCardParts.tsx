'use client'

// Small pieces shared by the home's featured card and list cards (design 11a):
// the Destacado sparkle, the Índice Hara ring and the specialty chips with their "+N" toggle.

import { useState } from 'react'
import { SPECIALTY_COLORS } from '@/lib/design-constants'
import type { HomeRow } from '@/lib/home-arrival'

const MAX_CHIPS = 3
const SCORE_HIGH = 51
const SCORE_MID = 30

export function Sparkle({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 0c.7 6.3 5.7 11.3 12 12-6.3.7-11.3 5.7-12 12-.7-6.3-5.7-11.3-12-12C6.3 11.3 11.3 6.3 12 0z" />
    </svg>
  )
}

function scoreColor(score: number): string {
  if (score >= SCORE_HIGH) return 'var(--color-success)'
  if (score >= SCORE_MID) return 'var(--color-warning)'
  return 'var(--color-brand)'
}

/** Índice Hara as a ring filled to the score, with the number inside. */
export function ScoreRing({ score, size }: { score: number; size: 'lg' | 'md' }) {
  const big = size === 'lg'
  return (
    <div data-testid="ranking-score" className="flex flex-none flex-col items-center gap-[3px]">
      <div
        className={`flex items-center justify-center rounded-full ${big ? 'h-[50px] w-[50px]' : 'h-11 w-11'}`}
        style={{ background: `conic-gradient(${scoreColor(score)} ${score}%, color-mix(in srgb, var(--color-foreground) 12%, transparent) 0)` }}
      >
        <span className={`font-almanac-serif flex items-center justify-center rounded-full bg-gray-50 leading-none ${big ? 'h-[42px] w-[42px] text-[18px]' : 'h-9 w-9 text-base'}`}>
          {score}
        </span>
      </div>
      <span className="almanac-label !text-[8px] !tracking-[0.16em]">ÍNDICE</span>
    </div>
  )
}

/** Specialty chips, three at first and a "+N" button to show the rest. */
export function SpecialtyChips({ chips }: { chips: HomeRow['chips'] }) {
  const [expanded, setExpanded] = useState(false)
  if (chips.length === 0) return null
  const shown = expanded ? chips : chips.slice(0, MAX_CHIPS)
  const hidden = chips.length - MAX_CHIPS
  return (
    <div className="relative z-10 mt-3 flex flex-wrap gap-1.5">
      {shown.map((c) => (
        <span key={c.key} className={`font-almanac rounded-full px-[11px] py-[5px] text-xs font-medium text-foreground ${SPECIALTY_COLORS[c.key]?.bg ?? 'bg-surface-2'}`}>
          {c.label}
        </span>
      ))}
      {hidden > 0 && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
          className="font-almanac rounded-full border-[1.5px] border-foreground/15 px-2.5 py-[3.5px] text-xs font-medium text-brand-dark"
        >
          {expanded ? 'Menos' : `+${hidden}`}
        </button>
      )}
    </div>
  )
}
