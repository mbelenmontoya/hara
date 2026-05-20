// Card 3: About — "What's their approach?"
// Only rendered when bio or experience_description exists

interface ProfileAboutProps {
  bio: string | null
  experienceDescription: string | null
}

export function ProfileAbout({ bio, experienceDescription }: ProfileAboutProps) {
  if (!bio && !experienceDescription) return null

  return (
    <div className="liquid-glass rounded-3xl shadow-elevated border border-outline/30 p-6">
      {bio && (
        <div className={experienceDescription ? 'mb-6' : ''}>
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Sobre mí</h2>
          <p className="text-sm text-foreground leading-relaxed">{bio}</p>
        </div>
      )}

      {experienceDescription && (
        <div>
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Sobre la experiencia</h2>
          <p className="text-sm text-foreground leading-relaxed">{experienceDescription}</p>
        </div>
      )}
    </div>
  )
}
