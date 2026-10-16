// The one dark block on the home page: invites people who don't know what they need to the concierge.

import Link from 'next/link'

export function HomeConcierge() {
  return (
    <section className="relative overflow-hidden rounded-[28px] bg-foreground px-[22px] pb-5 pt-[22px] text-background">
      <img
        src="/assets/almanac/orbita_punteada-cream.svg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute -right-[26px] -top-[18px] h-[160px] w-[118px] object-contain opacity-55"
      />
      <p className="font-almanac text-[10.5px] font-medium uppercase tracking-[0.21em] text-brand-weak">
        Concierge · Gratis
      </p>
      <h2 className="font-almanac-serif mt-2.5 max-w-[250px] text-[30px] leading-[1.05]">
        ¿No sabés qué <em>necesitás</em>?
      </h2>
      <div className="mt-3 flex items-center gap-3">
        <img
          src="/assets/almanac/tres_puntos-cream.svg"
          alt=""
          aria-hidden="true"
          className="h-[29px] w-[30px] flex-none object-contain"
        />
        <p className="font-almanac text-sm leading-[1.45] text-background/80">
          Contanos. Una persona del equipo te elige tres, en menos de 48 horas.
        </p>
      </div>
      <Link
        href="/solicitar"
        className="font-almanac mt-4 inline-flex rounded-[14px] bg-brand-weak px-5 py-3 text-[14.5px] font-medium text-brand-dark transition-opacity hover:opacity-90"
      >
        Contanos →
      </Link>
    </section>
  )
}
