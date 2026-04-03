// Semantic chip/tag for status labels, categories, and specialty display.
// Use `specialty` prop for curated specialties — resolves label and color automatically.
// Use `variant` prop for semantic status chips (success, warning, info, brand, neutral).

import { SPECIALTY_MAP, SPECIALTY_COLORS } from '@/lib/design-constants'

// Semantic variant classes (5 states)
const VARIANT_CLASSES: Record<string, string> = {
  success: 'bg-success-weak text-success border-success/20',
  warning: 'bg-warning-weak text-warning border-warning/20',
  info: 'bg-info-weak text-info border-info/20',
  brand: 'bg-brand-weak text-brand border-brand/20',
  neutral: 'bg-surface-2 text-foreground border-outline',
}

const NEUTRAL_CLASSES = VARIANT_CLASSES.neutral

// Discriminated union: use specialty OR variant, never both
type SpecialtyChipProps = {
  specialty: string
  label?: string
  variant?: never
  className?: string
}

type VariantChipProps = {
  variant?: 'success' | 'warning' | 'info' | 'brand' | 'neutral'
  label: string
  specialty?: never
  className?: string
}

type ChipProps = SpecialtyChipProps | VariantChipProps

export function Chip(props: ChipProps) {
  const { className = '' } = props

  let colorClasses: string
  let label: string

  if (props.specialty !== undefined) {
    const colors = SPECIALTY_COLORS[props.specialty]
    colorClasses = colors
      ? `${colors.bg} ${colors.text} ${colors.border}`
      : NEUTRAL_CLASSES
    label = props.label ?? (SPECIALTY_MAP[props.specialty] || props.specialty)
  } else {
    colorClasses = VARIANT_CLASSES[props.variant ?? 'neutral']
    label = props.label
  }

  return (
    <span className={`px-3 py-1.5 text-xs font-medium rounded-full border ${colorClasses} ${className}`}>
      {label}
    </span>
  )
}
