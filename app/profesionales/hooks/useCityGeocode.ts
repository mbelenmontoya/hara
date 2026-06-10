'use client'

import { useState, useEffect } from 'react'
import { loadGoogleMapsScript } from '@/lib/google-maps-loader'
import { logError } from '@/lib/monitoring'

interface CityInput { city: string; country: string }
type CoordsMap = Map<string, { lat: number; lng: number }>

function normalizeKey(city: string, country: string): string {
  return `${city.toLowerCase().trim().normalize('NFD').replace(/[̀-ͯ]/g, '')},${country.toLowerCase()}`
}

function readCache(key: string): { lat: number; lng: number } | null {
  try {
    const raw = localStorage.getItem(`hara:geocode:${key}`)
    if (!raw) return null
    return JSON.parse(raw) as { lat: number; lng: number }
  } catch {
    return null
  }
}

function writeCache(key: string, coords: { lat: number; lng: number }): void {
  try {
    localStorage.setItem(`hara:geocode:${key}`, JSON.stringify(coords))
  } catch {
    // localStorage quota — non-fatal
  }
}

/**
 * Geocodes a list of cities to lat/lng, deduping by normalized key and caching
 * results in localStorage so each distinct city is geocoded at most once per browser.
 */
export function useCityGeocode(cities: CityInput[]): CoordsMap {
  const [coordsMap, setCoordsMap] = useState<CoordsMap>(new Map())

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  useEffect(() => {
    if (!apiKey || cities.length === 0) return

    const distinctKeys = [...new Map(cities.map(c => [normalizeKey(c.city, c.country), c])).entries()]

    // Seed from cache
    const initial: CoordsMap = new Map()
    const missing: { key: string; city: string; country: string }[] = []

    for (const [key, input] of distinctKeys) {
      const cached = readCache(key)
      if (cached) {
        initial.set(key, cached)
      } else {
        missing.push({ key, ...input })
      }
    }

    if (initial.size > 0) {
      setCoordsMap(new Map(initial))
    }
    if (missing.length === 0) return

    loadGoogleMapsScript(apiKey).then(() => {
      const geocoder = new google.maps.Geocoder()
      missing.forEach(({ key, city, country }) => {
        geocoder.geocode({ address: `${city}, ${country}` }, (results, status) => {
          if (status !== 'OK' || !results || results.length === 0) {
            logError(new Error(`Geocoder failed for ${city}: ${status}`), { source: 'useCityGeocode' })
            return
          }
          const loc = results[0].geometry?.location
          if (!loc) return
          const coords = { lat: loc.lat(), lng: loc.lng() }
          writeCache(key, coords)
          setCoordsMap(prev => new Map([...prev, [key, coords]]))
        })
      })
    }).catch((err: unknown) => {
      logError(err instanceof Error ? err : new Error(String(err)), { source: 'useCityGeocode.load' })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, JSON.stringify(cities.map(c => normalizeKey(c.city, c.country)).sort())])

  return coordsMap
}
