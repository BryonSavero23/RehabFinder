// src/app/admin/centers/[id]/page.tsx - Enhanced with Google Places Verification
'use client'

import { use, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import GooglePlacesVerifier from '@/components/GooglePlacesVerifier'

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
  description?: string
}

interface EditCenterPageProps {
  params: Promise<{ id: string }>
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

export default function EditCenterPage(props: EditCenterPageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const params = use(props.params)
  const centerId = params.id
  const [center, setCenter] = useState<Centre | null>(null)
  const [countries, setCountries] = useState<Country[]>([])
  const [centerTypes, setCenterTypes] = useState<CenterType[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Get return URL from query params, or default to centers list
  const returnUrl = searchParams.get('returnUrl') || '/admin/centers'

  // Form state
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
    center_type_id: '',
    active: true,
    verified: false
  })

  useEffect(() => {
    fetchData()
  }, [centerId])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [centerResult, countriesResult, typesResult] = await Promise.all([
        supabase
          .from('rehabilitation_centers')
          .select('*')
          .eq('id', centerId)
          .single(),
        supabase
          .from('countries')
          .select('*')
          .order('name'),
        supabase
          .from('center_types')
          .select('*')
          .order('name')
      ])

      if (centerResult.error) {
        if (centerResult.error.code === 'PGRST116') {
          setError('Center not found')
        } else {
          throw centerResult.error
        }
        return
      }

      if (countriesResult.error) throw countriesResult.error
      if (typesResult.error) throw typesResult.error

      const centerData = centerResult.data
      console.log('📥 Fetched center data from database:', centerData)
      console.log('🌐 Website from database:', centerData.website)
      console.log('🔄 Current form website value:', formData.website)
      
      setCenter(centerData)
      setCountries(countriesResult.data || [])
      setCenterTypes(typesResult.data || [])

      const newFormData = {
        name: centerData.name || '',
        address: centerData.address || '',
        latitude: centerData.latitude?.toString() || '',
        longitude: centerData.longitude?.toString() || '',
        phone: centerData.phone || '',
        email: centerData.email || '',
        website: centerData.website || '',
        services: centerData.services || '',
        accessibility: centerData.accessibility || false,
        country_id: centerData.country_id || '',
        center_type_id: centerData.center_type_id || '',
        active: centerData.active,
        verified: centerData.verified
      }

