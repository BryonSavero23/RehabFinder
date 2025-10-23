// src/app/admin/geocoding/page.tsx - FIXED VERSION - Does NOT update center names!
// CRITICAL FIX: Line 48 - removed name update to prevent duplicate creation

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
  const [includeExisting, setIncludeExisting] = useState(false)

  useEffect(() => {
    loadGoogleMaps()
    fetchData()
  }, [includeExisting])

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
      
      let query = supabase
        .from('rehabilitation_centers')
        .select('id, name, address, latitude, longitude, country_id')
        .eq('active', true)
        .order('name')
      
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

  const smartGeocode = async (centerName: string, address: string, countryName: string, countryCode: string) => {
    if (!window.google?.maps) {
      throw new Error('Google Maps not loaded')
    }

    // Method 1: Try Google Places Search
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
          // 🔥 CRITICAL FIX: Only update coordinates and address, NOT the name!
          const { error: updateError } = await supabase
            .from('rehabilitation_centers')
            .update({
              // ✅ REMOVED: name: result.name || center.name
              // Only update coordinates - this prevents duplicate creation!
              latitude: result.lat,
              longitude: result.lng,
              // Optionally update address if you want Google's formatted version
              // address: result.address
            })
            .eq('id', center.id)

          if (updateError) throw updateError

          const geocodeResult: GeocodingResult = {
            centerId: center.id,
            centerName: center.name, // Use original name, not Google's
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
      }
    }

    setStats(prev => ({ ...prev, isRunning: false }))
    alert(`Geocoding complete! ${stats.successful} centers successfully geocoded.`)
    fetchData() // Refresh the list
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900">Smart Geocoding</h1>
            <Link
              href="/admin/centers"
              className="text-blue-600 hover:text-blue-800"
            >
              ← Back to Centers
            </Link>
          </div>
          <p className="text-gray-600">
            Automatically geocode rehabilitation centers using Google Maps API
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="space-y-4">
            {/* Google Maps Status */}
            <div className="flex items-center gap-2 text-sm">
              {googleMapsLoaded ? (
                <>
                  <span className="text-green-600 text-xl">✅</span>
                  <span className="text-green-800 font-medium">Google Maps Ready</span>
                </>
              ) : (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                  <span className="text-blue-800">Loading Google Maps...</span>
                </>
              )}
            </div>

            {/* Re-geocode toggle */}
            <div className="p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeExisting}
                  onChange={(e) => {
                    setIncludeExisting(e.target.checked)
                    fetchData()
                  }}
                  disabled={stats.isRunning}
                  className="mt-1 w-5 h-5"
                />
                <div>
                  <div className="font-bold text-yellow-900">
                    🔄 Re-geocode ALL centers
                  </div>
                  <p className="text-sm text-yellow-800 mt-1">
                    Check this to update coordinates for centers that already have them
                  </p>
                </div>
              </label>
            </div>

            {/* Country filter */}
            <div>
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

            {/* Batch size */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Batch Size
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
            </div>

            {/* Start button */}
            <button
              onClick={startSmartGeocode}
              disabled={stats.isRunning || !googleMapsLoaded || filteredCenters.length === 0}
              className="w-full bg-green-500 text-white px-4 py-3 rounded-lg hover:bg-green-600 disabled:opacity-50 font-medium"
            >
              {stats.isRunning ? 'Geocoding...' : `Start Geocoding (${filteredCenters.length} centers)`}
            </button>
          </div>
        </div>

        {/* Progress */}
        {stats.isRunning && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h3 className="font-semibold mb-3">Progress</h3>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div
                className="bg-green-500 h-2 rounded-full"
                style={{ width: `${(stats.processed / stats.total) * 100}%` }}
              ></div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>Processed: {stats.processed}/{stats.total}</div>
              <div className="text-green-700">✅ Successful: {stats.successful}</div>
              <div className="text-red-700">❌ Failed: {stats.failed}</div>
            </div>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="font-semibold mb-4">Results ({results.length})</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 rounded ${result.success ? 'bg-green-50' : 'bg-red-50'}`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-lg">{result.success ? '✅' : '❌'}</span>
                    <div className="flex-1">
                      <div className="font-medium">{result.centerName}</div>
                      {result.success ? (
                        <div className="text-sm text-gray-600">
                          <div>Method: {result.method}</div>
                          <div>Coordinates: {result.lat?.toFixed(6)}, {result.lng?.toFixed(6)}</div>
                        </div>
                      ) : (
                        <div className="text-sm text-red-600">Error: {result.error}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}