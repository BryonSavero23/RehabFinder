// src/components/GeocodingUtility.tsx - Batch Geocoding Tool for Admin
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

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
  skipped: number
  isRunning: boolean
}

declare global {
  interface Window {
    google: any
  }
}

export default function GeocodingUtility() {
  const [centers, setCenters] = useState<Centre[]>([])
  const [countries, setCountries] = useState<Country[]>([])
  const [stats, setStats] = useState<GeocodingStats>({
    total: 0,
    processed: 0,
    successful: 0,
    failed: 0,
    skipped: 0,
    isRunning: false
  })
  const [results, setResults] = useState<GeocodingResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [geocoder, setGeocoder] = useState<any>(null)

  useEffect(() => {
    initializeGeocoder()
    fetchData()
  }, [])

  const initializeGeocoder = async () => {
    try {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
      if (!apiKey) {
        throw new Error('Google Maps API key not configured')
      }

      // Load Google Maps API
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
      script.async = true
      script.defer = true
      
      script.onload = () => {
        const geocoderInstance = new window.google.maps.Geocoder()
        setGeocoder(geocoderInstance)
      }
      
      script.onerror = () => {
        setError('Failed to load Google Maps API')
      }
      
      document.head.appendChild(script)
    } catch (err) {
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
          .eq('active', true)
          .order('name'),
        supabase
          .from('countries')
          .select('*')
      ])

      if (centersResult.error) throw centersResult.error
      if (countriesResult.error) throw countriesResult.error

      setCenters(centersResult.data || [])
      setCountries(countriesResult.data || [])
      
      // Calculate initial stats
      const centersNeedingGeocode = (centersResult.data || []).filter(center => 
        !center.latitude || !center.longitude || 
        center.latitude === 0 || center.longitude === 0
      )
      
      setStats(prev => ({
        ...prev,
        total: centersNeedingGeocode.length
      }))

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  const getCountryInfo = (countryId: string) => {
    return countries.find(c => c.id === countryId)
  }

  const geocodeAddress = async (address: string, country: string): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      if (!geocoder) {
        resolve(null)
        return
      }

      const geocodeRequest = {
        address: `${address}, ${country}`,
        region: country === 'Malaysia' ? 'MY' : 'TH'
      }

      geocoder.geocode(geocodeRequest, (results: any[], status: string) => {
        if (status === 'OK' && results[0]) {
          const location = results[0].geometry.location
          resolve({
            lat: location.lat(),
            lng: location.lng()
          })
        } else {
          resolve(null)
        }
      })
    })
  }

  const updateCenterCoordinates = async (centerId: string, lat: number, lng: number) => {
    const { error } = await supabase
      .from('rehabilitation_centers')
      .update({ latitude: lat, longitude: lng })
      .eq('id', centerId)

    if (error) throw error
  }

  const startBatchGeocoding = async () => {
    if (!geocoder) {
      alert('Geocoder not initialized. Please wait and try again.')
      return
    }

    const centersToGeocode = centers.filter(center => 
      !center.latitude || !center.longitude || 
      center.latitude === 0 || center.longitude === 0
    )

    if (centersToGeocode.length === 0) {
      alert('All centers already have coordinates!')
      return
    }

    setStats({
      total: centersToGeocode.length,
      processed: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      isRunning: true
    })
    setResults([])

    const batchSize = 10
    const delay = 200 // ms between requests

    for (let i = 0; i < centersToGeocode.length; i += batchSize) {
      const batch = centersToGeocode.slice(i, i + batchSize)
      
      await Promise.all(
        batch.map(async (center, batchIndex) => {
          const countryInfo = getCountryInfo(center.country_id)
          if (!countryInfo) {
            const result: GeocodingResult = {
              centerId: center.id,
              centerName: center.name,
              success: false,
              error: 'Country not found'
            }
            setResults(prev => [...prev, result])
            setStats(prev => ({
              ...prev,
              processed: prev.processed + 1,
              failed: prev.failed + 1
            }))
            return
          }

          try {
            const coordinates = await geocodeAddress(center.address, countryInfo.name)
            
            if (coordinates) {
              await updateCenterCoordinates(center.id, coordinates.lat, coordinates.lng)
              
              const result: GeocodingResult = {
                centerId: center.id,
                centerName: center.name,
                success: true,
                lat: coordinates.lat,
                lng: coordinates.lng
              }
              setResults(prev => [...prev, result])
              setStats(prev => ({
                ...prev,
                processed: prev.processed + 1,
                successful: prev.successful + 1
              }))
            } else {
              const result: GeocodingResult = {
                centerId: center.id,
                centerName: center.name,
                success: false,
                error: 'Geocoding failed'
              }
              setResults(prev => [...prev, result])
              setStats(prev => ({
                ...prev,
                processed: prev.processed + 1,
                failed: prev.failed + 1
              }))
            }
          } catch (error) {
            const result: GeocodingResult = {
              centerId: center.id,
              centerName: center.name,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            }
            setResults(prev => [...prev, result])
            setStats(prev => ({
              ...prev,
              processed: prev.processed + 1,
              failed: prev.failed + 1
            }))
          }

          // Add delay between requests in the same batch
          if (batchIndex < batch.length - 1) {
            await new Promise(resolve => setTimeout(resolve, delay))
          }
        })
      )

      // Longer delay between batches
      if (i + batchSize < centersToGeocode.length) {
        await new Promise(resolve => setTimeout(resolve, delay * 2))
      }
    }

    setStats(prev => ({ ...prev, isRunning: false }))
    alert(`Geocoding complete! ${stats.successful} centers successfully geocoded.`)
  }

  const exportResults = () => {
    const csvContent = [
      ['Center ID', 'Center Name', 'Success', 'Latitude', 'Longitude', 'Error'],
      ...results.map(result => [
        result.centerId,
        result.centerName,
        result.success ? 'Yes' : 'No',
        result.lat || '',
        result.lng || '',
        result.error || ''
      ])
    ]
    .map(row => row.join(','))
    .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `geocoding-results-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading geocoding utility...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️ Error</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Reload Page
          </button>
        </div>
      </div>
    )
  }

  const centersWithCoords = centers.filter(center => 
    center.latitude && center.longitude && 
    center.latitude !== 0 && center.longitude !== 0
  ).length

  const centersNeedingCoords = centers.length - centersWithCoords

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          🗺️ Batch Geocoding Utility
        </h1>

        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="text-2xl font-bold text-blue-600">{centers.length}</div>
            <div className="text-sm text-blue-800">Total Centers</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="text-2xl font-bold text-green-600">{centersWithCoords}</div>
            <div className="text-sm text-green-800">Already Mapped</div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <div className="text-2xl font-bold text-orange-600">{centersNeedingCoords}</div>
            <div className="text-sm text-orange-800">Need Mapping</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <div className="text-2xl font-bold text-purple-600">
              {centersWithCoords > 0 ? Math.round((centersWithCoords / centers.length) * 100) : 0}%
            </div>
            <div className="text-sm text-purple-800">Completion</div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={startBatchGeocoding}
            disabled={stats.isRunning || !geocoder || centersNeedingCoords === 0}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {stats.isRunning ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Processing...
              </>
            ) : (
              <>
                🚀 Start Batch Geocoding
              </>
            )}
          </button>

          {results.length > 0 && (
            <button
              onClick={exportResults}
              className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
            >
              📥 Export Results
            </button>
          )}

          <button
            onClick={fetchData}
            disabled={stats.isRunning}
            className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 disabled:bg-gray-400"
          >
            🔄 Refresh Data
          </button>
        </div>

        {/* Progress */}
        {stats.isRunning && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">Geocoding Progress</h3>
            <div className="w-full bg-blue-200 rounded-full h-3 mb-2">
              <div 
                className="bg-blue-600 h-3 rounded-full transition-all duration-300" 
                style={{ 
                  width: `${stats.total > 0 ? (stats.processed / stats.total) * 100 : 0}%` 
                }}
              ></div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium">Processed:</span> {stats.processed}/{stats.total}
              </div>
              <div className="text-green-700">
                <span className="font-medium">✅ Successful:</span> {stats.successful}
              </div>
              <div className="text-red-700">
                <span className="font-medium">❌ Failed:</span> {stats.failed}
              </div>
              <div className="text-yellow-700">
                <span className="font-medium">⏭️ Skipped:</span> {stats.skipped}
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Important Instructions</h3>
          <ul className="text-yellow-700 text-sm space-y-1">
            <li>• This tool will geocode centers that don't have coordinates</li>
            <li>• The process uses Google Maps Geocoding API with rate limiting</li>
            <li>• Large batches may take several minutes to complete</li>
            <li>• Results are automatically saved to the database</li>
            <li>• Make sure you have a valid Google Maps API key configured</li>
          </ul>
        </div>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Geocoding Results ({results.length})
          </h2>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Center Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Coordinates
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Error
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {results.map((result, index) => (
                  <tr key={index} className={result.success ? 'bg-green-50' : 'bg-red-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {result.centerName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {result.success ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          ✅ Success
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          ❌ Failed
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {result.lat && result.lng ? (
                        <span className="font-mono">
                          {result.lat.toFixed(6)}, {result.lng.toFixed(6)}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                      {result.error || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Centers Preview */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Centers Overview
        </h2>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Country
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Coordinates
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {centers.slice(0, 50).map((center) => {
                const hasCoords = center.latitude && center.longitude && 
                                center.latitude !== 0 && center.longitude !== 0
                const countryInfo = getCountryInfo(center.country_id)
                
                return (
                  <tr key={center.id} className={hasCoords ? 'bg-green-50' : 'bg-orange-50'}>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="max-w-xs truncate">{center.name}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="max-w-sm truncate">{center.address}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {countryInfo?.name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {hasCoords ? (
                        <span className="font-mono text-xs">
                          {center.latitude?.toFixed(4)}, {center.longitude?.toFixed(4)}
                        </span>
                      ) : (
                        <span className="text-gray-400">Not mapped</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {hasCoords ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          📍 Mapped
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          🔍 Needs Mapping
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          
          {centers.length > 50 && (
            <div className="mt-4 text-center text-gray-500 text-sm">
              Showing first 50 of {centers.length} centers
            </div>
          )}
        </div>
      </div>
    </div>
  )
}