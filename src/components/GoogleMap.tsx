// src/components/GoogleMap.tsx - Enhanced version (drop-in replacement)
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
  services?: string
}

interface GoogleMapProps {
  center?: { lat: number; lng: number }
  centres?: Centre[]
  height?: string
  showControls?: boolean
  onMarkerClick?: (centre: Centre) => void
}

declare global {
  interface Window {
    google: any
  }
}

export default function GoogleMap({ 
  center, 
  centres = [], 
  height = "400px",
  showControls = true,
  onMarkerClick
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
            stylers: [{ color: '#f8f9fa' }]
          },
          {
            featureType: 'poi',
            elementType: 'geometry',
            stylers: [{ color: '#f1f3f4' }]
          }
        ],
        mapTypeControl: showControls,
        streetViewControl: showControls,
        fullscreenControl: showControls,
        zoomControl: showControls,
      })

      mapInstanceRef.current = map

      // Add custom "My Location" button to the map if controls enabled
      if (showControls) {
        addLocationButton(map)
      }

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
    controlUI.style.width = '40px'
    controlUI.style.height = '40px'
    controlUI.style.display = 'flex'
    controlUI.style.alignItems = 'center'
    controlUI.style.justifyContent = 'center'
    controlUI.title = 'Click to get your current location'
    controlDiv.appendChild(controlUI)
    
    // Set CSS for the control interior
    const controlText = document.createElement('div')
    controlText.style.fontSize = '18px'
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

    userMarker.addListener('click', () => {
      infoWindowRef.current.setContent(`
        <div style="padding: 12px; font-family: Arial, sans-serif;">
          <h3 style="margin: 0 0 8px 0; color: #4285F4;">📍 Your Location</h3>
          <p style="margin: 0; color: #666; font-size: 13px;">
            ${userLocation.lat.toFixed(6)}, ${userLocation.lng.toFixed(6)}
          </p>
        </div>
      `)
      infoWindowRef.current.open(map, userMarker)
    })
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
      
      // Prevent over-zooming for single markers
      const listener = window.google.maps.event.addListener(map, 'idle', () => {
        if (map.getZoom() > 15) {
          map.setZoom(15)
        }
        window.google.maps.event.removeListener(listener)
      })
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
        scale: 6,
        fillColor: getMarkerColor(centre.type),
        fillOpacity: 0.9,
        strokeColor: '#ffffff',
        strokeWeight: 2
      }
    })

    const infoContent = createInfoWindowContent(centre)

    marker.addListener('click', () => {
      infoWindowRef.current.setContent(infoContent)
      infoWindowRef.current.open(map, marker)
      
      if (onMarkerClick) {
        onMarkerClick(centre)
      }
    })

    markersRef.current.push(marker)
    bounds.extend(position)
  }

  const getMarkerColor = (type: string): string => {
    const colors: { [key: string]: string } = {
      'Inpatient': '#dc2626',     // Red
      'Outpatient': '#059669',    // Green
      'Community': '#7c3aed',     // Purple
      'Traditional': '#d97706',   // Orange
      'Specialist': '#2563eb',    // Blue
    }
    return colors[type] || '#6b7280' // Gray default
  }

  const createInfoWindowContent = (centre: Centre): string => {
    return `
      <div style="padding: 14px; max-width: 320px; font-family: Arial, sans-serif; line-height: 1.4;">
        <h3 style="margin: 0 0 10px 0; font-size: 16px; font-weight: bold; color: #1f2937;">
          ${centre.name}
        </h3>
        
        <div style="margin-bottom: 8px;">
          <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 13px; display: flex; align-items: flex-start; gap: 6px;">
            <span style="color: #374151;">📍</span>
            <span>${centre.address}</span>
          </p>
        </div>

        <div style="margin-bottom: 8px;">
          <span style="background: ${getMarkerColor(centre.type)}; color: white; padding: 3px 8px; border-radius: 12px; font-size: 12px; font-weight: 500;">
            ${centre.type}
          </span>
        </div>

        ${centre.services ? `
          <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 13px;">
            <strong>Services:</strong> ${centre.services.substring(0, 100)}${centre.services.length > 100 ? '...' : ''}
          </p>
        ` : ''}

        <div style="border-top: 1px solid #e5e7eb; padding-top: 8px; margin-top: 8px;">
          ${centre.phone ? `
            <p style="margin: 0 0 4px 0; font-size: 13px;">
              📞 <a href="tel:${centre.phone}" style="color: #2563eb; text-decoration: none; font-weight: 500;">${centre.phone}</a>
            </p>
          ` : ''}
          
          ${centre.email ? `
            <p style="margin: 0 0 4px 0; font-size: 13px;">
              ✉️ <a href="mailto:${centre.email}" style="color: #2563eb; text-decoration: none; font-weight: 500;">${centre.email}</a>
            </p>
          ` : ''}
          
          ${centre.website ? `
            <p style="margin: 0; font-size: 13px;">
              🌐 <a href="${centre.website.startsWith('http') ? centre.website : `https://${centre.website}`}" 
                     target="_blank" rel="noopener noreferrer" 
                     style="color: #2563eb; text-decoration: none; font-weight: 500;">Visit Website</a>
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
          <button 
            onClick={() => initializeMap()}
            className="mt-3 bg-red-500 text-white px-4 py-2 rounded text-sm hover:bg-red-600"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full relative" style={{ height }}>
      {(isLoading || geocodingProgress.isActive) && (
        <div className="absolute inset-0 bg-white bg-opacity-95 flex items-center justify-center z-20">
          <div className="text-center bg-white p-6 rounded-lg shadow-lg border">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3"></div>
            
            {geocodingProgress.isActive ? (
              <div>
                <h4 className="text-gray-900 text-sm font-semibold mb-2">Converting addresses to map locations...</h4>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                    style={{ 
                      width: `${geocodingProgress.total > 0 ? (geocodingProgress.completed / geocodingProgress.total) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
                <p className="text-gray-600 text-xs">
                  {geocodingProgress.completed} of {geocodingProgress.total} centers processed
                </p>
              </div>
            ) : (
              <div>
                <h4 className="text-gray-900 text-sm font-semibold mb-1">Loading Google Maps</h4>
                <p className="text-gray-600 text-xs">Initializing map and markers...</p>
              </div>
            )}
          </div>
        </div>
      )}
      
      <div ref={mapRef} className="w-full h-full rounded-lg" />
    </div>
  )
}