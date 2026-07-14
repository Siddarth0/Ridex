import geolib from "geolib"

/**
 * Calculate distance between two points using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in kilometers
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const distance = geolib.getDistance({ latitude: lat1, longitude: lon1 }, { latitude: lat2, longitude: lon2 })

  return distance / 1000 // Convert meters to kilometers
}

/**
 * Calculate estimated time of arrival based on distance
 * @param {number} distance - Distance in kilometers
 * @param {number} averageSpeed - Average speed in km/h (default: 30)
 * @returns {number} ETA in minutes
 */
const calculateETA = (distance, averageSpeed = 30) => {
  const timeInHours = distance / averageSpeed
  return Math.round(timeInHours * 60) // Convert to minutes
}

/**
 * Find the center point of multiple coordinates
 * @param {Array} coordinates - Array of [longitude, latitude] pairs
 * @returns {Array} Center point as [longitude, latitude]
 */
const getCenterPoint = (coordinates) => {
  if (coordinates.length === 0) return [0, 0]
  if (coordinates.length === 1) return coordinates[0]

  const points = coordinates.map((coord) => ({
    latitude: coord[1],
    longitude: coord[0],
  }))

  const center = geolib.getCenterOfBounds(points)
  return [center.longitude, center.latitude]
}

/**
 * Check if a point is within a polygon
 * @param {Array} point - [longitude, latitude]
 * @param {Array} polygon - Array of [longitude, latitude] pairs forming polygon
 * @returns {boolean} True if point is inside polygon
 */
const isPointInPolygon = (point, polygon) => {
  const polygonPoints = polygon.map((coord) => ({
    latitude: coord[1],
    longitude: coord[0],
  }))

  return geolib.isPointInPolygon({ latitude: point[1], longitude: point[0] }, polygonPoints)
}

/**
 * Get nearby points within a radius
 * @param {Array} centerPoint - [longitude, latitude] of center
 * @param {Array} points - Array of points with coordinates
 * @param {number} radius - Radius in meters
 * @returns {Array} Filtered points within radius
 */
const getPointsWithinRadius = (centerPoint, points, radius) => {
  const center = { latitude: centerPoint[1], longitude: centerPoint[0] }

  return points.filter((point) => {
    const pointCoords = {
      latitude: point.coordinates[1],
      longitude: point.coordinates[0],
    }

    return geolib.isPointWithinRadius(pointCoords, center, radius)
  })
}

/**
 * Calculate bearing between two points
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Bearing in degrees
 */
const calculateBearing = (lat1, lon1, lat2, lon2) => {
  return geolib.getBearing({ latitude: lat1, longitude: lon1 }, { latitude: lat2, longitude: lon2 })
}

/**
 * Get compass direction from bearing
 * @param {number} bearing - Bearing in degrees
 * @returns {string} Compass direction (N, NE, E, SE, S, SW, W, NW)
 */
const getCompassDirection = (bearing) => {
  return geolib.getCompassDirection(bearing)
}

/**
 * Validate coordinates
 * @param {number} latitude - Latitude value
 * @param {number} longitude - Longitude value
 * @returns {boolean} True if coordinates are valid
 */
const validateCoordinates = (latitude, longitude) => {
  return (
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  )
}

/**
 * Convert coordinates to different formats
 * @param {number} latitude - Latitude value
 * @param {number} longitude - Longitude value
 * @returns {Object} Coordinates in different formats
 */
const formatCoordinates = (latitude, longitude) => {
  return {
    decimal: { latitude, longitude },
    dms: geolib.toDecimal(`${latitude}°, ${longitude}°`),
    string: `${latitude}, ${longitude}`,
    array: [longitude, latitude], // GeoJSON format
    mongoArray: [longitude, latitude], // MongoDB GeoJSON format
  }
}

/**
 * Calculate route bounds for multiple points
 * @param {Array} coordinates - Array of [longitude, latitude] pairs
 * @returns {Object} Bounds with northeast and southwest corners
 */
const getRouteBounds = (coordinates) => {
  if (coordinates.length === 0) return null

  const points = coordinates.map((coord) => ({
    latitude: coord[1],
    longitude: coord[0],
  }))

  const bounds = geolib.getBounds(points)

  return {
    northeast: {
      latitude: bounds.maxLat,
      longitude: bounds.maxLng,
    },
    southwest: {
      latitude: bounds.minLat,
      longitude: bounds.minLng,
    },
  }
}

/**
 * Simplify route coordinates (reduce number of points)
 * @param {Array} coordinates - Array of [longitude, latitude] pairs
 * @param {number} tolerance - Simplification tolerance (default: 0.001)
 * @returns {Array} Simplified coordinates array
 */
const simplifyRoute = (coordinates, tolerance = 0.001) => {
  if (coordinates.length <= 2) return coordinates

  // Simple Douglas-Peucker algorithm implementation
  const simplify = (points, tolerance) => {
    if (points.length <= 2) return points

    let maxDistance = 0
    let maxIndex = 0

    for (let i = 1; i < points.length - 1; i++) {
      const distance = perpendicularDistance(points[i], points[0], points[points.length - 1])
      if (distance > maxDistance) {
        maxDistance = distance
        maxIndex = i
      }
    }

    if (maxDistance > tolerance) {
      const left = simplify(points.slice(0, maxIndex + 1), tolerance)
      const right = simplify(points.slice(maxIndex), tolerance)
      return left.slice(0, -1).concat(right)
    } else {
      return [points[0], points[points.length - 1]]
    }
  }

  return simplify(coordinates, tolerance)
}

/**
 * Calculate perpendicular distance from point to line
 * @param {Array} point - [longitude, latitude]
 * @param {Array} lineStart - [longitude, latitude]
 * @param {Array} lineEnd - [longitude, latitude]
 * @returns {number} Distance in degrees
 */
const perpendicularDistance = (point, lineStart, lineEnd) => {
  const [x, y] = point
  const [x1, y1] = lineStart
  const [x2, y2] = lineEnd

  const A = x - x1
  const B = y - y1
  const C = x2 - x1
  const D = y2 - y1

  const dot = A * C + B * D
  const lenSq = C * C + D * D

  if (lenSq === 0) return Math.sqrt(A * A + B * B)

  const param = dot / lenSq

  let xx, yy

  if (param < 0) {
    xx = x1
    yy = y1
  } else if (param > 1) {
    xx = x2
    yy = y2
  } else {
    xx = x1 + param * C
    yy = y1 + param * D
  }

  const dx = x - xx
  const dy = y - yy

  return Math.sqrt(dx * dx + dy * dy)
}

export {
  calculateDistance,
  calculateETA,
  getCenterPoint,
  isPointInPolygon,
  getPointsWithinRadius,
  calculateBearing,
  getCompassDirection,
  validateCoordinates,
  formatCoordinates,
  getRouteBounds,
  simplifyRoute,
  perpendicularDistance,
}
