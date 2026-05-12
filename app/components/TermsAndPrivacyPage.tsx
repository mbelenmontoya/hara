'use client'

import Link from 'next/link'
import { PageBackground } from '@/app/components/ui/PageBackground'
import { GlassCard } from '@/app/components/ui/GlassCard'
import { DisclosureItem, type DisclosureGroup } from '@/app/components/ui/Disclosure'

interface TermsAndPrivacyPageProps {
  updatedAt: string
  groups: readonly DisclosureGroup[]
}

export function TermsAndPrivacyPage({
  updatedAt,
  groups,
}: TermsAndPrivacyPageProps) {
  return (
    <div className="min-h-screen bg-background">
      <PageBackground />

      <div className="relative z-10 max-w-md md:max-w-[960px] mx-auto px-4 pt-8 pb-12">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-muted hover:text-foreground transition-colors mb-6"
        >
          ← Volver al inicio
        </Link>

        <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-3">
          Legal
        </p>
        <h1 className="text-3xl font-semibold text-foreground leading-tight mb-3">
          Términos y privacidad
        </h1>
        <p className="text-base text-muted leading-relaxed mb-4">
          En esta página reunimos la información legal básica de Hara Vital para que puedas revisar
          cómo funciona la plataforma y cómo tratamos los datos que compartís.
        </p>
        <p className="text-sm text-muted mb-8">
          Última actualización: <span className="text-foreground">{updatedAt}</span>
        </p>

        <div className="flex flex-wrap gap-x-4 gap-y-2 mb-6">
          <a
            href="#terminos"
            className="text-sm text-muted hover:text-foreground transition-colors"
          >
            Términos
          </a>
          <a
            href="#privacidad"
            className="text-sm text-muted hover:text-foreground transition-colors"
          >
            Privacidad
          </a>
        </div>

        <div className="space-y-4">
          {groups.map((group) => (
            <section
              key={group.id}
              id={group.id}
              className="scroll-mt-8"
            >
              <GlassCard>
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  {group.title}
                </h2>
                <p className="text-sm text-muted leading-relaxed mb-5">
                  {group.intro}
                </p>

                <div className="space-y-2">
                  {group.disclosures.map((disclosure) => (
                    <DisclosureItem key={disclosure.title} {...disclosure} />
                  ))}
                </div>
              </GlassCard>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
