// Hará Match - Contact Button Component
// Purpose: Track contact events via sendBeacon + navigate to WhatsApp
// Security: NEVER blocks navigation, uses real WhatsApp number format

'use client'

import { useState } from 'react'

interface ContactButtonProps {
  professionalSlug: string
  professionalName: string
  whatsappNumber: string // Format: digits only (e.g., "5215512345678")
  trackingCode: string
  rank: number
  attributionToken: string // JWT token for /api/events validation
  className?: string
}

export function ContactButton({
  professionalSlug,
  professionalName,
  whatsappNumber,
  trackingCode,
  rank,
  attributionToken,
  className = '',
}: ContactButtonProps) {
  const [isTracking, setIsTracking] = useState(false)

  const handleClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Don't prevent default - let the link open naturally with target="_blank"
    // Track event (non-blocking, fires before navigation)
    setIsTracking(true)

    const eventPayload = {
      attribution_token: attributionToken,
      event_type: 'contact_click',
      tracking_code: trackingCode,
      professional_slug: professionalSlug,
      rank,
      timestamp: new Date().toISOString(),
    }

    // Try sendBeacon first (most reliable for navigation)
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(eventPayload)], { type: 'application/json' })
      navigator.sendBeacon('/api/events', blob)
    } else {
      // Fallback: fetch with keepalive
      fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventPayload),
        keepalive: true,
      }).catch(() => {
        // Ignore errors - tracking should never block navigation
      })
    }

    // Let browser handle navigation (target="_blank" opens new tab)
    setIsTracking(false)
  }

  return (
    <a
      href={`https://wa.me/${whatsappNumber}`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      data-testid={`contact-button-${professionalSlug}`}
      className={`inline-block px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors ${className} ${isTracking ? 'opacity-75' : ''}`}
    >
      {isTracking ? 'Opening WhatsApp...' : `Contact ${professionalName}`}
    </a>
  )
}
