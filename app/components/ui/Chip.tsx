// Semantic chip/tag for status labels and categories
// Variants match the feedback color system from globals.css

interface ChipProps {
  label: string
  variant?: 'success' | 'warning' | 'info' | 'brand' | 'neutral'
  className?: string
}

const VARIANT_CLASSES: Record<string, string> = {
  success: 'bg-success-weak text-success border-success/20',
  warning: 'bg-warning-weak text-warning border-warning/20',
  info: 'bg-info-weak text-info border-info/20',
  brand: 'bg-brand-weak text-brand border-brand/20',
  neutral: 'bg-surface-2 text-foreground border-outline',
}

export function Chip({ label, variant = 'neutral', className = '' }: ChipProps) {
  return (
    <span
      className={`px-3 py-1.5 text-xs font-medium rounded-full border ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {label}
    </span>
  )
}
