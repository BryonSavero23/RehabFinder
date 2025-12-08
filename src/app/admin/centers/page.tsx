// src/app/admin/centers/page.tsx - Admin Centers Management Page 
'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

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
  state_id?: string | null
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

interface State {
  id: string
  name: string
  country_id: string
}

interface CenterType {
  id: string
  name: string
  description?: string
}

interface Filters {
  search: string
  country: string
  state: string
  type: string
  verified: string
  active: string
  needsGeocode: boolean
}

export default function AdminCentersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [centers, setCenters] = useState<Centre[]>([])
  const [countries, setCountries] = useState<Country[]>([])
  const [states, setStates] = useState<State[]>([])
  const [centerTypes, setCenterTypes] = useState<CenterType[]>([])
  const [filters, setFilters] = useState<Filters>({
    search: searchParams.get('search') || '',
    country: searchParams.get('country') || '',
    state: searchParams.get('state') || '',
    type: searchParams.get('type') || '',
    verified: searchParams.get('verified') || '',
    active: searchParams.get('active') || '',
    needsGeocode: searchParams.get('needsGeocode') === 'true'
  })
  const [loading, setLoading] = useState(true)
  const [selectedCenters, setSelectedCenters] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20)
  const [bulkActionLoading, setBulkActionLoading] = useState(false)

  // Check if selected country is Thailand
  const isThailand = useMemo(() => {
    if (!filters.country) return false
    const country = countries.find(c => c.id === filters.country)
    return country?.code === 'TH' || country?.name === 'Thailand'
  }, [countries, filters.country])

  // Filter states/provinces based on selected country
  const availableStates = useMemo(() => {
    if (!filters.country) return []
    return states.filter(state => state.country_id === filters.country)
  }, [states, filters.country])

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams()
    if (filters.search) params.set('search', filters.search)
    if (filters.country) params.set('country', filters.country)
    if (filters.state) params.set('state', filters.state)
    if (filters.type) params.set('type', filters.type)
    if (filters.verified) params.set('verified', filters.verified)
    if (filters.active) params.set('active', filters.active)
    if (filters.needsGeocode) params.set('needsGeocode', 'true')
    
    router.replace(`/admin/centers?${params.toString()}`, { scroll: false })
  }, [filters, router])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      console.log('Fetching admin centers data...')
      
      // Fetch ALL centers using pagination (Supabase limit is 1000 per request)
      const fetchAllCenters = async () => {
        let allCenters: Centre[] = []
        let from = 0
        const pageSize = 1000
        
        console.log('🔄 Starting admin pagination fetch...')
        
        while (true) {
          const { data, error } = await supabase
            .from('rehabilitation_centers')
            .select('*')
            .range(from, from + pageSize - 1)
            .order('name')
          
          if (error) {
            console.error('Error fetching batch:', error)
            throw error
          }
          
          if (!data || data.length === 0) {
            console.log('✅ No more data to fetch')
            break
          }
          
          allCenters = [...allCenters, ...data]
          console.log(`📦 Admin batch: ${data.length} centers | Total so far: ${allCenters.length}`)
          
          // If we got less than pageSize, we've reached the end
          if (data.length < pageSize) {
            console.log('✅ Reached end of data (last batch was partial)')
            break
          }
          
          from += pageSize
        }
        
        return allCenters
      }

      const [centers, countriesResult, statesResult, typesResult] = await Promise.all([
        fetchAllCenters(),
        supabase
          .from('countries')
          .select('*')
          .order('name'),
        supabase
          .from('states')
          .select('*')
          .order('name'),
        supabase
          .from('center_types')
          .select('*')
          .order('name')
      ])

      if (countriesResult.error) {
        console.error('Countries query error:', countriesResult.error)
        throw countriesResult.error
      }
      if (statesResult.error) {
        console.error('States query error:', statesResult.error)
        throw statesResult.error
      }
      if (typesResult.error) {
        console.error('Types query error:', typesResult.error)
        throw typesResult.error
      }

      console.log(`✅ ADMIN TOTAL: Loaded ${centers.length} centers`)

      setCenters(centers)
      setCountries(countriesResult.data || [])
      setStates(statesResult.data || [])
      setCenterTypes(typesResult.data || [])

    } catch (err) {
      console.error('Error fetching admin centers data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Filter centers based on current filters
  const filteredCenters = useMemo(() => {
    let filtered = centers

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase()
      filtered = filtered.filter(center => 
        center.name.toLowerCase().includes(searchTerm) ||
        center.address.toLowerCase().includes(searchTerm) ||
        (center.services && center.services.toLowerCase().includes(searchTerm))
      )
    }

    if (filters.country) {
      filtered = filtered.filter(center => center.country_id === filters.country)
    }

    if (filters.state) {
      filtered = filtered.filter(center => center.state_id === filters.state)
    }

    if (filters.type) {
      filtered = filtered.filter(center => center.center_type_id === filters.type)
    }

    if (filters.verified !== '') {
      filtered = filtered.filter(center => center.verified === (filters.verified === 'true'))
    }

    if (filters.active !== '') {
      filtered = filtered.filter(center => center.active === (filters.active === 'true'))
    }

    if (filters.needsGeocode) {
      filtered = filtered.filter(center => !center.latitude || !center.longitude)
    }

    return filtered
  }, [centers, filters])

  // Pagination - Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filters])

  const totalPages = Math.ceil(filteredCenters.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentCenters = filteredCenters.slice(startIndex, endIndex)

  const getCountryName = (countryId: string) => {
    return countries.find(c => c.id === countryId)?.name || 'Unknown'
  }

  const getStateName = (stateId: string | null | undefined) => {
    if (!stateId) return null
    return states.find(s => s.id === stateId)?.name || null
  }

  const getCenterTypeName = (typeId: string) => {
    return centerTypes.find(t => t.id === typeId)?.name || 'Unknown'
  }

  const handleSelectCenter = (centerId: string) => {
    const newSelected = new Set(selectedCenters)
    if (newSelected.has(centerId)) {
      newSelected.delete(centerId)
    } else {
      newSelected.add(centerId)
    }
    setSelectedCenters(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedCenters.size === currentCenters.length) {
      setSelectedCenters(new Set())
    } else {
      setSelectedCenters(new Set(currentCenters.map(c => c.id)))
    }
  }

  const handleBulkAction = async (action: 'verify' | 'unverify' | 'activate' | 'deactivate') => {
    if (selectedCenters.size === 0) return

    const confirmMessage = `Are you sure you want to ${action} ${selectedCenters.size} center(s)?`
    if (!confirm(confirmMessage)) return

    setBulkActionLoading(true)
    try {
      const updates = Array.from(selectedCenters).map(id => {
        switch (action) {
          case 'verify':
            return { id, verified: true }
          case 'unverify':
            return { id, verified: false }
          case 'activate':
            return { id, active: true }
          case 'deactivate':
            return { id, active: false }
        }
      })

      for (const update of updates) {
        const { error } = await supabase
          .from('rehabilitation_centers')
          .update({ 
            verified: update.verified,
            active: update.active 
          })
          .eq('id', update.id)

        if (error) throw error
      }

      // Refresh data
      await fetchData()
      setSelectedCenters(new Set())
      
    } catch (error) {
      console.error(`Bulk ${action} failed:`, error)
      alert(`Failed to ${action} selected centers`)
    } finally {
      setBulkActionLoading(false)
    }
  }

  const clearFilters = () => {
    setFilters({
      search: '',
      country: '',
      state: '',
      type: '',
      verified: '',
      active: '',
      needsGeocode: false
    })
  }

  // Build current filter query string for links
  const getReturnUrl = () => {
    const params = new URLSearchParams()
    if (filters.search) params.set('search', filters.search)
    if (filters.country) params.set('country', filters.country)
    if (filters.state) params.set('state', filters.state)
    if (filters.type) params.set('type', filters.type)
    if (filters.verified) params.set('verified', filters.verified)
    if (filters.active) params.set('active', filters.active)
    if (filters.needsGeocode) params.set('needsGeocode', 'true')
    const queryString = params.toString()
    return queryString ? `?returnUrl=${encodeURIComponent(`/admin/centers?${queryString}`)}` : ''
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading centers...</p>
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
              <h1 className="text-3xl font-bold text-gray-900">Centers Management</h1>
              <p className="text-gray-600 mt-1">
                Manage {filteredCenters.length} of {centers.length} rehabilitation centers
              </p>
            </div>
            <div className="flex gap-3">
              <Link 
                href="/admin" 
                className="text-blue-600 hover:text-blue-800"
              >
                ← Back to Admin
              </Link>
              <Link 
                href="/centers/new" 
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center gap-2"
              >
                ➕ Add New Center
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Filters</h3>
          
          <div className="grid md:grid-cols-6 gap-4 mb-4">
            <input
              type="text"
              placeholder="Search centers..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            
            <select
              value={filters.country}
              onChange={(e) => setFilters({ ...filters, country: e.target.value, state: '' })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Countries</option>
              {countries.map(country => (
                <option key={country.id} value={country.id}>{country.name}</option>
              ))}
            </select>
            
            {/* Dynamic State/Province selector - shows when country is selected and has states */}
            {availableStates.length > 0 && (
              <select
                value={filters.state}
                onChange={(e) => setFilters({ ...filters, state: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">
                  {isThailand ? 'All Provinces' : 'All States'}
                </option>
                {availableStates.map(state => (
                  <option key={state.id} value={state.id}>{state.name}</option>
                ))}
              </select>
            )}
            
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Types</option>
              {centerTypes.map(type => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>
            
            <select
              value={filters.active}
              onChange={(e) => setFilters({ ...filters, active: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
            
            <select
              value={filters.verified}
              onChange={(e) => setFilters({ ...filters, verified: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Verification</option>
              <option value="true">Verified</option>
              <option value="false">Unverified</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.needsGeocode}
                onChange={(e) => setFilters({ ...filters, needsGeocode: e.target.checked })}
                className="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Needs Geocoding</span>
            </label>
            
            <button
              onClick={clearFilters}
              className="text-gray-600 hover:text-gray-800 text-sm"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedCenters.size > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="font-medium text-blue-900">
                {selectedCenters.size} center(s) selected
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleBulkAction('activate')}
                  disabled={bulkActionLoading}
                  className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 disabled:opacity-50"
                >
                  Activate
                </button>
                <button
                  onClick={() => handleBulkAction('deactivate')}
                  disabled={bulkActionLoading}
                  className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 disabled:opacity-50"
                >
                  Deactivate
                </button>
                <button
                  onClick={() => handleBulkAction('verify')}
                  disabled={bulkActionLoading}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  Verify
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Centers List */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedCenters.size === currentCenters.length && currentCenters.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentCenters.map((center) => (
                  <tr key={center.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedCenters.has(center.id)}
                        onChange={() => handleSelectCenter(center.id)}
                        className="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{center.name}</div>
                      <div className="text-sm text-gray-500">{center.phone}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{center.address}</div>
                      <div className="text-sm text-gray-500">
                        {getCountryName(center.country_id)}
                        {getStateName(center.state_id) && ` • ${getStateName(center.state_id)}`}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {getCenterTypeName(center.center_type_id)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          center.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {center.active ? 'Active' : 'Inactive'}
                        </span>
                        {center.verified && (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                            Verified
                          </span>
                        )}
                        {(!center.latitude || !center.longitude) && (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800">
                            No Coords
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        href={`/admin/centers/${center.id}${getReturnUrl()}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(endIndex, filteredCenters.length)}</span> of{' '}
                  <span className="font-medium">{filteredCenters.length}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}