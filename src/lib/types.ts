// src/lib/types.ts
export interface Centre {
  id: number
  name: string
  address: string
  latitude: number
  longitude: number
  phone: string
  email: string
  services: string
  type: string
  accessibility: boolean
  website: string
  created_at?: string
}

export interface UserLocation {
  lat: number
  lng: number
}

export interface MapProps {
  centres: Centre[]
  userLocation?: UserLocation
  onCentreSelect?: (centre: Centre) => void
}

export interface FilterState {
  country: string
  type: string
  accessibility: boolean
  search: string
}