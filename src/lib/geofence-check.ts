export function getDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000 // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export interface GeofenceResult {
  isWithin: boolean
  distance: number  // meters
  radius: number    // allowed radius meters
}

export async function checkGeofence(): Promise<GeofenceResult | null> {
  try {
    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
      })
    })

    // Fetch branch GPS and geofence radius from API
    const res = await fetch('/api/geofence-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
    })

    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}
