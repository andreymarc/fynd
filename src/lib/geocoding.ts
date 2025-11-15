// Geocoding utility functions

/**
 * Geocode an address to get latitude and longitude
 * Uses OpenStreetMap Nominatim API (free, no API key required)
 */
export async function geocodeAddress(address: string): Promise<{ latitude: number; longitude: number } | null> {
  if (!address || address.trim() === '') {
    return null
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
      {
        headers: {
          'User-Agent': 'FyndApp/1.0' // Required by Nominatim
        }
      }
    )

    if (!response.ok) {
      throw new Error('Geocoding request failed')
    }

    const data = await response.json()

    if (data && data.length > 0) {
      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon)
      }
    }

    return null
  } catch (error) {
    console.error('Error geocoding address:', error)
    return null
  }
}

/**
 * Reverse geocode coordinates to get an address
 * Uses OpenStreetMap Nominatim API
 */
export async function reverseGeocode(latitude: number, longitude: number): Promise<string> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'FyndApp/1.0'
        }
      }
    )

    if (!response.ok) {
      throw new Error('Reverse geocoding request failed')
    }

    const data = await response.json()

    if (data && data.address) {
      const addr = data.address
      // Build a readable address
      const parts: string[] = []
      
      if (addr.road) parts.push(addr.road)
      if (addr.house_number) parts.push(addr.house_number)
      if (addr.city || addr.town || addr.village) {
        parts.push(addr.city || addr.town || addr.village)
      }
      if (addr.country) parts.push(addr.country)

      return parts.length > 0 ? parts.join(', ') : data.display_name
    }

    return data.display_name || `${latitude}, ${longitude}`
  } catch (error) {
    console.error('Error reverse geocoding:', error)
    return `${latitude}, ${longitude}`
  }
}

