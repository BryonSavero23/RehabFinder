// src/components/SupabaseTest.tsx
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Country {
  id: string
  name: string
  code: string
  created_at: string
}

interface CenterType {
  id: string
  name: string
  description: string
}

export default function SupabaseTest() {
  const [countries, setCountries] = useState<Country[]>([])
  const [centerTypes, setCenterTypes] = useState<CenterType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'testing' | 'success' | 'error'>('testing')

  useEffect(() => {
    testSupabaseConnection()
  }, [])

  const testSupabaseConnection = async () => {
    try {
      setLoading(true)
      setError(null)
      setConnectionStatus('testing')

      // Test 1: Basic connection
      console.log('Testing Supabase connection...')
      
      // Test 2: Fetch countries
      const { data: countriesData, error: countriesError } = await supabase
        .from('countries')
        .select('*')
        .order('name')

      if (countriesError) {
        throw new Error(`Countries query failed: ${countriesError.message}`)
      }

      // Test 3: Fetch center types
      const { data: typesData, error: typesError } = await supabase
        .from('center_types')
        .select('*')
        .order('name')

      if (typesError) {
        throw new Error(`Center types query failed: ${typesError.message}`)
      }

      if (!countriesData || countriesData.length === 0) {
        throw new Error('No countries found. Did you run the SQL setup script?')
      }

      if (!typesData || typesData.length === 0) {
        throw new Error('No center types found. Did you run the SQL setup script?')
      }

      setCountries(countriesData)
      setCenterTypes(typesData)
      setConnectionStatus('success')
      console.log('✅ Supabase connection successful!', { countries: countriesData, types: typesData })

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      setConnectionStatus('error')
      console.error('❌ Supabase connection failed:', errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const testInsert = async () => {
    try {
      // Get Malaysia country ID for the test insert
      const malaysiaCountry = countries.find(c => c.code === 'MY')
      if (!malaysiaCountry) {
        throw new Error('Malaysia not found in countries table')
      }

      // Test inserting a dummy rehabilitation center
      const { data, error } = await supabase
        .from('rehabilitation_centers')
        .insert([
          {
            name: 'Test Rehabilitation Center',
            address: '123 Test Street, Kuala Lumpur, Malaysia',
            latitude: 3.1390,
            longitude: 101.6869,
            phone: '+60 3-1234 5678',
            email: 'test@example.com',
            services: 'Physiotherapy, Occupational Therapy, Test Services',
            accessibility: true,
            country_id: malaysiaCountry.id,
            active: true,
            verified: false
          }
        ])
        .select()

      if (error) {
        throw new Error(`Insert failed: ${error.message}`)
      }

      alert('✅ Test insert successful! Check your Supabase Table Editor → rehabilitation_centers')
      console.log('Test insert successful:', data)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Insert test failed'
      alert(`❌ Insert test failed: ${errorMessage}`)
      console.error('Insert test failed:', errorMessage)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-3xl font-bold text-gray-900 mb-6">
        🧪 Supabase Connection Test
      </h2>

      {/* Connection Status */}
      <div className="mb-6 p-4 rounded-lg border-2">
        <h3 className="font-semibold mb-2 text-lg">Connection Status:</h3>
        <div className="flex items-center gap-3">
          {connectionStatus === 'testing' && (
            <>
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              <span className="text-blue-600 font-medium">Testing connection...</span>
            </>
          )}
          {connectionStatus === 'success' && (
            <>
              <span className="text-green-600 text-2xl">✅</span>
              <span className="text-green-600 font-bold text-lg">Connection successful!</span>
            </>
          )}
          {connectionStatus === 'error' && (
            <>
              <span className="text-red-600 text-2xl">❌</span>
              <span className="text-red-600 font-bold text-lg">Connection failed</span>
            </>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
          <h3 className="font-bold text-red-800 mb-2">Error Details:</h3>
          <p className="text-red-700 mb-3">{error}</p>
          <div className="text-sm text-red-600 bg-red-100 p-3 rounded">
            <p><strong>Common fixes:</strong></p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Check NEXT_PUBLIC_SUPABASE_URL in .env.local</li>
              <li>Check NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local</li>
              <li>Make sure you ran the SQL setup script in Supabase</li>
              <li>Restart your dev server after adding .env.local</li>
            </ul>
          </div>
        </div>
      )}

      {/* Success Data Display */}
      {connectionStatus === 'success' && (
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Countries */}
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h3 className="font-bold mb-3 text-green-800">Countries Found:</h3>
            <div className="space-y-2">
              {countries.map((country) => (
                <div key={country.id} className="p-3 bg-white rounded border border-green-300">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{country.name}</span>
                    <span className="text-sm text-gray-600 px-2 py-1 bg-green-100 rounded">
                      {country.code}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Center Types */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="font-bold mb-3 text-blue-800">Center Types Found:</h3>
            <div className="space-y-2">
              {centerTypes.map((type) => (
                <div key={type.id} className="p-3 bg-white rounded border border-blue-300">
                  <div className="font-medium">{type.name}</div>
                  <div className="text-sm text-gray-600">{type.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={testSupabaseConnection}
          disabled={loading}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 font-medium"
        >
          {loading ? 'Testing...' : 'Test Connection Again'}
        </button>

        {connectionStatus === 'success' && (
          <button
            onClick={testInsert}
            className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium"
          >
            Test Insert Data
          </button>
        )}
      </div>

      {/* Environment Check */}
      <div className="bg-gray-50 p-4 rounded-lg border">
        <h3 className="font-bold mb-3">Environment Variables Check:</h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className={process.env.NEXT_PUBLIC_SUPABASE_URL ? 'text-green-600' : 'text-red-600'}>
              {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅' : '❌'}
            </span>
            <span>Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'text-green-600' : 'text-red-600'}>
              {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅' : '❌'}
            </span>
            <span>Supabase Key: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing'}</span>
          </div>
        </div>
        
        {process.env.NEXT_PUBLIC_SUPABASE_URL && (
          <div className="mt-3 text-xs text-gray-600">
            <strong>Current URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL}
          </div>
        )}
      </div>
    </div>
  )
}