// Hará Match - Contact Button Component
// Purpose: Track contact events via sendBeacon + navigate to WhatsApp
// Security: NEVER blocks navigation, uses real WhatsApp number format
//
// Two event-tracking paths:
//   1. Concierge (attributionToken present): existing billing path with JWT.
//   2. Direct (no token): fires contact_click with professional_slug so the
//      reviews cron can pick it up. Email is read from localStorage where the
//      ReviewerEmailCapture component stores it after an opt-in.

'use client'

import { useState } from 'react'

interface ContactButtonProps {
  professionalSlug: string
  professionalName: string
  whatsappNumber: string // Format: digits only (e.g., "5215512345678")
  trackingCode: string
  rank: number
  attributionToken?: string // Optional: JWT token for concierge (attributed) visits
  className?: string
  onBeforeNavigate?: () => void // Optional: Called before opening WhatsApp
}

export function ContactButton({
  professionalSlug,
  professionalName,
  whatsappNumber,
  trackingCode,
  rank,
  attributionToken,
  className = '',
  onBeforeNavigate,
}: ContactButtonProps) {
  const [isTracking, setIsTracking] = useState(false)

  const handleClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.stopPropagation()
    setIsTracking(true)

    if (onBeforeNavigate) {
      try { onBeforeNavigate() } catch { /* callback errors must never block navigation */ }
    }

    // Always fire a contact_click event.
    // Concierge path: include attribution_token so the billing system records the PQL.
    // Direct path: include professional_slug so the reviews cron can issue review requests.
    const eventPayload = attributionToken
      ? {
          attribution_token: attributionToken,
          event_type:        'contact_click',
          tracking_code:     trackingCode,
          professional_slug: professionalSlug,
          rank,
          timestamp:         new Date().toISOString(),
        }
      : {
          professional_slug: professionalSlug,
          event_type:        'contact_click',
          timestamp:         new Date().toISOString(),
          // Read optional reviewer email from localStorage (set by ReviewerEmailCapture)
          reviewer_email:
            typeof window !== 'undefined'
              ? (localStorage.getItem(`reviewer-email:${professionalSlug}`) ?? undefined)
              : undefined,
        }

    const body = JSON.stringify(eventPayload)

    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' })
      navigator.sendBeacon('/api/events', blob)
    } else {
      fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {
        // Ignore errors — tracking must never block navigation
      })
    }

    setIsTracking(false)
  }

  return (
    <a
      href={`https://wa.me/${whatsappNumber}`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      data-testid={`contact-button-${professionalSlug}`}
      className={`inline-flex items-center justify-center px-6 py-3.5 bg-brand text-white font-semibold rounded-full shadow-elevated hover:bg-brand-hover hover:shadow-strong btn-press-glow transition-all duration-150 ${className} ${isTracking ? 'opacity-90' : ''}`}
    >
      {isTracking ? `Contactando a ${professionalName}...` : 'Abrir WhatsApp'}
    </a>
  )
}
