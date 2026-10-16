// One Diario (blog) article in the almanac design (Claude Design 9e):
// cover with a round back button, serif title, author row, the body, the dark "Si esto te sonó" card and "Seguí leyendo".

import Link from 'next/link'

const ISOTIPO_SRC = '/assets/logo/isotipo.png'

export interface DiarioArticleProps {
  title: string
  bodyHtml: string
  minutes: number
  coverUrl: string | null
  secondaryImageUrl: string | null
  authorLabel: string
  isEditorial: boolean
  professional: { slug: string; fullName: string; imageUrl: string | null } | null
  next: { slug: string; title: string } | null
}

function BackButton({ className }: { className: string }) {
  return (
    <Link
      href="/blog"
      aria-label="Volver al Diario"
      className={`flex h-10 w-10 items-center justify-center rounded-full bg-gray-50/90 text-[17px] text-foreground ${className}`}
    >
      ←
    </Link>
  )
}

function AuthorRow({ authorLabel, isEditorial, professional }: Pick<DiarioArticleProps, 'authorLabel' | 'isEditorial' | 'professional'>) {
  const avatar = isEditorial ? ISOTIPO_SRC : professional?.imageUrl ?? null
  return (
    <div className="mt-[18px] flex items-center gap-2.5 border-y border-foreground/12 py-3.5">
      {avatar && (
        <img
          src={avatar}
          alt=""
          aria-hidden="true"
          className={`h-[38px] w-[38px] flex-none rounded-full ${isEditorial ? 'bg-gray-50 object-contain p-1.5' : 'object-cover'}`}
        />
      )}
      <span className="text-sm font-medium">{authorLabel}</span>
    </div>
  )
}

function ConciergeCard({ professional }: Pick<DiarioArticleProps, 'professional'>) {
  const firstName = professional?.fullName.split(' ')[0] ?? ''
  return (
    <section className="relative overflow-hidden rounded-[26px] bg-foreground p-[22px] text-background">
      <img
        src="/assets/almanac/orbita_punteada-cream.svg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute -right-[26px] -top-[18px] h-[150px] w-[110px] object-contain opacity-45"
      />
      <span className="block text-[10.5px] font-medium uppercase tracking-[0.21em] text-brand-weak">Si esto te sonó</span>
      <span className="font-almanac-serif mt-2.5 block max-w-[250px] text-[26px] leading-[1.1]">
        {professional ? (
          <>Escribile a <em>{firstName}</em>, o pedinos tres opciones.</>
        ) : (
          <>Contanos y te elegimos <em>tres</em> opciones.</>
        )}
      </span>
      <div className="mt-4 flex gap-2">
        {professional && (
          <Link
            href={`/p/${professional.slug}`}
            className="rounded-[13px] bg-brand-weak px-4 py-[11px] text-sm font-medium text-brand-dark transition-opacity hover:opacity-90"
          >
            Ver perfil
          </Link>
        )}
        <Link
          href="/solicitar"
          className="rounded-[13px] border-[1.5px] border-background/30 px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-90"
        >
          Concierge
        </Link>
      </div>
    </section>
  )
}

/**
 * The full article view. bodyHtml is sanitized at write time by POST /api/blog.
 */
export function DiarioArticle(props: DiarioArticleProps) {
  const { title, bodyHtml, minutes, coverUrl, secondaryImageUrl, next } = props

  return (
    <main className="min-h-screen bg-background font-almanac text-foreground">
      <div className="mx-auto w-full max-w-md pb-[60px] md:max-w-xl">
        {coverUrl ? (
          <div className="relative h-[330px]">
            <img src={coverUrl} alt="" className="h-full w-full object-cover" />
            <BackButton className="absolute left-5 top-5" />
          </div>
        ) : (
          <BackButton className="ml-5 mt-5" />
        )}

        <article className="px-6 pt-[22px]">
          <span className="almanac-label block text-muted">{minutes} min de lectura</span>
          <h1
            className="font-almanac-serif mb-0 mt-3 text-[38px] text-foreground"
            style={{ lineHeight: 1.02, letterSpacing: '-0.4px' }}
          >
            {title}
          </h1>
          <AuthorRow authorLabel={props.authorLabel} isEditorial={props.isEditorial} professional={props.professional} />
          <div className="diario-body mt-[22px]" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
          {secondaryImageUrl && (
            <img src={secondaryImageUrl} alt="" className="mt-7 w-full rounded-2xl object-cover" />
          )}
        </article>

        <div className="px-4 pt-[30px]">
          <ConciergeCard professional={props.professional} />
        </div>

        {next && (
          <Link href={`/blog/${next.slug}`} className="block px-6 pt-[26px]">
            <span className="almanac-label block text-muted">Seguí leyendo</span>
            <span className="font-almanac-serif mt-2 block text-2xl leading-[1.12]">
              {next.title} <span className="font-almanac text-lg text-brand-dark">→</span>
            </span>
          </Link>
        )}
      </div>
    </main>
  )
}
