// Hero: arch portrait circled by the brand orbit, name, practice and place, short description as a quote.

interface ProfileHeroProps {
  name: string
  shortDescription: string | null
  profileImageUrl: string | null
  location: string
  primaryPractice: string | null
  isDestacado: boolean
}

// Arch shape from the design: round top, slightly rounded bottom.
const ARCH_RADIUS = '118px 118px 26px 26px'
const PORTRAIT_WIDTH_PX = 236
const PORTRAIT_HEIGHT_PX = 282

export function ProfileHero({
  name,
  shortDescription,
  profileImageUrl,
  location,
  primaryPractice,
  isDestacado,
}: ProfileHeroProps) {
  const meta = [primaryPractice, location].filter(Boolean).join(' · ')

  return (
    <section className="text-center">
      <div
        className="relative mx-auto mt-5"
        style={{ width: PORTRAIT_WIDTH_PX, height: PORTRAIT_HEIGHT_PX }}
      >
        {profileImageUrl?.startsWith('http') ? (
          <img
            src={profileImageUrl}
            alt={name}
            className="w-full h-full object-cover"
            style={{ borderRadius: ARCH_RADIUS }}
          />
        ) : (
          <div
            className="w-full h-full bg-brand-weak flex items-center justify-center"
            style={{ borderRadius: ARCH_RADIUS }}
          >
            <span className="font-almanac-serif text-7xl text-brand-dark">{name.charAt(0)}</span>
          </div>
        )}

        <img
          src="/assets/almanac/orbita_punteada-primary.svg"
          alt=""
          aria-hidden="true"
          className="absolute pointer-events-none object-contain"
          style={{ right: -50, top: -22, width: 150, height: 205 }}
        />

        {isDestacado && (
          <div
            data-testid="destacado-chip"
            className="absolute left-1/2 -bottom-3.5 -translate-x-1/2 flex items-center gap-1.5 bg-gray-50 rounded-full shadow-elevated whitespace-nowrap"
            style={{ padding: '7px 13px 7px 10px' }}
          >
            <svg viewBox="0 0 24 24" className="w-[11px] h-[13px] text-brand" fill="currentColor" aria-hidden="true">
              <path d="M12 0c.7 6.3 5.7 11.3 12 12-6.3.7-11.3 5.7-12 12-.7-6.3-5.7-11.3-12-12C6.3 11.3 11.3 6.3 12 0z" />
            </svg>
            <span className="font-almanac text-[10.5px] font-medium tracking-[1.6px] text-brand-dark">DESTACADA</span>
          </div>
        )}
      </div>

      <h1 className="font-almanac-serif font-normal text-[44px] leading-none tracking-tight text-foreground mt-8">
        {name}
      </h1>

      {meta && (
        <p className="font-almanac text-[12.5px] font-medium text-gray-700 mt-2 flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-brand" aria-hidden="true" />
          <span data-testid="hero-meta">{meta}</span>
        </p>
      )}

      {shortDescription && (
        <p className="font-almanac-serif italic text-[21px] leading-snug text-gray-700 mt-4 text-balance">
          <span className="text-brand">“</span>
          {shortDescription}
          <span className="text-brand">”</span>
        </p>
      )}
    </section>
  )
}
