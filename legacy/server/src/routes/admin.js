import express from "express"
import { query, body, validationResult } from "express-validator"
import User from "../models/User.js"
import Driver from "../models/Driver.js"
import Ride from "../models/Ride.js"
import { authorize } from "../middleware/auth.js"
import { asyncHandler, AppError } from "../middleware/errorHandler.js"

const router = express.Router()

// @desc    Get dashboard statistics
// @route   GET /api/admin/dashboard
// @access  Private (Admin only)
router.get(
  "/dashboard",
  authorize("admin"),
  asyncHandler(async (req, res) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    // Get basic counts
    const [totalUsers, totalDrivers, totalRides, activeRides, onlineDrivers, pendingDrivers] = await Promise.all([
      User.countDocuments({ role: "rider", isActive: true }),
      Driver.countDocuments(),
      Ride.countDocuments(),
      Ride.countDocuments({ status: { $in: ["searching", "accepted", "arrived", "started"] } }),
      Driver.countDocuments({ isOnline: true, status: "approved" }),
      Driver.countDocuments({ status: "pending" }),
    ])

    // Get today's statistics
    const todayStats = await Ride.aggregate([
      { $match: { createdAt: { $gte: today } } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          revenue: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, "$fare.total", 0] } },
        },
      },
    ])

    // Get this month's statistics
    const thisMonthStats = await Ride.aggregate([
      { $match: { createdAt: { $gte: thisMonth } } },
      {
        $group: {
          _id: null,
          totalRides: { $sum: 1 },
          completedRides: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
          totalRevenue: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, "$fare.total", 0] } },
          averageFare: { $avg: { $cond: [{ $eq: ["$status", "completed"] }, "$fare.total", null] } },
        },
      },
    ])

    // Get last month's statistics for comparison
    const lastMonthStats = await Ride.aggregate([
      { $match: { createdAt: { $gte: lastMonth, $lt: thisMonth } } },
      {
        $group: {
          _id: null,
          totalRides: { $sum: 1 },
          completedRides: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
          totalRevenue: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, "$fare.total", 0] } },
        },
      },
    ])

    // Calculate growth percentages
    const thisMonth_data = thisMonthStats[0] || { totalRides: 0, completedRides: 0, totalRevenue: 0 }
    const lastMonth_data = lastMonthStats[0] || { totalRides: 0, completedRides: 0, totalRevenue: 0 }

    const rideGrowth =
      lastMonth_data.totalRides > 0
        ? ((thisMonth_data.totalRides - lastMonth_data.totalRides) / lastMonth_data.totalRides) * 100
        : 0

    const revenueGrowth =
      lastMonth_data.totalRevenue > 0
        ? ((thisMonth_data.totalRevenue - lastMonth_data.totalRevenue) / lastMonth_data.totalRevenue) * 100
        : 0

    // Get hourly ride distribution for today
    const hourlyDistribution = await Ride.aggregate([
      { $match: { createdAt: { $gte: today } } },
      {
        $group: {
          _id: { $hour: "$createdAt" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ])

    // Get top performing drivers
    const topDrivers = await Driver.aggregate([
      { $match: { status: "approved" } },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          name: { $concat: ["$user.firstName", " ", "$user.lastName"] },
          totalRides: 1,
          totalEarnings: 1,
          rating: "$rating.average",
          completionRate: {
            $cond: [
              { $gt: ["$totalRides", 0] },
              { $multiply: [{ $divide: ["$completedRides", "$totalRides"] }, 100] },
              100,
            ],
          },
        },
      },
      { $sort: { totalEarnings: -1 } },
      { $limit: 5 },
    ])

    res.json({
      success: true,
      data: {
        overview: {
          totalUsers,
          totalDrivers,
          totalRides,
          activeRides,
          onlineDrivers,
          pendingDrivers,
        },
        today: {
          rides: todayStats.reduce((sum, stat) => sum + stat.count, 0),
          revenue: todayStats.reduce((sum, stat) => sum + stat.revenue, 0),
          completed: todayStats.find((stat) => stat._id === "completed")?.count || 0,
          cancelled: todayStats.find((stat) => stat._id === "cancelled")?.count || 0,
        },
        thisMonth: {
          ...thisMonth_data,
          rideGrowth: Math.round(rideGrowth * 100) / 100,
          revenueGrowth: Math.round(revenueGrowth * 100) / 100,
        },
        charts: {
          hourlyDistribution,
          topDrivers,
        },
      },
    })
  }),
)

