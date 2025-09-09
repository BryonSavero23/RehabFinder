// src/components/DataImport.tsx - CORRECTED VERSION
'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

let XLSX: any = null
if (typeof window !== 'undefined') {
  import('xlsx').then((module) => {
    XLSX = module
  })
}

interface ImportStats {
  malaysia: { processed: number; inserted: number; errors: number }
  thailand: { processed: number; inserted: number; errors: number }
}

export default function DataImport() {
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState('')
  const [stats, setStats] = useState<ImportStats | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [malaysiaFile, setMalaysiaFile] = useState<File | null>(null)
  const [thailandFile, setThailandFile] = useState<File | null>(null)
  const [debugInfo, setDebugInfo] = useState<string[]>([])
  const [fullImport, setFullImport] = useState(false)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>, country: 'malaysia' | 'thailand') => {
    const file = event.target.files?.[0]
    if (file) {
      if (country === 'malaysia') {
        setMalaysiaFile(file)
      } else {
        setThailandFile(file)
      }
    }
  }

  const cleanValue = (value: any): string | null => {
    if (value === undefined || value === null || value === '' || value === 'MISSING') {
      return null
    }
    const cleaned = String(value).trim()
    return cleaned === '' || cleaned === 'MISSING' ? null : cleaned
  }

  const getCenterTypeId = (centerTypes: any[], typeString: string): string => {
    const typeStr = typeString.toLowerCase()
    
    if (typeStr.includes('hospital') || typeStr.includes('medical')) {
      return centerTypes.find(t => t.name === 'Inpatient')?.id || centerTypes[0]?.id
    } else if (typeStr.includes('ngo') || typeStr.includes('community')) {
      return centerTypes.find(t => t.name === 'Community')?.id || centerTypes[0]?.id
    } else if (typeStr.includes('government') || typeStr.includes('public')) {
      return centerTypes.find(t => t.name === 'Outpatient')?.id || centerTypes[0]?.id
    } else if (typeStr.includes('traditional')) {
      return centerTypes.find(t => t.name === 'Traditional')?.id || centerTypes[0]?.id
    } else {
      return centerTypes.find(t => t.name === 'Specialist')?.id || centerTypes[0]?.id
    }
  }

  const importData = async () => {
    try {
      if (!malaysiaFile && !thailandFile) {
        alert('Please select at least one Excel file to import')
        return
      }

      setImporting(true)
      setProgress('Starting import...')
      setStats(null)
      setErrors([])
      setDebugInfo([])

      if (!XLSX) {
        const module = await import('xlsx')
        XLSX = module
      }

      const importStats: ImportStats = {
        malaysia: { processed: 0, inserted: 0, errors: 0 },
        thailand: { processed: 0, inserted: 0, errors: 0 }
      }

      // Get database references
      const { data: countries } = await supabase.from('countries').select('id, code')
      const { data: centerTypes } = await supabase.from('center_types').select('id, name')

      const malaysiaId = countries?.find(c => c.code === 'MY')?.id
      const thailandId = countries?.find(c => c.code === 'TH')?.id

      if (!malaysiaId || !thailandId || !centerTypes?.length) {
        throw new Error('Required database references not found')
      }

      setDebugInfo([
        'Database references loaded:',
        `Malaysia ID: ${malaysiaId}`,
        `Thailand ID: ${thailandId}`,
        `Available center types: ${centerTypes?.map(t => t.name).join(', ')}`
      ])

      // Import Malaysia data
      if (malaysiaFile) {
        setProgress('Importing Malaysia rehabilitation centers...')
        await importMalaysiaData(malaysiaFile, malaysiaId, centerTypes, importStats)
      }

      // Import Thailand data  
      if (thailandFile) {
        setProgress('Importing Thailand rehabilitation centers...')
        await importThailandData(thailandFile, thailandId, centerTypes, importStats)
      }

      setStats(importStats)
      setProgress('Import completed!')

    } catch (error: any) {
      console.error('Import failed:', error)
      setErrors(prev => [...prev, `Import failed: ${error?.message || error}`])
      setProgress('Import failed')
    } finally {
      setImporting(false)
    }
  }

  const importMalaysiaData = async (file: File, countryId: string, centerTypes: any[], stats: ImportStats) => {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer)
      const sheetName = workbook.SheetNames[0] // "malaysia_rehab_directory_csv"
      const sheet = workbook.Sheets[sheetName]
      
      // Convert to JSON starting from row 1 (headers) - data starts from row 2
      const jsonData = XLSX.utils.sheet_to_json(sheet, { range: 0, defval: "" })
      
      setDebugInfo(prev => [...prev, `Malaysia: Found ${jsonData.length} records from ${sheetName}`])
      
      const limit = fullImport ? jsonData.length : 10
      
      for (const [index, row] of jsonData.entries()) {
        if (index >= limit) break
        
        try {
          stats.malaysia.processed++
          const rowData = row as any
          
          // Malaysia Excel structure: State, Name, Type, Address, Phone, Email, Website, Notes
          const name = cleanValue(rowData['Name'])
          if (!name) {
            setDebugInfo(prev => [...prev, `Malaysia row ${index + 2}: Skipped - no name (${JSON.stringify(rowData['Name'])})`])
            continue
          }
          
          const centerData = {
            name: name,
            address: cleanValue(rowData['Address']) || 'Address not provided',
            phone: cleanValue(rowData['Phone']),
            email: cleanValue(rowData['Email']),
            website: cleanValue(rowData['Website']),
            services: cleanValue(rowData['Notes']) || cleanValue(rowData['Type']) || 'Services not specified',
            country_id: countryId,
            center_type_id: getCenterTypeId(centerTypes, rowData['Type'] || ''),
            accessibility: false,
            active: true,
            verified: false
          }

          if (index === 0) {
            setDebugInfo(prev => [...prev, `Sample Malaysia record:`, JSON.stringify(centerData, null, 2)])
          }

          const { data: insertResult, error: insertError } = await supabase
            .from('rehabilitation_centers')
            .insert([centerData])
            .select()

          if (insertError) {
            setDebugInfo(prev => [...prev, `Malaysia row ${index + 2} INSERT ERROR: ${insertError.message}`])
            stats.malaysia.errors++
            setErrors(prev => [...prev, `Malaysia row ${index + 2}: ${insertError.message}`])
            continue
          }

          if (insertResult && insertResult.length > 0) {
            stats.malaysia.inserted++
            if (stats.malaysia.inserted === 1) {
              setDebugInfo(prev => [...prev, `✅ First Malaysia record inserted: ${insertResult[0].name}`])
            }
          }
          
          if (index % 25 === 0) {
            setProgress(`Malaysia: ${index + 1}/${limit} processed, ${stats.malaysia.inserted} inserted`)
          }

        } catch (error: any) {
          stats.malaysia.errors++
          setDebugInfo(prev => [...prev, `Malaysia row ${index + 2} ERROR: ${error.message}`])
          setErrors(prev => [...prev, `Malaysia row ${index + 2}: ${error.message}`])
        }
      }

    } catch (error: any) {
      setDebugInfo(prev => [...prev, `Malaysia import failed: ${error.message}`])
      throw error
    }
  }

  const importThailandData = async (file: File, countryId: string, centerTypes: any[], stats: ImportStats) => {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer)
      const sheetName = workbook.SheetNames[0] // "thailand_rehab_directory"
      const sheet = workbook.Sheets[sheetName]
      
      // Convert to JSON starting from row 1 (headers)
      const jsonData = XLSX.utils.sheet_to_json(sheet, { range: 0, defval: "" })
      
      setDebugInfo(prev => [...prev, `Thailand: Found ${jsonData.length} records from ${sheetName}`])
      
      const limit = fullImport ? jsonData.length : 10
      
      for (const [index, row] of jsonData.entries()) {
        if (index >= limit) break
        
        try {
          stats.thailand.processed++
          const rowData = row as any
          
          // Thailand Excel structure: Region, District, Name, Type, Category, Description, Phone, Email, Website, Address, Languages...
          // Note: "Name" is Thai name, "Type" is English name
          const name = cleanValue(rowData['Type']) || cleanValue(rowData['Name']) // Use English name first, fallback to Thai
          if (!name) {
            setDebugInfo(prev => [...prev, `Thailand row ${index + 2}: Skipped - no name (Type: ${JSON.stringify(rowData['Type'])}, Name: ${JSON.stringify(rowData['Name'])})`])
            continue
          }
          
          const centerData = {
            name: name,
            address: cleanValue(rowData['Address']) || 'Address not provided',
            phone: cleanValue(rowData['Phone']),
            email: cleanValue(rowData['Email']),
            website: cleanValue(rowData['Website']),
            services: cleanValue(rowData['Description']) || cleanValue(rowData['Category']) || 'Services not specified',
            country_id: countryId,
            center_type_id: getCenterTypeId(centerTypes, rowData['Category'] || ''),
            accessibility: false,
            active: true,
            verified: false
          }

          if (index === 0) {
            setDebugInfo(prev => [...prev, `Sample Thailand record:`, JSON.stringify(centerData, null, 2)])
          }

          const { data: insertResult, error: insertError } = await supabase
            .from('rehabilitation_centers')
            .insert([centerData])
            .select()

          if (insertError) {
            setDebugInfo(prev => [...prev, `Thailand row ${index + 2} INSERT ERROR: ${insertError.message}`])
            stats.thailand.errors++
            setErrors(prev => [...prev, `Thailand row ${index + 2}: ${insertError.message}`])
            continue
          }

          if (insertResult && insertResult.length > 0) {
            stats.thailand.inserted++
            if (stats.thailand.inserted === 1) {
              setDebugInfo(prev => [...prev, `✅ First Thailand record inserted: ${insertResult[0].name}`])
            }
          }
          
          if (index % 25 === 0) {
            setProgress(`Thailand: ${index + 1}/${limit} processed, ${stats.thailand.inserted} inserted`)
          }

        } catch (error: any) {
          stats.thailand.errors++
          setDebugInfo(prev => [...prev, `Thailand row ${index + 2} ERROR: ${error.message}`])
          setErrors(prev => [...prev, `Thailand row ${index + 2}: ${error.message}`])
        }
      }

    } catch (error: any) {
      setDebugInfo(prev => [...prev, `Thailand import failed: ${error.message}`])
      throw error
    }
  }

  const clearDatabase = async () => {
    if (!confirm('Are you sure you want to clear all rehabilitation centers? This cannot be undone!')) {
      return
    }

    try {
      setProgress('Clearing database...')
      const { error } = await supabase
        .from('rehabilitation_centers')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')

      if (error) throw error
      
      setProgress('Database cleared')
      setStats(null)
      setDebugInfo([])
      
    } catch (error: any) {
      setErrors(prev => [...prev, `Clear failed: ${error?.message || error}`])
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-3xl font-bold text-gray-900 mb-6">
        📊 Import Rehabilitation Center Data - CORRECTED
      </h2>

      {/* File Analysis Summary */}
      <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
        <h3 className="font-bold text-green-800 mb-2">✅ Excel File Analysis Complete:</h3>
        <div className="text-green-700 space-y-1 text-sm">
          <div><strong>Malaysia:</strong> 811 records with columns: State, Name, Type, Address, Phone, Email, Website, Notes</div>
          <div><strong>Thailand:</strong> 294 records with columns: Region, District, Name, Type, Category, Description, Phone, Email, Website, Address</div>
          <div><strong>Fix Applied:</strong> Correct column mapping and handling of "MISSING" values</div>
        </div>
      </div>

      {/* Import Mode Toggle */}
      <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
        <h3 className="font-bold text-purple-800 mb-2">Import Mode:</h3>
        <div className="flex items-center gap-4">
          <label className="flex items-center">
            <input
              type="radio"
              checked={!fullImport}
              onChange={() => setFullImport(false)}
              className="mr-2"
            />
            <span>Test Mode (10 records each)</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              checked={fullImport}
              onChange={() => setFullImport(true)}
              className="mr-2"
            />
            <span>Full Import (Malaysia: 811, Thailand: 294)</span>
          </label>
        </div>
      </div>

      {/* Debug Info */}
      {debugInfo.length > 0 && (
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
          <h3 className="font-bold text-gray-800 mb-2">Debug Information:</h3>
          <div className="text-gray-700 text-sm space-y-1 font-mono">
            {debugInfo.map((info, i) => (
              <div key={i}>{info}</div>
            ))}
          </div>
        </div>
      )}

      {/* File Upload Section */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-bold text-blue-800 mb-4">Select Your Excel Files:</h3>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-blue-700 mb-2">
              Malaysia Rehabs Excel File:
            </label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => handleFileSelect(e, 'malaysia')}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {malaysiaFile && <p className="text-sm text-green-600 mt-1">✅ {malaysiaFile.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-700 mb-2">
              Thailand Rehabs Excel File:
            </label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => handleFileSelect(e, 'thailand')}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {thailandFile && <p className="text-sm text-green-600 mt-1">✅ {thailandFile.name}</p>}
          </div>
        </div>
      </div>

      {/* Progress */}
      {progress && (
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center gap-2">
            {importing && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>}
            <span className="font-medium">{progress}</span>
          </div>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="mb-6 grid md:grid-cols-2 gap-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-bold text-green-800 mb-2">Malaysia Import:</h3>
            <div className="text-green-700 space-y-1">
              <div>Processed: {stats.malaysia.processed}</div>
              <div>Inserted: {stats.malaysia.inserted}</div>
              <div>Errors: {stats.malaysia.errors}</div>
            </div>
          </div>
          
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-bold text-blue-800 mb-2">Thailand Import:</h3>
            <div className="text-blue-700 space-y-1">
              <div>Processed: {stats.thailand.processed}</div>
              <div>Inserted: {stats.thailand.inserted}</div>
              <div>Errors: {stats.thailand.errors}</div>
            </div>
          </div>
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg max-h-40 overflow-y-auto">
          <h3 className="font-bold text-red-800 mb-2">Errors ({errors.length}):</h3>
          <div className="text-red-700 text-sm space-y-1">
            {errors.map((error, i) => (
              <div key={i}>{error}</div>
            ))}
          </div>
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-3">
        <button
          onClick={importData}
          disabled={importing || (!malaysiaFile && !thailandFile)}
          className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400 font-medium"
        >
          {importing ? 'Importing...' : `📥 Import ${fullImport ? 'All Records (1,105 total)' : '10 Test Records'}`}
        </button>

        <button
          onClick={clearDatabase}
          disabled={importing}
          className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-400 font-medium"
        >
          🗑️ Clear Database
        </button>
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <p><strong>Ready to Import:</strong> The column mapping has been corrected based on your actual Excel files. Start with Test Mode to verify, then do Full Import.</p>
      </div>
    </div>
  )
}