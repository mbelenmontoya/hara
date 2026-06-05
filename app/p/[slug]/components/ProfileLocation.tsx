// Card: Ubicación presencial — shows city address + Google Maps embed
// Returns null when onlineOnly=true or city is absent

interface ProfileLocationProps {
  city: string | null
  location: string
  onlineOnly: boolean
}

export function ProfileLocation({
  city,
  location,
  onlineOnly,
}: ProfileLocationProps) {
  if (onlineOnly || !city) return null

  const mapsQuery = encodeURIComponent(location)
  const embedUrl = `https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${mapsQuery}`
  const linkUrl = `https://maps.google.com/?q=${mapsQuery}`

  return (
    <div className="liquid-glass rounded-3xl shadow-elevated border border-outline/30 p-6">
      <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
        Ubicación presencial
      </h2>
      <p className="text-sm text-foreground mb-4">{location}</p>
      <div className="rounded-2xl overflow-hidden mb-2">
        <iframe
          src={embedUrl}
          width="100%"
          height="200"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title={`Mapa de ${location}`}
        />
      </div>
      <a
        href={linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-brand hover:underline"
      >
        Ver en Google Maps →
      </a>
    </div>
  )
}
