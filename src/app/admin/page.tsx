// src/app/admin/page.tsx - Admin Dashboard with Public Map Preview
'use client'

import { useState, useEffect } from 'react'
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

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentCenters, setRecentCenters] = useState<RecentCenter[]>([])
  const [allCenters, setAllCenters] = useState<Centre[]>([])
  const [countries, setCountries] = useState<Country[]>([])
  const [centerTypes, setCenterTypes] = useState<CenterType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showMap, setShowMap] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

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
        typesResult,
        recentCentersResult,
        activeCenters
      ] = await Promise.all([
        // Total centers
        supabase.from('rehabilitation_centers').select('id', { count: 'exact', head: true }),
        // Active centers
        supabase.from('rehabilitation_centers').select('id', { count: 'exact', head: true }).eq('active', true),
        // Verified centers
        supabase.from('rehabilitation_centers').select('id', { count: 'exact', head: true }).eq('verified', true),
        // Centers needing geocoding
        supabase.from('rehabilitation_centers').select('id', { count: 'exact', head: true }).is('latitude', null),
        // Recent submissions (last 7 days)
        supabase.from('rehabilitation_centers').select('id', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
        // Countries count
        supabase.from('countries').select('*').order('name'),
        // Center types count
        supabase.from('center_types').select('*').order('name'),
        // Recent centers for display
        supabase
          .from('rehabilitation_centers')
          .select('id, name, address, created_at, verified, latitude, longitude')
          .order('created_at', { ascending: false })
          .limit(10),
        // All active centers for map
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

      console.log('📊 Admin Dashboard Stats:', dashboardStats)
      console.log('🗺️ Active centers for map:', activeCenters.length)

      setStats(dashboardStats)
      setRecentCenters(recentCentersResult.data || [])
      setAllCenters(activeCenters)
      setCountries(countriesResult.data || [])
      // Ensure centerTypes have description (add empty string if missing)
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

        {/* Public Map Preview */}
        <div className="bg-white rounded-lg shadow-sm border mb-8">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">📍 Public Map Preview</h2>
                <p className="text-sm text-gray-600 mt-1">
                  This is exactly what users see on the public site • Showing {allCenters.length} active centers
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
                  <strong>ℹ️ Live Preview:</strong> This map shows all <strong>{allCenters.length} active centers</strong> that users can see on the public homepage.
                  Any edits you make in the admin panel will reflect here immediately after saving.
                </p>
              </div>

              <div className="h-[500px] rounded-lg overflow-hidden border border-gray-200">
                <CenterMap
                  centers={allCenters}
                  userLocation={null}
                  centerTypes={centerTypes}
                  countries={countries}
                  height="100%"
                  onCenterClick={(center) => {
                    // Open edit page for this center
                    window.open(`/admin/centers/${center.id}`, '_blank')
                  }}
                />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-4">
                <div className="bg-gray-50 p-3 rounded border">
                  <p className="text-xs text-gray-600">Centers with Coordinates</p>
                  <p className="text-lg font-bold text-green-600">
                    {allCenters.filter(c => c.latitude && c.longitude).length}
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded border">
                  <p className="text-xs text-gray-600">Missing Coordinates</p>
                  <p className="text-lg font-bold text-orange-600">
                    {allCenters.filter(c => !c.latitude || !c.longitude).length}
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded border">
                  <p className="text-xs text-gray-600">Total Visible</p>
                  <p className="text-lg font-bold text-blue-600">
                    {allCenters.length}
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
                <Link
                  href="/admin/centers"
                  className="w-full flex items-center gap-3 p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <span className="text-xl">🏥</span>
                  <div>
                    <p className="font-medium text-gray-900">Manage Centers</p>
                    <p className="text-sm text-gray-600">Add, edit, or remove centers</p>
                  </div>
                </Link>

                <Link
                  href="/admin/import"
                  className="w-full flex items-center gap-3 p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <span className="text-xl">📊</span>
                  <div>
                    <p className="font-medium text-gray-900">Import Data</p>
                    <p className="text-sm text-gray-600">Bulk import from Excel</p>
                  </div>
                </Link>

                <Link
                  href="/admin/geocoding"
                  className="w-full flex items-center gap-3 p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <span className="text-xl">🗺️</span>
                  <div>
                    <p className="font-medium text-gray-900">Geocoding</p>
                    <p className="text-sm text-gray-600">Add map coordinates</p>
                  </div>
                </Link>

                <Link
                  href="/admin/verification"
                  className="w-full flex items-center gap-3 p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <span className="text-xl">🔍</span>
                  <div>
                    <p className="font-medium text-gray-900">Verification Queue</p>
                    <p className="text-sm text-gray-600">Review unverified centers</p>
                  </div>
                </Link>
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