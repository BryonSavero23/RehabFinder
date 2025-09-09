// src/app/page.tsx - Complete Homepage with all features
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Map from '@/components/Map'

interface Centre {
  id: string
  name: string
  address: string
  latitude?: number
  longitude?: number
  phone?: string
  email?: string
  website?: string
  services?: string
  accessibility: boolean
  country_id: string
  center_type_id: string
  active: boolean
  verified: boolean
  created_at: string
}

interface Country {
  id: string
  name: string
  code: string
}

interface CenterType {
  id: string
  name: string
  description: string
}

interface FilterState {
  country: string
  type: string
  accessibility: boolean
  search: string
}

export default function HomePage() {
  const [centres, setCentres] = useState<Centre[]>([])
  const [countries, setCountries] = useState<Country[]>([])
  const [centerTypes, setCenterTypes] = useState<CenterType[]>([])
  const [filteredCentres, setFilteredCentres] = useState<Centre[]>([])
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
  const [showAllCenters, setShowAllCenters] = useState(false)

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
  useEffect(() => {
    let filtered = centres

    if (filters.search) {
      filtered = filtered.filter(centre =>
        centre.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        centre.address.toLowerCase().includes(filters.search.toLowerCase()) ||
        (centre.services && centre.services.toLowerCase().includes(filters.search.toLowerCase()))
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

    setFilteredCentres(filtered)
  }, [filters, centres])

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

  const getCountryName = (countryId: string) => {
    return countries.find(c => c.id === countryId)?.name || 'Unknown'
  }

  const getCenterTypeName = (typeId: string) => {
    return centerTypes.find(t => t.id === typeId)?.name || 'Unknown'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading RehabFinder...</p>
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

  const displayedCentres = showAllCenters ? filteredCentres : filteredCentres.slice(0, 6)

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
              {loadingLocation ? 'Getting Location...' : 'Use My Location'}
            </button>
          </div>
        </div>
      </div>

      {/* Resources Section */}
      <div className="bg-blue-50 py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Comprehensive Rehabilitation Resources</h2>
            <p className="text-lg text-gray-600">Everything you need for your recovery journey</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Exercise Videos */}
            <div className="bg-white rounded-lg p-6 text-center shadow-sm hover:shadow-md transition-shadow">
              <div className="text-4xl mb-4">▶️</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Exercise Videos</h3>
              <p className="text-gray-600 mb-4">Guided rehabilitation exercises and therapy routines</p>
              <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors">
                Coming Soon
              </button>
            </div>

            {/* Downloadable Toolkits */}
            <div className="bg-white rounded-lg p-6 text-center shadow-sm hover:shadow-md transition-shadow">
              <div className="text-4xl mb-4">⬇️</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Downloadable Toolkits</h3>
              <p className="text-gray-600 mb-4">Comprehensive resources for patients and families</p>
              <button className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors">
                Coming Soon
              </button>
            </div>

            {/* Support Groups */}
            <div className="bg-white rounded-lg p-6 text-center shadow-sm hover:shadow-md transition-shadow">
              <div className="text-4xl mb-4">👥</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Support Groups</h3>
              <p className="text-gray-600 mb-4">Connect with others on similar recovery journeys</p>
              <button className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 transition-colors">
                Coming Soon
              </button>
            </div>

            {/* Traditional Healing */}
            <div className="bg-white rounded-lg p-6 text-center shadow-sm hover:shadow-md transition-shadow">
              <div className="text-4xl mb-4">🌿</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Traditional Healing Practices</h3>
              <p className="text-gray-600 mb-4">Complementary and alternative medicine options</p>
              <button className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 transition-colors">
                Coming Soon
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Centers Content */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Sidebar Filters */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter Centers</h3>
              
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

              {/* Type Filter */}
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

              {/* Results Summary */}
              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  Showing <strong>{filteredCentres.length}</strong> of <strong>{centres.length}</strong> centers
                </p>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Map Section */}
            <div className="bg-white rounded-lg shadow-sm mb-8 overflow-hidden">
              <div className="h-96">
                <Map 
                  center={userLocation || undefined}
                  centres={filteredCentres.map(centre => ({
                    name: centre.name,
                    address: centre.address,
                    lat: centre.latitude || 0,
                    lng: centre.longitude || 0,
                    type: getCenterTypeName(centre.center_type_id)
                  }))}
                />
              </div>
            </div>

            {/* Centers List */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Rehabilitation Centers ({filteredCentres.length})
                  </h2>
                  {filteredCentres.length > 6 && (
                    <button
                      onClick={() => setShowAllCenters(!showAllCenters)}
                      className="text-blue-500 hover:text-blue-600 font-medium"
                    >
                      {showAllCenters ? 'Show Less' : `Show All ${filteredCentres.length}`}
                    </button>
                  )}
                </div>
              </div>
              
              <div className="divide-y divide-gray-200">
                {displayedCentres.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <p>No centers found matching your criteria.</p>
                    <p className="mt-2">Try adjusting your filters or search terms.</p>
                  </div>
                ) : (
                  displayedCentres.map((centre) => (
                    <div key={centre.id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900 mb-1">
                            {centre.name}
                          </h3>
                          <p className="text-gray-600">{centre.address}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {getCenterTypeName(centre.center_type_id)}
                          </span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {getCountryName(centre.country_id)}
                          </span>
                          {centre.accessibility && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              ♿ Accessible
                            </span>
                          )}
                        </div>
                      </div>

                      {centre.services && (
                        <div className="mb-4">
                          <p className="text-sm text-gray-600">
                            <strong>Services:</strong> {centre.services}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        {centre.phone && (
                          <a href={`tel:${centre.phone}`} className="hover:text-blue-600">
                            📞 {centre.phone}
                          </a>
                        )}
                        {centre.email && (
                          <a href={`mailto:${centre.email}`} className="hover:text-blue-600">
                            ✉️ {centre.email}
                          </a>
                        )}
                        {centre.website && (
                          <a 
                            href={centre.website.startsWith('http') ? centre.website : `https://${centre.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-blue-600"
                          >
                            🌐 Website
                          </a>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
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