// Section header label used inside cards
// Consistent uppercase muted label pattern

interface SectionHeaderProps {
  children: string
  className?: string
}

export function SectionHeader({ children, className = '' }: SectionHeaderProps) {
  return (
    <h3 className={`text-xs font-semibold text-muted uppercase tracking-wide ${className}`}>
      {children}
    </h3>
  )
}
