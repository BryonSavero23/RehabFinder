// src/app/admin/geocoding/page.tsx - Fixed version without multiple API loading
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import googleMapsLoader from '@/lib/googleMapsLoader'
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
  error?: string
}

interface GeocodingStats {
  total: number
  processed: number
  successful: number
  failed: number
  isRunning: boolean
}

export default function AdminGeocodingPage() {
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
  const [batchSize, setBatchSize] = useState(5)
  const [apiKeyStatus, setApiKeyStatus] = useState<'checking' | 'valid' | 'missing' | 'invalid'>('checking')
  const [geocoder, setGeocoder] = useState<any>(null)

  useEffect(() => {
    initializeGeocoder()
    fetchData()
  }, [])

  const initializeGeocoder = async () => {
    try {
      setApiKeyStatus('checking')
      
      // Use centralized loader to prevent multiple loading
      await googleMapsLoader.loadGoogleMaps()
      
      // Create geocoder instance
      const geocoderInstance = googleMapsLoader.createGeocoder()
      setGeocoder(geocoderInstance)
      setApiKeyStatus('valid')
      
    } catch (err) {
      console.error('Failed to initialize geocoder:', err)
      setApiKeyStatus(err instanceof Error && err.message.includes('not configured') ? 'missing' : 'invalid')
      setError(err instanceof Error ? err.message : 'Failed to initialize geocoder')
    }
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      
      const [centersResult, countriesResult] = await Promise.all([
        supabase
          .from('rehabilitation_centers')
          .select('id, name, address, latitude, longitude, country_id')
          .is('latitude', null)
          .eq('active', true)
          .order('name'),
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

  // Real Google Maps Geocoding function using the centralized loader
  const realGeocode = async (address: string, countryName: string): Promise<{ lat: number; lng: number } | null> => {
    if (!geocoder) {
      throw new Error('Geocoder not initialized')
    }

    return new Promise((resolve, reject) => {
      const fullAddress = `${address}, ${countryName}`
      
      geocoder.geocode(
        { 
          address: fullAddress,
          region: countryName === 'Malaysia' ? 'MY' : countryName === 'Thailand' ? 'TH' : undefined
        },
        (results: any[], status: any) => {
          if (status === 'OK' && results && results.length > 0) {
            const location = results[0].geometry.location
            resolve({
              lat: location.lat(),
              lng: location.lng()
            })
          } else if (status === 'ZERO_RESULTS') {
            resolve(null)
          } else if (status === 'OVER_QUERY_LIMIT') {
            reject(new Error('Google Maps API quota exceeded. Please try again later.'))
          } else if (status === 'REQUEST_DENIED') {
            reject(new Error('Geocoding request denied. Check your API key permissions.'))
          } else if (status === 'INVALID_REQUEST') {
            reject(new Error('Invalid geocoding request.'))
          } else {
            reject(new Error(`Geocoding failed: ${status}`))
          }
        }
      )
    })
  }

  const startBatchGeocode = async () => {
    if (!geocoder) {
      alert('Geocoder not initialized. Please check your Google Maps API key.')
      return
    }

    const centersToProcess = filteredCenters.slice(0, batchSize)
    if (centersToProcess.length === 0) {
      alert('No centers to geocode.')
      return
    }

    setStats(prev => ({
      ...prev,
      isRunning: true,
      processed: 0,
      successful: 0,
      failed: 0,
      total: centersToProcess.length
    }))
    setResults([])

    // Process centers one by one to avoid rate limiting
    for (let i = 0; i < centersToProcess.length; i++) {
      const center = centersToProcess[i]
      const country = countries.find(c => c.id === center.country_id)
      
      try {
        // Add delay to respect Google's rate limits
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 200)) // Increased delay
        }

        const coords = await realGeocode(center.address, country?.name || 'Malaysia')
        
        if (coords) {
          // Update database
          const { error: updateError } = await supabase
            .from('rehabilitation_centers')
            .update({
              latitude: coords.lat,
              longitude: coords.lng
            })
            .eq('id', center.id)

          if (updateError) throw updateError

          const result: GeocodingResult = {
            centerId: center.id,
            centerName: center.name,
            success: true,
            lat: coords.lat,
            lng: coords.lng
          }

          setResults(prev => [...prev, result])
          setStats(prev => ({
            ...prev,
            processed: i + 1,
            successful: prev.successful + 1
          }))
        } else {
          const result: GeocodingResult = {
            centerId: center.id,
            centerName: center.name,
            success: false,
            error: 'Address not found'
          }

          setResults(prev => [...prev, result])
          setStats(prev => ({
            ...prev,
            processed: i + 1,
            failed: prev.failed + 1
          }))
        }

      } catch (err) {
        console.error(`Geocoding failed for ${center.name}:`, err)
        
        const result: GeocodingResult = {
          centerId: center.id,
          centerName: center.name,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        }

        setResults(prev => [...prev, result])
        setStats(prev => ({
          ...prev,
          processed: i + 1,
          failed: prev.failed + 1
        }))

        // If we hit quota limits, stop processing
        if (err instanceof Error && err.message.includes('quota exceeded')) {
          break
        }
      }
    }

    setStats(prev => ({ ...prev, isRunning: false }))
    
    // Refresh data to update the list
    await fetchData()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading centers needing geocoding...</p>
        </div>
      </div>
    )
  }

  if (error && apiKeyStatus !== 'valid') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8 max-w-2xl">
          <div className="text-red-500 text-xl mb-4">⚠️ Google Maps API Setup Required</div>
          <div className="bg-white rounded-lg p-6 shadow-sm border text-left">
            <h3 className="font-semibold text-gray-900 mb-4">To enable real geocoding, please:</h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-700 mb-4">
              <li>Get a Google Maps API key from the <a href="https://console.cloud.google.com/" target="_blank" className="text-blue-600 hover:underline">Google Cloud Console</a></li>
              <li>Enable the "Geocoding API" for your project</li>
              <li>Add the API key to your environment variables as <code className="bg-gray-100 px-2 py-1 rounded">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code></li>
              <li>Restart your development server</li>
            </ol>
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
              <p className="text-sm text-yellow-800">
                <strong>Current Error:</strong> {error}
              </p>
            </div>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Retry After Setup
          </button>
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
              <h1 className="text-3xl font-bold text-gray-900">Real Geocoding Centers</h1>
              <p className="text-gray-600 mt-1">
                Add coordinates to {centers.length} centers using Google Maps API
              </p>
              <div className="flex items-center gap-4 mt-2">
                {apiKeyStatus === 'valid' && (
                  <div className="flex items-center gap-2">
                    <span className="text-green-600">✅</span>
                    <span className="text-sm text-green-700">Google Maps API connected</span>
                  </div>
                )}
                {apiKeyStatus === 'checking' && (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                    <span className="text-sm text-gray-600">Checking API connection...</span>
                  </div>
                )}
              </div>
            </div>
            <Link 
              href="/admin/centers" 
              className="text-blue-600 hover:text-blue-800"
            >
              ← Back to Centers
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Controls */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Batch Geocoding</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Filter by Country
                  </label>
                  <select
                    value={selectedCountry}
                    onChange={(e) => setSelectedCountry(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Countries</option>
                    {countries.map((country) => (
                      <option key={country.id} value={country.id}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Batch Size (respect API limits)
                  </label>
                  <select
                    value={batchSize}
                    onChange={(e) => setBatchSize(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={5}>5 centers</option>
                    <option value={10}>10 centers</option>
                    <option value={20}>20 centers</option>
                    <option value={50}>50 centers (max)</option>
                  </select>
                </div>

                <div className="pt-4 border-t">
                  <button
                    onClick={startBatchGeocode}
                    disabled={stats.isRunning || filteredCenters.length === 0 || apiKeyStatus !== 'valid'}
                    className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
                  >
                    {stats.isRunning 
                      ? `Geocoding... (${stats.processed}/${stats.total})`
                      : `🗺️ Start Geocoding (${Math.min(filteredCenters.length, batchSize)} centers)`
                    }
                  </button>
                </div>

                {/* Progress Stats */}
                {stats.isRunning && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">Progress</h4>
                    <div className="w-full bg-blue-200 rounded-full h-2 mb-3">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${stats.total > 0 ? (stats.processed / stats.total) * 100 : 0}%` 
                        }}
                      ></div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div className="text-blue-700">
                        <span className="font-medium">Processed:</span> {stats.processed}
                      </div>
                      <div className="text-green-700">
                        <span className="font-medium">✅ Success:</span> {stats.successful}
                      </div>
                      <div className="text-red-700">
                        <span className="font-medium">❌ Failed:</span> {stats.failed}
                      </div>
                    </div>
                  </div>
                )}

                {/* API Information */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-medium text-green-800 mb-2">🔧 Fixed Issues</h4>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>• ✅ No more duplicate API loading</li>
                    <li>• ✅ Centralized script management</li>
                    <li>• ✅ Improved error handling</li>
                    <li>• ✅ Better rate limiting (200ms delays)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Centers List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Centers Needing Geocoding ({filteredCenters.length})
                </h3>
              </div>

              <div className="divide-y divide-gray-200">
                {filteredCenters.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="text-green-500 text-4xl mb-4">🎉</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">All Done!</h3>
                    <p className="text-gray-600">All centers in this filter have coordinates.</p>
                  </div>
                ) : (
                  filteredCenters.slice(0, batchSize).map((center) => {
                    const country = countries.find(c => c.id === center.country_id)
                    const result = results.find(r => r.centerId === center.id)
                    
                    return (
                      <div key={center.id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-gray-900">{center.name}</h4>
                              {result && (
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  result.success 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {result.success ? '✓ Geocoded' : '✗ Failed'}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mb-1">{center.address}</p>
                            <p className="text-xs text-gray-500">{country?.name}</p>
                            {result && result.success && (
                              <p className="text-xs text-green-600 mt-1">
                                Lat: {result.lat?.toFixed(6)}, Lng: {result.lng?.toFixed(6)}
                              </p>
                            )}
                            {result && !result.success && (
                              <p className="text-xs text-red-600 mt-1">{result.error}</p>
                            )}
                          </div>
                          
                          <Link
                            href={`/admin/centers/${center.id}`}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            Edit →
                          </Link>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {filteredCenters.length > batchSize && (
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                  <p className="text-sm text-gray-600">
                    Showing first {batchSize} centers. Adjust batch size to process more at once.
                  </p>
                </div>
              )}
            </div>

            {/* Results Summary */}
            {results.length > 0 && (
              <div className="mt-6 bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Latest Results ({results.length})
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{stats.successful}</div>
                    <div className="text-green-700">Successfully Geocoded</div>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
                    <div className="text-red-700">Failed to Geocode</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}