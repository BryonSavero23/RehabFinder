// src/app/centres/page.tsx - Public Find Centres Page
'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import CenterMap from '@/components/CenterMap'
import type { Centre, Country, CenterType, FilterState } from '@/types/center'

export default function FindCentresPage() {
  const [centres, setCentres] = useState<Centre[]>([])
  const [countries, setCountries] = useState<Country[]>([])
  const [centerTypes, setCenterTypes] = useState<CenterType[]>([])
  const [filters, setFilters] = useState<FilterState>({
    country: '',
    type: '',
    accessibility: false,
    search: ''
  })
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadingLocation, setLoadingLocation] = useState(false)
  const [selectedCenter, setSelectedCenter] = useState<Centre | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch ALL active centers
      const fetchAllCenters = async () => {
        let allCenters: Centre[] = []
        let from = 0
        const pageSize = 1000
        
        while (true) {
          const { data, error } = await supabase
            .from('rehabilitation_centers')
            .select('*')
            .eq('active', true)
            .range(from, from + pageSize - 1)
            .order('name')
          
          if (error) throw error
          if (!data || data.length === 0) break
          
          allCenters = [...allCenters, ...data]
          if (data.length < pageSize) break
          from += pageSize
        }
        
        return allCenters
      }

      const [centres, countriesResult, typesResult] = await Promise.all([
        fetchAllCenters(),
        supabase.from('countries').select('*').order('name'),
        supabase.from('center_types').select('*').order('name')
      ])

      if (countriesResult.error) throw countriesResult.error
      if (typesResult.error) throw typesResult.error

      setCentres(centres)
      setCountries(countriesResult.data || [])
      setCenterTypes(typesResult.data || [])

    } catch (err) {
      console.error('Error fetching data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  // Filter centres based on current filters
  const filteredCentres = useMemo(() => {
    let filtered = centres

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase()
      filtered = filtered.filter(centre => 
        centre.name.toLowerCase().includes(searchTerm) ||
        centre.address.toLowerCase().includes(searchTerm) ||
        (centre.services && centre.services.toLowerCase().includes(searchTerm))
      )
    }

    if (filters.country) {
      filtered = filtered.filter(centre => centre.country_id === filters.country)
    }

    if (filters.type) {
      filtered = filtered.filter(centre => centre.center_type_id === filters.type)
    }

    if (filters.accessibility) {
      filtered = filtered.filter(centre => centre.accessibility)
    }

    return filtered
  }, [centres, filters])

  const handleUseLocation = () => {
    setLoadingLocation(true)
    
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.')
      setLoadingLocation(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        })
        setLoadingLocation(false)
        setViewMode('map')
      },
      (error) => {
        alert('Unable to retrieve your location. Please check your browser permissions.')
        setLoadingLocation(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    )
  }

  const clearFilters = () => {
    setFilters({
      country: '',
      type: '',
      accessibility: false,
      search: ''
    })
  }

  const getCountryName = (countryId: string) => {
    return countries.find(c => c.id === countryId)?.name || 'Unknown'
  }

  const getCenterTypeName = (typeId: string) => {
    return centerTypes.find(t => t.id === typeId)?.name || 'Unknown'
  }

  const handleCenterClick = (center: Centre) => {
    setSelectedCenter(center)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading rehabilitation centres...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8 max-w-md">
          <div className="text-red-500 text-xl mb-4">⚠️ Error Loading Data</div>
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
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <h1 className="text-4xl font-bold mb-4">Find Rehabilitation Centres</h1>
          <p className="text-xl text-blue-100">
            Discover {centres.length} rehabilitation centres across Malaysia & Thailand
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <input
                type="text"
                placeholder="Search by name, address, or services..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            {/* Country Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Country
              </label>
              <select
                value={filters.country}
                onChange={(e) => setFilters({ ...filters, country: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="">All Countries</option>
                {countries.map((country) => (
                  <option key={country.id} value={country.id}>
                    {country.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type
              </label>
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="">All Types</option>
                {centerTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.accessibility}
                  onChange={(e) => setFilters({ ...filters, accessibility: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">♿ Wheelchair Accessible Only</span>
              </label>

              <button
                onClick={handleUseLocation}
                disabled={loadingLocation}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
              >
                📍 {loadingLocation ? 'Getting location...' : 'Use My Location'}
              </button>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={clearFilters}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                Clear Filters
              </button>

              <div className="text-sm text-gray-600">
                Showing <strong>{filteredCentres.length}</strong> of <strong>{centres.length}</strong> centres
              </div>
            </div>
          </div>
        </div>

        {/* View Toggle */}
        <div className="bg-white rounded-lg shadow-sm border mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setViewMode('list')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              📋 List View ({filteredCentres.length})
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                viewMode === 'map'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              🗺️ Map View
            </button>
          </div>

          {/* List View */}
          {viewMode === 'list' && (
            <div className="divide-y divide-gray-200">
              {filteredCentres.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="text-gray-400 text-4xl mb-4">🔍</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No centres found</h3>
                  <p className="text-gray-600 mb-4">
                    Try adjusting your search criteria or filters.
                  </p>
                  <button 
                    onClick={clearFilters}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  >
                    Clear Filters
                  </button>
                </div>
              ) : (
                filteredCentres.map((centre) => (
                  <div key={centre.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-start gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {centre.name}
                          </h3>
                          {centre.verified && (
                            <span className="text-green-600 text-sm bg-green-100 px-2 py-1 rounded-full">
                              ✓ Verified
                            </span>
                          )}
                        </div>
                        
                        <div className="space-y-2 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <span>📍</span>
                            <span>{centre.address}</span>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <span>🏥 {getCenterTypeName(centre.center_type_id)}</span>
                            <span>🌍 {getCountryName(centre.country_id)}</span>
                            {centre.accessibility && <span>♿ Wheelchair Accessible</span>}
                          </div>
                          
                          {centre.services && (
                            <div className="flex items-start gap-2">
                              <span>💊</span>
                              <span className="flex-1">{centre.services}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-4 mt-3">
                          {centre.phone && (
                            <a 
                              href={`tel:${centre.phone}`}
                              className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                            >
                              📞 {centre.phone}
                            </a>
                          )}
                          {centre.email && (
                            <a 
                              href={`mailto:${centre.email}`}
                              className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                            >
                              ✉️ Email
                            </a>
                          )}
                          {centre.website && (
                            <a 
                              href={centre.website.startsWith('http') ? centre.website : `https://${centre.website}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                            >
                              🌐 Website
                            </a>
                          )}
                          {centre.latitude && centre.longitude && (
                            <button
                              onClick={() => {
                                setSelectedCenter(centre)
                                setViewMode('map')
                              }}
                              className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                            >
                              🗺️ View on Map
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Map View */}
          {viewMode === 'map' && (
            <div className="h-[600px]">
              <CenterMap
                centers={filteredCentres}
                userLocation={userLocation}
                centerTypes={centerTypes}
                countries={countries}
                height="100%"
                onCenterClick={handleCenterClick}
              />
            </div>
          )}
        </div>

        {/* Info Box */}
        {!userLocation && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800 text-sm">
              💡 <strong>Tip:</strong> Click "Use My Location" to find centres near you and get directions
            </p>
          </div>
        )}
      </div>
    </div>
  )
}