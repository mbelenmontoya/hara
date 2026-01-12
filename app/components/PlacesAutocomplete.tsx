// Google Places Autocomplete Component
// Provides location search with autocomplete suggestions

'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface PlacesAutocompleteProps {
  value: string
  onChange: (value: string, placeData?: PlaceData) => void
  placeholder?: string
  className?: string
}

interface PlaceData {
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
    initGoogleMaps: () => void
  }
}

let isScriptLoading = false
let isScriptLoaded = false
const callbacks: (() => void)[] = []

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  return new Promise((resolve) => {
    if (isScriptLoaded) {
      resolve()
      return
    }

    callbacks.push(resolve)

    if (isScriptLoading) {
      return
    }

    isScriptLoading = true

    window.initGoogleMaps = () => {
      isScriptLoaded = true
      isScriptLoading = false
      callbacks.forEach(cb => cb())
      callbacks.length = 0
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMaps`
    script.async = true
    script.defer = true
    document.head.appendChild(script)
  })
}

export function PlacesAutocomplete({
  value,
  onChange,
  placeholder = 'Buscar ubicación...',
  className = '',
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
      types: ['(cities)'],
      fields: ['address_components', 'formatted_address', 'geometry'],
    })

    autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current?.getPlace()
      if (!place || !place.address_components) return

      let city = ''
      let country = ''
      let countryCode = ''

      for (const component of place.address_components) {
        const types = component.types
        if (types.includes('locality')) {
          city = component.long_name
        } else if (types.includes('administrative_area_level_1') && !city) {
          city = component.long_name
        } else if (types.includes('country')) {
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
  }, [onChange])

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
