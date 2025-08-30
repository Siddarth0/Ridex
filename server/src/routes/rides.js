import express from "express"
import { body, validationResult, query } from "express-validator"
import Ride from "../models/Ride.js"
import Driver from "../models/Driver.js"
import User from "../models/User.js"
import { authorize } from "../middleware/auth.js"
import { asyncHandler, AppError } from "../middleware/errorHandler.js"
import { calculateDistance, calculateETA } from "../utils/locationUtils.js"
import { calculateFare, applySurgePrice } from "../utils/fareUtils.js"
import { sendSMS } from "../utils/smsService.js"

const router = express.Router()

// @route   POST /api/rides/request
// @desc    Request a new ride
// @access  Private (Rider only)
router.post(
  "/request",
  authorize("rider"),
  [
    body("pickup.address").notEmpty().withMessage("Pickup address is required"),
    body("pickup.coordinates")
      .isArray({ min: 2, max: 2 })
      .withMessage("Pickup coordinates must be [longitude, latitude]"),
    body("destination.address").notEmpty().withMessage("Destination address is required"),
    body("destination.coordinates")
      .isArray({ min: 2, max: 2 })
      .withMessage("Destination coordinates must be [longitude, latitude]"),
    body("rideType").optional().isIn(["standard", "premium", "shared", "motorcycle", "cng"]),
    body("paymentMethod")
      .isIn(["cash", "card", "mobile-banking", "wallet"])
      .withMessage("Valid payment method is required"),
    body("specialRequests").optional().isObject(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      })
    }

    const { pickup, destination, rideType = "standard", paymentMethod, specialRequests, promoCode } = req.body

    // Calculate distance and estimated duration
    const distance = calculateDistance(
      pickup.coordinates[1],
      pickup.coordinates[0],
      destination.coordinates[1],
      destination.coordinates[0],
    )

    const estimatedDuration = calculateETA(distance)

    // Calculate base fare
    const baseFare = calculateFare(distance, estimatedDuration, rideType)

    // Apply surge pricing if applicable
    const surgeMultiplier = await applySurgePrice(pickup.coordinates)
    const estimatedFare = baseFare * surgeMultiplier

    // Create ride request
    const ride = await Ride.create({
      rider: req.user._id,
      pickup: {
        address: pickup.address,
        coordinates: pickup.coordinates,
        landmark: pickup.landmark,
      },
      destination: {
        address: destination.address,
        coordinates: destination.coordinates,
        landmark: destination.landmark,
      },
      rideType,
      route: {
        distance,
        duration: estimatedDuration,
      },
      estimatedFare,
      surgeMultiplier,
      payment: {
        method: paymentMethod,
      },
      specialRequests: specialRequests || {},
      promoCode: promoCode || null,
      status: "searching",
    })

    // Find nearby available drivers
    const nearbyDrivers = await Driver.findNearbyAvailable(
      pickup.coordinates[0],
      pickup.coordinates[1],
      5000, // 5km radius
      rideType === "motorcycle" ? "motorcycle" : null,
    )

    if (nearbyDrivers.length === 0) {
      ride.status = "no-driver"
      await ride.save()

      return res.status(200).json({
        success: true,
        message: "No drivers available at the moment. Please try again later.",
        data: {
          ride: {
            id: ride._id,
            status: ride.status,
            estimatedFare,
            surgeMultiplier,
          },
        },
      })
    }

    // Notify nearby drivers via Socket.IO
    nearbyDrivers.forEach((driver) => {
      req.io.to(`driver_${driver.userId}`).emit("ride_request", {
        rideId: ride._id,
        pickup: ride.pickup,
        destination: ride.destination,
        estimatedFare,
        distance,
        estimatedDuration,
        riderInfo: {
          name: req.user.firstName,
          rating: req.user.averageRating,
          phone: req.user.phone,
        },
      })
    })

    res.status(201).json({
      success: true,
      message: "Ride requested successfully. Looking for nearby drivers...",
      data: {
        ride: {
          id: ride._id,
          status: ride.status,
          pickup: ride.pickup,
          destination: ride.destination,
          estimatedFare,
          surgeMultiplier,
          estimatedDuration,
          nearbyDrivers: nearbyDrivers.length,
        },
      },
    })
  }),
)

