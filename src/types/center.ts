// src/types/center.ts - Updated with Extended Types for Detail Pages

// Base Centre interface (what's in the database)
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
  state_id?: string | null
  city_id?: string | null
  center_type_id: string
  active: boolean
  verified: boolean
  created_at: string
  distance?: number  // Added for location-based sorting
}

// Extended Centre interface with joined relations (for detail pages)
export interface CentreWithRelations extends Centre {
  countries?: {
    id: string
    name: string
    code: string
  } | null
  states?: {
    id: string
    name: string
    code: string
    country_id: string
  } | null
  center_types?: {
    id: string
    name: string
    description: string
  } | null
}

export interface Country {
  id: string
  name: string
  code: string
}

export interface State {
  id: string
  name: string
  code: string
  country_id: string
  created_at?: string
}

export interface CenterType {
  id: string
  name: string
  description: string
}

export interface FilterState {
  country: string
  state: string
  type: string
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