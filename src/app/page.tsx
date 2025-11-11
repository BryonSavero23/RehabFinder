// src/app/page.tsx - Enhanced Homepage with Location-Based Sorting + Autocomplete Search
'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import CenterMap from '@/components/CenterMap'
import ExerciseVideos from '@/components/ExerciseVideos'
import type { Centre, Country, State, CenterType, FilterState } from '@/types/center'

export default function HomePage() {
  const [centres, setCentres] = useState<Centre[]>([])
  const [countries, setCountries] = useState<Country[]>([])
  const [states, setStates] = useState<State[]>([])
  const [centerTypes, setCenterTypes] = useState<CenterType[]>([])
  const [filters, setFilters] = useState<FilterState>({
    country: '',
    state: '',
    type: '',
    search: ''
  })
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadingLocation, setLoadingLocation] = useState(false)
  const [selectedCenter, setSelectedCenter] = useState<Centre | null>(null)

  // NEW: Autocomplete state
  const [searchSuggestions, setSearchSuggestions] = useState<Array<{
    type: 'center' | 'location' | 'service'
    value: string
    center?: Centre
  }>>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Filter states based on selected country
  const availableStates = useMemo(() => {
    if (!filters.country) return []
    return states.filter(state => state.country_id === filters.country)
  }, [states, filters.country])

  // Fetch data from database
  useEffect(() => {
    fetchData()
  }, [])