// @route   POST /api/rides/:id/accept
// @desc    Accept a ride request (Driver)
// @access  Private (Driver only)
router.post(
  "/:id/accept",
  authorize("driver"),
  asyncHandler(async (req, res) => {
    const ride = await Ride.findById(req.params.id).populate("rider", "firstName lastName phone avatar")

    if (!ride) {
      throw new AppError("Ride not found", 404)
    }

    if (ride.status !== "searching") {
      throw new AppError("Ride is no longer available", 400)
    }

    // Get driver information
    const driver = await Driver.findOne({ userId: req.user._id }).populate("userId", "firstName lastName phone avatar")

    if (!driver) {
      throw new AppError("Driver profile not found", 404)
    }

    if (driver.status !== "approved" || !driver.isOnline || !driver.isAvailable) {
      throw new AppError("Driver is not available to accept rides", 400)
    }

    // Update ride with driver information
    ride.driver = driver._id
    ride.status = "accepted"
    ride.acceptedAt = new Date()

    // Calculate ETA to pickup location
    const etaToPickup = calculateETA(
      calculateDistance(
        driver.currentLocation.coordinates[1],
        driver.currentLocation.coordinates[0],
        ride.pickup.coordinates[1],
        ride.pickup.coordinates[0],
      ),
    )

    ride.estimatedArrival = new Date(Date.now() + etaToPickup * 60 * 1000)

    await ride.save()

    // Update driver availability
    driver.isAvailable = false
    await driver.save()

    // Notify rider
    req.io.to(`user_${ride.rider._id}`).emit("ride_accepted", {
      rideId: ride._id,
      driver: {
        id: driver._id,
        name: driver.userId.firstName + " " + driver.userId.lastName,
        phone: driver.userId.phone,
        avatar: driver.userId.avatar,
        rating: driver.rating.average,
        vehicle: driver.vehicle,
        location: driver.currentLocation.coordinates,
        estimatedArrival: ride.estimatedArrival,
      },
    })

    // Notify other drivers that ride is no longer available
    const otherDrivers = await Driver.find({
      _id: { $ne: driver._id },
      status: "approved",
      isOnline: true,
      isAvailable: true,
    })

    otherDrivers.forEach((otherDriver) => {
      req.io.to(`driver_${otherDriver.userId}`).emit("ride_unavailable", {
        rideId: ride._id,
      })
    })

    res.json({
      success: true,
      message: "Ride accepted successfully",
      data: {
        ride: {
          id: ride._id,
          status: ride.status,
          rider: {
            name: ride.rider.firstName + " " + ride.rider.lastName,
            phone: ride.rider.phone,
            avatar: ride.rider.avatar,
          },
          pickup: ride.pickup,
          destination: ride.destination,
          estimatedArrival: ride.estimatedArrival,
          estimatedFare: ride.estimatedFare,
        },
      },
    })
  }),
)

// @route   POST /api/rides/:id/arrived
// @desc    Mark driver as arrived at pickup
// @access  Private (Driver only)
router.post(
  "/:id/arrived",
  authorize("driver"),
  asyncHandler(async (req, res) => {
    const ride = await Ride.findById(req.params.id).populate("rider", "firstName lastName phone")

    if (!ride) {
      throw new AppError("Ride not found", 404)
    }

    const driver = await Driver.findOne({ userId: req.user._id })
    if (!driver || ride.driver.toString() !== driver._id.toString()) {
      throw new AppError("Unauthorized to update this ride", 403)
    }

    if (ride.status !== "accepted") {
      throw new AppError("Invalid ride status for this action", 400)
    }

    ride.status = "arrived"
    ride.arrivedAt = new Date()
    await ride.save()

    // Notify rider
    req.io.to(`user_${ride.rider._id}`).emit("driver_arrived", {
      rideId: ride._id,
      message: "Your driver has arrived at the pickup location",
    })

    // Send SMS notification
    try {
      await sendSMS({
        to: ride.rider.phone,
        message: `Your RideX driver has arrived at the pickup location. Ride ID: ${ride._id}`,
      })
    } catch (error) {
      console.error("Failed to send SMS:", error)
    }

    res.json({
      success: true,
      message: "Arrival confirmed",
      data: {
        ride: {
          id: ride._id,
          status: ride.status,
          arrivedAt: ride.arrivedAt,
        },
      },
    })
  }),
)

