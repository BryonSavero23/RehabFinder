// src/app/admin/cleanup-duplicates/page.tsx
// Interactive Duplicate Cleanup Tool
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface DuplicateGroup {
  name: string
  count: number
  records: Array<{
    id: string
    name: string
    address: string
    created_at: string
    updated_at: string
    latitude: number | null
    longitude: number | null
    active: boolean
  }>
}

export default function CleanupDuplicatesPage() {
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set())
  const [stats, setStats] = useState({ total: 0, duplicates: 0, toDelete: 0 })

  useEffect(() => {
    findDuplicates()
  }, [])

  const findDuplicates = async () => {
    try {
      setLoading(true)

      // Fetch all centers
      const { data: allCenters, error } = await supabase
        .from('rehabilitation_centers')
        .select('*')
        .order('created_at', { ascending: true })

      if (error) throw error

      // Group by normalized name
      const grouped = new Map<string, DuplicateGroup>()
      
      allCenters?.forEach(center => {
        const normalizedName = center.name.toLowerCase().trim()
        
        if (!grouped.has(normalizedName)) {
          grouped.set(normalizedName, {
            name: center.name,
            count: 0,
            records: []
          })
        }
        
        const group = grouped.get(normalizedName)!
        group.count++
        group.records.push(center)
      })

      // Filter only duplicates (count > 1)
      const duplicateGroups = Array.from(grouped.values())
        .filter(group => group.count > 1)
        .sort((a, b) => b.count - a.count)

      setDuplicates(duplicateGroups)

      // Calculate stats
      const totalRecords = allCenters?.length || 0
      const duplicateCount = duplicateGroups.length
      const recordsToDelete = duplicateGroups.reduce((sum, group) => sum + (group.count - 1), 0)

      setStats({
        total: totalRecords,
        duplicates: duplicateCount,
        toDelete: recordsToDelete
      })

    } catch (err) {
      console.error('Error finding duplicates:', err)
      alert('Failed to find duplicates. Check console for details.')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectGroup = (name: string) => {
    const newSelected = new Set(selectedGroups)
    if (newSelected.has(name)) {
      newSelected.delete(name)
    } else {
      newSelected.add(name)
    }
    setSelectedGroups(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedGroups.size === duplicates.length) {
      setSelectedGroups(new Set())
    } else {
      setSelectedGroups(new Set(duplicates.map(g => g.name.toLowerCase().trim())))
    }
  }

  const deleteDuplicates = async (groupNames: string[]) => {
    const idsToDelete: string[] = []

    groupNames.forEach(normalizedName => {
      const group = duplicates.find(g => g.name.toLowerCase().trim() === normalizedName)
      if (group && group.records.length > 1) {
        // Keep the FIRST (oldest) record, delete the rest
        const toDelete = group.records.slice(1).map(r => r.id)
        idsToDelete.push(...toDelete)
      }
    })

    if (idsToDelete.length === 0) {
      alert('No records to delete')
      return
    }

    const confirmed = confirm(
      `⚠️ WARNING: This will permanently delete ${idsToDelete.length} duplicate records!\n\n` +
      `Are you sure you want to continue?\n\n` +
      `This action CANNOT be undone!`
    )

    if (!confirmed) return

    try {
      setProcessing(true)

      // Delete in batches of 50
      const batchSize = 50
      let deleted = 0

      for (let i = 0; i < idsToDelete.length; i += batchSize) {
        const batch = idsToDelete.slice(i, i + batchSize)
        
        const { error } = await supabase
          .from('rehabilitation_centers')
          .delete()
          .in('id', batch)

        if (error) throw error

        deleted += batch.length
        console.log(`Deleted ${deleted}/${idsToDelete.length} records...`)
      }

      alert(`✅ Successfully deleted ${deleted} duplicate records!`)
      
      // Refresh the list
      setSelectedGroups(new Set())
      await findDuplicates()

    } catch (err) {
      console.error('Error deleting duplicates:', err)
      alert('Failed to delete duplicates. Check console for details.')
    } finally {
      setProcessing(false)
    }
  }

  const handleBulkDelete = () => {
    if (selectedGroups.size === 0) {
      alert('Please select at least one group to delete')
      return
    }

    deleteDuplicates(Array.from(selectedGroups))
  }

  const handleDeleteAllDuplicates = () => {
    const allGroupNames = duplicates.map(g => g.name.toLowerCase().trim())
    deleteDuplicates(allGroupNames)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Scanning for duplicates...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900">🧹 Cleanup Duplicates</h1>
            <Link href="/admin/centers" className="text-blue-600 hover:text-blue-800">
              ← Back to Centers
            </Link>
          </div>
          <p className="text-gray-600">
            Find and remove duplicate rehabilitation centers from your database
          </p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="text-3xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-gray-600 mt-1">Total Centers</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="text-3xl font-bold text-orange-600">{stats.duplicates}</div>
            <div className="text-gray-600 mt-1">Centers with Duplicates</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="text-3xl font-bold text-red-600">{stats.toDelete}</div>
            <div className="text-gray-600 mt-1">Duplicate Records to Remove</div>
          </div>
        </div>

        {duplicates.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Duplicates Found!</h2>
            <p className="text-gray-600">Your database is clean. Great job!</p>
          </div>
        ) : (
          <>
            {/* Actions Bar */}
            <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedGroups.size === duplicates.length}
                      onChange={handleSelectAll}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Select All ({duplicates.length} groups)
                    </span>
                  </label>
                  {selectedGroups.size > 0 && (
                    <span className="text-sm text-gray-600">
                      {selectedGroups.size} selected
                    </span>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleBulkDelete}
                    disabled={selectedGroups.size === 0 || processing}
                    className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processing ? 'Deleting...' : `Delete Selected (${selectedGroups.size})`}
                  </button>
                  <button
                    onClick={handleDeleteAllDuplicates}
                    disabled={processing}
                    className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processing ? 'Deleting...' : 'Delete All Duplicates'}
                  </button>
                  <button
                    onClick={findDuplicates}
                    disabled={processing}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
                  >
                    Refresh
                  </button>
                </div>
              </div>
            </div>

            {/* Warning */}
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚠️</span>
                <div>
                  <h3 className="font-bold text-yellow-900 mb-1">Important Information</h3>
                  <ul className="text-sm text-yellow-800 space-y-1">
                    <li>• The <strong>oldest</strong> record will be kept, newer duplicates will be deleted</li>
                    <li>• This action is <strong>permanent</strong> and cannot be undone</li>
                    <li>• Review each group carefully before deleting</li>
                    <li>• Consider creating a database backup first</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Duplicate Groups */}
            <div className="space-y-4">
              {duplicates.map((group) => {
                const normalizedName = group.name.toLowerCase().trim()
                const isSelected = selectedGroups.has(normalizedName)
                const oldestRecord = group.records[0]
                const duplicateRecords = group.records.slice(1)

                return (
                  <div
                    key={normalizedName}
                    className={`bg-white rounded-lg shadow-sm border-2 ${
                      isSelected ? 'border-blue-500' : 'border-gray-200'
                    }`}
                  >
                    <div className="p-4 border-b border-gray-200">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectGroup(normalizedName)}
                            className="mt-1 w-5 h-5"
                          />
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {group.name}
                            </h3>
                            <p className="text-sm text-gray-600 mt-1">
                              {group.count} total records • {group.count - 1} duplicates to remove
                            </p>
                          </div>
                        </div>
                        <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                          {group.count - 1} to delete
                        </span>
                      </div>
                    </div>

                    <div className="p-4 space-y-3">
                      {/* Keep This One */}
                      <div className="border-2 border-green-500 rounded-lg p-4 bg-green-50">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xl">✅</span>
                          <span className="font-bold text-green-900">KEEP THIS ONE (Oldest)</span>
                        </div>
                        <div className="text-sm space-y-1">
                          <div><strong>ID:</strong> {oldestRecord.id}</div>
                          <div><strong>Address:</strong> {oldestRecord.address}</div>
                          <div><strong>Created:</strong> {new Date(oldestRecord.created_at).toLocaleString()}</div>
                          <div>
                            <strong>Coordinates:</strong>{' '}
                            {oldestRecord.latitude && oldestRecord.longitude
                              ? `${oldestRecord.latitude.toFixed(6)}, ${oldestRecord.longitude.toFixed(6)}`
                              : 'Not set'}
                          </div>
                          <div>
                            <strong>Status:</strong>{' '}
                            <span className={oldestRecord.active ? 'text-green-600' : 'text-red-600'}>
                              {oldestRecord.active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Delete These */}
                      {duplicateRecords.map((record) => (
                        <div key={record.id} className="border-2 border-red-300 rounded-lg p-4 bg-red-50">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xl">🗑️</span>
                            <span className="font-bold text-red-900">WILL BE DELETED</span>
                          </div>
                          <div className="text-sm space-y-1 text-gray-700">
                            <div><strong>ID:</strong> {record.id}</div>
                            <div><strong>Address:</strong> {record.address}</div>
                            <div><strong>Created:</strong> {new Date(record.created_at).toLocaleString()}</div>
                            <div>
                              <strong>Coordinates:</strong>{' '}
                              {record.latitude && record.longitude
                                ? `${record.latitude.toFixed(6)}, ${record.longitude.toFixed(6)}`
                                : 'Not set'}
                            </div>
                            <div>
                              <strong>Status:</strong>{' '}
                              <span className={record.active ? 'text-green-600' : 'text-red-600'}>
                                {record.active ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}