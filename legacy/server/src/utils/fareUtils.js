import Ride from "../models/Ride.js"
// Note: PromoCode model referenced but not present; keeping placeholder comment.

// Base fare calculation utility
const calculateFare = (distance, duration, rideType = "standard") => {
  const baseFare = Number.parseFloat(process.env.BASE_FARE) || 2.5
  const pricePerKm = Number.parseFloat(process.env.PRICE_PER_KM) || 1.2
  const pricePerMinute = Number.parseFloat(process.env.PRICE_PER_MINUTE) || 0.25

  // Base calculation
  let fare = baseFare + distance * pricePerKm + duration * pricePerMinute

  // Apply ride type multipliers
  const rideTypeMultipliers = {
    standard: 1.0,
    premium: 1.5,
    shared: 0.8,
    motorcycle: 0.7,
    cng: 0.9,
  }

  const multiplier = rideTypeMultipliers[rideType] || 1.0
  fare *= multiplier

  // Minimum fare
  const minimumFare = rideType === "motorcycle" ? 30 : 50

  return Math.max(fare, minimumFare)
}

// Calculate surge pricing multiplier based on demand and supply
const applySurgePrice = async (coordinates) => {
  try {
    const [longitude, latitude] = coordinates
    const radius = 5000 // 5km radius
    const timeWindow = 30 * 60 * 1000 // 30 minutes
    const now = new Date()
    const thirtyMinutesAgo = new Date(now.getTime() - timeWindow)

    // Count recent ride requests in the area
    const recentRides = await Ride.countDocuments({
      "pickup.coordinates": {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [longitude, latitude],
          },
          $maxDistance: radius,
        },
      },
      createdAt: { $gte: thirtyMinutesAgo },
      status: { $in: ["searching", "no-driver"] },
    })

    // Count available drivers in the area (this would require Driver model)
    // For now, we'll use a simple algorithm

    // Base surge calculation
    let surgeMultiplier = 1.0

    // High demand periods (rush hours)
    const hour = now.getHours()
    const isRushHour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)
    const isWeekend = now.getDay() === 0 || now.getDay() === 6

    if (isRushHour && !isWeekend) {
      surgeMultiplier += 0.5
    }

    // Weather-based surge (would need weather API)
    // For now, random factor for demonstration
    const weatherFactor = Math.random() * 0.3 // 0 to 0.3

    // Demand-based surge
    if (recentRides > 10) {
      surgeMultiplier += 0.5
    } else if (recentRides > 5) {
      surgeMultiplier += 0.3
    }

    // Add weather factor
    surgeMultiplier += weatherFactor

    // Cap the surge multiplier
    const maxSurge = Number.parseFloat(process.env.SURGE_MULTIPLIER_MAX) || 3.0
    surgeMultiplier = Math.min(surgeMultiplier, maxSurge)

    // Round to 1 decimal place
    return Math.round(surgeMultiplier * 10) / 10
  } catch (error) {
    console.error("Error calculating surge price:", error)
    return 1.0 // Default to no surge on error
  }
}

// Apply promo code to fare
const applyPromoCode = (fare, promoCode) => {
  if (!promoCode) {
    return { fare, discount: 0 }
  }

  // For demonstration, assume promoCode is a valid object with discount percentage
  const discountPercentage = promoCode.discount || 0
  const discountAmount = fare * (discountPercentage / 100)
  const finalFare = fare - discountAmount

  return { fare: finalFare, discount: discountAmount }
}

// Calculate cancellation fee
const calculateCancellationFee = (rideStatus, cancelledBy, timeElapsed = 0) => {
  // No fee for cancellations before driver acceptance
  if (rideStatus === "searching" || rideStatus === "requested") {
    return 0
  }

  // No fee if driver cancels
  if (cancelledBy === "driver") {
    return 0
  }

  // Rider cancellation fees
  if (cancelledBy === "rider") {
    if (rideStatus === "accepted" && timeElapsed < 2) {
      return 0 // No fee if cancelled within 2 minutes of acceptance
    }

    if (rideStatus === "accepted" || rideStatus === "arrived") {
      return 50 // BDT 50 cancellation fee
    }

    if (rideStatus === "started") {
      return 100 // Higher fee if ride already started
    }
  }

  return 0
}

// Calculate driver earnings from a ride
const calculateDriverEarnings = (totalFare, rideType = "standard") => {
  // Platform commission rates
  const commissionRates = {
    standard: 0.2, // 20%
    premium: 0.15, // 15%
    shared: 0.25, // 25%
    motorcycle: 0.15, // 15%
    cng: 0.2, // 20%
  }

  const commissionRate = commissionRates[rideType] || 0.2
  const platformFee = totalFare * commissionRate
  const driverEarnings = totalFare - platformFee

  return {
    totalFare,
    platformFee: Math.round(platformFee * 100) / 100,
    driverEarnings: Math.round(driverEarnings * 100) / 100,
    commissionRate: commissionRate * 100, // Return as percentage
  }
}

// Calculate estimated fare for ride request
const calculateEstimatedFare = async (distance, duration, rideType, coordinates, promoCode = null) => {
  try {
    // Calculate base fare
    const baseFare = calculateFare(distance, duration, rideType)

    // Apply surge pricing
    const surgeMultiplier = await applySurgePrice(coordinates)
    const fareWithSurge = baseFare * surgeMultiplier

    // Apply promo code if provided
    const { fare: finalFare, discount } = applyPromoCode(fareWithSurge, promoCode)

    return {
      baseFare: Math.round(baseFare * 100) / 100,
      surgeMultiplier,
      fareWithSurge: Math.round(fareWithSurge * 100) / 100,
      discount: Math.round(discount * 100) / 100,
      finalFare: Math.round(finalFare * 100) / 100,
      currency: "BDT",
    }
  } catch (error) {
    console.error("Error calculating estimated fare:", error)
    throw error
  }
}

// Get fare breakdown for completed ride
const getFareBreakdown = (ride) => {
  const breakdown = {
    baseFare: ride.fare.baseFare || 0,
    distanceFare: ride.fare.distanceFare || 0,
    timeFare: ride.fare.timeFare || 0,
    surgeFare: ride.fare.surgeFare || 0,
    tolls: ride.fare.tolls || 0,
    tips: ride.fare.tips || 0,
    discount: ride.fare.discount || 0,
    subtotal: 0,
    total: ride.fare.total || 0,
    currency: ride.fare.currency || "BDT",
  }

  breakdown.subtotal =
    breakdown.baseFare + breakdown.distanceFare + breakdown.timeFare + breakdown.surgeFare + breakdown.tolls

  // Calculate driver earnings
  const earnings = calculateDriverEarnings(breakdown.total, ride.rideType)
  breakdown.driverEarnings = earnings.driverEarnings
  breakdown.platformFee = earnings.platformFee

  return breakdown
}

// Validate fare calculation
const validateFare = (fareData) => {
  const { baseFare, distanceFare, timeFare, total } = fareData

  // Basic validation
  if (total < 0 || baseFare < 0 || distanceFare < 0 || timeFare < 0) {
    return false
  }

  // Check if total is reasonable
  const calculatedTotal = baseFare + distanceFare + timeFare
  const tolerance = 0.01 // 1 cent tolerance

  return Math.abs(total - calculatedTotal) <= tolerance
}

export {
  calculateFare,
  applySurgePrice,
  applyPromoCode,
  calculateDriverEarnings,
  calculateCancellationFee,
  calculateEstimatedFare,
  getFareBreakdown,
  validateFare,
}
