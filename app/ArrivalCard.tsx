// One "¿Cómo llegás?" card (almanac design 7a and 9a): the specialty's color, a small triangle,
// its label and how many professionals have it. Used on the home and in the concierge form.

import { SPECIALTY_COLORS } from '@/lib/design-constants'
import type { ArrivalCard as ArrivalCardData } from '@/lib/home-arrival'

const NEUTRAL_CARD = { bg: 'bg-surface-2', text: 'text-brand-dark' }

function Glyph({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 20 18" className={`h-[27px] w-[28px] ${className}`} fill="none" stroke="currentColor" strokeWidth={1.2} aria-hidden="true">
      <path strokeLinejoin="round" d="M10 2 18 16H2z" />
    </svg>
  )
}

interface ArrivalCardProps {
  card: ArrivalCardData
  isSelected: boolean
  onToggle: () => void
}

/** A pressable specialty card with its professional count. */
export function ArrivalCard({ card, isSelected, onToggle }: ArrivalCardProps) {
  const colors = SPECIALTY_COLORS[card.key] ?? NEUTRAL_CARD
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={onToggle}
      className={`flex min-h-[104px] flex-col justify-between gap-3.5 rounded-[22px] p-[15px] pb-4 text-left transition-shadow ${colors.bg} ${
        isSelected ? 'shadow-elevated ring-2 ring-brand-dark' : ''
      }`}
    >
      <Glyph className={colors.text} />
      <span>
        <span className="font-almanac block text-[15.5px] font-medium text-foreground">{card.label}</span>
        <span className="font-almanac mt-0.5 block text-[12.5px] leading-[1.35] text-gray-700">
          {card.count} {card.count === 1 ? 'profesional' : 'profesionales'}
        </span>
      </span>
    </button>
  )
}
