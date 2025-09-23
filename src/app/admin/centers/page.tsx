// src/app/admin/centers/page.tsx - Complete Admin Centers Management Page with Debug Tools
'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

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
}

interface Country {
  id: string
  name: string
  code: string
}

interface CenterType {
  id: string
  name: string
  description?: string
}

interface Filters {
  search: string
  country: string
  type: string
  verified: string
  active: string
  needsGeocode: boolean
}

export default function AdminCentersPage() {
  const [centers, setCenters] = useState<Centre[]>([])
  const [countries, setCountries] = useState<Country[]>([])
  const [centerTypes, setCenterTypes] = useState<CenterType[]>([])
  const [filters, setFilters] = useState<Filters>({
    search: '',
    country: '',
    type: '',
    verified: '',
    active: '',
    needsGeocode: false
  })
  const [loading, setLoading] = useState(true)
  const [selectedCenters, setSelectedCenters] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20)
  const [bulkActionLoading, setBulkActionLoading] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      console.log('Fetching admin centers data...')
      
      const [centersResult, countriesResult, typesResult] = await Promise.all([
        supabase
          .from('rehabilitation_centers')
          .select('*')
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

      if (centersResult.error) {
        console.error('Centers query error:', centersResult.error)
        throw centersResult.error
      }
      if (countriesResult.error) {
        console.error('Countries query error:', countriesResult.error)
        throw countriesResult.error
      }
      if (typesResult.error) {
        console.error('Types query error:', typesResult.error)
        throw typesResult.error
      }

      const centersData = centersResult.data || []
      console.log(`Loaded ${centersData.length} centers`)
      
      // Log Tung Shin specifically
      const tungShin = centersData.filter(c => 
        c.name.toLowerCase().includes('tung shin')
      )
      console.log(`Found ${tungShin.length} Tung Shin centers:`, tungShin)

      setCenters(centersData)
      setCountries(countriesResult.data || [])
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

  // Pagination
  const totalPages = Math.ceil(filteredCenters.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentCenters = filteredCenters.slice(startIndex, endIndex)

  const getCountryName = (countryId: string) => {
    return countries.find(c => c.id === countryId)?.name || 'Unknown'
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
        const updateData: any = { id: update.id }
        if ('verified' in update) updateData.verified = update.verified
        if ('active' in update) updateData.active = update.active

        const { error } = await supabase
          .from('rehabilitation_centers')
          .update(updateData)
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
      type: '',
      verified: '',
      active: '',
      needsGeocode: false
    })
    setCurrentPage(1)
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
                href="/admin/centers/new" 
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center gap-2"
              >
                ➕ Add New Center
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Comprehensive Debug Section */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-red-800 mb-4">🔍 Comprehensive Database Debug</h3>
          
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div className="bg-white p-4 rounded border">
              <h4 className="font-medium text-gray-800 mb-2">Database Stats</h4>
              <div className="space-y-1 text-sm">
                <div>Total Centers: {centers.length}</div>
                <div>Active Centers: {centers.filter(c => c.active).length}</div>
                <div>Inactive Centers: {centers.filter(c => !c.active).length}</div>
                <div>With Coordinates: {centers.filter(c => c.latitude && c.longitude).length}</div>
                <div>Without Coordinates: {centers.filter(c => !c.latitude || !c.longitude).length}</div>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded border">
              <h4 className="font-medium text-gray-800 mb-2">Search Test</h4>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Search term..."
                  className="w-full px-2 py-1 border rounded text-sm"
                  id="debugSearch"
                />
                <button
                  onClick={async () => {
                    const searchTerm = (document.getElementById('debugSearch') as HTMLInputElement).value.toLowerCase()
                    console.log('=== SEARCH DEBUG ===')
                    console.log('Search term:', searchTerm)
                    
                    const matches = centers.filter(center => 
                      center.name.toLowerCase().includes(searchTerm) ||
                      center.address.toLowerCase().includes(searchTerm) ||
                      (center.services && center.services.toLowerCase().includes(searchTerm))
                    )
                    
                    console.log('Matches found:', matches.length)
                    matches.forEach(center => {
                      console.log('Match:', {
                        name: center.name,
                        active: center.active,
                        hasCoords: !!(center.latitude && center.longitude),
                        id: center.id
                      })
                    })
                    
                    alert(`Found ${matches.length} matches for "${searchTerm}" - check console for details`)
                  }}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 w-full"
                >
                  Test Search
                </button>
              </div>
            </div>
          </div>
          
          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <button
              onClick={async () => {
                console.log('=== RAW DATABASE QUERY ===')
                const { data, error } = await supabase
                  .from('rehabilitation_centers')
                  .select('*')
                  .order('name')
                
                console.log('Query result:', { data: data?.length, error })
                
                if (data) {
                  const tungShin = data.filter(c => 
                    c.name.toLowerCase().includes('tung shin')
                  )
                  console.log('Tung Shin in raw query:', tungShin)
                  alert(`Raw DB Query: ${data.length} total centers, ${tungShin.length} Tung Shin matches`)
                }
              }}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              🔍 Raw DB Query
            </button>
            
            <button
              onClick={async () => {
                console.log('=== HOMEPAGE QUERY SIMULATION ===')
                const { data, error } = await supabase
                  .from('rehabilitation_centers')
                  .select('*')
                  .eq('active', true)
                  .order('name')
                
                console.log('Homepage query result:', { data: data?.length, error })
                
                if (data) {
                  const tungShin = data.filter(c => 
                    c.name.toLowerCase().includes('tung shin')
                  )
                  console.log('Tung Shin in homepage query:', tungShin)
                  alert(`Homepage Query: ${data.length} active centers, ${tungShin.length} Tung Shin matches`)
                }
              }}
              className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
            >
              🏠 Homepage Query Test
            </button>
            
            <button
              onClick={async () => {
                console.log('=== SPECIFIC TUNG SHIN LOOKUP ===')
                const { data, error } = await supabase
                  .from('rehabilitation_centers')
                  .select('*')
                  .ilike('name', '%tung shin%')
                
                console.log('Specific Tung Shin lookup:', { data, error })
                
                if (data && data.length > 0) {
                  const center = data[0]
                  alert(`Found Tung Shin!\nID: ${center.id}\nActive: ${center.active}\nCoords: ${center.latitude}, ${center.longitude}`)
                } else {
                  alert('Tung Shin not found with specific lookup')
                }
              }}
              className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700"
            >
              🎯 Find Tung Shin
            </button>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
            <h4 className="font-medium text-yellow-800 mb-2">Expected Result Based on Database:</h4>
            <div className="text-sm text-yellow-700">
              <div>✅ Tung Shin Hospital should be found</div>
              <div>✅ It should be active (true)</div>
              <div>✅ It should have coordinates (3.14543700, 101.70364100)</div>
              <div>✅ It should appear in homepage search</div>
              <div className="mt-2 font-medium">If any button above shows different results, there's a data sync issue!</div>
            </div>
          </div>
          
          <div className="mt-4">
            <button
              onClick={() => {
                console.log('=== CURRENT STATE ===')
                console.log('Centers array:', centers)
                console.log('Centers length:', centers.length)
                
                // Check if the specific ID exists
                const tungShinId = 'e4ff5c92-ee08-4312-8966-badc9c90028d'
                const foundById = centers.find(c => c.id === tungShinId)
                console.log('Found by specific ID:', foundById)
                
                if (foundById) {
                  alert(`Found by ID: ${foundById.name} (Active: ${foundById.active})`)
                } else {
                  alert('NOT found by specific ID - there is a data loading issue!')
                }
              }}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              🆔 Check Specific ID
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-4">
            {/* Search */}
            <div className="xl:col-span-2">
              <input
                type="text"
                placeholder="Search centers..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            {/* Country Filter */}
            <div>
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
            <div>
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

            {/* Active Filter */}
            <div>
              <select
                value={filters.active}
                onChange={(e) => setFilters({ ...filters, active: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="">All Status</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>

            {/* Verified Filter */}
            <div>
              <select
                value={filters.verified}
                onChange={(e) => setFilters({ ...filters, verified: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="">All Verification</option>
                <option value="true">Verified</option>
                <option value="false">Unverified</option>
              </select>
            </div>
          </div>

          {/* Filter Actions */}
          <div className="flex items-center gap-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.needsGeocode}
                onChange={(e) => setFilters({ ...filters, needsGeocode: e.target.checked })}
                className="mr-2"
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
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Centers ({filteredCenters.length})
              </h3>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedCenters.size === currentCenters.length && currentCenters.length > 0}
                  onChange={handleSelectAll}
                  className="mr-2"
                />
                <span className="text-sm text-gray-600">Select All</span>
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {currentCenters.map((center) => (
              <div key={center.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start gap-4">
                  <input
                    type="checkbox"
                    checked={selectedCenters.has(center.id)}
                    onChange={() => handleSelectCenter(center.id)}
                    className="mt-1"
                  />
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-gray-900">{center.name}</h4>
                          
                          {/* Status Badges */}
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            center.active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {center.active ? 'Active' : 'Inactive'}
                          </span>
                          
                          {center.verified && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                              ✓ Verified
                            </span>
                          )}
                          
                          {(!center.latitude || !center.longitude) && (
                            <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                              📍 Needs Geocoding
                            </span>
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-2">{center.address}</p>
                        
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>Country: {getCountryName(center.country_id)}</span>
                          <span>Type: {getCenterTypeName(center.center_type_id)}</span>
                          <span>Added: {new Date(center.created_at).toLocaleDateString()}</span>
                          {center.latitude && center.longitude && (
                            <span className="text-green-600">📍 Has Coordinates</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <Link
                          href={`/admin/centers/${center.id}`}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Edit
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-gray-600">
              Showing {startIndex + 1}-{Math.min(endIndex, filteredCenters.length)} of {filteredCenters.length} centers
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}