const fetchData = async () => {
  try {
    setLoading(true)
    setError(null)

    // Fetch ALL centers using pagination
    const fetchAllCenters = async () => {
      let allCenters: Centre[] = []
      let from = 0
      const pageSize = 1000
      
      console.log('🔄 Starting pagination fetch...')
      
      while (true) {
        const { data, error } = await supabase
          .from('rehabilitation_centers')
          .select('*')
          .eq('active', true)
          .range(from, from + pageSize - 1)
          .order('name')
        
        if (error) {
          console.error('Supabase error:', error)
          throw error
        }
        if (!data || data.length === 0) break
        
        allCenters = [...allCenters, ...data]
        console.log(`📦 Batch: ${data.length} | Total: ${allCenters.length}`)
        
        if (data.length < pageSize) break
        from += pageSize
      }
      
      // 🔍 DEBUG: Check for duplicate IDs in the raw data
      const idCount = new Map<string, number>()
      allCenters.forEach(center => {
        idCount.set(center.id, (idCount.get(center.id) || 0) + 1)
      })
      
      const duplicateIds = Array.from(idCount.entries()).filter(([id, count]) => count > 1)
      if (duplicateIds.length > 0) {
        console.warn('⚠️ DUPLICATE IDs FOUND IN DATABASE:', duplicateIds)
        duplicateIds.forEach(([id, count]) => {
          const dupes = allCenters.filter(c => c.id === id)
          console.warn(`ID: ${id} appears ${count} times:`, dupes.map(d => d.name))
        })
      }
      
      // 🔍 DEBUG: Check for duplicate names (same name but different IDs)
      const nameCount = new Map<string, Centre[]>()
      allCenters.forEach(center => {
        const existing = nameCount.get(center.name) || []
        nameCount.set(center.name, [...existing, center])
      })
      
      const duplicateNames = Array.from(nameCount.entries()).filter(([name, centers]) => centers.length > 1)
      if (duplicateNames.length > 0) {
        console.warn('⚠️ DUPLICATE NAMES FOUND (different IDs):', duplicateNames.length)
        console.warn('💡 These are likely the same centers imported multiple times with different IDs.')
        console.warn('🔧 Recommendation: Clean up your database to remove duplicate center names.')
        duplicateNames.slice(0, 5).forEach(([name, centers]) => {
          console.warn(`Name: "${name}" appears ${centers.length} times with IDs:`, centers.map(c => c.id))
        })
        if (duplicateNames.length > 5) {
          console.warn(`... and ${duplicateNames.length - 5} more duplicate names`)
        }
      }
      
      return allCenters
    }

    const [centres, countriesResult, statesResult, typesResult] = await Promise.all([
      fetchAllCenters(),
      supabase.from('countries').select('*').order('name'),
      supabase.from('states').select('*').order('name'),
      supabase.from('center_types').select('*').order('name')
    ])

    if (countriesResult.error) {
      console.error('Countries error:', countriesResult.error)
      throw countriesResult.error
    }
    if (statesResult.error) {
      console.error('States error:', statesResult.error)
      throw statesResult.error
    }
    if (typesResult.error) {
      console.error('Center types error:', typesResult.error)
      throw typesResult.error
    }

    console.log('✅ Total loaded:', centres.length)

    setCentres(centres)
    setCountries(countriesResult.data || [])
    setStates(statesResult.data || [])
    setCenterTypes(typesResult.data || [])

  } catch (err) {
    // FIXED: Better error handling for network and database errors
    console.error('Error fetching data:', err)
    
    let errorMessage = 'Failed to load data'
    
    // Handle different error types
    if (err instanceof TypeError && err.message.includes('fetch')) {
      errorMessage = 'Network Error: Cannot connect to database. Please check your internet connection and Supabase configuration.'
    } else if (err && typeof err === 'object' && 'message' in err) {
      errorMessage = (err as any).message || 'Database error occurred'
    } else if (err instanceof Error) {
      errorMessage = err.message
    }
    
    setError(errorMessage)
  } finally {
    setLoading(false)
  }
}

  // NEW: Generate autocomplete suggestions
  useEffect(() => {
    if (!filters.search || filters.search.length < 2) {
      setSearchSuggestions([])
      setShowSuggestions(false)
      return
    }

    const searchTerm = filters.search.toLowerCase()
    const suggestions: Array<{
      type: 'center' | 'location' | 'service'
      value: string
      center?: Centre
    }> = []

    // Get center name suggestions
    const centerMatches = centres
      .filter(centre => 
        centre.name.toLowerCase().includes(searchTerm) && centre.active
      )
      .slice(0, 5)
      .map(centre => ({
        type: 'center' as const,
        value: centre.name,
        center: centre
      }))

    // Get location suggestions from addresses
    const locationSet = new Set<string>()
    centres
      .filter(centre => centre.active)
      .forEach(centre => {
        if (centre.address) {
          const parts = centre.address.split(',').map(p => p.trim())
          parts.forEach(part => {
            if (part.toLowerCase().includes(searchTerm) && part.length > 2) {
              locationSet.add(part)
            }
          })
        }
      })
    
    const locationMatches = Array.from(locationSet)
      .slice(0, 5)
      .map(location => ({
        type: 'location' as const,
        value: location,
      }))

    // Get service suggestions
    const serviceSet = new Set<string>()
    centres
      .filter(centre => centre.active && centre.services)
      .forEach(centre => {
        if (centre.services) {
          const services = centre.services.split(',').map(s => s.trim())
          services.forEach(service => {
            if (service.toLowerCase().includes(searchTerm) && service.length > 2) {
              serviceSet.add(service)
            }
          })
        }
      })

    const serviceMatches = Array.from(serviceSet)
      .slice(0, 5)
      .map(service => ({
        type: 'service' as const,
        value: service,
      }))

    // Combine all suggestions with priority: centers first, then locations, then services
    suggestions.push(...centerMatches, ...locationMatches, ...serviceMatches)

    setSearchSuggestions(suggestions.slice(0, 10)) // Limit to 10 total suggestions
    setShowSuggestions(suggestions.length > 0)
    setSelectedSuggestionIndex(-1)
  }, [filters.search, centres])

  // NEW: Handle suggestion click
  const handleSuggestionClick = (suggestion: typeof searchSuggestions[0]) => {
    setFilters({ ...filters, search: suggestion.value })
    setShowSuggestions(false)
    setSelectedSuggestionIndex(-1)
    
    // If it's a center suggestion, scroll to it
    if (suggestion.center) {
      setSelectedCenter(suggestion.center)
    }
  }

  // NEW: Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedSuggestionIndex(prev => 
          prev < searchSuggestions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : -1)
        break
      case 'Enter':
        e.preventDefault()
        if (selectedSuggestionIndex >= 0 && selectedSuggestionIndex < searchSuggestions.length) {
          handleSuggestionClick(searchSuggestions[selectedSuggestionIndex])
        }
        break
      case 'Escape':
        setShowSuggestions(false)
        setSelectedSuggestionIndex(-1)
        break
    }
  }

  // NEW: Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Helper function to calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371 // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c // Distance in kilometers
  }

  // Filter centers based on search criteria
  const filteredCentres = useMemo(() => {
    console.log('🔍 Starting filter with:', filters.search || 'no search term')
    let filtered = centres

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase()
      filtered = filtered.filter(centre => 
        centre.name.toLowerCase().includes(searchTerm) ||
        centre.address.toLowerCase().includes(searchTerm) ||
        (centre.services && centre.services.toLowerCase().includes(searchTerm))
      )
      console.log(`📋 After search filter: ${filtered.length} centers`)
    }

    if (filters.country) {
      filtered = filtered.filter(centre => centre.country_id === filters.country)
      console.log(`🌍 After country filter: ${filtered.length} centers`)
    }

    if (filters.state) {
      filtered = filtered.filter(centre => centre.state_id === filters.state)
      console.log(`📍 After state filter: ${filtered.length} centers`)
    }

    if (filters.type) {
      filtered = filtered.filter(centre => centre.center_type_id === filters.type)
      console.log(`🏥 After type filter: ${filtered.length} centers`)
    }

    console.log(`📊 Before deduplication: ${filtered.length} centers`)

    // Check for duplicates BEFORE deduplication
    const idsBefore = filtered.map(c => c.id)
    const duplicateIdsBefore = idsBefore.filter((id, index) => idsBefore.indexOf(id) !== index)
    if (duplicateIdsBefore.length > 0) {
      console.warn('⚠️ DUPLICATES DETECTED IN FILTERED LIST:', new Set(duplicateIdsBefore))
      duplicateIdsBefore.forEach(dupId => {
        const dupes = filtered.filter(c => c.id === dupId)
        console.warn(`Duplicate ID ${dupId}:`, dupes.map(d => ({ name: d.name, id: d.id })))
      })
    }

    // CRITICAL FIX: Remove duplicates by NAME (many centers have same name but different IDs)
    // We'll keep the first occurrence of each unique name
    const seenNames = new Set<string>()
    const uniqueCentres = filtered.filter(centre => {
      const nameLower = centre.name.toLowerCase().trim()
      if (seenNames.has(nameLower)) {
        console.log(`🗑️ Removing duplicate: "${centre.name}" (ID: ${centre.id})`)
        return false
      }
      seenNames.add(nameLower)
      return true
    })

    console.log(`✅ After deduplication: ${uniqueCentres.length} centers`)
    console.log(`🗑️ Removed ${filtered.length - uniqueCentres.length} duplicates by name`)

    // NEW: Sort by distance if user location is available
    if (userLocation) {
      const centresWithDistance = uniqueCentres
        .filter(centre => centre.latitude && centre.longitude)
        .map(centre => ({
          ...centre,
          distance: calculateDistance(
            userLocation.lat,
            userLocation.lng,
            centre.latitude!,
            centre.longitude!
          )
        }))
        .sort((a, b) => a.distance - b.distance)

      // Add centers without coordinates at the end
      const centresWithoutCoords = uniqueCentres.filter(centre => !centre.latitude || !centre.longitude)
      
      console.log(`📍 Sorted by distance from user location: ${centresWithDistance.length} centers with coords, ${centresWithoutCoords.length} without`)
      
      return [...centresWithDistance, ...centresWithoutCoords]
    }

    return uniqueCentres
  }, [centres, filters, userLocation])

  // Get featured centers (first 6 filtered results)
  const featuredCentres = useMemo(() => {
    const featured = filteredCentres.slice(0, 6)
    
    // 🔍 DEBUG: Log the featured centers
    console.log('⭐ Featured centers:', featured.map(c => ({ id: c.id, name: c.name })))
    
    // Check for duplicates in featured
    const featuredIds = featured.map(c => c.id)
    const duplicateFeatured = featuredIds.filter((id, index) => featuredIds.indexOf(id) !== index)
    if (duplicateFeatured.length > 0) {
      console.error('❌ DUPLICATES IN FEATURED LIST:', duplicateFeatured)
    }
    
    return featured
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

  const getStateName = (stateId: string | null | undefined) => {
    if (!stateId) return null
    const state = states.find(s => s.id === stateId)
    return state?.name || null
  }

  const getCenterTypeName = (typeId: string) => {
    const type = centerTypes.find(t => t.id === typeId)
    return type?.name || 'Unknown'
  }

  // Helper to format distance
  const formatDistance = (center: Centre & { distance?: number }) => {
    if (!center.distance) return null
    if (center.distance < 1) {
      return `${Math.round(center.distance * 1000)}m away`
    }
    return `${center.distance.toFixed(1)}km away`
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
        <div className="text-center p-8 max-w-2xl">
          <div className="text-red-500 text-xl mb-4">⚠️ Error Loading Data</div>
          <p className="text-gray-900 font-semibold mb-2">{error}</p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 text-left">
            <p className="text-sm text-gray-700 mb-2"><strong>Common fixes:</strong></p>
            <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
              <li>Check your internet connection</li>
              <li>Verify NEXT_PUBLIC_SUPABASE_URL in .env.local</li>
              <li>Verify NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local</li>
              <li>Restart your development server after changing .env.local</li>
              <li>Check Supabase project status at supabase.com</li>
            </ul>
          </div>
          <button 
            onClick={fetchData}
            className="bg-blue-500 text-white px-6 py-3 rounded hover:bg-blue-600 font-semibold"
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
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Find Hope, Find Help
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 mb-2">
              Your Path to Recovery Starts Here
            </p>
            <p className="text-lg text-blue-200">
              Discover {centres.length} rehabilitation centers across Malaysia & Thailand
            </p>
          </div>

          {/* Search Box with Autocomplete */}
          <div className="mt-12 max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-2">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1 relative">
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search by location, name, or services... (e.g., Cheras, KL, addiction)"
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    onKeyDown={handleKeyDown}
                    onFocus={() => {
                      if (searchSuggestions.length > 0) {
                        setShowSuggestions(true)
                      }
                    }}
                    className="w-full px-4 py-3 text-gray-900 outline-none rounded-md border-2 border-transparent focus:border-blue-500"
                  />
                  
                  {/* Suggestions Dropdown */}
                  {showSuggestions && searchSuggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-lg shadow-xl max-h-80 overflow-y-auto">
                      {searchSuggestions.map((suggestion, index) => (
                        <div
                          key={`${suggestion.type}-${suggestion.value}-${index}`}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className={`px-4 py-3 cursor-pointer border-b border-gray-100 hover:bg-blue-50 transition-colors ${
                            index === selectedSuggestionIndex ? 'bg-blue-50' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {/* Icon based on type */}
                            <span className="text-lg">
                              {suggestion.type === 'center' && '🏥'}
                              {suggestion.type === 'location' && '📍'}
                              {suggestion.type === 'service' && '💊'}
                            </span>
                            
                            {/* Suggestion content */}
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">
                                {suggestion.value}
                              </div>
                              <div className="text-xs text-gray-500 capitalize">
                                {suggestion.type === 'center' && 'Rehabilitation Center'}
                                {suggestion.type === 'location' && 'Location'}
                                {suggestion.type === 'service' && 'Service'}
                              </div>
                            </div>
                            
                            {/* Additional info for centers */}
                            {suggestion.center && (
                              <div className="text-xs text-gray-400">
                                {suggestion.center.address.split(',')[0]}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleUseLocation}
                    disabled={loadingLocation}
                    className="bg-blue-500 text-white px-6 py-3 rounded-md hover:bg-blue-600 disabled:bg-gray-400 flex items-center gap-2 whitespace-nowrap"
                  >
                    <span>📍</span>
                    {loadingLocation ? 'Finding...' : 'Use My Location'}
                  </button>
                  <button
                    onClick={handleSearch}
                    className="bg-blue-600 text-white px-8 py-3 rounded-md hover:bg-blue-700 font-semibold"
                  >
                    Search
                  </button>
                </div>
              </div>
            </div>

            {/* Filter Tags */}
            <div className="mt-4 flex flex-wrap gap-3">
              <select
                value={filters.country}
                onChange={(e) => setFilters({ ...filters, country: e.target.value, state: '' })}
                className="px-4 py-2 bg-white text-gray-900 rounded-md border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">All Countries</option>
                {countries.map((country) => (
                  <option key={country.id} value={country.id}>
                    {country.name}
                  </option>
                ))}
              </select>

              {availableStates.length > 0 && (
                <select
                  value={filters.state}
                  onChange={(e) => setFilters({ ...filters, state: e.target.value })}
                  className="px-4 py-2 bg-white text-gray-900 rounded-md border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">All States</option>
                  {availableStates.map((state) => (
                    <option key={state.id} value={state.id}>
                      {state.name}
                    </option>
                  ))}
                </select>
              )}

              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                className="px-4 py-2 bg-white text-gray-900 rounded-md border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">All Types</option>
                {centerTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>

              {(filters.search || filters.country || filters.state || filters.type) && (
                <button
                  onClick={() => setFilters({ country: '', state: '', type: '', search: '' })}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                >
                  Clear Filters
                </button>
              )}
            </div>

            {/* Location Status */}
            {userLocation && (
              <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-green-800 text-sm flex items-center gap-2">
                  <span>✓</span>
                  <span><strong>Location detected!</strong> Centers are now sorted by distance from you.</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Map Section */}
        <div className="mb-12">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="border-b border-gray-200 p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Explore Centers on Map</h2>
                  <p className="text-gray-600 mt-1">
                    {userLocation 
                      ? 'Interactive map showing centers sorted by distance from you'
                      : 'Interactive map showing all matching rehabilitation centers'
                    }
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">
                    {filteredCentres.length}
                  </div>
                  <div className="text-sm text-gray-600">
                    {filteredCentres.length === 1 ? 'center' : 'centers'} shown
                  </div>
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

        {/* Featured Rehabilitation Centers */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">
                {userLocation ? 'Nearest Rehabilitation Centers' : 'Featured Rehabilitation Centers'}
              </h2>
              <a 
                href="/centres"
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors font-medium"
              >
                View All {centres.length} Centers
              </a>
            </div>
            <p className="text-gray-600 text-sm mt-2">
              {userLocation && `Showing the 6 closest centers to your location`}
              {!userLocation && filters.search && `Showing first 6 of ${filteredCentres.length} matching centers`}
              {!userLocation && !filters.search && 'Discover some of our featured rehabilitation centers'}
            </p>
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
                  onClick={() => setFilters({ country: '', state: '', type: '', search: '' })}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              featuredCentres.map((centre, index) => (
                <div key={`${centre.id}-${index}`} className="p-6 hover:bg-gray-50 cursor-pointer transition-colors">
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
                        {userLocation && 'distance' in centre && centre.distance !== undefined && (
                          <span className="text-blue-600 text-sm bg-blue-100 px-2 py-1 rounded-full">
                            {formatDistance(centre as Centre & { distance?: number })}
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
                          <span>
                            {getCountryName(centre.country_id)}
                            {getStateName(centre.state_id) && ` • ${getStateName(centre.state_id)}`}
                          </span>
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
        <div id="resources" className="mb-12 max-w-7xl mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Comprehensive Rehabilitation Resources
            </h2>
            <p className="text-xl text-gray-600">
              Everything you need for your recovery journey
            </p>
          </div>

          {/* Exercise Videos Section - NOW WITH YOUTUBE VIDEOS! */}
          <div className="mb-12">
            <ExerciseVideos />
          </div>

          {/* Other Resources */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
          <p className="text-gray-400 text-sm mt-2">Phase 1: Rehabilitation Centers Database • Phase 2: Exercise Videos Now Live!</p>
        </div>
      </footer>
    </div>
  )
}