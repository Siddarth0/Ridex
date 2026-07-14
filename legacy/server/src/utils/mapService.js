const axios = require("axios")
const logger = require("./logger")

class MapService {
  constructor() {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY || "AIzaSyDummyGoogleMapsAPIKey12345"
    this.baseUrl = "https://maps.googleapis.com/maps/api"
  }

  // Calculate distance and duration between two points
  async calculateRoute(origin, destination, mode = "driving") {
    try {
      const originStr = `${origin.lat},${origin.lng}`
      const destinationStr = `${destination.lat},${destination.lng}`

      const response = await axios.get(`${this.baseUrl}/directions/json`, {
        params: {
          origin: originStr,
          destination: destinationStr,
          mode,
          key: this.apiKey,
          traffic_model: "best_guess",
          departure_time: "now",
        },
      })

      if (response.data.status !== "OK") {
        throw new Error(`Google Maps API error: ${response.data.status}`)
      }

      const route = response.data.routes[0]
      const leg = route.legs[0]

      const result = {
        distance: {
          text: leg.distance.text,
          value: leg.distance.value, // in meters
          km: Math.round((leg.distance.value / 1000) * 100) / 100,
        },
        duration: {
          text: leg.duration.text,
          value: leg.duration.value, // in seconds
          minutes: Math.round(leg.duration.value / 60),
        },
        polyline: route.overview_polyline.points,
        steps: leg.steps.map((step) => ({
          instruction: step.html_instructions.replace(/<[^>]*>/g, ""),
          distance: step.distance.text,
          duration: step.duration.text,
          startLocation: step.start_location,
          endLocation: step.end_location,
        })),
      }

      logger.info("Route calculated", {
        origin: originStr,
        destination: destinationStr,
        distance: result.distance.km,
        duration: result.duration.minutes,
      })

      return {
        success: true,
        route: result,
      }
    } catch (error) {
      logger.error("Route calculation failed", error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  // Get address from coordinates (reverse geocoding)
  async reverseGeocode(lat, lng) {
    try {
      const response = await axios.get(`${this.baseUrl}/geocode/json`, {
        params: {
          latlng: `${lat},${lng}`,
          key: this.apiKey,
        },
      })

      if (response.data.status !== "OK") {
        throw new Error(`Geocoding API error: ${response.data.status}`)
      }

      const result = response.data.results[0]

      return {
        success: true,
        address: {
          formatted: result.formatted_address,
          components: result.address_components,
          placeId: result.place_id,
        },
      }
    } catch (error) {
      logger.error("Reverse geocoding failed", error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  // Get coordinates from address (geocoding)
  async geocode(address) {
    try {
      const response = await axios.get(`${this.baseUrl}/geocode/json`, {
        params: {
          address,
          key: this.apiKey,
        },
      })

      if (response.data.status !== "OK") {
        throw new Error(`Geocoding API error: ${response.data.status}`)
      }

      const result = response.data.results[0]

      return {
        success: true,
        location: {
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
          formatted_address: result.formatted_address,
          placeId: result.place_id,
        },
      }
    } catch (error) {
      logger.error("Geocoding failed", error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  // Calculate ETA with traffic
  async calculateETA(origin, destination) {
    try {
      const routeResult = await this.calculateRoute(origin, destination)

      if (!routeResult.success) {
        return routeResult
      }

      const eta = new Date(Date.now() + routeResult.route.duration.value * 1000)

      return {
        success: true,
        eta: {
          timestamp: eta,
          minutes: routeResult.route.duration.minutes,
          text: routeResult.route.duration.text,
        },
      }
    } catch (error) {
      logger.error("ETA calculation failed", error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  // Find nearby places (gas stations, restaurants, etc.)
  async findNearbyPlaces(lat, lng, type = "gas_station", radius = 5000) {
    try {
      const response = await axios.get(`${this.baseUrl}/place/nearbysearch/json`, {
        params: {
          location: `${lat},${lng}`,
          radius,
          type,
          key: this.apiKey,
        },
      })

      if (response.data.status !== "OK") {
        throw new Error(`Places API error: ${response.data.status}`)
      }

      const places = response.data.results.map((place) => ({
        name: place.name,
        placeId: place.place_id,
        location: place.geometry.location,
        rating: place.rating,
        vicinity: place.vicinity,
        types: place.types,
      }))

      return {
        success: true,
        places,
      }
    } catch (error) {
      logger.error("Nearby places search failed", error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  // Validate coordinates
  isValidCoordinates(lat, lng) {
    return typeof lat === "number" && typeof lng === "number" && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
  }

  // Calculate straight-line distance between two points (Haversine formula)
  calculateStraightLineDistance(lat1, lng1, lat2, lng2) {
    const R = 6371 // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1)
    const dLng = this.toRadians(lng2 - lng1)

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distance = R * c

    return Math.round(distance * 100) / 100 // Round to 2 decimal places
  }

  toRadians(degrees) {
    return degrees * (Math.PI / 180)
  }
}

module.exports = new MapService()
