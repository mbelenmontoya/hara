// Page background with illustration overlay
// Used across all public and admin pages for visual consistency

interface PageBackgroundProps {
  /** Path to illustration image, or null for plain background */
  image?: string | null
  /** Background position, defaults to 'bottom' */
  position?: string
}

export function PageBackground({
  image = '/assets/illustrations/rizki-kurniawan-SSp6eC-LKBU-unsplash.svg',
  position = 'bottom',
}: PageBackgroundProps) {
  return (
    <div
      className="fixed inset-0 z-0 bg-background"
      style={{
        backgroundImage: image ? `url(${image})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: position,
        backgroundRepeat: 'no-repeat',
      }}
    />
  )
}
