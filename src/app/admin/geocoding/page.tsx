// src/app/admin/geocoding/page.tsx - Admin page for batch geocoding
'use client'

import GeocodingUtility from '@/components/GeocodingUtility'

export default function AdminGeocodingPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <GeocodingUtility />
    </div>
  )
}