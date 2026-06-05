'use client'

// Card 5: Contact — "How do I reach them?"
// Shows Instagram link + WhatsApp button only. No raw phone number displayed.

import { ContactButton } from '@/app/components/ContactButton'

function normalizeInstagram(raw: string): { href: string; label: string } {
  const handle = raw
    .replace(/^https?:\/\/(www\.)?instagram\.com\//, '')
    .replace(/[/?].*$/, '')
    .replace(/^@/, '')
  return { href: `https://www.instagram.com/${handle}`, label: `@${handle}` }
}

interface ProfileContactProps {
  slug: string
  name: string
  whatsapp: string
  instagram: string | null
}

export function ProfileContact({
  slug,
  name,
  whatsapp,
  instagram,
}: ProfileContactProps) {
  const ig = instagram ? normalizeInstagram(instagram) : null

  return (
    <div className="liquid-glass rounded-3xl shadow-elevated border border-outline/30 p-6">
      <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-4">Contacto</h2>

      {ig && (
        <div className="mb-4">
          <h3 className="text-xs text-muted mb-1">Instagram</h3>
          <a
            href={ig.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-brand hover:underline"
          >
            {ig.label}
          </a>
        </div>
      )}

      <ContactButton
        professionalSlug={slug}
        professionalName={name}
        whatsappNumber={whatsapp}
        trackingCode="direct-profile-visit"
        rank={0}
      />
    </div>
  )
}
