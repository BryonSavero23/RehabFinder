// src/app/centres/page.tsx - Fixed version with correct types
'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import CenterMap from '@/components/CenterMap'
import type { Centre, Country, CenterType, FilterState } from '@/types/center'

export default function CentresPage() {
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
  const [showMap, setShowMap] = useState(true)

  // Fetch data from database
  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch all data in parallel
      const [centresResult, countriesResult, typesResult] = await Promise.all([
        supabase
          .from('rehabilitation_centers')
          .select('*')
          .eq('active', true)
          .order('name'),
        supabase
          .from('countries')
          .select('*')
          .order('name'),
        supabase
          .from('center_types')
          .select('*')
          .order('name')
      ])

      if (centresResult.error) throw centresResult.error
      if (countriesResult.error) throw countriesResult.error
      if (typesResult.error) throw typesResult.error

      setCentres(centresResult.data || [])
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
    return centres.filter(centre => {
      const matchesSearch = filters.search === '' || 
        centre.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        centre.address.toLowerCase().includes(filters.search.toLowerCase()) ||
        (centre.services && centre.services.toLowerCase().includes(filters.search.toLowerCase()))

      const matchesCountry = filters.country === '' || centre.country_id === filters.country
      const matchesType = filters.type === '' || centre.center_type_id === filters.type
      const matchesAccessibility = !filters.accessibility || centre.accessibility

      return matchesSearch && matchesCountry && matchesType && matchesAccessibility
    })
  }, [centres, filters])

  const handleUseLocation = async () => {
    if (loadingLocation) return

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
      },
      (error) => {
        alert('Unable to retrieve your location. Please check your browser permissions.')
        setLoadingLocation(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    )
  }

  const getCenterTypeName = (typeId: string) => {
    return centerTypes.find(t => t.id === typeId)?.name || 'Unknown'
  }

  const getCountryName = (countryId: string) => {
    return countries.find(c => c.id === countryId)?.name || 'Unknown'
  }

  const handleCenterClick = (center: Centre) => {
    setSelectedCenter(center)
    console.log('Selected center:', center.name)
  }

  const clearFilters = () => {
    setFilters({
      country: '',
      type: '',
      accessibility: false,
      search: ''
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading rehabilitation centers...</p>
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
      {/* Hero Section */}
      <div className="bg-white py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Find Rehabilitation Centers
            </h1>
            <p className="text-xl text-gray-600">
              Discover {centres.length} rehabilitation centers in Malaysia & Thailand
            </p>
          </div>

          {/* Search Section */}
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by name, location, or services..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-lg"
              />
            </div>
            <button
              onClick={handleUseLocation}
              disabled={loadingLocation}
              className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 disabled:bg-gray-400 flex items-center gap-2 whitespace-nowrap"
            >
              <span className="text-lg">📍</span>
              {loadingLocation ? 'Finding Location...' : 'Use My Location'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar Filters */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
                {(filters.country || filters.type || filters.accessibility || filters.search) && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Country Filter */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Country
                </label>
                <select
                  value={filters.country}
                  onChange={(e) => setFilters({ ...filters, country: e.target.value })}
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

              {/* Center Type Filter */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Center Type
                </label>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="">All Types</option>
                  {centerTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Accessibility Filter */}
              <div className="mb-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.accessibility}
                    onChange={(e) => setFilters({ ...filters, accessibility: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Wheelchair accessible only</span>
                </label>
              </div>

              {/* Map Toggle */}
              <div className="mb-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={showMap}
                    onChange={(e) => setShowMap(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Show map</span>
                </label>
              </div>

              {/* Results Summary */}
              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  Showing <strong>{filteredCentres.length}</strong> of <strong>{centres.length}</strong> centers
                </p>
                {userLocation && (
                  <div className="text-sm text-green-600 flex items-center gap-2 mt-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    Your location detected
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Map Section */}
            {showMap && (
              <div className="bg-white rounded-lg shadow-sm mb-8 overflow-hidden">
                <div className="p-4 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">Center Locations</h3>
                    <div className="text-sm text-gray-600">
                      {filteredCentres.length} centers shown
                    </div>
                  </div>
                </div>
                <div className="h-96">
                  <CenterMap
                    centers={filteredCentres}
                    userLocation={userLocation}
                    centerTypes={centerTypes}
                    countries={countries}
                    height="100%"
                    onCenterClick={handleCenterClick}
                  />
                </div>
                {!userLocation && (
                  <div className="p-4 bg-blue-50 border-t border-blue-200">
                    <p className="text-blue-700 text-sm">
                      💡 <strong>Tip:</strong> Click "Use My Location" above to see centers near you on the map
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Centers List */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  Rehabilitation Centers ({filteredCentres.length})
                </h2>
              </div>
              
              <div className="divide-y divide-gray-200">
                {filteredCentres.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="text-gray-400 text-4xl mb-4">🔍</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No centers found</h3>
                    <p className="text-gray-600 mb-4">
                      Try adjusting your search criteria or clearing your filters.
                    </p>
                    {(filters.country || filters.type || filters.accessibility || filters.search) && (
                      <button
                        onClick={clearFilters}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Clear all filters
                      </button>
                    )}
                  </div>
                ) : (
                  filteredCentres.map((centre) => (
                    <div 
                      key={centre.id} 
                      className={`p-6 hover:bg-gray-50 transition-colors cursor-pointer ${
                        selectedCenter?.id === centre.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                      }`}
                      onClick={() => handleCenterClick(centre)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {centre.name}
                          </h3>
                          
                          <div className="flex items-center gap-3 mb-3">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {getCenterTypeName(centre.center_type_id)}
                            </span>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {getCountryName(centre.country_id)}
                            </span>
                            {centre.accessibility && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                ♿ Accessible
                              </span>
                            )}
                            {centre.verified && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                ✓ Verified
                              </span>
                            )}
                          </div>

                          <p className="text-gray-600 mb-3">
                            📍 {centre.address}
                          </p>

                          {centre.services && (
                            <p className="text-gray-700 text-sm mb-3">
                              <strong>Services:</strong> {centre.services.substring(0, 150)}
                              {centre.services.length > 150 && '...'}
                            </p>
                          )}

                          <div className="flex items-center gap-4 text-sm">
                            {centre.phone && (
                              <a 
                                href={`tel:${centre.phone}`}
                                className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                📞 {centre.phone}
                              </a>
                            )}
                            {centre.email && (
                              <a 
                                href={`mailto:${centre.email}`}
                                className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                onClick={(e) => e.stopPropagation()}
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
                                onClick={(e) => e.stopPropagation()}
                              >
                                🌐 Website
                              </a>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          {centre.latitude && centre.longitude && (
                            <span className="text-xs text-green-600 flex items-center gap-1">
                              📍 Mapped
                            </span>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCenterClick(centre)
                              if (showMap) {
                                document.querySelector('.lg\\:col-span-3')?.scrollIntoView({ 
                                  behavior: 'smooth', 
                                  block: 'start' 
                                })
                              }
                            }}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}