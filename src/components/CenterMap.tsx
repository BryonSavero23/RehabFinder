// src/components/CenterMap.tsx - Fixed TypeScript version
'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Loader } from '@googlemaps/js-api-loader'
import { supabase } from '@/lib/supabase'
import type { Centre, Country, CenterType } from '@/types/center'

interface CenterMapProps {
  centers: Centre[]
  userLocation?: { lat: number; lng: number } | null
  centerTypes: CenterType[]
  countries: Country[]
  height?: string
  showControls?: boolean
  onCenterClick?: (center: Centre) => void
}

interface GeocodingStats {
  total: number
  completed: number
  successful: number
  failed: number
  isActive: boolean
}

// Extend Window interface for our custom functions
declare global {
  interface Window {
    google: any
    getDirections?: (lat: number, lng: number, name: string) => void
    openExternalMaps?: (lat: number, lng: number, name: string) => void
    shareLocation?: (lat: number, lng: number, name: string) => void
    openGoogleMaps?: (lat: string, lng: string, name: string) => void
    openAppleMaps?: (lat: string, lng: string, name: string) => void
    clearDirections?: () => void
  }
}

export default function CenterMap({ 
  centers = [],
  userLocation = null,
  centerTypes = [],
  countries = [],
  height = "400px",
  showControls = true,
  onCenterClick
}: CenterMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const infoWindowRef = useRef<any>(null)
  const geocoderRef = useRef<any>(null)
  const directionsServiceRef = useRef<any>(null)
  const directionsRendererRef = useRef<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUserLocation, setCurrentUserLocation] = useState<{ lat: number; lng: number } | null>(userLocation || null)
  const [geocodingStats, setGeocodingStats] = useState<GeocodingStats>({
    total: 0,
    completed: 0,
    successful: 0,
    failed: 0,
    isActive: false
  })

  // Default center - Malaysia
  const defaultCenter = { lat: 4.2105, lng: 101.9758 }

  const getCenterTypeName = useCallback((typeId: string) => {
    return centerTypes.find(t => t.id === typeId)?.name || 'Unknown'
  }, [centerTypes])

  const getCountryName = useCallback((countryId: string) => {
    return countries.find(c => c.id === countryId)?.name || 'Unknown'
  }, [countries])

  useEffect(() => {
    setCurrentUserLocation(userLocation || null)
  }, [userLocation])

  useEffect(() => {
    if (centers.length > 0) {
      initializeMap()
    }
  }, [centers, currentUserLocation])

  const initializeMap = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
      if (!apiKey) {
        throw new Error('Google Maps API key is not configured. Please add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your environment variables.')
      }

      const loader = new Loader({
        apiKey: apiKey,
        version: 'weekly',
        libraries: ['places', 'geometry']
      })

      await loader.load()

      if (!mapRef.current) return

      // Create the map
      const mapCenter = currentUserLocation || defaultCenter
      const map = new window.google.maps.Map(mapRef.current, {
        center: mapCenter,
        zoom: currentUserLocation ? 12 : 6,
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

      // Initialize services
      geocoderRef.current = new window.google.maps.Geocoder()
      directionsServiceRef.current = new window.google.maps.DirectionsService()
      directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
        suppressMarkers: false,
        polylineOptions: {
          strokeColor: '#4285F4',
          strokeWeight: 5,
          strokeOpacity: 0.8
        }
      })
      directionsRendererRef.current.setMap(map)

      // Clear existing markers
      clearMarkers()

      // Create info window
      infoWindowRef.current = new window.google.maps.InfoWindow()

      // Add user location marker if provided
      if (currentUserLocation) {
        addUserLocationMarker(map, currentUserLocation)
      }

      // Add location button if controls are enabled
      if (showControls) {
        addLocationButton(map)
      }

      // Add center markers with batch geocoding
      await addCenterMarkersWithBatchGeocoding(map, centers)

      setIsLoading(false)

    } catch (err) {
      console.error('Error loading Google Maps:', err)
      setError(err instanceof Error ? err.message : 'Failed to load map')
      setIsLoading(false)
    }
  }

  const clearMarkers = () => {
    markersRef.current.forEach(marker => marker.setMap(null))
    markersRef.current = []
  }

  const addUserLocationMarker = (map: any, location: { lat: number; lng: number }) => {
    const userMarker = new window.google.maps.Marker({
      position: location,
      map: map,
      title: 'Your Location',
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 12,
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
            ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}
          </p>
        </div>
      `)
      infoWindowRef.current.open(map, userMarker)
    })
  }

  const addLocationButton = (map: any) => {
    const controlDiv = document.createElement('div')
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
    controlUI.title = 'Click to center map on your location'
    
    const controlText = document.createElement('div')
    controlText.style.fontSize = '18px'
    controlText.innerHTML = '📍'
    controlUI.appendChild(controlText)
    controlDiv.appendChild(controlUI)
    
    map.controls[window.google.maps.ControlPosition.TOP_RIGHT].push(controlDiv)
    
    controlUI.addEventListener('click', () => {
      getCurrentLocation(map)
    })
  }

  const getCurrentLocation = (map: any) => {
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

        // Remove existing user location markers
        markersRef.current = markersRef.current.filter(marker => {
          if (marker.getTitle() === 'Your Location') {
            marker.setMap(null)
            return false
          }
          return true
        })

        setCurrentUserLocation(pos)
        addUserLocationMarker(map, pos)
        map.setCenter(pos)
        map.setZoom(12)
      },
      (error) => {
        alert('Unable to retrieve your location. Please check your browser permissions.')
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      }
    )
  }

  const showDirections = (destination: { lat: number; lng: number }, centerName: string) => {
    if (!currentUserLocation) {
      alert('Please enable location access to get directions. Click the location button 📍 on the map.')
      return
    }

    if (!directionsServiceRef.current || !directionsRendererRef.current) {
      alert('Directions service not available. Please try again.')
      return
    }

    const request = {
      origin: currentUserLocation,
      destination: destination,
      travelMode: window.google.maps.TravelMode.DRIVING,
    }

    directionsServiceRef.current.route(request, (result: any, status: any) => {
      if (status === 'OK') {
        directionsRendererRef.current.setDirections(result)
        
        // Show directions info
        const route = result.routes[0]
        const leg = route.legs[0]
        
        const directionsInfo = `
          <div style="padding: 14px; max-width: 350px; font-family: Arial, sans-serif; line-height: 1.4;">
            <h3 style="margin: 0 0 10px 0; font-size: 16px; font-weight: bold; color: #1f2937;">
              🧭 Directions to ${centerName}
            </h3>
            
            <div style="background: #f0f9ff; padding: 10px; border-radius: 8px; margin-bottom: 10px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span style="font-weight: 600; color: #1e40af;">Distance:</span>
                <span style="color: #1e40af;">${leg.distance.text}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="font-weight: 600; color: #1e40af;">Duration:</span>
                <span style="color: #1e40af;">${leg.duration.text}</span>
              </div>
            </div>
            
            <div style="margin-bottom: 12px;">
              <div style="font-size: 13px; color: #4b5563; margin-bottom: 4px;">
                <strong>From:</strong> ${leg.start_address}
              </div>
              <div style="font-size: 13px; color: #4b5563;">
                <strong>To:</strong> ${leg.end_address}
              </div>
            </div>
            
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <button onclick="window.openGoogleMaps('${destination.lat}', '${destination.lng}', '${centerName.replace(/'/g, "\\\'")}')" 
                      style="background: #4285F4; color: white; border: none; padding: 8px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; font-weight: 500;">
                🗺️ Open in Google Maps
              </button>
              <button onclick="window.openAppleMaps('${destination.lat}', '${destination.lng}', '${centerName.replace(/'/g, "\\\'")}')" 
                      style="background: #000; color: white; border: none; padding: 8px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; font-weight: 500;">
                🍎 Open in Apple Maps
              </button>
              <button onclick="window.clearDirections()" 
                      style="background: #6b7280; color: white; border: none; padding: 8px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; font-weight: 500;">
                ❌ Clear Route
              </button>
            </div>
          </div>
        `
        
        infoWindowRef.current.setContent(directionsInfo)
        infoWindowRef.current.setPosition(destination)
        infoWindowRef.current.open(mapInstanceRef.current)
        
      } else {
        alert('Directions request failed due to ' + status)
      }
    })
  }

  const addCenterMarkersWithBatchGeocoding = async (map: any, centers: Centre[]) => {
    const bounds = new window.google.maps.LatLngBounds()
    let markersAdded = 0

    // Separate centers with and without coordinates
    const centersWithCoords = centers.filter(center => 
      center.latitude && center.longitude && 
      center.latitude !== 0 && center.longitude !== 0
    )

    const centersNeedingGeocode = centers.filter(center => 
      !center.latitude || !center.longitude || 
      center.latitude === 0 || center.longitude === 0
    )

    console.log(`Centers with coordinates: ${centersWithCoords.length}`)
    console.log(`Centers needing geocoding: ${centersNeedingGeocode.length}`)

    // Add centers that already have coordinates
    centersWithCoords.forEach(center => {
      if (center.latitude && center.longitude) {
        const position = { lat: center.latitude, lng: center.longitude }
        addMarkerToMap(map, center, position, bounds)
        markersAdded++
      }
    })

    // Batch geocode centers that need coordinates (limit to first 20 for performance)
    if (centersNeedingGeocode.length > 0) {
      await batchGeocodeAndSaveCenters(map, centersNeedingGeocode.slice(0, 20), bounds)
    }

    // Fit map to show all markers if no user location
    if (markersAdded > 0 && !currentUserLocation) {
      map.fitBounds(bounds)
      
      // Prevent over-zooming for single markers
      const listener = window.google.maps.event.addListener(map, 'idle', () => {
        if (map.getZoom() > 15) {
          map.setZoom(15)
        }
        window.google.maps.event.removeListener(listener)
      })
    }

    console.log(`Total markers added: ${markersAdded}`)
  }

  const batchGeocodeAndSaveCenters = async (map: any, centers: Centre[], bounds: any) => {
    const batchSize = 5
    const delay = 300

    setGeocodingStats({
      total: centers.length,
      completed: 0,
      successful: 0,
      failed: 0,
      isActive: true
    })

    for (let i = 0; i < centers.length; i += batchSize) {
      const batch = centers.slice(i, i + batchSize)
      
      await Promise.all(
        batch.map(async (center, batchIndex) => {
          try {
            const position = await geocodeAddress(center.address, getCountryName(center.country_id))
            
            if (position) {
              await updateCenterCoordinates(center.id, position.lat, position.lng)
              addMarkerToMap(map, center, position, bounds)
              
              setGeocodingStats(prev => ({
                ...prev,
                completed: prev.completed + 1,
                successful: prev.successful + 1
              }))
            } else {
              setGeocodingStats(prev => ({
                ...prev,
                completed: prev.completed + 1,
                failed: prev.failed + 1
              }))
            }
          } catch (error) {
            console.warn(`Failed to geocode center: ${center.name}`, error)
            setGeocodingStats(prev => ({
              ...prev,
              completed: prev.completed + 1,
              failed: prev.failed + 1
            }))
          }

          if (batchIndex < batch.length - 1) {
            await new Promise(resolve => setTimeout(resolve, delay))
          }
        })
      )

      if (i + batchSize < centers.length) {
        await new Promise(resolve => setTimeout(resolve, delay * 2))
      }
    }

    setGeocodingStats(prev => ({ ...prev, isActive: false }))
  }

  const geocodeAddress = (address: string, country: string): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      if (!geocoderRef.current) {
        resolve(null)
        return
      }

      const geocodeRequest = {
        address: `${address}, ${country}`,
        region: country === 'Malaysia' ? 'MY' : 'TH'
      }

      geocoderRef.current.geocode(geocodeRequest, (results: any[], status: string) => {
        if (status === 'OK' && results[0]) {
          const location = results[0].geometry.location
          resolve({
            lat: location.lat(),
            lng: location.lng()
          })
        } else {
          console.warn(`Geocoding failed for address: ${address}, Status: ${status}`)
          resolve(null)
        }
      })
    })
  }

  const updateCenterCoordinates = async (centerId: string, lat: number, lng: number) => {
    try {
      const { error } = await supabase
        .from('rehabilitation_centers')
        .update({
          latitude: lat,
          longitude: lng
        })
        .eq('id', centerId)

      if (error) {
        console.error('Failed to update center coordinates:', error)
      }
    } catch (error) {
      console.error('Database error updating coordinates:', error)
    }
  }

  const addMarkerToMap = (map: any, center: Centre, position: { lat: number; lng: number }, bounds: any) => {
    const centerType = getCenterTypeName(center.center_type_id)
    
    const marker = new window.google.maps.Marker({
      position: position,
      map: map,
      title: center.name,
      icon: {
        path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
        scale: 6,
        fillColor: getMarkerColor(centerType),
        fillOpacity: 0.9,
        strokeColor: '#ffffff',
        strokeWeight: 2
      }
    })

    const infoContent = createInfoWindowContent(center, centerType, position)

    marker.addListener('click', () => {
      // Clear any existing directions when clicking a new marker
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setDirections({ routes: [] })
      }
      
      infoWindowRef.current.setContent(infoContent)
      infoWindowRef.current.open(map, marker)
      
      if (onCenterClick) {
        onCenterClick(center)
      }
    })

    markersRef.current.push(marker)
    bounds.extend(position)
  }

  const getMarkerColor = (type: string): string => {
    const colors: { [key: string]: string } = {
      'Inpatient': '#dc2626',
      'Outpatient': '#059669',
      'Community': '#7c3aed',
      'Traditional': '#d97706',
      'Specialist': '#2563eb',
    }
    return colors[type] || '#6b7280'
  }

  const createInfoWindowContent = (center: Centre, centerType: string, position: { lat: number; lng: number }): string => {
    const countryName = getCountryName(center.country_id)
    const hasUserLocation = currentUserLocation !== null
    
    return `
      <div style="padding: 14px; max-width: 320px; font-family: Arial, sans-serif; line-height: 1.4;">
        <h3 style="margin: 0 0 10px 0; font-size: 16px; font-weight: bold; color: #1f2937;">
          ${center.name}
        </h3>
        
        <div style="margin-bottom: 8px;">
          <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 13px; display: flex; align-items: flex-start; gap: 6px;">
            <span style="color: #374151;">📍</span>
            <span>${center.address}</span>
          </p>
        </div>

        <div style="display: flex; gap: 12px; margin-bottom: 8px; font-size: 12px; flex-wrap: wrap;">
          <span style="background: ${getMarkerColor(centerType)}; color: white; padding: 2px 8px; border-radius: 12px; font-weight: 500;">
            ${centerType}
          </span>
          <span style="background: #f3f4f6; color: #374151; padding: 2px 8px; border-radius: 12px;">
            ${countryName}
          </span>
          ${center.accessibility ? `
            <span style="background: #ecfdf5; color: #047857; padding: 2px 8px; border-radius: 12px;">
              ♿ Accessible
            </span>
          ` : ''}
        </div>

        ${center.services ? `
          <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 13px;">
            <strong>Services:</strong> ${center.services.substring(0, 100)}${center.services.length > 100 ? '...' : ''}
          </p>
        ` : ''}

        <div style="border-top: 1px solid #e5e7eb; padding-top: 8px; margin-top: 8px;">
          ${center.phone ? `
            <p style="margin: 0 0 4px 0; font-size: 13px;">
              📞 <a href="tel:${center.phone}" style="color: #2563eb; text-decoration: none; font-weight: 500;">${center.phone}</a>
            </p>
          ` : ''}
          
          ${center.email ? `
            <p style="margin: 0 0 4px 0; font-size: 13px;">
              ✉️ <a href="mailto:${center.email}" style="color: #2563eb; text-decoration: none; font-weight: 500;">${center.email}</a>
            </p>
          ` : ''}
          
          ${center.website ? `
            <p style="margin: 0 0 8px 0; font-size: 13px;">
              🌐 <a href="${center.website.startsWith('http') ? center.website : `https://${center.website}`}" 
                     target="_blank" rel="noopener noreferrer" 
                     style="color: #2563eb; text-decoration: none; font-weight: 500;">Visit Website</a>
            </p>
          ` : ''}
        </div>
        
        <div style="border-top: 1px solid #e5e7eb; padding-top: 8px; margin-top: 8px;">
          ${hasUserLocation ? `
            <button onclick="window.getDirections(${position.lat}, ${position.lng}, '${center.name.replace(/'/g, "\\\'")}')" 
                    style="background: #10b981; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-size: 13px; cursor: pointer; font-weight: 500; width: 100%; margin-bottom: 8px;">
              🧭 Get Directions
            </button>
          ` : `
            <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 8px; margin-bottom: 8px;">
              <p style="margin: 0; font-size: 12px; color: #92400e;">
                📍 Enable location access to get directions
              </p>
            </div>
          `}
          
          <div style="display: flex; gap: 6px;">
            <button onclick="window.openExternalMaps(${position.lat}, ${position.lng}, '${center.name.replace(/'/g, "\\\'")}')" 
                    style="background: #3b82f6; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-size: 12px; cursor: pointer; flex: 1;">
              🗺️ External Maps
            </button>
            <button onclick="window.shareLocation(${position.lat}, ${position.lng}, '${center.name.replace(/'/g, "\\\'")}')" 
                    style="background: #8b5cf6; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-size: 12px; cursor: pointer; flex: 1;">
              📤 Share
            </button>
          </div>
        </div>
      </div>
    `
  }

  // Setup global functions when component mounts
  useEffect(() => {
    // Define global functions for info window buttons
    window.getDirections = (lat: number, lng: number, name: string) => {
      showDirections({ lat, lng }, name)
    }
    
    window.openExternalMaps = (lat: number, lng: number, name: string) => {
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      if (isMobile) {
        const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
        window.open(googleMapsUrl, '_blank')
      } else {
        const googleMapsUrl = `https://www.google.com/maps/@${lat},${lng},15z`
        window.open(googleMapsUrl, '_blank')
      }
    }
    
    window.shareLocation = async (lat: number, lng: number, name: string) => {
      const shareData = {
        title: `${name} - RehabFinder`,
        text: `Check out this rehabilitation center: ${name}`,
        url: `https://www.google.com/maps/@${lat},${lng},15z`
      }
      
      if (navigator.share) {
        try {
          await navigator.share(shareData)
        } catch (err) {
          console.log('Error sharing:', err)
          fallbackShare(lat, lng, name)
        }
      } else {
        fallbackShare(lat, lng, name)
      }
    }

    // Additional functions for directions modal
    window.openGoogleMaps = (lat: string, lng: string, name: string) => {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${name}`
      window.open(url, '_blank')
    }
    
    window.openAppleMaps = (lat: string, lng: string, name: string) => {
      const url = `http://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`
      window.open(url, '_blank')
    }
    
    window.clearDirections = () => {
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setDirections({ routes: [] })
      }
      if (infoWindowRef.current) {
        infoWindowRef.current.close()
      }
    }
    
    const fallbackShare = (lat: number, lng: number, name: string) => {
      const url = `https://www.google.com/maps/@${lat},${lng},15z`
      navigator.clipboard.writeText(`${name}: ${url}`).then(() => {
        alert('Location link copied to clipboard!')
      }).catch(() => {
        prompt('Copy this link:', url)
      })
    }

    // Cleanup function
    return () => {
      // Clean up global functions when component unmounts
      delete window.getDirections
      delete window.openExternalMaps
      delete window.shareLocation
      delete window.openGoogleMaps
      delete window.openAppleMaps
      delete window.clearDirections
    }
  }, [currentUserLocation]) // Re-run when user location changes

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
      {(isLoading || geocodingStats.isActive) && (
        <div className="absolute inset-0 bg-white bg-opacity-95 flex items-center justify-center z-20">
          <div className="text-center bg-white p-6 rounded-lg shadow-lg border max-w-sm">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3"></div>
            
            {geocodingStats.isActive ? (
              <div>
                <h4 className="text-gray-900 text-sm font-semibold mb-2">Processing Center Locations</h4>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                    style={{ 
                      width: `${geocodingStats.total > 0 ? (geocodingStats.completed / geocodingStats.total) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
                <p className="text-gray-600 text-xs">
                  {geocodingStats.completed} of {geocodingStats.total} centers processed
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  ✅ {geocodingStats.successful} located • ❌ {geocodingStats.failed} failed
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
      
      {geocodingStats.completed > 0 && !geocodingStats.isActive && (
        <div className="absolute bottom-4 left-4 bg-white p-3 rounded-lg shadow-lg border z-10">
          <p className="text-xs text-gray-600">
            📍 {geocodingStats.successful} centers mapped successfully
            {geocodingStats.failed > 0 && ` • ${geocodingStats.failed} locations not found`}
          </p>
        </div>
      )}
    </div>
  )
}