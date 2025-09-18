// src/app/admin/geocoding/page.tsx - Admin Geocoding Page
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

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

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

  const mockGeocode = async (address: string, countryCode: string): Promise<{ lat: number; lng: number }> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000))
    
    // Mock coordinates based on country
    const baseCoords = countryCode === 'MY' 
      ? { lat: 3.1390, lng: 101.6869 } // Malaysia
      : { lat: 13.7563, lng: 100.5018 } // Thailand
    
    // Add some randomization to simulate real geocoding
    const lat = baseCoords.lat + (Math.random() - 0.5) * 4
    const lng = baseCoords.lng + (Math.random() - 0.5) * 4
    
    // Simulate occasional failures
    if (Math.random() < 0.1) {
      throw new Error('Geocoding failed - address not found')
    }
    
    return { lat, lng }
  }

  const startBatchGeocode = async () => {
    const centersToProcess = filteredCenters.slice(0, batchSize)
    if (centersToProcess.length === 0) return

    setStats(prev => ({
      ...prev,
      isRunning: true,
      processed: 0,
      successful: 0,
      failed: 0,
      total: centersToProcess.length
    }))
    setResults([])

    for (let i = 0; i < centersToProcess.length; i++) {
      const center = centersToProcess[i]
      const country = countries.find(c => c.id === center.country_id)
      
      try {
        // Use mock geocoding for demo (replace with real service)
        const coords = await mockGeocode(center.address, country?.code || 'MY')
        
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

      } catch (err) {
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
      }
    }

    setStats(prev => ({ ...prev, isRunning: false }))
    
    // Refresh data to update the list
    await fetchData()
  }

  const addSingleCoordinate = async (centerId: string, lat: number, lng: number) => {
    try {
      const { error } = await supabase
        .from('rehabilitation_centers')
        .update({ latitude: lat, longitude: lng })
        .eq('id', centerId)

      if (error) throw error

      // Refresh data
      await fetchData()
      
      return true
    } catch (err) {
      console.error('Error adding coordinates:', err)
      return false
    }
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

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8 max-w-md">
          <div className="text-red-500 text-xl mb-4">⚠️ Error</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={fetchData}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Try Again
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
              <h1 className="text-3xl font-bold text-gray-900">Geocoding Centers</h1>
              <p className="text-gray-600 mt-1">
                Add coordinates to {centers.length} centers that need geocoding
              </p>
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
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
                    Batch Size
                  </label>
                  <select
                    value={batchSize}
                    onChange={(e) => setBatchSize(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value={5}>5 centers</option>
                    <option value={10}>10 centers</option>
                    <option value={20}>20 centers</option>
                    <option value={50}>50 centers</option>
                  </select>
                </div>

                <button
                  onClick={startBatchGeocode}
                  disabled={stats.isRunning || filteredCenters.length === 0}
                  className="w-full bg-blue-500 text-white px-4 py-3 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {stats.isRunning ? 'Processing...' : `Start Geocoding (${Math.min(batchSize, filteredCenters.length)} centers)`}
                </button>

                {/* Stats */}
                {(stats.processed > 0 || stats.isRunning) && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Progress</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Processed:</span>
                        <span>{stats.processed} / {stats.total}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-600">Successful:</span>
                        <span className="text-green-600">{stats.successful}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-red-600">Failed:</span>
                        <span className="text-red-600">{stats.failed}</span>
                      </div>
                    </div>
                    {stats.isRunning && (
                      <div className="mt-3">
                        <div className="bg-blue-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(stats.processed / stats.total) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Note about demo */}
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-800 text-xs">
                    <strong>Demo Mode:</strong> This uses mock geocoding. In production, integrate with Google Maps Geocoding API or similar service.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Centers List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Centers Needing Coordinates ({filteredCenters.length})
                </h3>
              </div>

              <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
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
                                Lat: {result.lat?.toFixed(4)}, Lng: {result.lng?.toFixed(4)}
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

            {/* Results */}
            {results.length > 0 && (
              <div className="mt-6 bg-white rounded-lg shadow-sm border">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Geocoding Results</h3>
                </div>
                <div className="divide-y divide-gray-200 max-h-64 overflow-y-auto">
                  {results.map((result, index) => (
                    <div key={index} className="p-4">
                      <div className="flex items-center gap-3">
                        <span className={`text-lg ${result.success ? 'text-green-500' : 'text-red-500'}`}>
                          {result.success ? '✓' : '✗'}
                        </span>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{result.centerName}</p>
                          {result.success ? (
                            <p className="text-sm text-green-600">
                              Coordinates: {result.lat?.toFixed(4)}, {result.lng?.toFixed(4)}
                            </p>
                          ) : (
                            <p className="text-sm text-red-600">{result.error}</p>
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
      </div>
    </div>
  )
}