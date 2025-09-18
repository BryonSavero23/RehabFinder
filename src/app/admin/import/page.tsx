// src/app/admin/import/page.tsx - Admin Import Page
'use client'

import DataImport from '@/components/DataImport'

export default function AdminImportPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Data Import</h1>
          <p className="text-gray-600 mt-2">Import rehabilitation center data from Excel files</p>
        </div>
        <DataImport />
      </div>
    </div>
  )
}