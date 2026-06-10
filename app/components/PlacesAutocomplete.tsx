// Google Places Autocomplete Component
// Provides location search with autocomplete suggestions

'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { loadGoogleMapsScript } from '@/lib/google-maps-loader'

interface PlacesAutocompleteProps {
  value: string
  onChange: (value: string, placeData?: PlaceData) => void
  placeholder?: string
  className?: string
  /** Restrict results to specific place types. Defaults to ['(cities)']. */
  types?: string[]
}

export interface PlaceData {
  city: string
  country: string
  countryCode: string
  formattedAddress: string
  lat?: number
  lng?: number
}

declare global {
  interface Window {
    google: typeof google
  }
}

export function PlacesAutocomplete({
  value,
  onChange,
  placeholder = 'Buscar ubicación...',
  className = '',
  types = ['(cities)'],
}: PlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [inputValue, setInputValue] = useState(value)

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  useEffect(() => {
    setInputValue(value)
  }, [value])

  const initAutocomplete = useCallback(() => {
    if (!inputRef.current || !window.google || autocompleteRef.current) return

    autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
      types,
      fields: ['address_components', 'formatted_address', 'geometry'],
    })

    autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current?.getPlace()
      if (!place || !place.address_components) return

      let city = ''
      let country = ''
      let countryCode = ''

      for (const component of place.address_components) {
        const componentTypes = component.types
        if (componentTypes.includes('locality')) {
          city = component.long_name
        } else if (componentTypes.includes('administrative_area_level_1') && !city) {
          city = component.long_name
        } else if (componentTypes.includes('country')) {
          country = component.long_name
          countryCode = component.short_name
        }
      }

      const placeData: PlaceData = {
        city,
        country,
        countryCode,
        formattedAddress: place.formatted_address || '',
        lat: place.geometry?.location?.lat(),
        lng: place.geometry?.location?.lng(),
      }

      setInputValue(placeData.formattedAddress)
      onChange(placeData.formattedAddress, placeData)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps -- types is read once at init; re-init requires imperative cleanup of the Autocomplete instance. All current callers pass a stable array literal.
  }, [onChange, types])

  useEffect(() => {
    if (!apiKey) {
      console.warn('Google Maps API key not found')
      return
    }

    loadGoogleMapsScript(apiKey).then(() => {
      setIsLoaded(true)
      initAutocomplete()
    })
  }, [apiKey, initAutocomplete])

  useEffect(() => {
    if (isLoaded) {
      initAutocomplete()
    }
  }, [isLoaded, initAutocomplete])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    onChange(newValue)
  }

  if (!apiKey) {
    return (
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        placeholder={placeholder}
        className={className}
      />
    )
  }

  return (
    <input
      ref={inputRef}
      type="text"
      value={inputValue}
      onChange={handleInputChange}
      placeholder={placeholder}
      className={className}
      autoComplete="off"
    />
  )
}
