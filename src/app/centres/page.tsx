'use client'

import { useState, useEffect } from 'react'
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
    address: '456 Lorong Gungai, Penang',
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
    <div className="min-h-screen bg-red-500">
      {/* Hero Section */}
      <div className="bg-white py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              TEST - Find Rehab Centres Near You
            </h1>
            <p className="text-xl text-gray-600">
              in Malaysia & Thailand
            </p>
          </div>

          {/* Search Section */}
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Enter location or centre name"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-lg"
              />
            </div>
            <button
              onClick={handleUseLocation}
              disabled={loadingLocation}
              className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 disabled:bg-gray-400 flex items-center gap-2 whitespace-nowrap"
            >
              <span className="text-lg">📍</span>
              {loadingLocation ? 'Finding your location...' : 'Use My Location'}
            </button>
          </div>

          {/* Location Status */}
          {userLocation && (
            <div className="mt-4 p-4 bg-green-100 text-green-800 rounded-lg max-w-md mx-auto text-center">
              📍 Location found: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold mb-4">Filters</h3>
              
              {/* Country Filter */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Country
                </label>
                <select
                  value={filters.country}
                  onChange={(e) => setFilters({ ...filters, country: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Malaysia">Malaysia</option>
                  <option value="Thailand">Thailand</option>
                </select>
              </div>

              {/* State/Province Filter */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State / Province
                </label>
                <select className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option value="Pemitary">Pemitary</option>
                  <option value="Selangor">Selangor</option>
                  <option value="Penang">Penang</option>
                  <option value="Kuala Lumpur">Kuala Lumpur</option>
                </select>
              </div>

              {/* Rehab Type Filter */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rehab Type
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.type === 'Inpatient'}
                      onChange={(e) => setFilters({ ...filters, type: e.target.checked ? 'Inpatient' : '' })}
                      className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    Inpatient
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.type === 'Outpatient'}
                      onChange={(e) => setFilters({ ...filters, type: e.target.checked ? 'Outpatient' : '' })}
                      className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    Outpatient
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.type === 'Traditional'}
                      onChange={(e) => setFilters({ ...filters, type: e.target.checked ? 'Traditional' : '' })}
                      className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    Traditional
                  </label>
                </div>
              </div>

              {/* Accessibility Filter */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Accessibility
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.accessibility}
                    onChange={(e) => setFilters({ ...filters, accessibility: e.target.checked })}
                    className="mr-2 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm">Wheelchair-friendly</span>
                  {filters.accessibility && (
                    <div className="ml-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  )}
                </label>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Map Section */}
            <div className="bg-white rounded-lg shadow-sm mb-8 overflow-hidden">
              <div className="h-96 bg-gradient-to-br from-blue-200 via-green-200 to-blue-300 relative">
                {/* Simplified Malaysia map representation */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative w-full h-full">
                    {/* Main Peninsula */}
                    <div className="absolute top-12 left-1/2 transform -translate-x-1/2 w-32 h-48 bg-green-300 rounded-bl-3xl rounded-br-lg opacity-80"></div>
                    
                    {/* Borneo-like shape */}
                    <div className="absolute top-16 right-16 w-24 h-32 bg-green-400 rounded-2xl opacity-70"></div>
                    
                    {/* Location pins */}
                    {filteredCentres.map((centre, index) => (
                      <div 
                        key={centre.id}
                        className="absolute w-6 h-6 bg-blue-600 rounded-full border-2 border-white shadow-lg cursor-pointer hover:bg-blue-700 transition-colors"
                        style={{ 
                          top: `${25 + index * 15}%`, 
                          left: `${45 + index * 10}%`, 
                          transform: 'translate(-50%, -50%)' 
                        }}
                        title={centre.name}
                      >
                      </div>
                    ))}
                    
                    {/* User location marker */}
                    {userLocation && (
                      <div 
                        className="absolute w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-lg animate-pulse"
                        style={{
                          top: '45%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)'
                        }}
                        title="Your Location"
                      ></div>
                    )}
                    
                    {/* Malaysia label */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white/90 px-3 py-1 rounded-lg shadow-sm">
                      <span className="font-semibold text-gray-800">Malaysia</span>
                    </div>

                    {/* Map controls */}
                    <div className="absolute top-4 right-4 flex flex-col space-y-2">
                      <button className="w-8 h-8 bg-white border border-gray-300 rounded shadow flex items-center justify-center text-lg hover:bg-gray-50 font-bold">
                        +
                      </button>
                      <button className="w-8 h-8 bg-white border border-gray-300 rounded shadow flex items-center justify-center text-lg hover:bg-gray-50 font-bold">
                        −
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Nearest Rehab Centres */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6 border-b">
                <h2 className="text-xl font-semibold text-gray-900">
                  Nearest Rehab Centres ({filteredCentres.length})
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
                        <div className="flex-1">
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