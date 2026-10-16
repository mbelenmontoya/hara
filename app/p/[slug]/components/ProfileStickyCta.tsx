'use client'

// Floating WhatsApp bar shown at the bottom of the screen once the main button has scrolled away.
// Hidden means invisible (out of the tab order and screen readers), so only one button is reachable at a time.

import { ContactButton } from '@/app/components/ContactButton'

interface ProfileStickyCtaProps {
  show: boolean
  slug: string
  name: string
  whatsapp: string
  onBeforeNavigate: () => void
}

export function ProfileStickyCta({ show, slug, name, whatsapp, onBeforeNavigate }: ProfileStickyCtaProps) {
  return (
    <div
      data-testid="sticky-cta"
      aria-hidden={!show}
      className={`fixed inset-x-3.5 bottom-6 z-20 mx-auto max-w-md rounded-3xl bg-gray-50/90 p-2.5 shadow-strong backdrop-blur-md transition-[opacity,transform,visibility] duration-300 motion-reduce:transition-none ${
        show ? 'translate-y-0 opacity-100' : 'invisible translate-y-4 opacity-0 pointer-events-none'
      }`}
    >
      <ContactButton
        professionalSlug={slug}
        professionalName={name}
        whatsappNumber={whatsapp}
        trackingCode="direct-profile-visit"
        rank={0}
        unstyled
        className="w-full rounded-2xl bg-brand-dark px-4 py-3.5 font-almanac text-[15px] font-medium text-gray-50"
        onBeforeNavigate={onBeforeNavigate}
      />
    </div>
  )
}
