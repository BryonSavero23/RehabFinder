// src/app/centres/[id]/page.tsx - Individual Centre Detail Page (TypeScript Fixed)
'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import CenterMap from '@/components/CenterMap'
import type { CentreWithRelations } from '@/types/center'

interface CentreDetailPageProps {
  params: Promise<{ id: string }>
}

export default function CentreDetailPage(props: CentreDetailPageProps) {
  const router = useRouter()
  const params = use(props.params)
  const centreId = params.id

  const [centre, setCentre] = useState<CentreWithRelations | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)

  // Fetch data
  useEffect(() => {
    fetchCentreDetails()
    getUserLocation()
  }, [centreId])

  const fetchCentreDetails = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('rehabilitation_centers')
        .select(`
          *,
          countries (id, name, code),
          center_types (id, name, description),
          states (id, name, code)
        `)
        .eq('id', centreId)
        .eq('active', true)
        .single()

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          setError('Centre not found')
        } else {
          throw fetchError
        }
        return
      }

      setCentre(data as CentreWithRelations)
    } catch (err) {
      console.error('Error fetching centre:', err)
      setError('Failed to load centre details')
    } finally {
      setLoading(false)
    }
  }

  const getUserLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
        },
        (error) => {
          console.log('Location access denied:', error)
        }
      )
    }
  }

  const formatWebsiteUrl = (url: string | null) => {
    if (!url) return null
    return url.startsWith('http') ? url : `https://${url}`
  }

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371 // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading centre details...</p>
        </div>
      </div>
    )
  }

  if (error || !centre) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {error || 'Centre Not Found'}
          </h1>
          <p className="text-gray-600 mb-4">
            The centre you're looking for doesn't exist or has been removed.
          </p>
          <Link 
            href="/centres"
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Back to All Centres
          </Link>
        </div>
      </div>
    )
  }

  const distance = userLocation && centre.latitude && centre.longitude
    ? calculateDistance(userLocation.lat, userLocation.lng, centre.latitude, centre.longitude)
    : null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/" className="text-blue-600 hover:text-blue-800">Home</Link>
            <span className="text-gray-400">/</span>
            <Link href="/centres" className="text-blue-600 hover:text-blue-800">Centres</Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-600">{centre.name}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header Card */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {centre.name}
                  </h1>
                  <div className="flex flex-wrap items-center gap-2">
                    {centre.verified && (
                      <span className="bg-green-100 text-green-700 text-sm px-3 py-1 rounded-full font-medium">
                        ✓ Verified
                      </span>
                    )}
                    <span className="bg-blue-100 text-blue-700 text-sm px-3 py-1 rounded-full">
                      {centre.center_types?.name || 'Rehabilitation Center'}
                    </span>
                    {distance && (
                      <span className="bg-purple-100 text-purple-700 text-sm px-3 py-1 rounded-full">
                        📍 {distance.toFixed(1)} km away
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Location Info */}
              <div className="space-y-3 text-gray-700">
                <div className="flex items-start gap-3">
                  <span className="text-xl">📍</span>
                  <div>
                    <p className="font-medium">Address</p>
                    <p>{centre.address}</p>
                    <p className="text-sm text-gray-600">
                      {centre.states?.name && `${centre.states.name}, `}
                      {centre.countries?.name || 'Unknown Country'}
                    </p>
                  </div>
                </div>

                {centre.phone && (
                  <div className="flex items-start gap-3">
                    <span className="text-xl">📞</span>
                    <div>
                      <p className="font-medium">Phone</p>
                      <a 
                        href={`tel:${centre.phone}`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {centre.phone}
                      </a>
                    </div>
                  </div>
                )}

                {centre.email && (
                  <div className="flex items-start gap-3">
                    <span className="text-xl">📧</span>
                    <div>
                      <p className="font-medium">Email</p>
                      <a 
                        href={`mailto:${centre.email}`}
                        className="text-blue-600 hover:text-blue-800 break-all"
                      >
                        {centre.email}
                      </a>
                    </div>
                  </div>
                )}

                {centre.website && (
                  <div className="flex items-start gap-3">
                    <span className="text-xl">🌐</span>
                    <div>
                      <p className="font-medium">Website</p>
                      <a 
                        href={formatWebsiteUrl(centre.website) || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 break-all"
                      >
                        {centre.website}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Services Card */}
            {centre.services && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span>🏥</span>
                  Services Offered
                </h2>
                <div className="prose max-w-none">
                  <p className="text-gray-700 whitespace-pre-line">{centre.services}</p>
                </div>
              </div>
            )}

            {/* Map Card */}
            {centre.latitude && centre.longitude && (
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <span>🗺️</span>
                    Location Map
                  </h2>
                </div>
                <div className="h-96">
                  <CenterMap
                    centers={[centre]}
                    userLocation={userLocation}
                    centerTypes={[]}
                    countries={[]}
                    height="100%"
                    onCenterClick={() => {}}
                  />
                </div>
                <div className="p-4 bg-gray-50 border-t border-gray-200">
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${centre.latitude},${centre.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors text-center font-medium"
                    >
                      🧭 Get Directions
                    </a>
                    <a
                      href={`https://www.google.com/maps/@${centre.latitude},${centre.longitude},15z`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors text-center font-medium"
                    >
                      🗺️ Open in Maps
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-4">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
              
              <div className="space-y-3">
                {centre.phone && (
                  <a
                    href={`tel:${centre.phone}`}
                    className="block w-full bg-green-500 text-white px-4 py-3 rounded-lg hover:bg-green-600 transition-colors text-center font-medium"
                  >
                    📞 Call Now
                  </a>
                )}

                {centre.email && (
                  <a
                    href={`mailto:${centre.email}`}
                    className="block w-full bg-blue-500 text-white px-4 py-3 rounded-lg hover:bg-blue-600 transition-colors text-center font-medium"
                  >
                    📧 Send Email
                  </a>
                )}

                {centre.website && (
                  <a
                    href={formatWebsiteUrl(centre.website) || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full bg-purple-500 text-white px-4 py-3 rounded-lg hover:bg-purple-600 transition-colors text-center font-medium"
                  >
                    🌐 Visit Website
                  </a>
                )}

                <Link
                  href="/centres"
                  className="block w-full bg-gray-200 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-300 transition-colors text-center font-medium"
                >
                  ← Back to All Centres
                </Link>
              </div>

              {/* Info Box */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-2">Need Help?</h4>
                <p className="text-sm text-gray-600">
                  If you notice any incorrect information about this centre, please{' '}
                  <Link href="/contact" className="text-blue-600 hover:text-blue-800">
                    contact us
                  </Link>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}