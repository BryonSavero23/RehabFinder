'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function Home() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [searchLocation, setSearchLocation] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    country: 'Malaysia',
    state: 'Pemitary',
    rehabType: '',
    accessibility: false
  })

  const handleUseLocation = () => {
    setLoading(true)
    setError(null)

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser.')
      setLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        })
        setLoading(false)
        console.log('Location found:', position.coords.latitude, position.coords.longitude)
      },
      (error) => {
        setError('Unable to retrieve your location. Please check your browser permissions.')
        setLoading(false)
        console.error('Geolocation error:', error)
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    )
  }

  const mockCentres = [
    {
      name: 'Sunrise Rehabilitation Centre',
      address: '122 Jalan Petaling\nKuala Lumpur',
      distance: '2.5 km'
    },
    {
      name: 'Taman Pemulihan',
      address: '456 Lorong Gungai\nPenang',
      distance: '4.3 km'
    },
    {
      name: 'Rehab Whisper',
      address: '789 Jalan Bahagia, Ip...\nIpoh',
      distance: '5.1 km'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Find Rehab Centres Near You<br />
              in Malaysia & Thailand
            </h1>
          </div>

          {/* Search Section */}
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input 
                type="text" 
                placeholder="Enter location or centre name"
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-lg"
              />
            </div>
            <button 
              onClick={handleUseLocation}
              disabled={loading}
              className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 disabled:bg-gray-400 flex items-center gap-2 whitespace-nowrap"
            >
              <span className="text-lg">📍</span>
              {loading ? 'Finding your location...' : 'Use My Location'}
            </button>
          </div>

          {/* Location Status */}
          {location && (
            <div className="mt-4 p-4 bg-green-100 text-green-800 rounded-lg max-w-md mx-auto text-center">
              📍 Location found: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-100 text-red-800 rounded-lg max-w-md mx-auto text-center">
              ❌ {error}
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
                  onChange={(e) => setFilters({...filters, country: e.target.value})}
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
                <select 
                  value={filters.state}
                  onChange={(e) => setFilters({...filters, state: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Pemitary">Pemitary</option>
                  <option value="Selangor">Selangor</option>
                  <option value="Penang">Penang</option>
                  <option value="Perak">Perak</option>
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
                      className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    Inpatient
                  </label>
                  <label className="flex items-center">
                    <input 
                      type="checkbox" 
                      className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    Outpatient
                  </label>
                  <label className="flex items-center">
                    <input 
                      type="checkbox" 
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
                    onChange={(e) => setFilters({...filters, accessibility: e.target.checked})}
                    className="mr-2 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm">Wheelchair-friendly</span>
                  <div className="ml-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
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
                    {[
                      { top: '25%', left: '52%' },
                      { top: '15%', left: '48%' },
                      { top: '35%', left: '55%' },
                      { top: '20%', left: '40%' },
                      { top: '40%', left: '50%' },
                      { top: '30%', left: '45%' },
                      { top: '45%', left: '53%' },
                      { top: '50%', left: '48%' },
                      { top: '60%', left: '52%' },
                    ].map((pin, index) => (
                      <div 
                        key={index}
                        className="absolute w-6 h-6 bg-blue-600 rounded-full border-2 border-white shadow-lg cursor-pointer hover:bg-blue-700 transition-colors"
                        style={{ top: pin.top, left: pin.left, transform: 'translate(-50%, -50%)' }}
                        title={`Rehab Centre ${index + 1}`}
                      >
                      </div>
                    ))}
                    
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
            <div className="bg-white rounded-lg shadow-sm mb-8">
              <div className="p-6 border-b">
                <h2 className="text-xl font-semibold text-gray-900">
                  Nearest Rehab Centres
                </h2>
              </div>
              <div className="p-6">
                <div className="grid md:grid-cols-3 gap-6">
                  {mockCentres.map((centre, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <h3 className="font-semibold text-lg mb-2">{centre.name}</h3>
                      <p className="text-gray-600 text-sm mb-2 whitespace-pre-line">{centre.address}</p>
                      <p className="text-blue-600 font-medium text-sm mb-3">{centre.distance}</p>
                      <button className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors">
                        View Details
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Cards Section */}
        <div className="grid md:grid-cols-4 gap-6 mt-12">
          <div className="bg-blue-100 p-6 rounded-lg text-center">
            <div className="w-12 h-12 bg-blue-200 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <span className="text-2xl">▶️</span>
            </div>
            <h3 className="font-semibold text-lg mb-2">Exercise Videos</h3>
            <p className="text-gray-600 text-sm">Guided rehabilitation exercises and therapy routines</p>
          </div>
          
          <div className="bg-green-100 p-6 rounded-lg text-center">
            <div className="w-12 h-12 bg-green-200 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <span className="text-2xl">⬇️</span>
            </div>
            <h3 className="font-semibold text-lg mb-2">Downloadable Toolkits</h3>
            <p className="text-gray-600 text-sm">Comprehensive resources for patients and families</p>
          </div>
          
          <div className="bg-orange-100 p-6 rounded-lg text-center">
            <div className="w-12 h-12 bg-orange-200 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <span className="text-2xl">👥</span>
            </div>
            <h3 className="font-semibold text-lg mb-2">Support Groups</h3>
            <p className="text-gray-600 text-sm">Connect with others on similar recovery journeys</p>
          </div>
          
          <div className="bg-teal-100 p-6 rounded-lg text-center">
            <div className="w-12 h-12 bg-teal-200 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <span className="text-2xl">🌿</span>
            </div>
            <h3 className="font-semibold text-lg mb-2">Traditional Healing Practices</h3>
            <p className="text-gray-600 text-sm">Complementary and alternative medicine options</p>
          </div>
        </div>
      </div>
    </div>
  )
}