// @route   POST /api/rides/:id/start
// @desc    Start the ride
// @access  Private (Driver only)
router.post(
  "/:id/start",
  authorize("driver"),
  asyncHandler(async (req, res) => {
    const ride = await Ride.findById(req.params.id).populate("rider", "firstName lastName phone")

    if (!ride) {
      throw new AppError("Ride not found", 404)
    }

    const driver = await Driver.findOne({ userId: req.user._id })
    if (!driver || ride.driver.toString() !== driver._id.toString()) {
      throw new AppError("Unauthorized to update this ride", 403)
    }

    if (ride.status !== "arrived") {
      throw new AppError("Invalid ride status for this action", 400)
    }

    ride.status = "started"
    ride.startedAt = new Date()
    await ride.save()

    // Notify rider
    req.io.to(`user_${ride.rider._id}`).emit("ride_started", {
      rideId: ride._id,
      message: "Your ride has started",
    })

    res.json({
      success: true,
      message: "Ride started successfully",
      data: {
        ride: {
          id: ride._id,
          status: ride.status,
          startedAt: ride.startedAt,
        },
      },
    })
  }),
)

// @route   POST /api/rides/:id/complete
// @desc    Complete the ride
// @access  Private (Driver only)
router.post(
  "/:id/complete",
  authorize("driver"),
  [
    body("finalLocation").optional().isArray({ min: 2, max: 2 }),
    body("actualDistance").optional().isNumeric(),
    body("actualDuration").optional().isNumeric(),
  ],
  asyncHandler(async (req, res) => {
    const ride = await Ride.findById(req.params.id).populate("rider", "firstName lastName phone")

    if (!ride) {
      throw new AppError("Ride not found", 404)
    }

    const driver = await Driver.findOne({ userId: req.user._id })
    if (!driver || ride.driver.toString() !== driver._id.toString()) {
      throw new AppError("Unauthorized to update this ride", 403)
    }

    if (ride.status !== "started") {
      throw new AppError("Invalid ride status for this action", 400)
    }

    const { finalLocation, actualDistance, actualDuration } = req.body

    // Update ride with actual data
    if (actualDistance) ride.route.distance = actualDistance
    if (actualDuration) ride.route.duration = actualDuration
    if (finalLocation) ride.destination.coordinates = finalLocation

    ride.status = "completed"
    ride.completedAt = new Date()

    // Calculate final fare
    ride.calculateFare()
    await ride.save()

    // Update driver statistics
    driver.totalRides += 1
    driver.completedRides += 1
    driver.totalEarnings += ride.fare.total * 0.8 // 80% to driver, 20% platform fee
    driver.isAvailable = true
    await driver.save()

    // Update rider statistics
    const rider = await User.findById(ride.rider._id)
    rider.totalRides += 1
    rider.totalSpent += ride.fare.total
    await rider.save()

    // Notify rider
    req.io.to(`user_${ride.rider._id}`).emit("ride_completed", {
      rideId: ride._id,
      fare: ride.fare,
      message: "Your ride has been completed",
    })

    res.json({
      success: true,
      message: "Ride completed successfully",
      data: {
        ride: {
          id: ride._id,
          status: ride.status,
          completedAt: ride.completedAt,
          fare: ride.fare,
          actualDuration: ride.actualDuration,
        },
      },
    })
  }),
)

