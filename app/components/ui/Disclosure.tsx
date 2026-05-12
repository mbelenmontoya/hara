// Reusable accordion disclosure primitives.
// Shared by TermsAndPrivacyPage (/terminosyprivacidad) and AyudaPage (/ayuda).

'use client'

import { useState } from 'react'

export interface DisclosureEntry {
  title: string
  paragraphs: readonly string[]
  bullets?: readonly string[]
}

export interface DisclosureGroup {
  id: string
  title: string
  intro: string
  disclosures: readonly DisclosureEntry[]
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

export function DisclosureItem({
  title,
  paragraphs,
  bullets,
}: DisclosureEntry) {
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
