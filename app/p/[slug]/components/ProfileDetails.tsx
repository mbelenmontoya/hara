// Card: Combined expertise card — Especialidades, Tipo de servicio, Modalidad
// Each section only renders when data is present (no empty labels).
// Returns null when all arrays are empty.

import { Chip } from '@/app/components/ui/Chip'

interface ProfileDetailsProps {
  specialties: string[]
  practiceLabels: string[]
  serviceTypeLabels: string[]
  modalityLabels: string[]
}

export function ProfileDetails({
  specialties,
  practiceLabels,
  serviceTypeLabels,
  modalityLabels,
}: ProfileDetailsProps) {
  const hasSpecialties = specialties.length > 0 || practiceLabels.length > 0
  const hasServiceType = serviceTypeLabels.length > 0
  const hasModality = modalityLabels.length > 0

  if (!hasSpecialties && !hasServiceType && !hasModality) return null

  return (
    <div className="liquid-glass rounded-3xl shadow-elevated border border-outline/30 p-6 space-y-4">
      {hasSpecialties && (
        <div>
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
            Especialidades
          </h2>
          <div className="flex flex-wrap gap-2">
            {specialties.map((s) => (
              <Chip key={s} specialty={s} className="text-[11px] px-2 py-1" />
            ))}
            {practiceLabels.map((label) => (
              <Chip key={label} label={label} variant="neutral" className="text-[11px] px-2 py-1" />
            ))}
          </div>
        </div>
      )}

      {hasServiceType && (
        <div>
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            Tipo de servicio
          </h2>
          <p className="text-sm text-foreground">{serviceTypeLabels.join(' & ')}</p>
        </div>
      )}

      {hasModality && (
        <div>
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
            Modalidad
          </h2>
          <div className="flex flex-wrap gap-2">
            {modalityLabels.map((label) => (
              <Chip key={label} label={label} variant="neutral" className="text-[11px] px-2 py-1" />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