// @route   POST /api/rides/:id/cancel
// @desc    Cancel a ride
// @access  Private
router.post(
  "/:id/cancel",
  [body("reason").notEmpty().withMessage("Cancellation reason is required"), body("description").optional().isString()],
  asyncHandler(async (req, res) => {
    const ride = await Ride.findById(req.params.id)
      .populate("rider", "firstName lastName phone")
      .populate({
        path: "driver",
        populate: {
          path: "userId",
          select: "firstName lastName phone",
        },
      })

    if (!ride) {
      throw new AppError("Ride not found", 404)
    }

    // Check if user is authorized to cancel
    const isRider = ride.rider._id.toString() === req.user._id.toString()
    const isDriver = ride.driver && ride.driver.userId._id.toString() === req.user._id.toString()

    if (!isRider && !isDriver) {
      throw new AppError("Unauthorized to cancel this ride", 403)
    }

    if (["completed", "cancelled"].includes(ride.status)) {
      throw new AppError("Cannot cancel a completed or already cancelled ride", 400)
    }

    const { reason, description } = req.body
    const cancelledBy = isRider ? "rider" : "driver"

    // Calculate cancellation fee
    let cancellationFee = 0
    if (ride.status === "accepted" || ride.status === "arrived") {
      cancellationFee = 50 // BDT 50 cancellation fee
    }

    ride.status = "cancelled"
    ride.cancelledAt = new Date()
    ride.cancellation = {
      cancelledBy,
      reason,
      description,
      fee: cancellationFee,
    }

    await ride.save()

    // Update driver availability if driver was assigned
    if (ride.driver) {
      const driver = await Driver.findById(ride.driver._id)
      if (driver) {
        driver.isAvailable = true
        driver.cancelledRides += 1
        await driver.save()
      }
    }

    // Notify the other party
    const notificationTarget = isRider
      ? ride.driver
        ? `driver_${ride.driver.userId._id}`
        : null
      : `user_${ride.rider._id}`

    if (notificationTarget) {
      req.io.to(notificationTarget).emit("ride_cancelled", {
        rideId: ride._id,
        cancelledBy,
        reason,
        message: `Ride has been cancelled by ${cancelledBy}`,
      })
    }

    res.json({
      success: true,
      message: "Ride cancelled successfully",
      data: {
        ride: {
          id: ride._id,
          status: ride.status,
          cancelledAt: ride.cancelledAt,
          cancellation: ride.cancellation,
        },
      },
    })
  }),
)

// @route   POST /api/rides/:id/rate
// @desc    Rate a ride
// @access  Private
router.post(
  "/:id/rate",
  [
    body("rating").isInt({ min: 1, max: 5 }).withMessage("Rating must be between 1 and 5"),
    body("comment").optional().isString().isLength({ max: 500 }).withMessage("Comment cannot exceed 500 characters"),
  ],
  asyncHandler(async (req, res) => {
    const ride = await Ride.findById(req.params.id)
      .populate("rider", "firstName lastName")
      .populate({
        path: "driver",
        populate: {
          path: "userId",
          select: "firstName lastName",
        },
      })

    if (!ride) {
      throw new AppError("Ride not found", 404)
    }

    if (ride.status !== "completed") {
      throw new AppError("Can only rate completed rides", 400)
    }

    const { rating, comment } = req.body
    const isRider = ride.rider._id.toString() === req.user._id.toString()
    const isDriver = ride.driver && ride.driver.userId._id.toString() === req.user._id.toString()

    if (!isRider && !isDriver) {
      throw new AppError("Unauthorized to rate this ride", 403)
    }

    if (isRider) {
      if (ride.riderRating.rating) {
        throw new AppError("You have already rated this ride", 400)
      }

      ride.riderRating = {
        rating,
        comment: comment || "",
        ratedAt: new Date(),
      }

      // Update driver's rating
      const driver = await Driver.findById(ride.driver._id)
      await driver.updateRating(rating)

      // Add to driver's recent reviews
      driver.recentReviews.unshift({
        rideId: ride._id,
        rating,
        comment: comment || "",
        createdAt: new Date(),
      })

      // Keep only last 10 reviews
      if (driver.recentReviews.length > 10) {
        driver.recentReviews = driver.recentReviews.slice(0, 10)
      }

      await driver.save()
    } else if (isDriver) {
      if (ride.driverRating.rating) {
        throw new AppError("You have already rated this ride", 400)
      }

      ride.driverRating = {
        rating,
        comment: comment || "",
        ratedAt: new Date(),
      }

      // Update rider's rating
      const rider = await User.findById(ride.rider._id)
      const totalRating = rider.averageRating * rider.totalRides + rating
      rider.averageRating = totalRating / (rider.totalRides || 1)
      await rider.save()
    }

    await ride.save()

    res.json({
      success: true,
      message: "Rating submitted successfully",
      data: {
        rating: isRider ? ride.riderRating : ride.driverRating,
      },
    })
  }),
)

