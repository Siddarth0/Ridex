import Driver from "../models/Driver.js"
import Ride from "../models/Ride.js"
import { AppError } from "../middleware/errorHandler.js"

// @desc    Get driver profile
// @route   GET /api/drivers/profile
// @access  Private (Driver only)
export const getDriverProfile = async (req, res, next) => {
  try {
    const driver = await Driver.findOne({ userId: req.user._id }).populate("userId", "-password")

    if (!driver) {
      throw new AppError("Driver profile not found", 404)
    }

    res.json({
      success: true,
      data: { driver },
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Update driver profile
// @route   PUT /api/drivers/profile
// @access  Private (Driver only)
export const updateDriverProfile = async (req, res, next) => {
  try {
    const driver = await Driver.findOne({ userId: req.user._id })

    if (!driver) {
      throw new AppError("Driver profile not found", 404)
    }

    // Update allowed fields
    const allowedUpdates = ["vehicle", "bankAccount", "mobileWallet", "emergencyContact", "preferences", "workingHours"]

    allowedUpdates.forEach((field) => {
      if (req.body[field]) {
        if (field === "vehicle" && driver.vehicle) {
          // Merge vehicle updates
          driver.vehicle = { ...driver.vehicle.toObject(), ...req.body[field] }
        } else {
          driver[field] = req.body[field]
        }
      }
    })

    await driver.save()

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: { driver },
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Upload driver documents
// @route   POST /api/drivers/documents
// @access  Private (Driver only)
export const uploadDriverDocuments = async (req, res, next) => {
  try {
    const driver = await Driver.findOne({ userId: req.user._id })

    if (!driver) {
      throw new AppError("Driver profile not found", 404)
    }

    const uploadedFiles = {}

    // Upload license images
    if (req.files.licenseImage) {
      const licenseImages = []
      for (const file of req.files.licenseImage) {
        const fileData = {
          filename: `license_${driver._id}_${Date.now()}.${file.mimetype.split("/")[1]}`,
          contentType: file.mimetype,
          data: file.buffer,
          size: file.size,
          uploadedAt: new Date(),
        }
        licenseImages.push(fileData)
      }
      driver.licenseImage = {
        front: licenseImages[0] || driver.licenseImage?.front,
        back: licenseImages[1] || driver.licenseImage?.back,
      }
      uploadedFiles.licenseImage = licenseImages.map((img) => img.filename)
    }

    // Upload vehicle images
    if (req.files.vehicleImages) {
      const vehicleImages = []
      for (const file of req.files.vehicleImages) {
        const fileData = {
          filename: `vehicle_${driver._id}_${Date.now()}.${file.mimetype.split("/")[1]}`,
          contentType: file.mimetype,
          data: file.buffer,
          size: file.size,
          uploadedAt: new Date(),
        }
        vehicleImages.push(fileData)
      }
      driver.vehicle.images = vehicleImages
      uploadedFiles.vehicleImages = vehicleImages.map((img) => img.filename)
    }

    // Upload registration image
    if (req.files.registrationImage) {
      const fileData = {
        filename: `registration_${driver._id}_${Date.now()}.${req.files.registrationImage[0].mimetype.split("/")[1]}`,
        contentType: req.files.registrationImage[0].mimetype,
        data: req.files.registrationImage[0].buffer,
        size: req.files.registrationImage[0].size,
        uploadedAt: new Date(),
      }
      driver.vehicle.registration.image = fileData
      uploadedFiles.registrationImage = fileData.filename
    }

    // Upload insurance image
    if (req.files.insuranceImage) {
      const fileData = {
        filename: `insurance_${driver._id}_${Date.now()}.${req.files.insuranceImage[0].mimetype.split("/")[1]}`,
        contentType: req.files.insuranceImage[0].mimetype,
        data: req.files.insuranceImage[0].buffer,
        size: req.files.insuranceImage[0].size,
        uploadedAt: new Date(),
      }
      driver.vehicle.insurance.image = fileData
      uploadedFiles.insuranceImage = fileData.filename
    }

    // Upload fitness certificate image
    if (req.files.fitnessImage) {
      const fileData = {
        filename: `fitness_${driver._id}_${Date.now()}.${req.files.fitnessImage[0].mimetype.split("/")[1]}`,
        contentType: req.files.fitnessImage[0].mimetype,
        data: req.files.fitnessImage[0].buffer,
        size: req.files.fitnessImage[0].size,
        uploadedAt: new Date(),
      }
      driver.vehicle.fitness.image = fileData
      uploadedFiles.fitnessImage = fileData.filename
    }

    await driver.save()

    res.json({
      success: true,
      message: "Documents uploaded successfully",
      data: { uploadedFiles },
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Get driver earnings
// @route   GET /api/drivers/earnings
// @access  Private (Driver only)
export const getDriverEarnings = async (req, res, next) => {
  try {
    const driver = await Driver.findOne({ userId: req.user._id })

    if (!driver) {
      throw new AppError("Driver profile not found", 404)
    }

    const { period = "month", startDate, endDate } = req.query

    // Calculate date range
    let dateRange = {}
    const now = new Date()

    if (startDate && endDate) {
      dateRange = {
        completedAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      }
    } else {
      switch (period) {
        case "today":
          dateRange = {
            completedAt: {
              $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
              $lte: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
            },
          }
          break
        case "week":
          const weekStart = new Date(now.setDate(now.getDate() - now.getDay()))
          dateRange = {
            completedAt: {
              $gte: weekStart,
              $lte: new Date(),
            },
          }
          break
        case "month":
          dateRange = {
            completedAt: {
              $gte: new Date(now.getFullYear(), now.getMonth(), 1),
              $lte: new Date(now.getFullYear(), now.getMonth() + 1, 0),
            },
          }
          break
        case "year":
          dateRange = {
            completedAt: {
              $gte: new Date(now.getFullYear(), 0, 1),
              $lte: new Date(now.getFullYear() + 1, 0, 0),
            },
          }
          break
      }
    }

    // Get completed rides for the period
    const rides = await Ride.find({
      driver: driver._id,
      status: "completed",
      ...dateRange,
    }).select("fare completedAt route")

    // Calculate earnings
    const totalEarnings = rides.reduce((sum, ride) => sum + (ride.fare.total * 0.8 || 0), 0) // 80% to driver
    const totalRides = rides.length
    const totalDistance = rides.reduce((sum, ride) => sum + (ride.route.distance || 0), 0)
    const averageEarningsPerRide = totalRides > 0 ? totalEarnings / totalRides : 0

    // Group earnings by date for chart data
    const earningsByDate = rides.reduce((acc, ride) => {
      const date = ride.completedAt.toISOString().split("T")[0]
      if (!acc[date]) {
        acc[date] = { earnings: 0, rides: 0 }
      }
      acc[date].earnings += ride.fare.total * 0.8
      acc[date].rides += 1
      return acc
    }, {})

    res.json({
      success: true,
      data: {
        period,
        summary: {
          totalEarnings: Math.round(totalEarnings * 100) / 100,
          totalRides,
          totalDistance: Math.round(totalDistance * 100) / 100,
          averageEarningsPerRide: Math.round(averageEarningsPerRide * 100) / 100,
        },
        earningsByDate,
        rides: rides.slice(0, 10), // Last 10 rides
      },
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Get driver statistics
// @route   GET /api/drivers/stats
// @access  Private (Driver only)
export const getDriverStats = async (req, res, next) => {
  try {
    const driver = await Driver.findOne({ userId: req.user._id })

    if (!driver) {
      throw new AppError("Driver profile not found", 404)
    }

    // Get ride statistics
    const rideStats = await Ride.aggregate([
      { $match: { driver: driver._id } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalEarnings: {
            $sum: {
              $cond: [{ $eq: ["$status", "completed"] }, { $multiply: ["$fare.total", 0.8] }, 0],
            },
          },
        },
      },
    ])

    // Get recent ratings
    const recentRatings = await Ride.find({
      driver: driver._id,
      status: "completed",
      "riderRating.rating": { $exists: true },
    })
      .select("riderRating createdAt")
      .sort({ createdAt: -1 })
      .limit(10)

    // Calculate performance metrics
    const totalRides = rideStats.reduce((sum, stat) => sum + stat.count, 0)
    const completedRides = rideStats.find((stat) => stat._id === "completed")?.count || 0
    const cancelledRides = rideStats.find((stat) => stat._id === "cancelled")?.count || 0

    const completionRate = totalRides > 0 ? (completedRides / totalRides) * 100 : 100
    const cancellationRate = totalRides > 0 ? (cancelledRides / totalRides) * 100 : 0

    res.json({
      success: true,
      data: {
        overview: {
          totalRides: driver.totalRides,
          completedRides: driver.completedRides,
          totalEarnings: driver.totalEarnings,
          rating: driver.rating,
          completionRate: Math.round(completionRate * 100) / 100,
          cancellationRate: Math.round(cancellationRate * 100) / 100,
        },
        rideStats,
        recentRatings,
        verification: driver.verification,
        status: driver.status,
        isOnline: driver.isOnline,
        isAvailable: driver.isAvailable,
      },
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Update driver location
// @route   POST /api/drivers/location
// @access  Private (Driver only)
export const updateDriverLocation = async (req, res, next) => {
  try {
    const { coordinates, heading, speed } = req.body
    const [longitude, latitude] = coordinates

    const driver = await Driver.findOne({ userId: req.user._id })

    if (!driver) {
      throw new AppError("Driver profile not found", 404)
    }

    // Update driver location
    await driver.updateLocation(longitude, latitude)

    // Update user location as well
    await req.user.updateLocation(longitude, latitude)

    // Emit location update to admin and any active rides
    req.io.to("admin_room").emit("driver_location_update", {
      driverId: driver._id,
      location: {
        coordinates,
        heading: heading || 0,
        speed: speed || 0,
        timestamp: new Date(),
      },
    })

    res.json({
      success: true,
      message: "Location updated successfully",
      data: {
        coordinates,
        timestamp: new Date(),
      },
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Update driver status (online/offline)
// @route   POST /api/drivers/status
// @access  Private (Driver only)
export const updateDriverStatus = async (req, res, next) => {
  try {
    const { isOnline, isAvailable } = req.body

    const driver = await Driver.findOne({ userId: req.user._id })

    if (!driver) {
      throw new AppError("Driver profile not found", 404)
    }

    if (driver.status !== "approved") {
      throw new AppError("Driver must be approved to go online", 400)
    }

    // Update status
    if (isOnline) {
      await driver.goOnline()
      if (typeof isAvailable === "boolean") {
        driver.isAvailable = isAvailable
        await driver.save()
      }
    } else {
      await driver.goOffline()
    }

    // Emit status change to admin
    req.io.to("admin_room").emit("driver_status_change", {
      driverId: driver._id,
      driverName: req.user.firstName + " " + req.user.lastName,
      isOnline: driver.isOnline,
      isAvailable: driver.isAvailable,
      timestamp: new Date(),
    })

    res.json({
      success: true,
      message: `Driver is now ${driver.isOnline ? "online" : "offline"}`,
      data: {
        isOnline: driver.isOnline,
        isAvailable: driver.isAvailable,
        lastActiveAt: driver.lastActiveAt,
      },
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Get nearby ride requests
// @route   GET /api/drivers/nearby-rides
// @access  Private (Driver only)
export const getNearbyRides = async (req, res, next) => {
  try {
    const driver = await Driver.findOne({ userId: req.user._id })

    if (!driver) {
      throw new AppError("Driver profile not found", 404)
    }

    if (!driver.isOnline || !driver.isAvailable) {
      return res.json({
        success: true,
        data: { rides: [] },
        message: "Driver is not available for rides",
      })
    }

    const radius = Number.parseInt(req.query.radius) || 5 // Default 5km radius
    const radiusInMeters = radius * 1000

    // Find nearby ride requests
    const nearbyRides = await Ride.find({
      status: "searching",
      "pickup.coordinates": {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: driver.currentLocation.coordinates,
          },
          $maxDistance: radiusInMeters,
        },
      },
    })
      .populate("rider", "firstName lastName avatar averageRating")
      .select("pickup destination estimatedFare surgeMultiplier rideType specialRequests createdAt")
      .sort({ createdAt: 1 })
      .limit(10)

    res.json({
      success: true,
      data: { rides: nearbyRides },
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Get driver's ride history
// @route   GET /api/drivers/rides
// @access  Private (Driver only)
export const getDriverRides = async (req, res, next) => {
  try {
    const driver = await Driver.findOne({ userId: req.user._id })

    if (!driver) {
      throw new AppError("Driver profile not found", 404)
    }

    const page = Number.parseInt(req.query.page) || 1
    const limit = Number.parseInt(req.query.limit) || 10
    const skip = (page - 1) * limit
    const { status } = req.query

    // Build query
    const query = { driver: driver._id }
    if (status && status !== "all") {
      query.status = status
    }

    // Get rides with pagination
    const rides = await Ride.find(query)
      .populate("rider", "firstName lastName avatar averageRating")
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
  } catch (error) {
    next(error)
  }
}
