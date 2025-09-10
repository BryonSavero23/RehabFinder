// src/components/GoogleMap.tsx - CLEAN VERSION
'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader } from '@googlemaps/js-api-loader'

interface Centre {
  name: string
  address: string
  lat: number
  lng: number
  type: string
  phone?: string
  email?: string
  website?: string
}

interface GoogleMapProps {
  center?: { lat: number; lng: number }
  centres?: Centre[]
  height?: string
}

declare global {
  interface Window {
    google: any
  }
}

export default function GoogleMap({ 
  center, 
  centres = [], 
  height = "400px" 
}: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const infoWindowRef = useRef<any>(null)
  const geocoderRef = useRef<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [geocodingProgress, setGeocodingProgress] = useState<{
    total: number
    completed: number
    isActive: boolean
  }>({ total: 0, completed: 0, isActive: false })

  // Default center (Malaysia)
  const defaultCenter = { lat: 4.2105, lng: 101.9758 }
  const mapCenter = center || defaultCenter

  useEffect(() => {
    initializeMap()
  }, [center, centres])

  const initializeMap = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Check if API key is available
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
      if (!apiKey) {
        throw new Error('Google Maps API key is not configured.')
      }

      // Initialize the loader
      const loader = new Loader({
        apiKey: apiKey,
        version: 'weekly',
        libraries: ['places', 'geometry']
      })

      // Load Google Maps
      await loader.load()

      if (!mapRef.current) return

      // Create the map
      const map = new window.google.maps.Map(mapRef.current, {
        center: mapCenter,
        zoom: center ? 12 : 6,
        styles: [
          {
            featureType: 'water',
            elementType: 'geometry',
            stylers: [{ color: '#e3f2fd' }]
          },
          {
            featureType: 'landscape',
            elementType: 'geometry',
            stylers: [{ color: '#f5f5f5' }]
          }
        ],
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
        zoomControl: true,
      })

      mapInstanceRef.current = map

      // Add custom "My Location" button to the map
      addLocationButton(map)

      // Initialize geocoder
      geocoderRef.current = new window.google.maps.Geocoder()

      // Clear existing markers
      clearMarkers()

      // Create info window
      infoWindowRef.current = new window.google.maps.InfoWindow()

      // Add user location marker if provided
      if (center) {
        addUserLocationMarker(map, center)
      }

      // Add center markers (with geocoding if needed)
      if (centres && centres.length > 0) {
        await addCenterMarkersWithGeocoding(map, centres)
      }

      setIsLoading(false)

    } catch (err) {
      console.error('Error loading Google Maps:', err)
      setError(err instanceof Error ? err.message : 'Failed to load map')
      setIsLoading(false)
    }
  }

  const addLocationButton = (map: any) => {
    // Create the DIV to hold the control
    const controlDiv = document.createElement('div')
    
    // Set CSS for the control border
    const controlUI = document.createElement('div')
    controlUI.style.backgroundColor = '#fff'
    controlUI.style.border = '2px solid #fff'
    controlUI.style.borderRadius = '3px'
    controlUI.style.boxShadow = '0 2px 6px rgba(0,0,0,.3)'
    controlUI.style.cursor = 'pointer'
    controlUI.style.marginTop = '8px'
    controlUI.style.marginRight = '10px'
    controlUI.style.textAlign = 'center'
    controlUI.title = 'Click to get your current location'
    controlDiv.appendChild(controlUI)
    
    // Set CSS for the control interior
    const controlText = document.createElement('div')
    controlText.style.color = 'rgb(25,25,25)'
    controlText.style.fontFamily = 'Roboto,Arial,sans-serif'
    controlText.style.fontSize = '16px'
    controlText.style.lineHeight = '38px'
    controlText.style.paddingLeft = '5px'
    controlText.style.paddingRight = '5px'
    controlText.innerHTML = '📍'
    controlUI.appendChild(controlText)
    
    // Add the control to the map
    map.controls[window.google.maps.ControlPosition.TOP_RIGHT].push(controlDiv)
    
    // Setup the click event listeners
    controlUI.addEventListener('click', () => {
      getCurrentLocationOnMap(map)
    })
  }

  const getCurrentLocationOnMap = (map: any) => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const pos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }

        // Remove any existing user location markers
        markersRef.current.forEach(marker => {
          if (marker.getTitle() === 'Your Current Location') {
            marker.setMap(null)
          }
        })

        // Add user location marker
        const userMarker = new window.google.maps.Marker({
          position: pos,
          map: map,
          title: 'Your Current Location',
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: '#4285F4',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 4
          },
          zIndex: 1000
        })

        markersRef.current.push(userMarker)

        // Create info window for user location
        const accuracy = position.coords.accuracy
        userMarker.addListener('click', () => {
          infoWindowRef.current.setContent(`
            <div style="padding: 12px; font-family: Arial, sans-serif;">
              <h3 style="margin: 0 0 8px 0; color: #4285F4;">📍 Your Current Location</h3>
              <p style="margin: 0 0 4px 0; color: #666; font-size: 13px;">
                <strong>Latitude:</strong> ${pos.lat.toFixed(8)}
              </p>
              <p style="margin: 0 0 4px 0; color: #666; font-size: 13px;">
                <strong>Longitude:</strong> ${pos.lng.toFixed(8)}
              </p>
              <p style="margin: 0; color: #666; font-size: 13px;">
                <strong>Accuracy:</strong> ±${Math.round(accuracy)}m
              </p>
            </div>
          `)
          infoWindowRef.current.open(map, userMarker)
        })

        // Center and zoom the map to user location
        map.setCenter(pos)
        map.setZoom(15)

        console.log('📍 Current location found:', {
          latitude: pos.lat,
          longitude: pos.lng,
          accuracy: `±${Math.round(accuracy)}m`
        })
      },
      (error) => {
        alert('Could not get your location. Please enable location access.')
        console.error('Geolocation error:', error)
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 300000,
      }
    )
  }

  const clearMarkers = () => {
    markersRef.current.forEach(marker => marker.setMap(null))
    markersRef.current = []
  }

  const addUserLocationMarker = (map: any, userLocation: { lat: number; lng: number }) => {
    const userMarker = new window.google.maps.Marker({
      position: userLocation,
      map: map,
      title: 'Your Location',
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#4285F4',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 3
      },
      zIndex: 1000
    })

    markersRef.current.push(userMarker)
  }

  const addCenterMarkersWithGeocoding = async (map: any, centers: Centre[]) => {
    const bounds = new window.google.maps.LatLngBounds()
    let validCenters = 0

    // First, try to add centers that already have coordinates
    const centersWithCoords = centers.filter(centre => 
      centre.lat && centre.lng && centre.lat !== 0 && centre.lng !== 0
    )

    const centersNeedingGeocode = centers.filter(centre => 
      !centre.lat || !centre.lng || centre.lat === 0 || centre.lng === 0
    )

    console.log(`Centers with coordinates: ${centersWithCoords.length}`)
    console.log(`Centers needing geocoding: ${centersNeedingGeocode.length}`)

    // Add centers that already have coordinates
    centersWithCoords.forEach(centre => {
      const position = { lat: centre.lat, lng: centre.lng }
      addMarkerToMap(map, centre, position, bounds)
      validCenters++
    })

    // Geocode centers that don't have coordinates (limit to first 20 for performance)
    if (centersNeedingGeocode.length > 0) {
      const centersToGeocode = centersNeedingGeocode.slice(0, 20)
      
      setGeocodingProgress({ 
        total: centersToGeocode.length, 
        completed: 0, 
        isActive: true 
      })

      for (let i = 0; i < centersToGeocode.length; i++) {
        const centre = centersToGeocode[i]
        
        try {
          const position = await geocodeAddress(centre.address)
          if (position) {
            addMarkerToMap(map, centre, position, bounds)
            validCenters++
          }
        } catch (error) {
          console.warn(`Failed to geocode: ${centre.name}`)
        }

        setGeocodingProgress(prev => ({ 
          ...prev, 
          completed: i + 1 
        }))

        // Add delay to avoid hitting API limits
        if (i < centersToGeocode.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200))
        }
      }

      setGeocodingProgress(prev => ({ 
        ...prev, 
        isActive: false 
      }))
    }

    // Fit map to show all markers if no user location
    if (validCenters > 0 && !center) {
      map.fitBounds(bounds)
    }

    console.log(`Total markers added: ${validCenters}`)
  }

  const geocodeAddress = (address: string): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      if (!geocoderRef.current) {
        resolve(null)
        return
      }

      geocoderRef.current.geocode(
        { 
          address: address,
          region: 'MY'
        },
        (results: any[], status: string) => {
          if (status === 'OK' && results[0]) {
            const location = results[0].geometry.location
            resolve({
              lat: location.lat(),
              lng: location.lng()
            })
          } else {
            resolve(null)
          }
        }
      )
    })
  }

  const addMarkerToMap = (map: any, centre: Centre, position: { lat: number; lng: number }, bounds: any) => {
    const marker = new window.google.maps.Marker({
      position: position,
      map: map,
      title: centre.name,
      icon: {
        path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
        scale: 5,
        fillColor: getMarkerColor(centre.type),
        fillOpacity: 0.9,
        strokeColor: '#ffffff',
        strokeWeight: 1
      }
    })

    const infoContent = createInfoWindowContent(centre)

    marker.addListener('click', () => {
      infoWindowRef.current.setContent(infoContent)
      infoWindowRef.current.open(map, marker)
    })

    markersRef.current.push(marker)
    bounds.extend(position)
  }

  const getMarkerColor = (type: string): string => {
    const colors: { [key: string]: string } = {
      'Inpatient': '#e53e3e',
      'Outpatient': '#38a169',
      'Community': '#805ad5',
      'Traditional': '#d69e2e',
      'Specialist': '#3182ce',
    }
    return colors[type] || '#666666'
  }

  const createInfoWindowContent = (centre: Centre): string => {
    return `
      <div style="padding: 12px; max-width: 300px; font-family: Arial, sans-serif;">
        <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold; color: #333;">
          ${centre.name}
        </h3>
        <p style="margin: 0 0 6px 0; color: #666; font-size: 14px; line-height: 1.4;">
          📍 ${centre.address}
        </p>
        <p style="margin: 0 0 8px 0; color: #888; font-size: 13px;">
          🏥 <strong>Type:</strong> ${centre.type}
        </p>
        <div style="border-top: 1px solid #eee; padding-top: 8px; margin-top: 8px;">
          ${centre.phone ? `
            <p style="margin: 0 0 4px 0; font-size: 13px;">
              📞 <a href="tel:${centre.phone}" style="color: #1976d2; text-decoration: none;">${centre.phone}</a>
            </p>
          ` : ''}
          ${centre.email ? `
            <p style="margin: 0 0 4px 0; font-size: 13px;">
              ✉️ <a href="mailto:${centre.email}" style="color: #1976d2; text-decoration: none;">${centre.email}</a>
            </p>
          ` : ''}
          ${centre.website ? `
            <p style="margin: 0; font-size: 13px;">
              🌐 <a href="${centre.website.startsWith('http') ? centre.website : `https://${centre.website}`}" 
                     target="_blank" rel="noopener noreferrer" 
                     style="color: #1976d2; text-decoration: none;">Visit Website</a>
            </p>
          ` : ''}
        </div>
      </div>
    `
  }

  if (error) {
    return (
      <div 
        className="w-full bg-red-50 border border-red-200 rounded-lg flex items-center justify-center"
        style={{ height }}
      >
        <div className="text-center p-6">
          <div className="text-red-500 text-lg mb-2">⚠️ Map Error</div>
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full relative" style={{ height }}>
      {(isLoading || geocodingProgress.isActive) && (
        <div className="absolute inset-0 bg-gray-100 bg-opacity-90 flex items-center justify-center z-10">
          <div className="text-center bg-white p-4 rounded-lg shadow-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            {geocodingProgress.isActive ? (
              <div>
                <p className="text-gray-800 text-sm font-medium">Converting addresses to map locations...</p>
                <p className="text-gray-600 text-xs mt-1">
                  {geocodingProgress.completed} of {geocodingProgress.total} centers processed
                </p>
              </div>
            ) : (
              <p className="text-gray-600 text-sm">Loading Google Maps...</p>
            )}
          </div>
        </div>
      )}
      <div ref={mapRef} className="w-full h-full rounded-lg" />
    </div>
  )
}