// @desc    Get all drivers with filters
// @route   GET /api/admin/drivers
// @access  Private (Admin only)
router.get(
  "/drivers",
  authorize("admin"),
  [
    query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
    query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100"),
    query("status").optional().isIn(["pending", "approved", "rejected", "suspended", "inactive"]),
    query("isOnline").optional().isBoolean(),
    query("search").optional().isString(),
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
    const limit = Number.parseInt(req.query.limit) || 20
    const skip = (page - 1) * limit
    const { status, isOnline, search } = req.query

    // Build query
    const query = {}
    if (status) query.status = status
    if (typeof isOnline === "boolean") query.isOnline = isOnline

    // Build aggregation pipeline
    const pipeline = [
      { $match: query },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
    ]

    // Add search filter
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { "user.firstName": { $regex: search, $options: "i" } },
            { "user.lastName": { $regex: search, $options: "i" } },
            { "user.email": { $regex: search, $options: "i" } },
            { licenseNumber: { $regex: search, $options: "i" } },
            { "vehicle.plateNumber": { $regex: search, $options: "i" } },
          ],
        },
      })
    }

    // Add pagination
    pipeline.push({ $sort: { createdAt: -1 } }, { $skip: skip }, { $limit: limit })

    // Execute aggregation
    const drivers = await Driver.aggregate(pipeline)

    // Get total count for pagination
    const totalPipeline = [...pipeline.slice(0, -3)] // Remove sort, skip, limit
    totalPipeline.push({ $count: "total" })
    const totalResult = await Driver.aggregate(totalPipeline)
    const total = totalResult[0]?.total || 0

    res.json({
      success: true,
      data: {
        drivers,
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

// @desc    Update driver status
// @route   PUT /api/admin/drivers/:id/status
// @access  Private (Admin only)
router.put(
  "/drivers/:id/status",
  authorize("admin"),
  [
    body("status").isIn(["pending", "approved", "rejected", "suspended", "inactive"]).withMessage("Invalid status"),
    body("reason").optional().isString().withMessage("Reason must be a string"),
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

    const { status, reason } = req.body
    const driver = await Driver.findById(req.params.id).populate("userId", "firstName lastName email phone")

    if (!driver) {
      throw new AppError("Driver not found", 404)
    }

    const oldStatus = driver.status
    driver.status = status

    if (status === "approved") {
      driver.approvedDate = new Date()
      driver.approvedBy = req.user._id
    } else if (status === "rejected") {
      driver.rejectionReason = reason
    } else if (status === "suspended") {
      driver.suspensionReason = reason
      driver.suspensionDate = new Date()
      driver.isOnline = false
      driver.isAvailable = false
    }

    await driver.save()

    // Send notification to driver
    req.io.to(`user_${driver.userId._id}`).emit("driver_status_update", {
      status,
      reason,
      message: `Your driver application status has been updated to: ${status}`,
    })

    // Log the status change
    console.log(`Driver ${driver._id} status changed from ${oldStatus} to ${status} by admin ${req.user._id}`)

    res.json({
      success: true,
      message: `Driver status updated to ${status}`,
      data: {
        driver: {
          id: driver._id,
          name: driver.userId.firstName + " " + driver.userId.lastName,
          status: driver.status,
          updatedAt: new Date(),
        },
      },
    })
  }),
)

// @desc    Get all rides with filters
// @route   GET /api/admin/rides
// @access  Private (Admin only)
router.get(
  "/rides",
  authorize("admin"),
  [
    query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
    query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100"),
    query("status").optional().isIn(["searching", "accepted", "arrived", "started", "completed", "cancelled"]),
    query("startDate").optional().isISO8601().withMessage("Invalid start date"),
    query("endDate").optional().isISO8601().withMessage("Invalid end date"),
    query("search").optional().isString(),
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
    const limit = Number.parseInt(req.query.limit) || 20
    const skip = (page - 1) * limit
    const { status, startDate, endDate, search } = req.query

    // Build query
    const query = {}
    if (status) query.status = status
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      }
    }

    // Build aggregation pipeline
    const pipeline = [
      { $match: query },
      {
        $lookup: {
          from: "users",
          localField: "rider",
          foreignField: "_id",
          as: "riderInfo",
        },
      },
      {
        $lookup: {
          from: "drivers",
          localField: "driver",
          foreignField: "_id",
          as: "driverInfo",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "driverInfo.userId",
          foreignField: "_id",
          as: "driverUser",
        },
      },
      { $unwind: { path: "$riderInfo", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$driverInfo", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$driverUser", preserveNullAndEmptyArrays: true } },
    ]

    // Add search filter
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { "riderInfo.firstName": { $regex: search, $options: "i" } },
            { "riderInfo.lastName": { $regex: search, $options: "i" } },
            { "driverUser.firstName": { $regex: search, $options: "i" } },
            { "driverUser.lastName": { $regex: search, $options: "i" } },
            { "pickup.address": { $regex: search, $options: "i" } },
            { "destination.address": { $regex: search, $options: "i" } },
          ],
        },
      })
    }

    // Add pagination
    pipeline.push({ $sort: { createdAt: -1 } }, { $skip: skip }, { $limit: limit })

    // Execute aggregation
    const rides = await Ride.aggregate(pipeline)

    // Get total count for pagination
    const totalPipeline = [...pipeline.slice(0, -3)] // Remove sort, skip, limit
    totalPipeline.push({ $count: "total" })
    const totalResult = await Ride.aggregate(totalPipeline)
    const total = totalResult[0]?.total || 0

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

