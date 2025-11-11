// src/app/admin/page.tsx - Admin Dashboard with Search Bar (Fixed Location & Admin Colors)
'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import CenterMap from '@/components/CenterMap'

interface DashboardStats {
  totalCenters: number
  activeCenters: number
  verifiedCenters: number
  centersNeedingGeocode: number
  recentSubmissions: number
  countriesCount: number
  centerTypesCount: number
}

interface RecentCenter {
  id: string
  name: string
  address: string
  created_at: string
  verified: boolean
  latitude?: number
  longitude?: number
}

interface Centre {
  id: string
  name: string
  address: string
  latitude?: number | null
  longitude?: number | null
  phone?: string | null
  email?: string | null
  website?: string | null
  services?: string | null
  accessibility: boolean
  country_id: string
  center_type_id: string
  active: boolean
  verified: boolean
  created_at: string
  state_id?: string | null
}

interface Country {
  id: string
  name: string
  code: string
}

interface State {
  id: string
  name: string
  country_id: string
}

interface CenterType {
  id: string
  name: string
  description: string
}

interface FilterState {
  country: string
  state: string
  type: string
  search: string
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentCenters, setRecentCenters] = useState<RecentCenter[]>([])
  const [allCenters, setAllCenters] = useState<Centre[]>([])
  const [countries, setCountries] = useState<Country[]>([])
  const [states, setStates] = useState<State[]>([])
  const [centerTypes, setCenterTypes] = useState<CenterType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showMap, setShowMap] = useState(true)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [loadingLocation, setLoadingLocation] = useState(false)
  
  // Search and filter state
  const [filters, setFilters] = useState<FilterState>({
    country: '',
    state: '',
    type: '',
    search: ''
  })

  // Filter states based on selected country
  const availableStates = useMemo(() => {
    if (!filters.country) return []
    return states.filter(state => state.country_id === filters.country)
  }, [states, filters.country])

  useEffect(() => {
    fetchDashboardData()
  }, [])

  // Helper function to calculate distance
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371 // Radius of Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  // Filter centers based on search criteria
  const filteredCenters = useMemo(() => {
    let filtered = allCenters

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

    if (filters.state) {
      filtered = filtered.filter(centre => centre.state_id === filters.state)
    }

    if (filters.type) {
      filtered = filtered.filter(centre => centre.center_type_id === filters.type)
    }

    // Sort by distance if user location is available
    if (userLocation) {
      const centresWithDistance = filtered
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

      const centresWithoutCoords = filtered.filter(centre => !centre.latitude || !centre.longitude)
      
      return [...centresWithDistance, ...centresWithoutCoords]
    }

    return filtered
  }, [allCenters, filters, userLocation])

  // FIXED: Use My Location handler
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
        console.log('✅ Location detected:', position.coords.latitude, position.coords.longitude)
      },
      (error) => {
        console.error('❌ Geolocation error:', error)
        let errorMessage = 'Unable to retrieve your location. '
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += 'Please allow location access in your browser settings.'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage += 'Location information is unavailable.'
            break
          case error.TIMEOUT:
            errorMessage += 'Location request timed out.'
            break
        }
        alert(errorMessage)
        setLoadingLocation(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  }

  const handleSearch = () => {
    console.log('Search triggered with:', filters.search)
  }

  const fetchDashboardData = async () => {
    try {
      setLoading(true)

      // Fetch ALL active centers for map (with pagination)
      const fetchAllActiveCenters = async () => {
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

      // Fetch statistics and data in parallel
      const [
        centersResult,
        activeCentersResult,
        verifiedCentersResult,
        needsGeocodeResult,
        recentSubmissionsResult,
        countriesResult,
        statesResult,
        typesResult,
        recentCentersResult,
        activeCenters
      ] = await Promise.all([
        supabase.from('rehabilitation_centers').select('id', { count: 'exact', head: true }),
        supabase.from('rehabilitation_centers').select('id', { count: 'exact', head: true }).eq('active', true),
        supabase.from('rehabilitation_centers').select('id', { count: 'exact', head: true }).eq('verified', true),
        supabase.from('rehabilitation_centers').select('id', { count: 'exact', head: true }).is('latitude', null),
        supabase.from('rehabilitation_centers').select('id', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
        supabase.from('countries').select('*').order('name'),
        supabase.from('states').select('*').order('name'),
        supabase.from('center_types').select('*').order('name'),
        supabase
          .from('rehabilitation_centers')
          .select('id, name, address, created_at, verified, latitude, longitude')
          .order('created_at', { ascending: false })
          .limit(10),
        fetchAllActiveCenters()
      ])

      const dashboardStats: DashboardStats = {
        totalCenters: centersResult.count || 0,
        activeCenters: activeCentersResult.count || 0,
        verifiedCenters: verifiedCentersResult.count || 0,
        centersNeedingGeocode: needsGeocodeResult.count || 0,
        recentSubmissions: recentSubmissionsResult.count || 0,
        countriesCount: countriesResult.data?.length || 0,
        centerTypesCount: typesResult.data?.length || 0
      }

      setStats(dashboardStats)
      setRecentCenters(recentCentersResult.data || [])
      setAllCenters(activeCenters)
      setCountries(countriesResult.data || [])
      setStates(statesResult.data || [])
      setCenterTypes((typesResult.data || []).map(type => ({
        ...type,
        description: type.description || ''
      })))

    } catch (err) {
      console.error('Error fetching dashboard data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8 max-w-md">
          <div className="text-red-500 text-xl mb-4">⚠️ Error Loading Dashboard</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchDashboardData}
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
              <h1 className="text-3xl font-bold text-gray-900">RehabFinder Admin</h1>
              <p className="text-gray-600 mt-1">Manage rehabilitation centers and system data</p>
            </div>
            <Link
              href="/"
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center gap-2"
            >
              🏠 Back to Site
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Centers</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.totalCenters || 0}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <span className="text-2xl">🏥</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Centers</p>
                <p className="text-2xl font-bold text-green-600">{stats?.activeCenters || 0}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <span className="text-2xl">✅</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Verified Centers</p>
                <p className="text-2xl font-bold text-purple-600">{stats?.verifiedCenters || 0}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <span className="text-2xl">🔐</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Need Geocoding</p>
                <p className="text-2xl font-bold text-orange-600">{stats?.centersNeedingGeocode || 0}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <span className="text-2xl">📍</span>
              </div>
            </div>
          </div>
        </div>

        {/* SEARCH BAR AND FILTERS - ADMIN STYLE (WHITE BACKGROUND) */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Search & Filter Centers</h3>
          
          {/* Search Box */}
          <div className="mb-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search by location, name, or services... (e.g., Cheras, KL, addiction)"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleUseLocation}
                  disabled={loadingLocation}
                  className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap transition-colors"
                >
                  <span>📍</span>
                  {loadingLocation ? 'Finding...' : 'Use My Location'}
                </button>
                <button
                  onClick={handleSearch}
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 font-semibold transition-colors"
                >
                  Search
                </button>
              </div>
            </div>
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap gap-3 mb-4">
            <select
              value={filters.country}
              onChange={(e) => setFilters({ ...filters, country: e.target.value, state: '' })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
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
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
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
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
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
                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium"
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* Results Count */}
          <div className="text-sm text-gray-600">
            Showing <strong className="text-gray-900">{filteredCenters.length}</strong> of <strong className="text-gray-900">{allCenters.length}</strong> centers
          </div>

          {/* Location Status */}
          {userLocation && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-green-800 text-sm flex items-center gap-2">
                <span>✓</span>
                <span><strong>Location detected!</strong> Centers are now sorted by distance from you at ({userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)})</span>
              </p>
            </div>
          )}
        </div>

        {/* Public Map Preview */}
        <div className="bg-white rounded-lg shadow-sm border mb-8">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">📍 Public Map Preview</h2>
                <p className="text-sm text-gray-600 mt-1">
                  This is exactly what users see on the public site • Showing {filteredCenters.length} centers
                </p>
              </div>
              <button
                onClick={() => setShowMap(!showMap)}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                {showMap ? 'Hide Map' : 'Show Map'}
              </button>
            </div>
          </div>

          {showMap && (
            <div className="p-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800">
                  <strong>ℹ️ Live Preview:</strong> This map shows <strong>{filteredCenters.length} filtered centers</strong> based on your search criteria.
                  Any edits you make in the admin panel will reflect here immediately after saving.
                </p>
              </div>

              <div className="h-[500px] rounded-lg overflow-hidden border border-gray-200">
                <CenterMap
                  centers={filteredCenters}
                  userLocation={userLocation}
                  centerTypes={centerTypes}
                  countries={countries}
                  height="100%"
                  onCenterClick={(center) => {
                    window.open(`/admin/centers/${center.id}`, '_blank')
                  }}
                />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-4">
                <div className="bg-gray-50 p-3 rounded border">
                  <p className="text-xs text-gray-600">Centers with Coordinates</p>
                  <p className="text-lg font-bold text-green-600">
                    {filteredCenters.filter(c => c.latitude && c.longitude).length}
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded border">
                  <p className="text-xs text-gray-600">Missing Coordinates</p>
                  <p className="text-lg font-bold text-orange-600">
                    {filteredCenters.filter(c => !c.latitude || !c.longitude).length}
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded border">
                  <p className="text-xs text-gray-600">Total Visible</p>
                  <p className="text-lg font-bold text-blue-600">
                    {filteredCenters.length}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <div>
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>

              <div className="space-y-3">
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <Link
                    href="/admin/centers"
                    className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-xl">🏥</span>
                    <div>
                      <p className="font-medium text-gray-900">Manage Centers</p>
                      <p className="text-sm text-gray-600">Add, edit, or remove centers</p>
                    </div>
                  </Link>
                  
                  <Link
                    href="/centers/new"
                    className="w-full flex items-center gap-3 p-3 pl-12 text-left bg-gray-50 hover:bg-gray-100 transition-colors border-t border-gray-200"
                  >
                    <span className="text-lg">➕</span>
                    <div>
                      <p className="font-medium text-blue-600">Add New Center</p>
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Recent Centers</h3>
                <span className="text-sm text-gray-600">
                  {stats?.recentSubmissions || 0} added this week
                </span>
              </div>

              <div className="space-y-4">
                {recentCenters.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No recent centers found</p>
                ) : (
                  recentCenters.map((center) => (
                    <div key={center.id} className="border-b border-gray-200 pb-4 last:border-b-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-gray-900">{center.name}</h4>
                            {center.verified && (
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                ✓ Verified
                              </span>
                            )}
                            {!center.latitude && (
                              <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                                📍 Needs Geocoding
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{center.address}</p>
                          <p className="text-xs text-gray-500">
                            Added: {new Date(center.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Link
                          href={`/admin/centers/${center.id}`}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Edit →
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {recentCenters.length > 0 && (
                <div className="mt-6 text-center">
                  <Link
                    href="/admin/centers"
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    View All Centers →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}