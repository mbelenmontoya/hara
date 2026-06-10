'use client'

import { useState, useEffect } from 'react'
import { PlacesAutocomplete } from '@/app/components/PlacesAutocomplete'
import { loadGoogleMapsScript } from '@/lib/google-maps-loader'
import { logError } from '@/lib/monitoring'
import { Chip } from '@/app/components/ui/Chip'
import type { LocationFilterValue } from './DirectoryFilters'

interface LocationFilterProps {
  value: LocationFilterValue | null
  onChange: (loc: LocationFilterValue | null) => void
}

export function LocationFilter({ value, onChange }: LocationFilterProps) {
  const [geoState, setGeoState] = useState<'idle' | 'loading' | 'error'>('idle')
  // Detected client-side to avoid hydration mismatch — navigator is undefined on the server
  const [supportsGeo, setSupportsGeo] = useState(false)

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  useEffect(() => {
    setSupportsGeo(!!apiKey && !!navigator?.geolocation)
  }, [apiKey])

  function handlePlaceSelect(_raw: string, placeData?: { city: string; country: string; countryCode: string; formattedAddress: string; lat?: number; lng?: number }) {
    if (!placeData) {
      onChange(null)
      return
    }
    onChange({
      city: placeData.city,
      country: placeData.countryCode,
      lat: placeData.lat ?? null,
      lng: placeData.lng ?? null,
    })
  }

  async function handleNearMe() {
    if (!navigator.geolocation) return
    setGeoState('loading')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await loadGoogleMapsScript(apiKey!)
          const geocoder = new google.maps.Geocoder()
          geocoder.geocode(
            { location: { lat: pos.coords.latitude, lng: pos.coords.longitude } },
            (results, status) => {
              if (status !== 'OK' || !results || results.length === 0) {
                logError(new Error(`Geocoder status: ${status}`), { source: 'LocationFilter.nearMe' })
                setGeoState('error')
                return
              }

              let city = ''
              let countryCode = ''
              for (const comp of results[0].address_components) {
                if (comp.types.includes('locality')) city = comp.long_name
                else if (comp.types.includes('administrative_area_level_1') && !city) city = comp.long_name
                else if (comp.types.includes('country')) countryCode = comp.short_name
              }

              if (!city) { setGeoState('error'); return }

              setGeoState('idle')
              onChange({ city, country: countryCode, lat: pos.coords.latitude, lng: pos.coords.longitude })
            }
          )
        } catch (err) {
          logError(err instanceof Error ? err : new Error(String(err)), { source: 'LocationFilter.nearMe' })
          setGeoState('error')
        }
      },
      (err) => {
        logError(new Error(`Geolocation error code: ${err.code}`), { source: 'LocationFilter.nearMe' })
        setGeoState('error')
      }
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold tracking-wider text-muted uppercase">
        Ubicación
      </p>

      {value ? (
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-weak border border-brand/20 text-brand text-sm font-medium">
            <span aria-hidden>📍</span>
            {value.city}
          </span>
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="Limpiar filtro de ubicación"
            className="text-muted hover:text-foreground transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <PlacesAutocomplete
            value=""
            onChange={handlePlaceSelect}
            placeholder="Buscar ciudad..."
            className="w-full sm:max-w-xs px-3 py-2 bg-surface/80 backdrop-blur-sm border border-outline rounded-xl text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all shadow-soft"
          />

          {supportsGeo && (
            <button
              type="button"
              onClick={handleNearMe}
              disabled={geoState === 'loading'}
              className="flex items-center gap-1.5 text-xs text-brand hover:text-brand/80 transition-colors disabled:opacity-60 whitespace-nowrap"
            >
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {geoState === 'loading' ? 'Buscando tu ubicación…' : 'Usar mi ubicación'}
            </button>
          )}
        </div>
      )}

      {geoState === 'error' && (
        <p className="text-xs text-danger">No pudimos detectar tu ubicación.</p>
      )}
    </div>
  )
}
