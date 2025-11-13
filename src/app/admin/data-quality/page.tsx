// src/app/admin/data-quality/page.tsx
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
  phone?: string | null
  email?: string | null
  website?: string | null
  services?: string | null
  center_type_id: string
  country_id: string
  verified: boolean
  active: boolean
  created_at: string
}

interface CenterType {
  id: string
  name: string
  description?: string
}

interface Country {
  id: string
  name: string
  code: string
}

interface IssueType {
  id: string
  label: string
  description: string
  color: string
}

export default function DataQualityPage() {
  const [centers, setCenters] = useState<Centre[]>([])
  const [centerTypes, setCenterTypes] = useState<CenterType[]>([])
  const [countries, setCountries] = useState<Country[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Filters
  const [filters, setFilters] = useState({
    search: '',
    country: '',
    centerType: '',
    issueType: 'all',
    verified: 'all',
    hasCoordinates: 'all'
  })
  
  // Selection and editing
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [editMode, setEditMode] = useState<string | null>(null) // center id being edited
  const [bulkUpdateType, setBulkUpdateType] = useState('')
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [deleteQueue, setDeleteQueue] = useState<Set<string>>(new Set())

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50

  // Issue types for filtering
  const issueTypes: IssueType[] = [
    { id: 'all', label: 'All Centers', description: 'Show all', color: 'gray' },
    { id: 'wrong_type', label: 'Wrong Type', description: 'Suspected incorrect center type', color: 'red' },
    { id: 'no_coords', label: 'No Coordinates', description: 'Missing lat/lng', color: 'orange' },
    { id: 'bad_address', label: 'Bad Address', description: 'Generic or incomplete address', color: 'yellow' },
    { id: 'unverified', label: 'Unverified', description: 'Not yet verified', color: 'blue' },
    { id: 'needs_review', label: 'Needs Review', description: 'Flagged for review', color: 'purple' }
  ]

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [centersResult, typesResult, countriesResult] = await Promise.all([
        supabase
          .from('rehabilitation_centers')
          .select('*')
          .order('name'),
        supabase
          .from('center_types')
          .select('*')
          .order('name'),
        supabase
          .from('countries')
          .select('*')
          .order('name')
      ])

      if (centersResult.error) throw centersResult.error
      if (typesResult.error) throw typesResult.error
      if (countriesResult.error) throw countriesResult.error

      setCenters(centersResult.data || [])
      setCenterTypes(typesResult.data || [])
      setCountries(countriesResult.data || [])

      console.log('✅ Data loaded:', {
        centers: centersResult.data?.length,
        types: typesResult.data?.length,
        countries: countriesResult.data?.length
      })
    } catch (err) {
      console.error('Error fetching data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  // Filter centers based on selected filters
  const filteredCenters = centers.filter(center => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      const matchName = center.name.toLowerCase().includes(searchLower)
      const matchAddress = center.address?.toLowerCase().includes(searchLower)
      if (!matchName && !matchAddress) return false
    }

    // Country filter
    if (filters.country && center.country_id !== filters.country) return false

    // Center type filter
    if (filters.centerType && center.center_type_id !== filters.centerType) return false

    // Verified filter
    if (filters.verified !== 'all') {
      if (filters.verified === 'verified' && !center.verified) return false
      if (filters.verified === 'unverified' && center.verified) return false
    }

    // Coordinates filter
    if (filters.hasCoordinates !== 'all') {
      const hasCoords = center.latitude && center.longitude
      if (filters.hasCoordinates === 'yes' && !hasCoords) return false
      if (filters.hasCoordinates === 'no' && hasCoords) return false
    }

    // Issue type filter
    if (filters.issueType !== 'all') {
      if (filters.issueType === 'no_coords' && (center.latitude && center.longitude)) return false
      if (filters.issueType === 'unverified' && center.verified) return false
      if (filters.issueType === 'bad_address') {
        const genericAddresses = ['address not provided', 'not provided', 'unknown']
        const isGeneric = genericAddresses.some(g => center.address?.toLowerCase().includes(g))
        if (!isGeneric && center.address?.length > 20) return false
      }
    }

    return true
  })

  // Pagination
  const totalPages = Math.ceil(filteredCenters.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedCenters = filteredCenters.slice(startIndex, endIndex)

  // Helper functions
  const getCenterTypeName = (typeId: string) => {
    return centerTypes.find(t => t.id === typeId)?.name || 'Unknown'
  }

  const getCountryName = (countryId: string) => {
    return countries.find(c => c.id === countryId)?.name || 'Unknown'
  }

  // Selection handlers
  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const selectAll = () => {
    if (selectedIds.size === paginatedCenters.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(paginatedCenters.map(c => c.id)))
    }
  }

  // Quick update handlers
  const quickUpdateType = async (centerId: string, newTypeId: string) => {
    try {
      setProcessing(true)
      const { error } = await supabase
        .from('rehabilitation_centers')
        .update({ center_type_id: newTypeId })
        .eq('id', centerId)

      if (error) throw error

      // Update local state
      setCenters(prev => prev.map(c => 
        c.id === centerId ? { ...c, center_type_id: newTypeId } : c
      ))

      setSuccess('Center type updated successfully')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error('Error updating center type:', err)
      setError(err instanceof Error ? err.message : 'Failed to update')
    } finally {
      setProcessing(false)
    }
  }

  // Bulk update handler
  const handleBulkUpdate = async () => {
    if (!bulkUpdateType || selectedIds.size === 0) return

    try {
      setProcessing(true)
      const idsArray = Array.from(selectedIds)

      const { error } = await supabase
        .from('rehabilitation_centers')
        .update({ center_type_id: bulkUpdateType })
        .in('id', idsArray)

      if (error) throw error

      // Update local state
      setCenters(prev => prev.map(c => 
        selectedIds.has(c.id) ? { ...c, center_type_id: bulkUpdateType } : c
      ))

      setSuccess(`Successfully updated ${selectedIds.size} centers`)
      setSelectedIds(new Set())
      setShowBulkModal(false)
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error('Error bulk updating:', err)
      setError(err instanceof Error ? err.message : 'Failed to bulk update')
    } finally {
      setProcessing(false)
    }
  }

  // Delete handler
  const handleDelete = async (centerId: string) => {
    const center = centers.find(c => c.id === centerId)
    if (!center) return

    if (!confirm(`⚠️ Delete "${center.name}"?\n\nThis cannot be undone.`)) return

    try {
      setProcessing(true)
      const { error } = await supabase
        .from('rehabilitation_centers')
        .delete()
        .eq('id', centerId)

      if (error) throw error

      setCenters(prev => prev.filter(c => c.id !== centerId))
      setSuccess('Center deleted successfully')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error('Error deleting center:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setProcessing(false)
    }
  }

  // Bulk delete handler
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return

    if (!confirm(`⚠️ Delete ${selectedIds.size} centers?\n\nThis cannot be undone.`)) return

    try {
      setProcessing(true)
      const idsArray = Array.from(selectedIds)

      const { error } = await supabase
        .from('rehabilitation_centers')
        .delete()
        .in('id', idsArray)

      if (error) throw error

      setCenters(prev => prev.filter(c => !selectedIds.has(c.id)))
      setSelectedIds(new Set())
      setSuccess(`Successfully deleted ${idsArray.length} centers`)
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error('Error bulk deleting:', err)
      setError(err instanceof Error ? err.message : 'Failed to bulk delete')
    } finally {
      setProcessing(false)
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      // Only work with selected items
      if (selectedIds.size === 0) return

      const governmentType = centerTypes.find(t => t.name === 'Government')
      const privateType = centerTypes.find(t => t.name === 'Private')
      const ngoType = centerTypes.find(t => t.name === 'NGO')

      switch (e.key.toLowerCase()) {
        case 'g':
          if (governmentType) setBulkUpdateType(governmentType.id)
          setShowBulkModal(true)
          break
        case 'p':
          if (privateType) setBulkUpdateType(privateType.id)
          setShowBulkModal(true)
          break
        case 'n':
          if (ngoType) setBulkUpdateType(ngoType.id)
          setShowBulkModal(true)
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [selectedIds, centerTypes])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading data quality tools...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-[1600px] mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Link 
                  href="/admin"
                  className="text-blue-600 hover:text-blue-800"
                >
                  ← Admin Dashboard
                </Link>
              </div>
              <h1 className="text-3xl font-bold text-gray-900">Data Quality Management</h1>
              <p className="text-gray-600 mt-1">
                Fix incorrect types, addresses, and remove invalid entries
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">
                {filteredCenters.length}
              </div>
              <div className="text-sm text-gray-600">Total Centers</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 py-8">
        {/* Success Message */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <span className="text-green-600 text-xl">✅</span>
              <p className="text-green-800 font-medium">{success}</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <span className="text-red-600 text-xl">⚠️</span>
              <p className="text-red-800 font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Filters Section */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters & Search</h3>
          
          <div className="grid md:grid-cols-4 gap-4 mb-4">
            {/* Search */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Name/Address
              </label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                placeholder="Search centers..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Country Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Country
              </label>
              <select
                value={filters.country}
                onChange={(e) => setFilters(prev => ({ ...prev, country: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Countries</option>
                {countries.map(country => (
                  <option key={country.id} value={country.id}>
                    {country.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Center Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Type
              </label>
              <select
                value={filters.centerType}
                onChange={(e) => setFilters(prev => ({ ...prev, centerType: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                {centerTypes.map(type => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Issue Type Filter */}
          <div className="flex flex-wrap gap-2">
            {issueTypes.map(issue => (
              <button
                key={issue.id}
                onClick={() => setFilters(prev => ({ ...prev, issueType: issue.id }))}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filters.issueType === issue.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {issue.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedIds.size > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="font-semibold text-blue-900">
                  {selectedIds.size} selected
                </span>
                <button
                  onClick={() => setShowBulkModal(true)}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 font-medium"
                >
                  Bulk Update Type
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={processing}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 font-medium disabled:opacity-50"
                >
                  Delete Selected
                </button>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Clear Selection
                </button>
              </div>
              <div className="text-sm text-blue-700">
                Keyboard: G=Gov, P=Private, N=NGO
              </div>
            </div>
          </div>
        )}

        {/* Centers Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === paginatedCenters.length && paginatedCenters.length > 0}
                      onChange={selectAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Center Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Country
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Issues
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedCenters.map(center => {
                  const hasCoords = center.latitude && center.longitude
                  const hasGenericAddress = ['not provided', 'unknown', 'address'].some(
                    term => center.address?.toLowerCase().includes(term)
                  )

                  return (
                    <tr 
                      key={center.id}
                      className={selectedIds.has(center.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}
                    >
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(center.id)}
                          onChange={() => toggleSelect(center.id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {center.name}
                        </div>
                        {!center.verified && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 mt-1">
                            Unverified
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate">
                          {center.address || 'No address'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={center.center_type_id}
                          onChange={(e) => quickUpdateType(center.id, e.target.value)}
                          disabled={processing}
                          className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          {centerTypes.map(type => (
                            <option key={type.id} value={type.id}>
                              {type.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {getCountryName(center.country_id)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {!hasCoords && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                              No coords
                            </span>
                          )}
                          {hasGenericAddress && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                              Bad address
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/centers/${center.id}`}
                            className="text-blue-600 hover:text-blue-900 font-medium"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => handleDelete(center.id)}
                            disabled={processing}
                            className="text-red-600 hover:text-red-900 font-medium disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="flex-1 flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(endIndex, filteredCenters.length)}</span> of{' '}
                  <span className="font-medium">{filteredCenters.length}</span> results
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Update Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Bulk Update Center Type
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Update {selectedIds.size} selected centers to:
            </p>
            <select
              value={bulkUpdateType}
              onChange={(e) => setBulkUpdateType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 mb-6"
            >
              <option value="">Select center type...</option>
              {centerTypes.map(type => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
            <div className="flex gap-3">
              <button
                onClick={handleBulkUpdate}
                disabled={!bulkUpdateType || processing}
                className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 font-medium disabled:opacity-50"
              >
                {processing ? 'Updating...' : 'Update All'}
              </button>
              <button
                onClick={() => setShowBulkModal(false)}
                className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}