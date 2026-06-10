'use client'

// DirectoryMap — renders a Google Maps view with one pin per professional.
// Pins use stored coordinates when available; coord-less pros fall back to
// a client-side geocoded city centroid (cached in localStorage).
// Classic google.maps.Marker is used for v1 — AdvancedMarkerElement requires
// a mapId and is overkill here. Note: Marker is deprecated in the Maps JS API
// but still functional; migrate when mapId is adopted.

import { useEffect, useRef, useMemo, useState } from 'react'
import { loadGoogleMapsScript } from '@/lib/google-maps-loader'
import { logError } from '@/lib/monitoring'
import { useCityGeocode } from '../hooks/useCityGeocode'
import type { DirectoryProfessional } from './ProfessionalsDirectory'

const LATAM_CENTER = { lat: -20, lng: -55 }
const LATAM_ZOOM = 3

function slugHash(slug: string): number {
  return slug.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
}

function jitter(slug: string, base: number): number {
  return base + ((slugHash(slug) % 7) - 3) * 0.0008
}

interface Props {
  professionals: DirectoryProfessional[]
}

export function DirectoryMap({ professionals }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  // Stable map instance — created once, never recreated on filter/geocode changes
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any[]>([])
  // Triggers the marker effect after the map is initialized
  const [mapReady, setMapReady] = useState(false)

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  // Only geocode pros that don't have stored coordinates
  const needsGeocode = useMemo(
    () => professionals
      .filter(p => !p.latitude || !p.longitude)
      .map(p => ({ city: p.city ?? '', country: p.country }))
      .filter(c => c.city),
    [professionals]
  )

  const coordsMap = useCityGeocode(needsGeocode)

  // Effect 1 — create the map once when the API loads
  useEffect(() => {
    if (!mapRef.current || !apiKey) return
    const el = mapRef.current

    loadGoogleMapsScript(apiKey).then(() => {
      if (mapInstanceRef.current) return // already initialized
      mapInstanceRef.current = new google.maps.Map(el, {
        center: LATAM_CENTER,
        zoom: LATAM_ZOOM,
        mapTypeControl: false,
        fullscreenControl: false,
        streetViewControl: false,
      })
      setMapReady(true)
    }).catch((err: unknown) => {
      logError(err instanceof Error ? err : new Error(String(err)), { source: 'DirectoryMap.init' })
    })
  }, [apiKey])

  // Effect 2 — sync markers whenever the professional list or geocode results change.
  // mapReady in deps ensures this runs after Effect 1 creates the map instance.
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || !mapReady) return

    // Clear previous markers before re-rendering the full set
    markersRef.current.forEach(m => m.setMap(null))
    markersRef.current = []

    const bounds = new google.maps.LatLngBounds()
    let pinCount = 0

    for (const pro of professionals) {
      let lat: number | null = pro.latitude
      let lng: number | null = pro.longitude

      if (!lat || !lng) {
        const key = `${pro.city?.toLowerCase().trim().normalize('NFD').replace(/[̀-ͯ]/g, '')},${pro.country.toLowerCase()}`
        const cached = coordsMap.get(key)
        if (cached) { lat = cached.lat; lng = cached.lng }
      }

      if (!lat || !lng) continue

      // Deterministic jitter so same-centroid pins don't perfectly overlap
      const position = { lat: jitter(pro.slug, lat), lng: jitter(`${pro.slug}_lng`, lng) }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const marker = new (google.maps.Marker as any)({
        position,
        map,
        title: pro.full_name,
      })

      const infoWindow = new google.maps.InfoWindow({
        content: `<div style="font-family:sans-serif;padding:4px 2px"><strong style="font-size:13px">${pro.full_name}</strong><br><a href="/p/${pro.slug}" style="color:#4B2BBF;font-size:12px">Ver perfil →</a></div>`,
      })

      google.maps.event.addListener(marker, 'click', () => {
        infoWindow.open({ map, anchor: marker })
      })

      markersRef.current.push(marker)
      bounds.extend(position)
      pinCount++
    }

    if (pinCount > 0) {
      map.fitBounds(bounds)
    }
  }, [professionals, coordsMap, mapReady])

  return (
    <div
      ref={mapRef}
      data-testid="directory-map"
      className="w-full rounded-2xl overflow-hidden shadow-elevated"
      style={{ height: '480px' }}
      aria-label="Mapa de profesionales"
    />
  )
}
