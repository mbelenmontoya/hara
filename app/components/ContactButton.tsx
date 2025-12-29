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
  className?: string
}

export function ContactButton({
  professionalSlug,
  professionalName,
  whatsappNumber,
  trackingCode,
  rank,
  className = '',
}: ContactButtonProps) {
  const [isTracking, setIsTracking] = useState(false)

  const handleClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    setIsTracking(true)

    // Track event (non-blocking)
    const eventPayload = {
      event_type: 'contact_initiated',
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

    // Navigate immediately (don't await tracking)
    const whatsappUrl = `https://wa.me/${whatsappNumber}`
    window.location.href = whatsappUrl
  }

  return (
    <a
      href={`https://wa.me/${whatsappNumber}`}
      onClick={handleClick}
      data-testid={`contact-button-${professionalSlug}`}
      className={`inline-block px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors ${className} ${isTracking ? 'opacity-75' : ''}`}
    >
      {isTracking ? 'Opening WhatsApp...' : `Contact ${professionalName}`}
    </a>
  )
}
