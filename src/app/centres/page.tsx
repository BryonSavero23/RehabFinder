'use client'

import { useState, useEffect } from 'react'
import Map from '@/components/Map'
import { Centre, FilterState } from '@/lib/types'

// Mock data - replace with actual API calls
const mockCentres: Centre[] = [
  {
    id: 1,
    name: 'Sunrise Rehabilitation Centre',
    address: '122 Jalan Petaling, Kuala Lumpur',
    latitude: 3.1390,
    longitude: 101.6869,
    phone: '+60 3-2078 8833',
    email: 'info@sunrise-rehab.my',
    services: 'Physiotherapy, Occupational Therapy, Speech Therapy',
    type: 'Inpatient',
    accessibility: true,
    website: 'https://sunrise-rehab.my'
  },
  {
    id: 2,
    name: 'Taman Pemulihan',
    address: '56 Lorong Gungai, Penang',
    latitude: 5.4141,
    longitude: 100.3288,
    phone: '+60 4-226 1234',
    email: 'contact@taman-pemulihan.my',
    services: 'Physical Rehabilitation, Mental Health Support',
    type: 'Outpatient',
    accessibility: false,
    website: 'https://taman-pemulihan.my'
  },
  {
    id: 3,
    name: 'Rehab Whisper',
    address: '789 Jalan Bahagia, Ipoh',
    latitude: 4.5975,
    longitude: 101.0901,
    phone: '+60 5-254 5678',
    email: 'info@rehabwhisper.my',
    services: 'Stroke Recovery, Cardiac Rehabilitation',
    type: 'Traditional',
    accessibility: true,
    website: 'https://rehabwhisper.my'
  }
]

export default function CentresPage() {
  const [centres, setCentres] = useState<Centre[]>(mockCentres)
  const [filteredCentres, setFilteredCentres] = useState<Centre[]>(mockCentres)
  const [filters, setFilters] = useState<FilterState>({
    country: 'Malaysia',
    type: '',
    accessibility: false,
    search: ''
  })
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [loadingLocation, setLoadingLocation] = useState(false)

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

  // Filter centres based on current filters
  useEffect(() => {
    let filtered = centres

    if (filters.search) {
      filtered = filtered.filter(centre =>
        centre.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        centre.address.toLowerCase().includes(filters.search.toLowerCase())
      )
    }

    if (filters.type) {
      filtered = filtered.filter(centre => centre.type === filters.type)
    }

    if (filters.accessibility) {
      filtered = filtered.filter(centre => centre.accessibility)
    }

    setFilteredCentres(filtered)
  }, [filters, centres])

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371 // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Find Rehab Centres Near You
          </h1>
          <p className="text-xl text-gray-600">
            in Malaysia &amp; Thailand
          </p>
        </div>

        {/* Search and Location */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <input
              type="text"
              placeholder="Enter location or centre name"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <button
              onClick={handleUseLocation}
              disabled={loadingLocation}
              className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 disabled:bg-gray-400 whitespace-nowrap"
            >
              {loadingLocation ? '📍 Finding your location...' : '🎯 Use My Location'}
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Filters</h2>
              
              {/* Country Filter */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Country
                </label>
                <select
                  value={filters.country}
                  onChange={(e) => setFilters({ ...filters, country: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Malaysia">Malaysia</option>
                  <option value="Thailand">Thailand</option>
                </select>
              </div>

              {/* State/Province Filter */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State / Province
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Penang">Penang</option>
                  <option value="Selangor">Selangor</option>
                  <option value="Kuala Lumpur">Kuala Lumpur</option>
                </select>
              </div>

              {/* Rehab Type Filter */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rehab Type
                </label>
                <div className="space-y-2">
                  {['Inpatient', 'Outpatient', 'Traditional'].map(type => (
                    <label key={type} className="flex items-center">
                      <input
                        type="radio"
                        name="rehabType"
                        value={type}
                        checked={filters.type === type}
                        onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                        className="mr-2"
                      />
                      {type}
                    </label>
                  ))}
                </div>
              </div>

              {/* Accessibility Filter */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Accessibility
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.accessibility}
                    onChange={(e) => setFilters({ ...filters, accessibility: e.target.checked })}
                    className="mr-2"
                  />
                  Wheelchair-friendly
                </label>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Map */}
            <div className="bg-white p-6 rounded-lg shadow mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Map View</h2>
              <Map 
                center={userLocation || undefined}
                centres={filteredCentres.map(centre => ({
                  name: centre.name,
                  address: centre.address,
                  lat: centre.latitude,
                  lng: centre.longitude,
                  type: centre.type
                }))}
              />
            </div>

            {/* Nearest Rehab Centres */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b">
                <h2 className="text-xl font-bold text-gray-900">
                  Nearest Rehab Centres ({filteredCentres.length} results)
                </h2>
              </div>
              
              <div className="divide-y">
                {filteredCentres.map((centre) => {
                  const distance = userLocation 
                    ? calculateDistance(userLocation.lat, userLocation.lng, centre.latitude, centre.longitude)
                    : null

                  return (
                    <div key={centre.id} className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {centre.name}
                          </h3>
                          <p className="text-gray-600 mb-1">{centre.address}</p>
                          {distance && (
                            <p className="text-blue-500 font-medium">
                              {distance.toFixed(1)} km away
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm mb-2">
                            {centre.type}
                          </span>
                          {centre.accessibility && (
                            <div className="text-green-600 text-sm">
                              ♿ Wheelchair accessible
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mb-4">
                        <p className="text-sm text-gray-600">
                          <strong>Services:</strong> {centre.services}
                        </p>
                        <p className="text-sm text-gray-600">
                          <strong>Phone:</strong> {centre.phone}
                        </p>
                        <p className="text-sm text-gray-600">
                          <strong>Email:</strong> {centre.email}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <button className="bg-blue-500 text-white px-4 py-2 rounded text-sm hover:bg-blue-600 transition-colors">
                          View Details
                        </button>
                        <button className="border border-blue-500 text-blue-500 px-4 py-2 rounded text-sm hover:bg-blue-50 transition-colors">
                          Get Directions
                        </button>
                        {centre.website && (
                          <a
                            href={centre.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="border border-gray-300 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-50 transition-colors"
                          >
                            Visit Website
                          </a>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}