// Card 1: Identity — "Who is this person?"

import { Chip } from '@/app/components/ui/Chip'

interface ProfileHeroProps {
  name: string
  shortDescription: string | null
  profileImageUrl: string | null
  location: string
  acceptingNewClients: boolean
  isDestacado: boolean
  ratingAverage: number
  ratingCount: number
}

export function ProfileHero({
  name,
  shortDescription,
  profileImageUrl,
  location,
  acceptingNewClients,
  isDestacado,
  ratingAverage,
  ratingCount,
}: ProfileHeroProps) {
  return (
    <div className="liquid-glass rounded-3xl shadow-elevated border border-outline/30 p-6">
      <div className="flex justify-center mb-4">
        {profileImageUrl?.startsWith('http') ? (
          <img
            src={profileImageUrl}
            alt={name}
            className="w-20 h-20 rounded-full object-cover shadow-soft border-2 border-white/60"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-weak to-info-weak flex items-center justify-center shadow-soft border-2 border-white/60">
            <span className="text-2xl font-semibold text-brand">
              {name.charAt(0)}
            </span>
          </div>
        )}
      </div>

      <h1 className="text-2xl font-bold text-foreground text-center mb-1">
        {name}
      </h1>

      {ratingCount > 0 && (
        <p className="text-sm text-muted text-center mb-2">
          {'★'.repeat(Math.round(ratingAverage))} {ratingAverage.toFixed(1)} · {ratingCount} {ratingCount === 1 ? 'reseña' : 'reseñas'}
        </p>
      )}

      {isDestacado && (
        <div className="flex justify-center mb-2">
          <span data-testid="destacado-chip">
            <Chip variant="brand" label="Destacado" />
          </span>
        </div>
      )}

      {shortDescription && (
        <p className="text-sm text-muted text-center italic mb-3">
          {shortDescription}
        </p>
      )}

      <p className="text-sm text-muted text-center mb-4">
        <svg className="inline-block w-3.5 h-3.5 mr-1 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        {location}
      </p>

      {acceptingNewClients && (
        <div className="flex justify-center">
          <Chip label="Aceptando nuevas consultas" variant="success" />
        </div>
      )}
    </div>
  )
}
