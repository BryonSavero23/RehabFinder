// src/components/GooglePlacesVerifier.tsx
'use client'

import { useState } from 'react'

interface GooglePlacesVerifierProps {
  centerId: string
  centerName: string
  currentAddress: string
  currentType: string
  latitude?: number | null
  longitude?: number | null
  onVerified: (data: VerifiedData) => void
}

interface VerifiedData {
  name: string
  address: string
  latitude: number
  longitude: number
  phone?: string
  website?: string
  businessType?: string
  placeId?: string
  services?: string
}

interface PlaceResult {
  place_id: string
  name: string
  formatted_address: string
  geometry: {
    location: {
      lat: number
      lng: number
    }
  }
  formatted_phone_number?: string
  website?: string
  types: string[]
}

export default function GooglePlacesVerifier({
  centerId,
  centerName,
  currentAddress,
  currentType,
  latitude,
  longitude,
  onVerified
}: GooglePlacesVerifierProps) {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<PlaceResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  const searchGoogle = async () => {
    try {
      setLoading(true)
      setError(null)
      setResults([])

      const query = `${centerName} rehabilitation ${currentAddress}`
      
      console.log('🔍 Searching Google Places for:', query)

      const response = await fetch('/api/google-places/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      })

      if (!response.ok) {
        throw new Error('Failed to search Google Places')
      }

      const data = await response.json()
      
      if (data.results && data.results.length > 0) {
        setResults(data.results)
        setExpanded(true)
      } else {
        setError('No results found. Try editing the name or address first.')
      }

    } catch (err) {
      console.error('Google Places search error:', err)
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  const selectPlace = (place: PlaceResult) => {
    let businessType = currentType
    const types = place.types?.map(t => t.toLowerCase()) || []
    
    if (types.includes('hospital') || types.includes('health')) {
      businessType = 'Hospital'
    } else if (types.includes('doctor') || types.includes('medical')) {
      businessType = 'Private'
    }

    const serviceTypes = (place.types || [])
      .filter(t => !['establishment', 'point_of_interest'].includes(t.toLowerCase()))
      .map(t => t.replace(/_/g, ' '))
      .join(', ')
    
    const services = serviceTypes || 'Rehabilitation services'

    const verifiedData: VerifiedData = {
      name: place.name,
      address: place.formatted_address,
      latitude: place.geometry.location.lat,
      longitude: place.geometry.location.lng,
      phone: place.formatted_phone_number,
      website: place.website,
      businessType,
      placeId: place.place_id,
      services: services
    }

    onVerified(verifiedData)
    setExpanded(false)
  }

  return (
    <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="font-medium text-gray-900">🔍 Verify with Google Places</h4>
          <p className="text-sm text-gray-600">
            Search Google to get accurate business information
          </p>
        </div>
        <button
          onClick={searchGoogle}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 font-medium disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              Searching...
            </span>
          ) : (
            'Search Google'
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 mb-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {expanded && results.length > 0 && (
        <div className="space-y-3 mt-4">
          <div className="text-sm font-medium text-gray-700">
            Found {results.length} result{results.length > 1 ? 's' : ''}:
          </div>
          {results.map((place, placeIndex) => {
            // Extract types with safety check
            const placeTypes = place.types || []
            
            return (
              <div
                key={`place-${place.place_id}-${placeIndex}`}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h5 className="font-semibold text-gray-900 mb-1">
                      {place.name}
                    </h5>
                    <p className="text-sm text-gray-600 mb-2">
                      {place.formatted_address}
                    </p>
                    {place.formatted_phone_number && (
                      <p className="text-sm text-gray-500">
                        📞 {place.formatted_phone_number}
                      </p>
                    )}
                    {place.website && (
                      <p className="text-sm text-blue-600 truncate">
                        🌐 {place.website}
                      </p>
                    )}
                    {placeTypes.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {placeTypes.slice(0, 3).map((type, typeIndex) => (
                          <span
                            key={`place-${placeIndex}-type-${typeIndex}-${type}`}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700"
                          >
                            {type.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => selectPlace(place)}
                  className="w-full mt-3 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 font-medium"
                >
                  ✓ Use This Information
                </button>
              </div>
            )
          })}
          <button
            onClick={() => setExpanded(false)}
            className="w-full text-gray-600 hover:text-gray-800 text-sm font-medium mt-2"
          >
            Close Results
          </button>
        </div>
      )}
    </div>
  )
}