      console.log('📝 Setting form data website to:', newFormData.website)
      setFormData(newFormData)

    } catch (err) {
      console.error('❌ Error fetching center:', err)
      setError(err instanceof Error ? err.message : 'Failed to load center data')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    setSuccess(false)
    setError(null) // Clear error when user makes changes
  }

  // URL validation and formatting helper
  const validateAndFormatUrl = (url: string): string | null => {
    if (!url || !url.trim()) return null
    
    let formattedUrl = url.trim()
    
    // Remove any leading/trailing whitespace
    formattedUrl = formattedUrl.replace(/\s+/g, '')
    
    // If URL doesn't start with http:// or https://, add https://
    if (!formattedUrl.match(/^https?:\/\//i)) {
      formattedUrl = 'https://' + formattedUrl
    }
    
    // Basic URL validation
    try {
      new URL(formattedUrl)
      return formattedUrl
    } catch {
      return null
    }
  }

  // NEW: Handle Google Places verification
  const handleGoogleVerification = async (verifiedData: VerifiedData) => {
    try {
      setSaving(true)
      setError(null)

      console.log('🔍 Received verification data:', verifiedData)

      // Map Google business type to your center_type_id
      let centerTypeId = formData.center_type_id
      if (verifiedData.businessType && verifiedData.businessType.trim()) {
        const businessType = verifiedData.businessType.toLowerCase()
        const matchingType = centerTypes.find(
          t => t.name.toLowerCase() === businessType
        )
        if (matchingType) {
          centerTypeId = matchingType.id
        }
      }

      // Format website URL
      let websiteUrl = null
      if (verifiedData.website) {
        websiteUrl = validateAndFormatUrl(verifiedData.website)
      }

      console.log('💾 Applying verified data to form...')

      // Update form data with verified information
      const updatedFormData = {
        ...formData,
        name: verifiedData.name || formData.name,
        address: verifiedData.address || formData.address,
        latitude: verifiedData.latitude?.toString() || formData.latitude,
        longitude: verifiedData.longitude?.toString() || formData.longitude,
        phone: verifiedData.phone || formData.phone,
        website: websiteUrl || formData.website,
        services: verifiedData.services || formData.services,
        center_type_id: centerTypeId,
        verified: true // Mark as verified since we got Google data
      }

      setFormData(updatedFormData)

      // Save to database immediately
      const updateData = {
        name: verifiedData.name,
        address: verifiedData.address,
        latitude: verifiedData.latitude,
        longitude: verifiedData.longitude,
        phone: verifiedData.phone || null,
        website: websiteUrl,
        services: verifiedData.services || null,
        center_type_id: centerTypeId,
        verified: true
      }

      console.log('💾 Saving Google verified data to database:', updateData)

      const { error: updateError } = await supabase
        .from('rehabilitation_centers')
        .update(updateData)
        .eq('id', centerId)

      if (updateError) {
        console.error('❌ Supabase update error:', updateError)
        throw new Error(updateError.message || 'Database update failed')
      }

      console.log('✅ Google verified data saved successfully!')

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)

      // Refresh data
      await fetchData()

    } catch (err: any) {
      console.error('❌ Error applying Google verification:', err)
      console.error('Error details:', {
        message: err?.message,
        name: err?.name,
        stack: err?.stack
      })
      setError(err?.message || 'Failed to apply verification')
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)

      // Validate required fields
      if (!formData.name.trim()) {
        setError('Center name is required')
        return
      }
      if (!formData.address.trim()) {
        setError('Address is required')
        return
      }
      if (!formData.country_id) {
        setError('Country is required')
        return
      }
      if (!formData.center_type_id) {
        setError('Center type is required')
        return
      }

      // Validate coordinates if provided
      let latitude = null
      let longitude = null
      
      if (formData.latitude.trim()) {
        latitude = parseFloat(formData.latitude)
        if (isNaN(latitude) || latitude < -90 || latitude > 90) {
          setError('Latitude must be a number between -90 and 90')
          return
        }
      }

      if (formData.longitude.trim()) {
        longitude = parseFloat(formData.longitude)
        if (isNaN(longitude) || longitude < -180 || longitude > 180) {
          setError('Longitude must be a number between -180 and 180')
          return
        }
      }

      // Validate email format if provided
      if (formData.email.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(formData.email.trim())) {
          setError('Please enter a valid email address')
          return
        }
      }

      // Validate and format website URL
      let websiteUrl = null
      if (formData.website.trim()) {
        websiteUrl = validateAndFormatUrl(formData.website)
        if (!websiteUrl) {
          setError('Please enter a valid website URL (e.g., example.com or https://example.com)')
          return
        }
      }

      console.log('💾 Saving website URL:', websiteUrl)

      // Prepare update data
      const updateData = {
        name: formData.name.trim(),
        address: formData.address.trim(),
        latitude: latitude,
        longitude: longitude,
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        website: websiteUrl,
        services: formData.services.trim() || null,
        accessibility: formData.accessibility,
        country_id: formData.country_id,
        center_type_id: formData.center_type_id,
        active: formData.active,
        verified: formData.verified
      }

      console.log('💾 Update data being sent:', updateData)

      const { data: updatedData, error: updateError } = await supabase
        .from('rehabilitation_centers')
        .update(updateData)
        .eq('id', centerId)
        .select()

      if (updateError) throw updateError

      console.log('✅ Data saved successfully:', updatedData)

      // Refresh the data from database to show the updated values
      await fetchData()

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)

    } catch (err: any) {
      console.error('❌ Error updating center:', err)
      console.error('Error details:', {
        message: err?.message,
        name: err?.name,
        code: err?.code,
        details: err?.details,
        hint: err?.hint
      })
      setError(err?.message || 'Failed to update center')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${center?.name}"? This action cannot be undone.`)) {
      return
    }

    try {
      setSaving(true)
      setError(null)

      const { error: deleteError } = await supabase
        .from('rehabilitation_centers')
        .delete()
        .eq('id', centerId)

      if (deleteError) throw deleteError

      router.push(returnUrl)

    } catch (err) {
      console.error('Error deleting center:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete center')
      setSaving(false)
    }
  }

  const getCountryName = (countryId: string) => {
    return countries.find(c => c.id === countryId)?.name || 'Unknown'
  }

  const getCenterTypeName = (typeId: string) => {
    return centerTypes.find(t => t.id === typeId)?.name || 'Unknown'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading center details...</p>
        </div>
      </div>
    )
  }

  if (error && !center) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8 max-w-md">
          <div className="text-red-500 text-xl mb-4">⚠️ Error</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link 
            href={returnUrl}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            ← Back to Centers
          </Link>
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
              <div className="flex items-center gap-3 mb-2">
                <Link 
                  href={returnUrl}
                  className="text-blue-600 hover:text-blue-800"
                >
                  ← Centers
                </Link>
              </div>
              <h1 className="text-3xl font-bold text-gray-900">Edit Center</h1>
              <p className="text-gray-600 mt-1">{center?.name}</p>
            </div>
            <button
              onClick={handleDelete}
              disabled={saving}
              className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 disabled:opacity-50"
            >
              🗑️ Delete Center
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Success Message */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <span className="text-green-600 text-xl">✅</span>
              <p className="text-green-800 font-medium">Changes saved successfully!</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && center && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <span className="text-red-600 text-xl">⚠️</span>
              <p className="text-red-800 font-medium">{error}</p>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Center Details</h3>

              <div className="space-y-6">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Center Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="Enter center name"
                  />
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address *
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="Enter full address"
                  />
                </div>

                {/* NEW: Google Places Verifier Component */}
                <div className="my-6">
                  <GooglePlacesVerifier
                    centerId={centerId}
                    centerName={formData.name}
                    currentAddress={formData.address}
                    currentType={getCenterTypeName(formData.center_type_id)}
                    latitude={center?.latitude}
                    longitude={center?.longitude}
                    onVerified={handleGoogleVerification}
                  />
                </div>

                {/* Country and Type */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Country *
                    </label>
                    <select
                      value={formData.country_id}
                      onChange={(e) => handleInputChange('country_id', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    >
                      <option value="">Select Country</option>
                      {countries.map(country => (
                        <option key={country.id} value={country.id}>
                          {country.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Center Type *
                    </label>
                    <select
                      value={formData.center_type_id}
                      onChange={(e) => handleInputChange('center_type_id', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    >
                      <option value="">Select Type</option>
                      {centerTypes.map(type => (
                        <option key={type.id} value={type.id}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Coordinates */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Latitude
                    </label>
                    <input
                      type="text"
                      value={formData.latitude}
                      onChange={(e) => handleInputChange('latitude', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="e.g., 3.1390"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Longitude
                    </label>
                    <input
                      type="text"
                      value={formData.longitude}
                      onChange={(e) => handleInputChange('longitude', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="e.g., 101.6869"
                    />
                  </div>
                </div>

                {/* Contact Info */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="e.g., +60 3-1234 5678"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="e.g., info@center.com"
                    />
                  </div>
                </div>

                {/* Website with validation hint */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Website
                  </label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="e.g., example.com or https://example.com"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    💡 Tip: Enter just the domain (e.g., "hospital.com") or full URL (e.g., "https://hospital.com")
                  </p>
                </div>

                {/* Services */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Services Offered
                  </label>
                  <textarea
                    value={formData.services}
                    onChange={(e) => handleInputChange('services', e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="Describe the services offered at this center"
                  />
                </div>

                {/* Checkboxes */}
                <div className="flex flex-wrap gap-6">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.accessibility}
                      onChange={(e) => handleInputChange('accessibility', e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">♿ Wheelchair Accessible</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) => handleInputChange('active', e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">✅ Active</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.verified}
                      onChange={(e) => handleInputChange('verified', e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">🔐 Verified</span>
                  </label>
                </div>
              </div>

              {/* Save Button */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 disabled:opacity-50 font-medium"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar Info */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border p-6 sticky top-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Center Information</h3>
              
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-600">Created:</span>
                  <span className="ml-2 font-medium">
                    {center ? new Date(center.created_at).toLocaleDateString() : 'Unknown'}
                  </span>
                </div>
                
                <div>
                  <span className="text-gray-600">ID:</span>
                  <span className="ml-2 font-mono text-xs text-gray-500 break-all">{center?.id}</span>
                </div>

                <div>
                  <span className="text-gray-600">Status:</span>
                  <div className="mt-1 flex flex-col gap-1">
                    {formData.active ? (
                      <span className="text-green-600 text-xs">✅ Active</span>
                    ) : (
                      <span className="text-red-600 text-xs">⏸ Inactive</span>
                    )}
                    {formData.verified ? (
                      <span className="text-green-600 text-xs">🔐 Verified</span>
                    ) : (
                      <span className="text-orange-600 text-xs">⏳ Unverified</span>
                    )}
                    {formData.accessibility && (
                      <span className="text-blue-600 text-xs">♿ Accessible</span>
                    )}
                    {(!formData.latitude || !formData.longitude) && (
                      <span className="text-orange-600 text-xs">📍 No Coordinates</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Quick Actions</h4>
                <div className="space-y-2">
                  <Link
                    href={`/admin/geocoding`}
                    className="block w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded border"
                  >
                    🗺️ Add Coordinates
                  </Link>
                  <Link
                    href="/"
                    target="_blank"
                    className="block w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded border"
                  >
                    👁️ View on Public Site
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}