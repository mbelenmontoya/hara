// Hook for fetching the concierge Carta data
// Handles loading, error states, and data fetching logic

import { useState, useEffect } from 'react'
import type { CartaPick } from '@/lib/carta'

export interface CartaHeader {
  first_name: string | null
  sent_at: string
}

export type CartaError = 'not-found' | 'fetch' | 'network'

interface UseRecommendationsResult {
  carta: CartaHeader | null
  recommendations: CartaPick[]
  loading: boolean
  error: CartaError | null
}

/**
 * Fetches the Carta (person's first name, date and recommended professionals) for a tracking code
 * @param trackingCode - Match tracking code (format: M-timestamp-id)
 */
export function useRecommendations(trackingCode: string): UseRecommendationsResult {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<CartaError | null>(null)
  const [carta, setCarta] = useState<CartaHeader | null>(null)
  const [recommendations, setRecommendations] = useState<CartaPick[]>([])

  useEffect(() => {
    if (!trackingCode) {
      setLoading(false)
      return
    }

    async function fetchCarta() {
      try {
        const res = await fetch(`/api/public/recommendations?tracking_code=${encodeURIComponent(trackingCode)}`)
        if (res.status === 404 || res.status === 400) {
          setError('not-found')
        } else if (!res.ok) {
          setError('fetch')
        } else {
          const data = await res.json()
          setCarta(data.carta ?? null)
          setRecommendations(data.recommendations ?? [])
        }
      } catch {
        setError('network')
      }
      setLoading(false)
    }

    fetchCarta()
  }, [trackingCode])

  return { carta, recommendations, loading, error }
}
