// "Usar mi ubicación": browser position -> city, the same way the old directory's LocationFilter did it.

import { loadGoogleMapsScript } from '@/lib/google-maps-loader'
import { logError } from '@/lib/monitoring'
import type { LocationFilterValue } from '@/app/profesionales/components/DirectoryFilters'

function reject(err: Error, reject: (e: Error) => void): void {
  logError(err, { source: 'near-me' })
  reject(err)
}

/** Resolves with the visitor's city, or rejects when the position or the city cannot be found. */
export function locateNearMe(apiKey: string): Promise<LocationFilterValue> {
  return new Promise((resolve, fail) => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await loadGoogleMapsScript(apiKey)
          new google.maps.Geocoder().geocode(
            { location: { lat: pos.coords.latitude, lng: pos.coords.longitude } },
            (results, status) => {
              if (status !== 'OK' || !results?.length) return reject(new Error(`Geocoder status: ${status}`), fail)
              let city = ''
              let country = ''
              for (const comp of results[0].address_components) {
                if (comp.types.includes('locality')) city = comp.long_name
                else if (comp.types.includes('administrative_area_level_1') && !city) city = comp.long_name
                else if (comp.types.includes('country')) country = comp.short_name
              }
              if (!city) return reject(new Error('No city found'), fail)
              resolve({ city, country, lat: pos.coords.latitude, lng: pos.coords.longitude })
            }
          )
        } catch (err) {
          reject(err instanceof Error ? err : new Error(String(err)), fail)
        }
      },
      (err) => reject(new Error(`Geolocation error code: ${err.code}`), fail)
    )
  })
}
