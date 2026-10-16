'use client'

// Contact: main WhatsApp button, Instagram shortcut, email link, and the floating bar that
// takes over once the main button scrolls out of view.
// Fires analytics events: instagram_click on IG link, whatsapp_click on WhatsApp button.
// The ContactButton also fires contact_click (for the reviews cron) independently.

import { useEffect, useRef, useState } from 'react'
import { ContactButton } from '@/app/components/ContactButton'
import { fireProfileEvent } from '@/lib/profile-events'
import { ProfileStickyCta } from './ProfileStickyCta'

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
  email: string
}

export function ProfileContact({
  slug,
  name,
  whatsapp,
  instagram,
  email,
}: ProfileContactProps) {
  const ig = instagram ? normalizeInstagram(instagram) : null
  const mainCtaRef = useRef<HTMLDivElement>(null)
  const [mainCtaVisible, setMainCtaVisible] = useState(true)

  useEffect(() => {
    const el = mainCtaRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) => setMainCtaVisible(entry.isIntersecting))
    observer.observe(el)
    return () => observer.disconnect()
  }, [whatsapp])

  const trackWhatsapp = () => fireProfileEvent('whatsapp_click', slug)

  return (
    <div>
      <div ref={mainCtaRef} className="flex gap-2">
        {whatsapp && (
          <ContactButton
            professionalSlug={slug}
            professionalName={name}
            whatsappNumber={whatsapp}
            trackingCode="direct-profile-visit"
            rank={0}
            unstyled
            className="flex-1 rounded-2xl bg-brand-dark px-4 py-4 font-almanac text-[15px] font-medium text-gray-50 hover:opacity-90 transition-opacity"
            onBeforeNavigate={trackWhatsapp}
          />
        )}

        {ig && (
          <a
            href={ig.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={ig.label}
            className={`flex items-center justify-center rounded-2xl bg-surface-2 font-almanac font-medium text-brand-dark hover:opacity-90 transition-opacity ${
              whatsapp ? 'w-[52px] text-[11.5px]' : 'flex-1 py-4 text-[15px]'
            }`}
            onClick={() => fireProfileEvent('instagram_click', slug)}
          >
            {whatsapp ? 'IG' : 'Ver en Instagram'}
          </a>
        )}
      </div>

      {email && (
        <p className="mt-3 text-center font-almanac text-[13px] text-muted">
          <a href={`mailto:${email}`} className="underline underline-offset-2 hover:text-brand-dark">
            {email}
          </a>
        </p>
      )}

      {whatsapp && (
        <ProfileStickyCta
          show={!mainCtaVisible}
          slug={slug}
          name={name}
          whatsapp={whatsapp}
          onBeforeNavigate={trackWhatsapp}
        />
      )}
    </div>
  )
}
