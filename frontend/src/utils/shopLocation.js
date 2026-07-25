export const HaversineEarthRadiusKm = 6371

export function haversineDistanceKm(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return HaversineEarthRadiusKm * c
}

export function extractCoordinatesFromMapUrl(value) {
  const url = String(value || '').trim()
  if (!url) return null

  const patterns = [
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /[?&](?:q|query|ll|destination|origin)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
    /\/maps\/[^?]*\?[^#]*q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /\/maps\/place\/[^/]*\/(\d+(?:\.\d+)?),(\d+(?:\.\d+)?),/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (!match) continue
    const lat = Number(match[1])
    const lng = Number(match[2])
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) continue
    return { lat, lng }
  }

  return null
}

export function getUserSavedLocation() {
  try {
    const raw = localStorage.getItem('chong_choul_user_location')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const lat = Number(parsed?.lat)
    const lng = Number(parsed?.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
    return { lat, lng, timestamp: Number(parsed?.timestamp) || Date.now() }
  } catch {
    return null
  }
}
