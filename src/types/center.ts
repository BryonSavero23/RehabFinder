// src/types/center.ts - Shared type definitions
export interface Centre {
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

export interface Country {
  id: string
  name: string
  code: string
}

export interface CenterType {
  id: string
  name: string
  description: string
}

export interface FilterState {
  country: string
  type: string
  accessibility: boolean
  search: string
}

// For Google Maps component compatibility
export interface MapCentre {
  name: string
  address: string
  lat: number
  lng: number
  type: string
  phone?: string
  email?: string
  website?: string
  services?: string
}