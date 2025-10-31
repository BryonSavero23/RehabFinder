'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Loader } from '@googlemaps/js-api-loader'
import { supabase } from '@/lib/supabase'

export default function AddCenterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [countries, setCountries] = useState<any[]>([])
  const [centerTypes, setCenterTypes] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  // Form data - matching your actual database columns
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    latitude: '',
    longitude: '',
    phone: '',
    email: '',
    website: '',
    services: '',
    accessibility: false,
    country_id: '',
    state_id: '',  // You have this column
    city_id: '',   // You have this column
    center_type_id: '',
    active: true,
    verified: false
  })

  // Google Maps refs
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const autocompleteRef = useRef<any>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchDropdownData()
    initializeGoogleMaps()
  }, [])

  const fetchDropdownData = async () => {
    try {
      // Test connection first
      console.log('🔌 Testing Supabase connection...')
      const { data: testData, error: testError } = await supabase
        .from('rehabilitation_centers')
        .select('id')
        .limit(1)
      
      if (testError) {
        console.error('❌ Supabase test failed:', testError)
        setError(`Database connection failed: ${testError.message}`)
        return
      }
      
      console.log('✅ Supabase connection OK')

      const [countriesResult, typesResult] = await Promise.all([
        supabase.from('countries').select('*').order('name'),
        supabase.from('center_types').select('*').order('name')
      ])

      if (countriesResult.error) {
        console.error('Countries error:', countriesResult.error)
        setError(`Failed to load countries: ${countriesResult.error.message}`)
        return
      }

      if (typesResult.error) {
        console.error('Center types error:', typesResult.error)
        setError(`Failed to load center types: ${typesResult.error.message}`)
        return
      }

      setCountries(countriesResult.data || [])
      setCenterTypes(typesResult.data || [])

      // Set Malaysia as default country
      const malaysia = countriesResult.data?.find((c: any) => c.code === 'MY')
      if (malaysia) {
        setFormData(prev => ({ ...prev, country_id: malaysia.id }))
      }

      console.log('📊 Loaded:', {
        countries: countriesResult.data?.length,
        types: typesResult.data?.length
      })
    } catch (err) {
      console.error('Error fetching dropdown data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load form data')
    }
  }

  const initializeGoogleMaps = async () => {
    try {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
      if (!apiKey) {
        setError('Google Maps API key is not configured')
        return
      }

      const loader = new Loader({
        apiKey: apiKey,
        version: 'weekly',
        libraries: ['places', 'geometry']
      })

      await loader.load()

      if (!mapRef.current) return

      // Initialize map centered on Malaysia
      const map = new window.google.maps.Map(mapRef.current, {
        center: { lat: 4.2105, lng: 101.9758 },
        zoom: 6,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
      })

      mapInstanceRef.current = map

      // Initialize autocomplete with Malaysia bias
      if (searchInputRef.current) {
        const autocomplete = new window.google.maps.places.Autocomplete(
          searchInputRef.current,
          {
            componentRestrictions: { country: 'my' },
            fields: ['name', 'formatted_address', 'geometry', 'place_id', 'formatted_phone_number', 'website'],
            types: ['establishment']
          }
        )

        autocompleteRef.current = autocomplete

        // Listen for place selection
        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace()
          
          if (!place.geometry || !place.geometry.location) {
            setError('No details available for this place')
            return
          }

          handlePlaceSelect(place)
        })
      }

      // Allow manual marker placement by clicking on map
      map.addListener('click', (e: any) => {
        const lat = e.latLng.lat()
        const lng = e.latLng.lng()
        updateMarkerPosition(lat, lng)
        reverseGeocode(lat, lng)
      })

    } catch (err) {
      console.error('Error initializing Google Maps:', err)
      setError('Failed to load Google Maps')
    }
  }

  const handlePlaceSelect = (place: any) => {
    const lat = place.geometry.location.lat()
    const lng = place.geometry.location.lng()

    setFormData(prev => ({
      ...prev,
      name: place.name || prev.name,
      address: place.formatted_address || prev.address,
      latitude: lat.toFixed(6),
      longitude: lng.toFixed(6),
      phone: place.formatted_phone_number || prev.phone,
      website: place.website || prev.website
    }))

    if (mapInstanceRef.current) {
      mapInstanceRef.current.setCenter({ lat, lng })
      mapInstanceRef.current.setZoom(16)
      updateMarkerPosition(lat, lng, place.name)
    }

    setError(null)
  }

  const updateMarkerPosition = (lat: number, lng: number, title: string = 'Selected Location') => {
    if (markerRef.current) {
      markerRef.current.setMap(null)
    }

    const marker = new window.google.maps.Marker({
      position: { lat, lng },
      map: mapInstanceRef.current,
      title: title,
      animation: window.google.maps.Animation.DROP,
      draggable: true
    })

    marker.addListener('dragend', (e: any) => {
      const newLat = e.latLng.lat()
      const newLng = e.latLng.lng()
      setFormData(prev => ({
        ...prev,
        latitude: newLat.toFixed(6),
        longitude: newLng.toFixed(6)
      }))
      reverseGeocode(newLat, newLng)
    })

    markerRef.current = marker

    setFormData(prev => ({
      ...prev,
      latitude: lat.toFixed(6),
      longitude: lng.toFixed(6)
    }))
  }

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const geocoder = new window.google.maps.Geocoder()
      const result = await geocoder.geocode({ location: { lat, lng } })
      
      if (result.results[0]) {
        setFormData(prev => ({
          ...prev,
          address: result.results[0].formatted_address
        }))
      }
    } catch (err) {
      console.error('Reverse geocoding error:', err)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    setError(null)
  }

  const handleCoordinateChange = (field: 'latitude' | 'longitude', value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))

    const lat = field === 'latitude' ? parseFloat(value) : parseFloat(formData.latitude)
    const lng = field === 'longitude' ? parseFloat(value) : parseFloat(formData.longitude)

    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      updateMarkerPosition(lat, lng)
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setCenter({ lat, lng })
        mapInstanceRef.current.setZoom(16)
      }
    }
  }

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Center name is required')
      return false
    }
    if (!formData.address.trim()) {
      setError('Address is required')
      return false
    }
    if (!formData.center_type_id) {
      setError('Center type is required')
      return false
    }

    const lat = parseFloat(formData.latitude)
    const lng = parseFloat(formData.longitude)

    if (!formData.latitude || isNaN(lat) || lat < -90 || lat > 90) {
      setError('Valid latitude is required (between -90 and 90)')
      return false
    }
    if (!formData.longitude || isNaN(lng) || lng < -180 || lng > 180) {
      setError('Valid longitude is required (between -180 and 180)')
      return false
    }

    if (formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email)) {
        setError('Invalid email format')
        return false
      }
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Prepare insert data - ONLY columns that exist in your table
      const dataToInsert: any = {
        name: formData.name.trim(),
        address: formData.address.trim(),
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        center_type_id: formData.center_type_id,
        active: true,
        verified: false
      }

      // Add optional fields only if they have values
      if (formData.phone.trim()) dataToInsert.phone = formData.phone.trim()
      if (formData.email.trim()) dataToInsert.email = formData.email.trim()
      if (formData.website.trim()) dataToInsert.website = formData.website.trim()
      if (formData.services.trim()) dataToInsert.services = formData.services.trim()
      
      // NOTE: place_id column doesn't exist in your database, so we don't include it
      
      // Add state_id and city_id if provided (you can add dropdowns for these later)
      if (formData.country_id) dataToInsert.country_id = formData.country_id
      if (formData.city_id) dataToInsert.city_id = formData.city_id
      
      // Add accessibility
      dataToInsert.accessibility = formData.accessibility

      console.log('📤 Inserting data:', dataToInsert)

      const { data, error: insertError } = await supabase
        .from('rehabilitation_centers')
        .insert(dataToInsert)
        .select()
        .single()

      if (insertError) {
        console.error('❌ Insert error:', insertError)
        throw new Error(insertError.message || 'Failed to create center')
      }

      console.log('✅ Center created:', data)
      setSuccess(true)
      
      setTimeout(() => {
        router.push('/admin/centers')
      }, 2000)

    } catch (err) {
      console.error('💥 Error:', err)
      setError(err instanceof Error ? err.message : 'Failed to create center')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => router.back()}
                className="text-gray-600 hover:text-gray-900 mb-2 flex items-center gap-2"
              >
                ← Back
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Add New Center</h1>
              <p className="text-sm text-gray-600 mt-1">
                Search for a place or click on the map to add a rehabilitation center
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Success Message */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <span className="text-green-600 text-xl">✅</span>
              <p className="text-green-800 font-medium">Center created successfully! Redirecting...</p>
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

        <form onSubmit={handleSubmit}>
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left Column - Form */}
            <div className="space-y-6">
              {/* Search Box */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">🔍 Search for Place</h3>
                
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search for 'Klinik Anda 24 Jam Seri Manjung' or any place..."
                  className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-lg"
                />
                <p className="text-xs text-gray-500 mt-2">
                  💡 Start typing to search, or click on the map to manually select a location
                </p>
              </div>

              {/* Basic Information */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Center Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="e.g., Klinik Anda 24 Jam Seri Manjung"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address *
                    </label>
                    <textarea
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="Full address will be auto-filled"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Latitude *
                      </label>
                      <input
                        type="text"
                        value={formData.latitude}
                        onChange={(e) => handleCoordinateChange('latitude', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        placeholder="4.214536"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Longitude *
                      </label>
                      <input
                        type="text"
                        value={formData.longitude}
                        onChange={(e) => handleCoordinateChange('longitude', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        placeholder="100.695595"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Center Type *
                    </label>
                    <select
                      value={formData.center_type_id}
                      onChange={(e) => handleInputChange('center_type_id', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      required
                    >
                      <option value="">Select Type</option>
                      {centerTypes.map(type => (
                        <option key={type.id} value={type.id}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Country Dropdown */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Country
                    </label>
                    <select
                      value={formData.country_id}
                      onChange={(e) => handleInputChange('country_id', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    >
                      <option value="">Select Country (Optional)</option>
                      {countries.map(country => (
                        <option key={country.id} value={country.id}>
                          {country.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="+60 12-345 6789"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="contact@clinic.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                    <input
                      type="url"
                      value={formData.website}
                      onChange={(e) => handleInputChange('website', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="https://www.clinic.com"
                    />
                  </div>
                </div>
              </div>

              {/* Additional Details */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Details</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Services Offered
                    </label>
                    <textarea
                      value={formData.services}
                      onChange={(e) => handleInputChange('services', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="Describe the services offered..."
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="accessibility"
                      checked={formData.accessibility}
                      onChange={(e) => handleInputChange('accessibility', e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="accessibility" className="text-sm font-medium text-gray-700">
                      ♿ Wheelchair Accessible
                    </label>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {loading ? '💾 Creating...' : '✅ Create Center'}
                </button>
              </div>
            </div>

            {/* Right Column - Map */}
            <div className="lg:sticky lg:top-8 lg:self-start">
              <div className="bg-white rounded-lg shadow-sm border p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📍 Location Preview</h3>
                <div 
                  ref={mapRef}
                  className="w-full h-[600px] rounded-lg border-2 border-gray-200"
                />
                <p className="text-xs text-gray-500 mt-3">
                  💡 <strong>Tip:</strong> You can drag the marker to adjust the exact location
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}