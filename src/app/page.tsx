'use client'

import { useState } from 'react'

export default function Home() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">R</span>
              </div>
              <span className="font-bold text-xl text-gray-900">RehabFinder</span>
            </div>
            
            {/* Navigation */}
            <nav className="hidden md:flex space-x-6">
              <a href="/" className="text-blue-500 font-medium">Home</a>
              <a href="/centres" className="text-gray-600 hover:text-blue-500">Find Centres</a>
              <a href="/resources" className="text-gray-600 hover:text-blue-500">Resources</a>
              <a href="/contact" className="text-gray-600 hover:text-blue-500">Contact</a>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Find Rehab Centres Near You
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Malaysia & Thailand
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button 
              onClick={handleUseLocation}
              disabled={loading}
              className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 disabled:bg-gray-400 flex items-center gap-2"
            >
              {loading ? '📍 Finding your location...' : '🎯 Use My Location'}
            </button>
            <input 
              type="text" 
              placeholder="Enter location or centre name"
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          {/* Location Status */}
          {location && (
            <div className="mt-4 p-4 bg-green-100 text-green-800 rounded-lg max-w-md mx-auto">
              📍 Location found: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
              <br />
              <small>Now you can see nearby centres!</small>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-100 text-red-800 rounded-lg max-w-md mx-auto">
              ❌ {error}
            </div>
          )}
        </div>

        {/* Sample Centres (if location found) */}
        {location && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Nearest Centres</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { name: 'Sunway Medical Centre', address: 'Bandar Sunway, Selangor', distance: '2.3 km', type: 'Private Hospital' },
                { name: 'Hospital Sungai Buloh', address: 'Sungai Buloh, Selangor', distance: '4.1 km', type: 'Government Hospital' },
                { name: 'NASAM Rehab Centre', address: 'Shah Alam, Selangor', distance: '5.8 km', type: 'NGO Centre' }
              ].map((centre, i) => (
                <div key={i} className="bg-white p-6 rounded-lg shadow border">
                  <h3 className="font-semibold text-lg mb-2">{centre.name}</h3>
                  <p className="text-gray-600 mb-1">{centre.address}</p>
                  <p className="text-blue-500 font-medium mb-2">{centre.distance}</p>
                  <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                    {centre.type}
                  </span>
                  <div className="mt-4 flex gap-2">
                    <button className="bg-blue-500 text-white px-4 py-2 rounded text-sm hover:bg-blue-600">
                      View Details
                    </button>
                    <button className="border border-blue-500 text-blue-500 px-4 py-2 rounded text-sm hover:bg-blue-50">
                      Get Directions
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Access Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer">
            <div className="text-3xl mb-3">🎥</div>
            <h3 className="font-semibold mb-2">Exercise Videos</h3>
            <p className="text-gray-600">Rehabilitation exercises and therapy guides</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer">
            <div className="text-3xl mb-3">📍</div>
            <h3 className="font-semibold mb-2">Find Centres</h3>
            <p className="text-gray-600">Locate nearby rehabilitation facilities</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer">
            <div className="text-3xl mb-3">📚</div>
            <h3 className="font-semibold mb-2">Resources</h3>
            <p className="text-gray-600">Helpful tools and comprehensive guides</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p>&copy; 2024 RehabFinder - Health, Hope & Access</p>
        </div>
      </footer>
    </div>
  )
}