
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
      
      const [centersResult, countriesResult, typesResult] = await Promise.all([
        supabase
          .from('rehabilitation_centers')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('countries')
          .select('*')
          .order('name'),
        supabase
          .from('center_types')
          .select('*')
          .order('name')
      ])

      if (centersResult.error) throw centersResult.error
      if (countriesResult.error) throw countriesResult.error
      if (typesResult.error) throw typesResult.error

      setCenters(centersResult.data || [])
      setCountries(countriesResult.data || [])
      setCenterTypes(typesResult.data || [])

    } catch (err) {
      console.error('Error fetching data:', err)
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
            <Link 
              href="/admin/centers/new" 
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center gap-2"
            >
              ➕ Add New Center
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
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
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.needsGeocode}
                  onChange={(e) => setFilters({ ...filters, needsGeocode: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Needs Geocoding</span>
              </label>
            </div>

            <button
              onClick={clearFilters}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedCenters.size > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-blue-800 font-medium">
                {selectedCenters.size} center{selectedCenters.size !== 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleBulkAction('verify')}
                  disabled={bulkActionLoading}
                  className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 disabled:opacity-50"
                >
                  ✓ Verify
                </button>
                <button
                  onClick={() => handleBulkAction('unverify')}
                  disabled={bulkActionLoading}
                  className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600 disabled:opacity-50"
                >
                  ✗ Unverify
                </button>
                <button
                  onClick={() => handleBulkAction('activate')}
                  disabled={bulkActionLoading}
                  className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 disabled:opacity-50"
                >
                  ▶ Activate
                </button>
                <button
                  onClick={() => handleBulkAction('deactivate')}
                  disabled={bulkActionLoading}
                  className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 disabled:opacity-50"
                >
                  ⏸ Deactivate
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Centers Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          {/* Table Header */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={selectedCenters.size === currentCenters.length && currentCenters.length > 0}
                onChange={handleSelectAll}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-4 text-sm font-medium text-gray-900">
                Centers ({filteredCenters.length})
              </span>
            </div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-200">
            {currentCenters.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-gray-400 text-4xl mb-4">🔍</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No centers found</h3>
                <p className="text-gray-600">Try adjusting your filters or search criteria.</p>
              </div>
            ) : (
              currentCenters.map((center) => (
                <div key={center.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      checked={selectedCenters.has(center.id)}
                      onChange={() => handleSelectCenter(center.id)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-semibold text-gray-900 truncate">
                              {center.name}
                            </h3>
                            <div className="flex gap-1">
                              {center.verified && (
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                  ✓ Verified
                                </span>
                              )}
                              {!center.active && (
                                <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                                  ⏸ Inactive
                                </span>
                              )}
                              {(!center.latitude || !center.longitude) && (
                                <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                                  📍 No Coords
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="space-y-1 text-sm text-gray-600 mb-2">
                            <div className="flex items-center gap-2">
                              <span>📍</span>
                              <span className="truncate">{center.address}</span>
                            </div>
                            
                            <div className="flex items-center gap-4">
                              <span>🏥 {getCenterTypeName(center.center_type_id)}</span>
                              <span>🌍 {getCountryName(center.country_id)}</span>
                              {center.accessibility && <span>♿ Accessible</span>}
                            </div>
                            
                            {(center.phone || center.email || center.website) && (
                              <div className="flex gap-4 mt-2">
                                {center.phone && (
                                  <span className="text-blue-600">📞 {center.phone}</span>
                                )}
                                {center.email && (
                                  <span className="text-blue-600">✉️ {center.email}</span>
                                )}
                                {center.website && (
                                  <span className="text-blue-600">🌐 Website</span>
                                )}
                              </div>
                            )}
                          </div>
                          
                          <p className="text-xs text-gray-500">
                            Added: {new Date(center.created_at).toLocaleDateString()}
                          </p>
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
              ))
            )}
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