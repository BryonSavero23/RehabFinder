// src/app/api/google-places/search/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { query, latitude, longitude } = await request.json()

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      )
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google Maps API key not configured' },
        { status: 500 }
      )
    }

    // Use Text Search API
    let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`

    // If we have coordinates, search nearby
    if (latitude && longitude) {
      url += `&location=${latitude},${longitude}&radius=5000`
    }

    console.log('🔍 Searching Google Places:', query)

    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`Google Places API error: ${response.status}`)
    }

    const data = await response.json()

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Google Places API error:', data)
      return NextResponse.json(
        { error: `Google Places API error: ${data.status}` },
        { status: 500 }
      )
    }

    // Get detailed information for each result
    const detailedResults = await Promise.all(
      (data.results || []).slice(0, 3).map(async (place: any) => {
        try {
          const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_address,formatted_phone_number,website,geometry,types&key=${apiKey}`
          
          const detailsResponse = await fetch(detailsUrl)
          const detailsData = await detailsResponse.json()

          if (detailsData.status === 'OK') {
            return detailsData.result
          }
          
          return place
        } catch (err) {
          console.error('Error fetching place details:', err)
          return place
        }
      })
    )

    return NextResponse.json({
      results: detailedResults,
      status: data.status
    })

  } catch (error) {
    console.error('Google Places search error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Search failed' },
      { status: 500 }
    )
  }
}