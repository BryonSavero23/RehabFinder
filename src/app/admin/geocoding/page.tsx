// src/app/admin/geocoding/page.tsx - Smart Geocoding with Google Places
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface Centre {
  id: string
  name: string
  address: string
  latitude?: number | null
  longitude?: number | null
  country_id: string
}

interface Country {
  id: string
  name: string
  code: string
}

interface GeocodingResult {
  centerId: string
  centerName: string
  success: boolean
  lat?: number
  lng?: number
  address?: string
  method?: string
  error?: string
}

interface GeocodingStats {
  total: number
  processed: number
  successful: number
  failed: number
  isRunning: boolean
}

export default function SmartGeocodingPage() {
  const [centers, setCenters] = useState<Centre[]>([])
  const [countries, setCountries] = useState<Country[]>([])
  const [stats, setStats] = useState<GeocodingStats>({
    total: 0,
    processed: 0,
    successful: 0,
    failed: 0,
    isRunning: false
  })
  const [results, setResults] = useState<GeocodingResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCountry, setSelectedCountry] = useState<string>('')
  const [batchSize, setBatchSize] = useState(10)
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false)
  const [includeExisting, setIncludeExisting] = useState(false) // NEW: Include centers with coordinates

  useEffect(() => {
    loadGoogleMaps()
    fetchData()
  }, [includeExisting]) // Re-fetch when includeExisting changes

  const loadGoogleMaps = async () => {
    try {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
      if (!apiKey) {
        throw new Error('Google Maps API key not configured')
      }

      if (window.google?.maps) {
        setGoogleMapsLoaded(true)
        return
      }

      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geocoding`
      script.async = true
      script.defer = true
      
      script.onload = () => {
        setGoogleMapsLoaded(true)
      }
      
      script.onerror = () => {
        setError('Failed to load Google Maps API')
      }
      
      document.head.appendChild(script)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize')
    }
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Build query based on includeExisting flag
      let query = supabase
        .from('rehabilitation_centers')
        .select('id, name, address, latitude, longitude, country_id')
        .eq('active', true)
        .order('name')
      
      // Only filter for null coordinates if NOT including existing
      if (!includeExisting) {
        query = query.is('latitude', null)
      }

      const [centersResult, countriesResult] = await Promise.all([
        query,
        supabase
          .from('countries')
          .select('*')
          .order('name')
      ])

      if (centersResult.error) throw centersResult.error
      if (countriesResult.error) throw countriesResult.error

      const centersData = centersResult.data || []
      setCenters(centersData)
      setCountries(countriesResult.data || [])
      setStats(prev => ({ ...prev, total: centersData.length }))

    } catch (err) {
      console.error('Error fetching data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const filteredCenters = selectedCountry 
    ? centers.filter(center => center.country_id === selectedCountry)
    : centers

  // Smart geocoding: Try Google Places first, then fall back to geocoding
  const smartGeocode = async (centerName: string, address: string, countryName: string, countryCode: string) => {
    if (!window.google?.maps) {
      throw new Error('Google Maps not loaded')
    }

    // Method 1: Try Google Places Search (finds businesses by name)
    try {
      console.log(`🔍 Searching Google Places for: "${centerName}"`)
      
      const service = new window.google.maps.places.PlacesService(
        document.createElement('div')
      )

      const placesResult = await new Promise<any>((resolve, reject) => {
        service.textSearch(
          {
            query: `${centerName} ${countryName}`,
            type: 'hospital'
          },
          (results: any[], status: any) => {
            if (status === 'OK' && results && results.length > 0) {
              const place = results[0]
              console.log('✅ Found place:', place.name, place.formatted_address)
              resolve({
                name: place.name, // NEW: Include the official name from Google
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng(),
                address: place.formatted_address,
                method: 'Google Places Search'
              })
            } else {
              console.log('❌ Place not found, trying geocoding...')
              resolve(null)
            }
          }
        )
      })

      if (placesResult) return placesResult

    } catch (err) {
      console.error('Places search failed:', err)
    }

    // Method 2: Fall back to regular geocoding
    try {
      console.log(`🗺️ Geocoding address: "${address}"`)
      
      const geocoder = new window.google.maps.Geocoder()
      
      const geocodeResult = await new Promise<any>((resolve, reject) => {
        geocoder.geocode(
          {
            address: `${address}, ${countryName}`,
            region: countryCode
          },
          (results: any[], status: any) => {
            if (status === 'OK' && results && results.length > 0) {
              const result = results[0]
              console.log('✅ Geocoded:', result.formatted_address)
              
              resolve({
                lat: result.geometry.location.lat(),
                lng: result.geometry.location.lng(),
                address: result.formatted_address,
                method: 'Geocoding'
              })
            } else if (status === 'ZERO_RESULTS') {
              resolve(null)
            } else if (status === 'OVER_QUERY_LIMIT') {
              reject(new Error('Google Maps quota exceeded'))
            } else {
              reject(new Error(`Geocoding failed: ${status}`))
            }
          }
        )
      })

      return geocodeResult

    } catch (err) {
      console.error('Geocoding failed:', err)
      throw err
    }
  }

  const startSmartGeocode = async () => {
    if (!googleMapsLoaded) {
      alert('Google Maps is still loading. Please wait...')
      return
    }

    const centersToProcess = filteredCenters.slice(0, batchSize)
    if (centersToProcess.length === 0) {
      alert('No centers to geocode.')
      return
    }

    setStats({
      total: centersToProcess.length,
      processed: 0,
      successful: 0,
      failed: 0,
      isRunning: true
    })
    setResults([])

    for (let i = 0; i < centersToProcess.length; i++) {
      const center = centersToProcess[i]
      const country = countries.find(c => c.id === center.country_id)
      
      if (!country) {
        console.error(`Country not found for center ${center.name}`)
        continue
      }

      try {
        // Add delay to respect Google's rate limits
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 300))
        }

        const result = await smartGeocode(
          center.name,
          center.address,
          country.name,
          country.code
        )

        if (result) {
          // Update database with coordinates, address AND correct name from Google
          const { error: updateError } = await supabase
            .from('rehabilitation_centers')
            .update({
              name: result.name || center.name, // Update name if Google provided one
              latitude: result.lat,
              longitude: result.lng,
              address: result.address
            })
            .eq('id', center.id)

          if (updateError) throw updateError

          const geocodeResult: GeocodingResult = {
            centerId: center.id,
            centerName: result.name || center.name, // Show the updated name
            success: true,
            lat: result.lat,
            lng: result.lng,
            address: result.address,
            method: result.method
          }

          setResults(prev => [...prev, geocodeResult])
          setStats(prev => ({
            ...prev,
            processed: i + 1,
            successful: prev.successful + 1
          }))

        } else {
          const geocodeResult: GeocodingResult = {
            centerId: center.id,
            centerName: center.name,
            success: false,
            error: 'Location not found'
          }

          setResults(prev => [...prev, geocodeResult])
          setStats(prev => ({
            ...prev,
            processed: i + 1,
            failed: prev.failed + 1
          }))
        }

      } catch (err) {
        console.error(`Failed to geocode ${center.name}:`, err)
        
        const geocodeResult: GeocodingResult = {
          centerId: center.id,
          centerName: center.name,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        }

        setResults(prev => [...prev, geocodeResult])
        setStats(prev => ({
          ...prev,
          processed: i + 1,
          failed: prev.failed + 1
        }))

        if (err instanceof Error && err.message.includes('quota exceeded')) {
          alert('Google Maps quota exceeded. Stopping...')
          break
        }
      }
    }

    setStats(prev => ({ ...prev, isRunning: false }))
    await fetchData()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading centers...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">🔍 Smart Geocoding</h1>
              <p className="text-gray-600 mt-1">
                Find {centers.length} centers using Google Places & Maps
              </p>
            </div>
            <Link 
              href="/admin" 
              className="text-blue-600 hover:text-blue-800"
            >
              ← Back to Admin
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Control Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border p-6 sticky top-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Settings</h3>

              {/* Google Maps Status */}
              <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
                <div className="flex items-center gap-2">
                  {googleMapsLoaded ? (
                    <>
                      <span className="text-green-600 text-xl">✅</span>
                      <span className="text-sm text-green-800 font-medium">Google Maps Ready</span>
                    </>
                  ) : (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                      <span className="text-sm text-blue-800">Loading Google Maps...</span>
                    </>
                  )}
                </div>
              </div>

              {/* IMPORTANT: Include Existing Coordinates Toggle */}
              <div className="mb-4 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeExisting}
                    onChange={(e) => {
                      setIncludeExisting(e.target.checked)
                      fetchData()
                    }}
                    disabled={stats.isRunning}
                    className="mt-1 w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                  <div className="flex-1">
                    <div className="font-bold text-yellow-900 text-base">
                      🔄 Re-geocode ALL centers
                    </div>
                    <p className="text-sm text-yellow-800 mt-1 font-medium">
                      Check this to include centers that already have coordinates!
                    </p>
                    <p className="text-xs text-yellow-700 mt-1">
                      This will update their addresses to Google's official addresses.
                    </p>
                  </div>
                </label>
              </div>

              {/* Country Filter */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filter by Country
                </label>
                <select
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  disabled={stats.isRunning}
                >
                  <option value="">All Countries</option>
                  {countries.map(country => (
                    <option key={country.id} value={country.id}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Batch Size */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Batch Size (max per run)
                </label>
                <input
                  type="number"
                  value={batchSize}
                  onChange={(e) => setBatchSize(parseInt(e.target.value) || 5)}
                  min="1"
                  max="100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  disabled={stats.isRunning}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {includeExisting 
                    ? `Process up to ${batchSize} centers (including those with coordinates)` 
                    : `Process up to ${batchSize} centers without coordinates`
                  }
                </p>
              </div>

              {/* Start Button */}
              <button
                onClick={startSmartGeocode}
                disabled={stats.isRunning || !googleMapsLoaded || filteredCenters.length === 0}
                className="w-full bg-green-500 text-white px-4 py-3 rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {stats.isRunning ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Processing...
                  </div>
                ) : (
                  `🔍 Start Smart Geocoding (${filteredCenters.length})`
                )}
              </button>

              {/* Progress */}
              {stats.isRunning && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Progress</h4>
                  <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                      style={{ 
                        width: `${stats.total > 0 ? (stats.processed / stats.total) * 100 : 0}%` 
                      }}
                    ></div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="text-blue-700">
                      <span className="font-medium">Done:</span> {stats.processed}
                    </div>
                    <div className="text-green-700">
                      <span className="font-medium">✅:</span> {stats.successful}
                    </div>
                    <div className="text-red-700">
                      <span className="font-medium">❌:</span> {stats.failed}
                    </div>
                  </div>
                </div>
              )}

              {/* Info Box */}
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium text-green-800 mb-2">✨ How it works</h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Searches Google Places by center name</li>
                  <li>• Gets official address from Google Maps</li>
                  <li>• Falls back to geocoding if needed</li>
                  <li>• Updates both coordinates AND address</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="lg:col-span-2">
            {results.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border mb-6">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Results ({results.length})
                  </h3>
                </div>

                <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
                  {results.map((result, index) => (
                    <div 
                      key={index}
                      className={`px-6 py-4 ${result.success ? 'bg-green-50' : 'bg-red-50'}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">
                              {result.success ? '✅' : '❌'}
                            </span>
                            <h4 className="font-medium text-gray-900">
                              {result.centerName}
                            </h4>
                          </div>
                          
                          {result.success ? (
                            <div className="text-sm space-y-1">
                              <p className="text-green-700">
                                <strong>Method:</strong> {result.method}
                              </p>
                              <p className="text-gray-600">
                                <strong>Address:</strong> {result.address}
                              </p>
                              <p className="text-gray-600">
                                <strong>Coordinates:</strong> {result.lat?.toFixed(6)}, {result.lng?.toFixed(6)}
                              </p>
                            </div>
                          ) : (
                            <p className="text-sm text-red-600">
                              <strong>Error:</strong> {result.error}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Centers List */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  {includeExisting 
                    ? `All Centers (${filteredCenters.length})`
                    : `Centers Needing Geocoding (${filteredCenters.length})`
                  }
                </h3>
                {includeExisting && (
                  <p className="text-sm text-yellow-600 mt-1">
                    ⚠️ All centers will be re-geocoded with Google's official addresses
                  </p>
                )}
              </div>

              <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
                {filteredCenters.length === 0 ? (
                  <div className="px-6 py-12 text-center text-gray-500">
                    <p className="text-lg mb-2">🎉 All done!</p>
                    <p>
                      {includeExisting 
                        ? 'No centers found in this country.'
                        : 'All centers in this country have coordinates.'
                      }
                    </p>
                  </div>
                ) : (
                  filteredCenters.slice(0, 20).map(center => (
                    <div key={center.id} className="px-6 py-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 mb-1">
                            {center.name}
                          </h4>
                          <p className="text-sm text-gray-600 mb-1">
                            {center.address}
                          </p>
                          {center.latitude && center.longitude && (
                            <p className="text-xs text-blue-600">
                              📍 Has coordinates: {center.latitude.toFixed(6)}, {center.longitude.toFixed(6)}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            Country: {countries.find(c => c.id === center.country_id)?.name}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                
                {filteredCenters.length > 20 && (
                  <div className="px-6 py-4 bg-gray-50 text-center text-sm text-gray-600">
                    ... and {filteredCenters.length - 20} more centers
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}