// @desc    Get analytics data
// @route   GET /api/admin/analytics
// @access  Private (Admin only)
router.get(
  "/analytics",
  authorize("admin"),
  [
    query("period").optional().isIn(["7d", "30d", "90d", "1y"]).withMessage("Invalid period"),
    query("startDate").optional().isISO8601().withMessage("Invalid start date"),
    query("endDate").optional().isISO8601().withMessage("Invalid end date"),
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

    const { period = "30d", startDate, endDate } = req.query

    // Calculate date range
    let dateRange = {}
    const now = new Date()

    if (startDate && endDate) {
      dateRange = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      }
    } else {
      const daysBack = {
        "7d": 7,
        "30d": 30,
        "90d": 90,
        "1y": 365,
      }[period]

      dateRange = {
        createdAt: {
          $gte: new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000),
          $lte: now,
        },
      }
    }

    // Revenue analytics
    const revenueAnalytics = await Ride.aggregate([
      { $match: { status: "completed", ...dateRange } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
          },
          totalRevenue: { $sum: "$fare.total" },
          totalRides: { $sum: 1 },
          averageFare: { $avg: "$fare.total" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ])

    // Ride type distribution
    const rideTypeDistribution = await Ride.aggregate([
      { $match: { status: "completed", ...dateRange } },
      {
        $group: {
          _id: "$rideType",
          count: { $sum: 1 },
          revenue: { $sum: "$fare.total" },
        },
      },
    ])

    // Peak hours analysis
    const peakHours = await Ride.aggregate([
      { $match: dateRange },
      {
        $group: {
          _id: { $hour: "$createdAt" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ])

    // Driver performance
    const driverPerformance = await Driver.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          name: { $concat: ["$user.firstName", " ", "$user.lastName"] },
          totalRides: 1,
          completedRides: 1,
          totalEarnings: 1,
          rating: "$rating.average",
          completionRate: {
            $cond: [
              { $gt: ["$totalRides", 0] },
              { $multiply: [{ $divide: ["$completedRides", "$totalRides"] }, 100] },
              100,
            ],
          },
        },
      },
      { $sort: { totalEarnings: -1 } },
      { $limit: 10 },
    ])

    // Cancellation analysis
    const cancellationAnalysis = await Ride.aggregate([
      { $match: { status: "cancelled", ...dateRange } },
      {
        $group: {
          _id: "$cancellation.cancelledBy",
          count: { $sum: 1 },
          reasons: { $push: "$cancellation.reason" },
        },
      },
    ])

    // Geographic analysis (top pickup/destination areas)
    const geographicAnalysis = await Ride.aggregate([
      { $match: { status: "completed", ...dateRange } },
      {
        $group: {
          _id: {
            pickup: "$pickup.address",
            destination: "$destination.address",
          },
          count: { $sum: 1 },
          totalRevenue: { $sum: "$fare.total" },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ])

    res.json({
      success: true,
      data: {
        period,
        dateRange,
        revenue: revenueAnalytics,
        rideTypes: rideTypeDistribution,
        peakHours,
        topDrivers: driverPerformance,
        cancellations: cancellationAnalysis,
        popularRoutes: geographicAnalysis,
      },
    })
  }),
)

// @desc    Get system health and metrics
// @route   GET /api/admin/system
// @access  Private (Admin only)
router.get(
  "/system",
  authorize("admin"),
  asyncHandler(async (req, res) => {
    // Get database statistics
    const dbStats = await Promise.all([
      User.estimatedDocumentCount(),
      Driver.estimatedDocumentCount(),
      Ride.estimatedDocumentCount(),
    ])

    // Get active connections (this would be from your socket.io instance)
    const activeConnections = req.io.engine.clientsCount

    // Get recent errors (you might want to implement error logging)
    const recentErrors = [] // Placeholder for error logs

    // System metrics
    const systemMetrics = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      nodeVersion: process.version,
      environment: process.env.NODE_ENV,
    }

    res.json({
      success: true,
      data: {
        database: {
          users: dbStats[0],
          drivers: dbStats[1],
          rides: dbStats[2],
        },
        realtime: {
          activeConnections,
          socketRooms: Object.keys(req.io.sockets.adapter.rooms).length,
        },
        system: systemMetrics,
        errors: recentErrors,
        timestamp: new Date(),
      },
    })
  }),
)

export default router
