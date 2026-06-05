// Page background with illustration overlay
// Used across all public and admin pages for visual consistency

interface PageBackgroundProps {
  /** Path to illustration image, or null for plain background */
  image?: string | null
}

export function PageBackground({
  image = '/assets/illustrations/wahyu-bintoro--I1KCYd31Ts-unsplash.svg',
}: PageBackgroundProps) {
  return (
    <div
      className="fixed inset-0 z-0 bg-background"
      style={{
        backgroundImage: image ? `url("${image}")` : 'none',
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
      }}
    />
  )
}
