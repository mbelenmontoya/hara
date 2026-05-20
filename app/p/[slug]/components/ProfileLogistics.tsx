// Card 4: Logistics — "How do I see them?"

import { Chip } from '@/app/components/ui/Chip'

interface ProfileLogisticsProps {
  modalityLabels: string[]
  location: string
  onlineOnly: boolean
  city: string | null
  priceRange: string | null
  offersCoursesOnline: boolean
  coursesPresencialLocation: string | null
}

export function ProfileLogistics({
  modalityLabels,
  location,
  onlineOnly,
  city,
  priceRange,
  offersCoursesOnline,
  coursesPresencialLocation,
}: ProfileLogisticsProps) {
  return (
    <div className="liquid-glass rounded-3xl shadow-elevated border border-outline/30 p-6">
      <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-4">Modalidad</h2>

      <div className="flex flex-wrap gap-2 mb-4">
        {modalityLabels.map((label) => (
          <Chip key={label} label={label} variant="neutral" />
        ))}
      </div>

      {!onlineOnly && city && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Ubicación presencial</h3>
          <p className="text-sm text-foreground">{location}</p>
        </div>
      )}

      {priceRange && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Rango de precios</h3>
          <p className="text-sm text-foreground">{priceRange}</p>
        </div>
      )}

      {(offersCoursesOnline || coursesPresencialLocation) && (
        <div>
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Cursos</h3>
          <div className="space-y-1">
            {offersCoursesOnline && (
              <p className="text-sm text-foreground">Online</p>
            )}
            {coursesPresencialLocation && (
              <p className="text-sm text-foreground">Presenciales — {coursesPresencialLocation}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
