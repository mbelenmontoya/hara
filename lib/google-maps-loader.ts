// Singleton Maps JS API script loader shared across all Google Maps consumers
// (PlacesAutocomplete, Geocoder, DirectoryMap) so the script loads exactly once.

declare global {
  interface Window {
    initGoogleMaps: () => void
  }
}

let isScriptLoading = false
let isScriptLoaded = false
const callbacks: (() => void)[] = []

export function loadGoogleMapsScript(apiKey: string): Promise<void> {
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
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async&callback=initGoogleMaps`
    script.async = true
    script.defer = true
    document.head.appendChild(script)
  })
}
