import express from "express"
import { body, validationResult } from "express-validator"
import { asyncHandler } from "../middleware/errorHandler.js"
import multer from "multer"
import {
  getUserProfile,
  updateUserProfile,
  uploadUserAvatar,
  updateUserLocation,
  getUserStats,
  addPaymentMethod,
  removePaymentMethod,
  getUserNotifications,
  markNotificationAsRead,
  updateNotificationPreferences,
} from "../controllers/userController.js"

const router = express.Router()

// Configure multer for avatar uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true)
    } else {
      cb(new Error("Only image files are allowed"), false)
    }
  },
})

// Profile validation
const profileValidation = [
  body("firstName").optional().trim().isLength({ min: 2, max: 50 }).withMessage("First name must be 2-50 characters"),
  body("lastName").optional().trim().isLength({ min: 2, max: 50 }).withMessage("Last name must be 2-50 characters"),
  body("phone").optional().isMobilePhone().withMessage("Please provide a valid phone number"),
  body("dateOfBirth").optional().isISO8601().withMessage("Please provide a valid date of birth"),
  body("gender").optional().isIn(["male", "female", "other", "prefer-not-to-say"]),
  body("homeAddress").optional().isObject(),
  body("workAddress").optional().isObject(),
  body("preferences").optional().isObject(),
  body("emergencyContact").optional().isObject(),
]

const locationValidation = [
  body("coordinates").isArray({ min: 2, max: 2 }).withMessage("Coordinates must be [longitude, latitude]"),
]

const paymentMethodValidation = [
  body("type").isIn(["card", "mobile-banking", "cash"]).withMessage("Invalid payment method type"),
  body("provider").notEmpty().withMessage("Provider is required"),
  body("last4").optional().isLength({ min: 4, max: 4 }).withMessage("Last 4 digits must be exactly 4 characters"),
  body("isDefault").optional().isBoolean(),
]

const notificationPreferencesValidation = [
  body("email").optional().isBoolean(),
  body("sms").optional().isBoolean(),
  body("push").optional().isBoolean(),
]

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
router.get("/profile", asyncHandler(getUserProfile))

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
router.put(
  "/profile",
  profileValidation,
  asyncHandler(async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      })
    }
    await updateUserProfile(req, res, next)
  }),
)

// @desc    Upload user avatar
// @route   POST /api/users/avatar
// @access  Private
router.post("/avatar", upload.single("avatar"), asyncHandler(uploadUserAvatar))

// @desc    Update user location
// @route   POST /api/users/location
// @access  Private
router.post(
  "/location",
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
    await updateUserLocation(req, res, next)
  }),
)

// @desc    Get user's ride statistics
// @route   GET /api/users/stats
// @access  Private
router.get("/stats", asyncHandler(getUserStats))

// @desc    Add payment method
// @route   POST /api/users/payment-methods
// @access  Private
router.post(
  "/payment-methods",
  paymentMethodValidation,
  asyncHandler(async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      })
    }
    await addPaymentMethod(req, res, next)
  }),
)

// @desc    Remove payment method
// @route   DELETE /api/users/payment-methods/:id
// @access  Private
router.delete("/payment-methods/:id", asyncHandler(removePaymentMethod))

// @desc    Get user notifications
// @route   GET /api/users/notifications
// @access  Private
router.get("/notifications", asyncHandler(getUserNotifications))

// @desc    Mark notification as read
// @route   PUT /api/users/notifications/:id/read
// @access  Private
router.put("/notifications/:id/read", asyncHandler(markNotificationAsRead))

// @desc    Update notification preferences
// @route   PUT /api/users/notification-preferences
// @access  Private
router.put(
  "/notification-preferences",
  notificationPreferencesValidation,
  asyncHandler(async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      })
    }
    await updateNotificationPreferences(req, res, next)
  }),
)

export default router
