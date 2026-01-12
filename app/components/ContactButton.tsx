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
  attributionToken?: string // Optional: JWT token for /api/events validation (only for attributed visits)
  className?: string
  onBeforeNavigate?: () => void // Optional: Called before opening WhatsApp (e.g., to open bottom sheet)
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
    // Stop propagation to prevent parent card onClick from firing
    e.stopPropagation()
    // Don't prevent default - let the link open naturally with target="_blank"
    setIsTracking(true)

    // Call optional callback before navigation (e.g., open bottom sheet)
    if (onBeforeNavigate) {
      onBeforeNavigate()
    }

    // Only track events for attributed visits (from matches with attribution tokens)
    // Direct profile visits (no attribution token) skip event tracking
    if (attributionToken) {
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
      className={`inline-flex items-center justify-center px-6 py-3.5 bg-brand text-white font-semibold rounded-full shadow-elevated hover:bg-brand-hover hover:shadow-strong btn-press-glow transition-all duration-150 ${className} ${isTracking ? 'opacity-90' : ''}`}
    >
      {isTracking ? 'Abriendo WhatsApp...' : 'Abrir WhatsApp'}
    </a>
  )
}
