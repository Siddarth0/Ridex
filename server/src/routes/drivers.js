import express from "express"
import { body, validationResult, query } from "express-validator"
import { authorize } from "../middleware/auth.js"
import { asyncHandler } from "../middleware/errorHandler.js"
import multer from "multer"
import {
  getDriverProfile,
  updateDriverProfile,
  uploadDriverDocuments,
  getDriverEarnings,
  getDriverStats,
  updateDriverLocation,
  updateDriverStatus,
  getNearbyRides,
  getDriverRides,
} from "../controllers/driverController.js"

const router = express.Router()

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true)
    } else {
      cb(new Error("Only image files are allowed"), false)
    }
  },
})

// Validation rules
const profileUpdateValidation = [
  body("vehicle.make").optional().notEmpty().withMessage("Vehicle make cannot be empty"),
  body("vehicle.model").optional().notEmpty().withMessage("Vehicle model cannot be empty"),
  body("vehicle.year").optional().isInt({ min: 1990 }).withMessage("Valid vehicle year is required"),
  body("vehicle.color").optional().notEmpty().withMessage("Vehicle color cannot be empty"),
  body("bankAccount.accountNumber").optional().isLength({ min: 10 }).withMessage("Valid account number required"),
  body("emergencyContact.name").optional().notEmpty().withMessage("Emergency contact name required"),
  body("emergencyContact.phone").optional().isMobilePhone().withMessage("Valid emergency contact phone required"),
]

const earningsValidation = [
  query("period").optional().isIn(["today", "week", "month", "year"]).withMessage("Invalid period"),
  query("startDate").optional().isISO8601().withMessage("Invalid start date"),
  query("endDate").optional().isISO8601().withMessage("Invalid end date"),
]

const locationValidation = [
  body("coordinates").isArray({ min: 2, max: 2 }).withMessage("Coordinates must be [longitude, latitude]"),
  body("heading").optional().isNumeric().withMessage("Heading must be a number"),
  body("speed").optional().isNumeric().withMessage("Speed must be a number"),
]

const statusValidation = [
  body("isOnline").isBoolean().withMessage("isOnline must be a boolean"),
  body("isAvailable").optional().isBoolean().withMessage("isAvailable must be a boolean"),
]

const nearbyRidesValidation = [
  query("radius").optional().isInt({ min: 1, max: 50 }).withMessage("Radius must be between 1 and 50 km"),
]

const ridesValidation = [
  query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
  query("limit").optional().isInt({ min: 1, max: 50 }).withMessage("Limit must be between 1 and 50"),
  query("status").optional().isIn(["completed", "cancelled", "all"]),
]

// @desc    Get driver profile
// @route   GET /api/drivers/profile
// @access  Private (Driver only)
router.get("/profile", authorize("driver"), asyncHandler(getDriverProfile))

// @desc    Update driver profile
// @route   PUT /api/drivers/profile
// @access  Private (Driver only)
router.put(
  "/profile",
  authorize("driver"),
  profileUpdateValidation,
  asyncHandler(async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      })
    }
    await updateDriverProfile(req, res, next)
  }),
)

// @desc    Upload driver documents
// @route   POST /api/drivers/documents
// @access  Private (Driver only)
router.post(
  "/documents",
  authorize("driver"),
  upload.fields([
    { name: "licenseImage", maxCount: 2 },
    { name: "vehicleImages", maxCount: 5 },
    { name: "registrationImage", maxCount: 1 },
    { name: "insuranceImage", maxCount: 1 },
    { name: "fitnessImage", maxCount: 1 },
  ]),
  asyncHandler(uploadDriverDocuments),
)

// @desc    Get driver earnings
// @route   GET /api/drivers/earnings
// @access  Private (Driver only)
router.get(
  "/earnings",
  authorize("driver"),
  earningsValidation,
  asyncHandler(async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      })
    }
    await getDriverEarnings(req, res, next)
  }),
)

// @desc    Get driver statistics
// @route   GET /api/drivers/stats
// @access  Private (Driver only)
router.get("/stats", authorize("driver"), asyncHandler(getDriverStats))

// @desc    Update driver location
// @route   POST /api/drivers/location
// @access  Private (Driver only)
router.post(
  "/location",
  authorize("driver"),
  locationValidation,
  asyncHandler(async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      })
    }
    await updateDriverLocation(req, res, next)
  }),
)

// @desc    Update driver status (online/offline)
// @route   POST /api/drivers/status
// @access  Private (Driver only)
router.post(
  "/status",
  authorize("driver"),
  statusValidation,
  asyncHandler(async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      })
    }
    await updateDriverStatus(req, res, next)
  }),
)

// @desc    Get nearby ride requests
// @route   GET /api/drivers/nearby-rides
// @access  Private (Driver only)
router.get("/nearby-rides", authorize("driver"), nearbyRidesValidation, asyncHandler(getNearbyRides))

// @desc    Get driver's ride history
// @route   GET /api/drivers/rides
// @access  Private (Driver only)
router.get(
  "/rides",
  authorize("driver"),
  ridesValidation,
  asyncHandler(async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      })
    }
    await getDriverRides(req, res, next)
  }),
)

export default router
