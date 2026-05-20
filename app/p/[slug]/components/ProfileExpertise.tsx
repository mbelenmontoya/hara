// Card 2: Expertise — "Can they help me?"

import { Chip } from '@/app/components/ui/Chip'

interface ProfileExpertiseProps {
  specialties: string[]
  practiceLabels: string[]
  serviceTypeLabels: string[]
}

export function ProfileExpertise({
  specialties,
  practiceLabels,
  serviceTypeLabels,
}: ProfileExpertiseProps) {
  return (
    <div className="liquid-glass rounded-3xl shadow-elevated border border-outline/30 p-6">
      <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-4">Especialidades</h2>

      <div className="flex flex-wrap gap-2 mb-4">
        {specialties.map((s) => (
          <Chip key={s} specialty={s} />
        ))}
      </div>

      {practiceLabels.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Prácticas</h3>
          <p className="text-sm text-foreground">{practiceLabels.join(', ')}</p>
        </div>
      )}

      {serviceTypeLabels.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Tipo de servicio</h3>
          <p className="text-sm text-foreground">{serviceTypeLabels.join(' & ')}</p>
        </div>
      )}
    </div>
  )
}
