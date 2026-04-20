'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PageBackground } from '@/app/components/ui/PageBackground'
import { GlassCard } from '@/app/components/ui/GlassCard'

interface LegalDisclosure {
  title: string
  paragraphs: readonly string[]
  bullets?: readonly string[]
}

interface LegalGroup {
  id: string
  title: string
  intro: string
  disclosures: readonly LegalDisclosure[]
}

interface TermsAndPrivacyPageProps {
  updatedAt: string
  groups: readonly LegalGroup[]
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className={`h-4 w-4 flex-shrink-0 text-muted transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 4.5 12.5 10 7 15.5" />
    </svg>
  )
}

function DisclosureItem({
  title,
  paragraphs,
  bullets,
}: LegalDisclosure) {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="w-full grid grid-cols-[16px_1fr] gap-3 py-3 text-left text-foreground"
      >
        <span className="pt-0.5">
          <Chevron open={open} />
        </span>
        <span className="block text-sm font-semibold text-foreground leading-snug">{title}</span>
      </button>

      {open && (
        <div className="pl-7 pt-1 space-y-3">
          {paragraphs.map((paragraph) => (
            <p key={paragraph} className="text-sm text-muted leading-relaxed">
              {paragraph}
            </p>
          ))}

          {bullets && (
            <ul className="space-y-2">
              {bullets.map((bullet) => (
                <li key={bullet} className="flex gap-2 text-sm text-muted leading-relaxed">
                  <span className="text-brand">•</span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

export function TermsAndPrivacyPage({
  updatedAt,
  groups,
}: TermsAndPrivacyPageProps) {
  return (
    <div className="min-h-screen bg-background">
      <PageBackground />

      <div className="relative z-10 max-w-md mx-auto px-4 pt-8 pb-12">
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
          En esta página reunimos la información legal básica de Hará Match para que puedas revisar
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
