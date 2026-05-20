'use client'

// Card 5: Contact — "How do I reach them?"
// This card becomes the sticky sidebar on desktop (Task 8).

import { ContactButton } from '@/app/components/ContactButton'
import { ReviewerEmailCapture } from '@/app/components/ReviewerEmailCapture'

interface ProfileContactProps {
  slug: string
  name: string
  whatsapp: string
  instagram: string | null
  showReviewCapture: boolean
}

export function ProfileContact({
  slug,
  name,
  whatsapp,
  instagram,
  showReviewCapture,
}: ProfileContactProps) {
  return (
    <div className="liquid-glass rounded-3xl shadow-elevated border border-outline/30 p-6">
      <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-4">Contacto</h2>

      <div className="space-y-3 mb-6">
        <div>
          <h3 className="text-xs text-muted mb-1">WhatsApp</h3>
          <p className="text-sm text-foreground">{whatsapp}</p>
        </div>

        {instagram && (
          <div>
            <h3 className="text-xs text-muted mb-1">Instagram</h3>
            <a
              href={instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-brand hover:underline"
            >
              {instagram.replace('https://www.instagram.com/', '@').replace(/[?/].*$/, '')}
            </a>
          </div>
        )}
      </div>

      <ContactButton
        professionalSlug={slug}
        professionalName={name}
        whatsappNumber={whatsapp}
        trackingCode="direct-profile-visit"
        rank={0}
        className="w-full"
      />

      {showReviewCapture && (
        <ReviewerEmailCapture professionalSlug={slug} />
      )}
    </div>
  )
}
