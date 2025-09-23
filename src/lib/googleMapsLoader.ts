// src/lib/googleMapsLoader.ts - Centralized Google Maps Loader
class GoogleMapsLoader {
  private static instance: GoogleMapsLoader
  private isLoading = false
  private isLoaded = false
  private loadPromise: Promise<void> | null = null
  private apiKey: string | null = null

  private constructor() {}

  static getInstance(): GoogleMapsLoader {
    if (!GoogleMapsLoader.instance) {
      GoogleMapsLoader.instance = new GoogleMapsLoader()
    }
    return GoogleMapsLoader.instance
  }

  async loadGoogleMaps(): Promise<void> {
    // If already loaded, return immediately
    if (this.isLoaded && window.google?.maps) {
      return Promise.resolve()
    }

    // If currently loading, return the existing promise
    if (this.isLoading && this.loadPromise) {
      return this.loadPromise
    }

    // Check API key
    this.apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || null
    if (!this.apiKey) {
      throw new Error('Google Maps API key not configured')
    }

    // Check if script is already in DOM
    const existingScript = document.querySelector(`script[src*="maps.googleapis.com"]`)
    if (existingScript && window.google?.maps) {
      this.isLoaded = true
      return Promise.resolve()
    }

    // Start loading
    this.isLoading = true
    this.loadPromise = this.createLoadPromise()

    try {
      await this.loadPromise
      this.isLoaded = true
    } catch (error) {
      this.isLoading = false
      this.loadPromise = null
      throw error
    } finally {
      this.isLoading = false
    }
  }

  private createLoadPromise(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Remove any existing scripts to prevent conflicts
      const existingScripts = document.querySelectorAll(`script[src*="maps.googleapis.com"]`)
      existingScripts.forEach(script => script.remove())

      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${this.apiKey}&libraries=places,geometry`
      script.async = true
      script.defer = true

      script.onload = () => {
        if (window.google?.maps) {
          resolve()
        } else {
          reject(new Error('Google Maps failed to load'))
        }
      }

      script.onerror = () => {
        reject(new Error('Failed to load Google Maps script'))
      }

      document.head.appendChild(script)
    })
  }

  isGoogleMapsLoaded(): boolean {
    return this.isLoaded && !!window.google?.maps
  }

  createGeocoder() {
    if (!this.isGoogleMapsLoaded()) {
      throw new Error('Google Maps not loaded')
    }
    return new window.google.maps.Geocoder()
  }
}

export default GoogleMapsLoader.getInstance()