// @route   GET /api/rides/:id
// @desc    Get ride details
// @access  Private
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const ride = await Ride.findById(req.params.id)
      .populate("rider", "firstName lastName phone avatar averageRating")
      .populate({
        path: "driver",
        populate: {
          path: "userId",
          select: "firstName lastName phone avatar",
        },
      })

    if (!ride) {
      throw new AppError("Ride not found", 404)
    }

    // Check if user is authorized to view this ride
    const isRider = ride.rider._id.toString() === req.user._id.toString()
    const isDriver = ride.driver && ride.driver.userId._id.toString() === req.user._id.toString()
    const isAdmin = req.user.role === "admin"

    if (!isRider && !isDriver && !isAdmin) {
      throw new AppError("Unauthorized to view this ride", 403)
    }

    res.json({
      success: true,
      data: { ride },
    })
  }),
)

// @route   GET /api/rides/history
// @desc    Get user's ride history
// @access  Private
router.get(
  "/history",
  [
    query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
    query("limit").optional().isInt({ min: 1, max: 50 }).withMessage("Limit must be between 1 and 50"),
    query("status").optional().isIn(["completed", "cancelled", "all"]),
    query("startDate").optional().isISO8601(),
    query("endDate").optional().isISO8601(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      })
    }

    const page = Number.parseInt(req.query.page) || 1
    const limit = Number.parseInt(req.query.limit) || 10
    const skip = (page - 1) * limit
    const { status, startDate, endDate } = req.query

    // Build query
    const query = {}

    if (req.user.role === "rider") {
      query.rider = req.user._id
    } else if (req.user.role === "driver") {
      const driver = await Driver.findOne({ userId: req.user._id })
      if (driver) {
        query.driver = driver._id
      }
    }

    if (status && status !== "all") {
      query.status = status
    }

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      }
    }

    // Get rides with pagination
    const rides = await Ride.find(query)
      .populate("rider", "firstName lastName avatar")
      .populate({
        path: "driver",
        populate: {
          path: "userId",
          select: "firstName lastName avatar",
        },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)

    const total = await Ride.countDocuments(query)

    res.json({
      success: true,
      data: {
        rides,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    })
  }),
)

// @route   POST /api/rides/:id/location
// @desc    Update driver location during ride
// @access  Private (Driver only)
router.post(
  "/:id/location",
  authorize("driver"),
  [
    body("coordinates").isArray({ min: 2, max: 2 }).withMessage("Coordinates must be [longitude, latitude]"),
    body("speed").optional().isNumeric(),
    body("heading").optional().isNumeric(),
  ],
  asyncHandler(async (req, res) => {
    const ride = await Ride.findById(req.params.id)

    if (!ride) {
      throw new AppError("Ride not found", 404)
    }

    const driver = await Driver.findOne({ userId: req.user._id })
    if (!driver || ride.driver.toString() !== driver._id.toString()) {
      throw new AppError("Unauthorized to update this ride", 403)
    }

    if (!["accepted", "arrived", "started"].includes(ride.status)) {
      throw new AppError("Cannot update location for this ride status", 400)
    }

    const { coordinates, speed = 0, heading = 0 } = req.body

    // Update driver location in driver model
    await driver.updateLocation(coordinates[0], coordinates[1])

    // Add location to ride tracking
    await ride.addDriverLocation(coordinates[0], coordinates[1], speed, heading)

    // Emit real-time location update to rider
    req.io.to(`user_${ride.rider}`).emit("driver_location_update", {
      rideId: ride._id,
      location: {
        coordinates,
        speed,
        heading,
        timestamp: new Date(),
      },
    })

    res.json({
      success: true,
      message: "Location updated successfully",
    })
  }),
)

export default router
