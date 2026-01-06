// Hook for fetching recommendations data
// Handles loading, error states, and data fetching logic

import { useState, useEffect } from 'react'

export interface Professional {
  slug: string
  name: string
  specialty: string
  whatsapp: string
  bio?: string
  profile_image_url?: string
}

export interface Recommendation {
  id: string
  rank: number
  reasons: string[]
  attribution_token: string
  professional: Professional
}

interface UseRecommendationsResult {
  recommendations: Recommendation[]
  loading: boolean
  error: 'expired' | 'fetch' | 'network' | null
}

/**
 * Fetches match recommendations for a given tracking code
 * @param trackingCode - Match tracking code (format: M-timestamp-id)
 * @returns Loading state, recommendations data, and error state
 */
export function useRecommendations(trackingCode: string): UseRecommendationsResult {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<'expired' | 'fetch' | 'network' | null>(null)
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])

  useEffect(() => {
    if (!trackingCode) {
      setLoading(false)
      return
    }

    async function fetchRecommendations() {
      try {
        const res = await fetch(`/api/public/recommendations?tracking_code=${trackingCode}`)

        if (res.status === 404) {
          setError('expired')
          setLoading(false)
          return
        }

        if (!res.ok) {
          setError('fetch')
          setLoading(false)
          return
        }

        const data = await res.json()
        setRecommendations(data.recommendations || [])
        setLoading(false)
      } catch (err) {
        setError('network')
        setLoading(false)
      }
    }

    fetchRecommendations()
  }, [trackingCode])

  return { recommendations, loading, error }
}
