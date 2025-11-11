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
  accessibility: boolean  // Keep in database but won't show in UI
  country_id: string
  state_id?: string | null  // NEW: For Malaysian state filtering
  city_id?: string | null
  center_type_id: string
  active: boolean
  verified: boolean
  created_at: string
  distance?: number  // Added for location-based sorting
}

export interface Country {
  id: string
  name: string
  code: string
}

// NEW: State interface for Malaysian states
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

// UPDATED: Removed accessibility, added state
export interface FilterState {
  country: string
  state: string  // NEW: For state filtering
  type: string
  search: string
  // accessibility removed - no longer used in UI
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