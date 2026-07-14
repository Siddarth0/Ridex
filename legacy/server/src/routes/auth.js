import express from "express"
import { body, validationResult } from "express-validator"
import { authenticateToken, sensitiveOperationLimit } from "../middleware/auth.js"
import { asyncHandler } from "../middleware/errorHandler.js"
import {
  registerUser,
  loginUser,
  registerDriver,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  getCurrentUser,
  logoutUser,
} from "../controllers/authController.js"

const router = express.Router()

// Validation rules
const registerValidation = [
  body("firstName").trim().isLength({ min: 2, max: 50 }).withMessage("First name must be 2-50 characters"),
  body("lastName").trim().isLength({ min: 2, max: 50 }).withMessage("Last name must be 2-50 characters"),
  body("email").isEmail().normalizeEmail().withMessage("Please provide a valid email"),
  body("phone").isMobilePhone().withMessage("Please provide a valid phone number"),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  body("dateOfBirth").isISO8601().withMessage("Please provide a valid date of birth"),
  body("gender").optional().isIn(["male", "female", "other", "prefer-not-to-say"]),
]

const loginValidation = [
  body("email").isEmail().normalizeEmail().withMessage("Please provide a valid email"),
  body("password").notEmpty().withMessage("Password is required"),
]

const driverRegisterValidation = [
  ...registerValidation,
  body("licenseNumber").notEmpty().withMessage("License number is required"),
  body("licenseExpiry").isISO8601().withMessage("Valid license expiry date is required"),
  body("vehicle.make").notEmpty().withMessage("Vehicle make is required"),
  body("vehicle.model").notEmpty().withMessage("Vehicle model is required"),
  body("vehicle.year")
    .isInt({ min: 1990, max: new Date().getFullYear() + 1 })
    .withMessage("Valid vehicle year is required"),
  body("vehicle.color").notEmpty().withMessage("Vehicle color is required"),
  body("vehicle.plateNumber").notEmpty().withMessage("Plate number is required"),
  body("vehicle.type")
    .isIn(["sedan", "suv", "hatchback", "motorcycle", "cng", "rickshaw"])
    .withMessage("Valid vehicle type is required"),
  body("vehicle.capacity").isInt({ min: 1, max: 8 }).withMessage("Vehicle capacity must be between 1 and 8"),
]

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
router.post(
  "/register",
  registerValidation,
  asyncHandler(async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      })
    }
    await registerUser(req, res, next)
  }),
)

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
router.post(
  "/login",
  loginValidation,
  asyncHandler(async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      })
    }
    await loginUser(req, res, next)
  }),
)

// @desc    Driver registration
// @route   POST /api/auth/driver/register
// @access  Public
router.post(
  "/driver/register",
  driverRegisterValidation,
  asyncHandler(async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      })
    }
    await registerDriver(req, res, next)
  }),
)

// @desc    Verify email
// @route   GET /api/auth/verify-email/:token
// @access  Public
router.get("/verify-email/:token", asyncHandler(verifyEmail))

// @desc    Resend email verification
// @route   POST /api/auth/resend-verification
// @access  Private
router.post("/resend-verification", authenticateToken, asyncHandler(resendVerification))

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
router.post(
  "/forgot-password",
  [body("email").isEmail().normalizeEmail().withMessage("Please provide a valid email")],
  sensitiveOperationLimit(),
  asyncHandler(async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      })
    }
    await forgotPassword(req, res, next)
  }),
)

// @desc    Reset password
// @route   POST /api/auth/reset-password/:token
// @access  Public
router.post(
  "/reset-password/:token",
  [body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters")],
  asyncHandler(async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      })
    }
    await resetPassword(req, res, next)
  }),
)

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
router.get("/me", authenticateToken, asyncHandler(getCurrentUser))

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
router.post("/logout", authenticateToken, asyncHandler(logoutUser))

export default router
