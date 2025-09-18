// src/app/page.tsx - Enhanced Homepage with Search Button and Map Above Resources
'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import CenterMap from '@/components/CenterMap'
import type { Centre, Country, CenterType, FilterState } from '@/types/center'

export default function HomePage() {
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

  // Filter centers based on search criteria
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

  // Get featured centers (first 6 filtered results)
  const featuredCentres = useMemo(() => {
    return filteredCentres.slice(0, 6)
  }, [filteredCentres])

  const handleUseLocation = async () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.')
      return
    }

    setLoadingLocation(true)
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        })
        setLoadingLocation(false)
      },
      (error) => {
        console.error('Error getting location:', error)
        alert('Unable to retrieve your location. Please try again.')
        setLoadingLocation(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
      }
    )
  }

  const handleSearch = () => {
    // The search is already happening in real-time via the filteredCentres useMemo
    // This function can be used for additional search actions if needed
    console.log('Search triggered with:', filters.search)
  }

  const handleCenterClick = (center: Centre) => {
    setSelectedCenter(center)
  }

  const getCountryName = (countryId: string) => {
    const country = countries.find(c => c.id === countryId)
    return country?.name || 'Unknown'
  }

  const getCenterTypeName = (typeId: string) => {
    const type = centerTypes.find(t => t.id === typeId)
    return type?.name || 'Unknown'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8">
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
      <div className="bg-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              RehabFinder - Find Rehabilitation Centers
            </h1>
            <p className="text-xl text-gray-600">
              Discover {centres.length} rehabilitation centers in Malaysia & Thailand
            </p>
            <p className="text-lg text-gray-500 mt-2">
              Your comprehensive guide to recovery and healing
            </p>
          </div>

          {/* Search Section */}
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row gap-4">
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                placeholder="Search by name, location, or services..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-lg"
              />
              <button
                onClick={handleSearch}
                className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 flex items-center gap-2 whitespace-nowrap"
              >
                <span className="text-lg">🔍</span>
                Search
              </button>
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
          {/* Filter Centers Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter Centers</h3>

              {/* Country Filter */}
              <div className="mb-4">
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
              <div className="mb-4">
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
              <div className="mb-4">
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

              {/* Results Summary */}
              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  Showing <strong>{filteredCentres.length}</strong> of <strong>{centres.length}</strong> centers
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            {/* Center Locations Map */}
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
          </div>
        </div>

                {/* Featured Rehabilitation Centers */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">
                Featured Rehabilitation Centers
              </h2>
              <a 
                href="/centres"
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors font-medium"
              >
                View All {centres.length} Centers
              </a>
            </div>
            <p className="text-gray-600 text-sm mt-2">Discover some of our featured rehabilitation centers</p>
          </div>
          
          <div className="divide-y divide-gray-200">
            {featuredCentres.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-gray-400 text-4xl mb-4">🔍</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No centers found</h3>
                <p className="text-gray-600 mb-4">
                  Try adjusting your search criteria or clearing your filters.
                </p>
                <button 
                  onClick={() => setFilters({ country: '', type: '', accessibility: false, search: '' })}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              featuredCentres.map((centre) => (
                <div key={centre.id} className="p-6 hover:bg-gray-50 cursor-pointer transition-colors">
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
                        
                        <div className="flex items-center gap-2">
                          <span>🏥</span>
                          <span>{getCenterTypeName(centre.center_type_id)}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span>🌍</span>
                          <span>{getCountryName(centre.country_id)}</span>
                        </div>
                        
                        {centre.accessibility && (
                          <div className="flex items-center gap-2">
                            <span>♿</span>
                            <span>Wheelchair Accessible</span>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-4 mt-3">
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
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      {centre.latitude && centre.longitude && (
                        <span className="text-xs text-green-600 flex items-center gap-1">
                          📍 Mapped
                        </span>
                      )}
                      <a
                        href="/centres"
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View All Details
                      </a>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

        {/* Comprehensive Rehabilitation Resources */}
        <div className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Comprehensive Rehabilitation Resources
            </h2>
            <p className="text-xl text-gray-600">
              Everything you need for your recovery journey
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Exercise Videos */}
            <div className="bg-white rounded-lg shadow-sm p-6 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">▶️</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Exercise Videos</h3>
              <p className="text-gray-600 text-sm mb-4">Guided rehabilitation exercises and therapy routines</p>
              <button className="bg-blue-500 text-white px-4 py-2 rounded text-sm hover:bg-blue-600">
                Coming Soon
              </button>
            </div>

            {/* Downloadable Toolkits */}
            <div className="bg-white rounded-lg shadow-sm p-6 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⬇️</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Downloadable Toolkits</h3>
              <p className="text-gray-600 text-sm mb-4">Comprehensive resources for patients and families</p>
              <button className="bg-green-500 text-white px-4 py-2 rounded text-sm hover:bg-green-600">
                Coming Soon
              </button>
            </div>

            {/* Support Groups */}
            <div className="bg-white rounded-lg shadow-sm p-6 text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">👥</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Support Groups</h3>
              <p className="text-gray-600 text-sm mb-4">Connect with others on similar recovery journeys</p>
              <button className="bg-purple-500 text-white px-4 py-2 rounded text-sm hover:bg-purple-600">
                Coming Soon
              </button>
            </div>

            {/* Traditional Healing Practices */}
            <div className="bg-white rounded-lg shadow-sm p-6 text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🌿</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Traditional Healing Practices</h3>
              <p className="text-gray-600 text-sm mb-4">Complementary and alternative medicine options</p>
              <button className="bg-orange-500 text-white px-4 py-2 rounded text-sm hover:bg-orange-600">
                Coming Soon
              </button>
            </div>
          </div>
        </div>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-300">© 2024 RehabFinder. Connecting you to recovery resources in Malaysia & Thailand.</p>
          <p className="text-gray-400 text-sm mt-2">Phase 1: Rehabilitation Centers Database • Phase 2: Exercise Videos Coming Soon</p>
        </div>
      </footer>
    </div>
  )
}