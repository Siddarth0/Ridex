import crypto from "crypto"
import User from "../models/User.js"
import Driver from "../models/Driver.js"
import { generateToken } from "../middleware/auth.js"
import { AppError } from "../middleware/errorHandler.js"
import { sendEmail } from "../utils/emailService.js"

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res, next) => {
  try {
    const { firstName, lastName, email, phone, password, dateOfBirth, gender } = req.body

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { phone }],
    })

    if (existingUser) {
      const field = existingUser.email === email ? "email" : "phone"
      throw new AppError(`User with this ${field} already exists`, 400)
    }

    // Create user
    const user = await User.create({
      firstName,
      lastName,
      email,
      phone,
      password,
      dateOfBirth,
      gender: gender || "prefer-not-to-say",
    })

    // Generate email verification token
    const emailToken = crypto.randomBytes(32).toString("hex")
    user.emailVerificationToken = emailToken
    await user.save()

    // Send verification email
    try {
      await sendEmail({
        to: user.email,
        subject: "Verify Your RideX Account",
        template: "emailVerification",
        data: {
          name: user.firstName,
          verificationLink: `${process.env.FRONTEND_URL}/verify-email?token=${emailToken}`,
        },
      })
    } catch (error) {
      console.error("Failed to send verification email:", error)
    }

    // Generate token
    const token = generateToken(user._id)

    res.status(201).json({
      success: true,
      message: "Registration successful. Please check your email for verification.",
      data: {
        token,
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
          isPhoneVerified: user.isPhoneVerified,
        },
      },
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body

    // Find user and include password
    const user = await User.findOne({ email }).select("+password")

    if (!user) {
      throw new AppError("Invalid credentials", 401)
    }

    // Check if account is locked
    if (user.isLocked) {
      throw new AppError("Account is temporarily locked due to multiple failed login attempts", 423)
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password)

    if (!isPasswordValid) {
      await user.incLoginAttempts()
      throw new AppError("Invalid credentials", 401)
    }

    // Reset login attempts on successful login
    if (user.loginAttempts > 0) {
      await user.resetLoginAttempts()
    }

    // Generate token
    const token = generateToken(user._id)

    // Update last login
    user.lastActiveAt = new Date()
    await user.save()

    res.json({
      success: true,
      message: "Login successful",
      data: {
        token,
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
          isPhoneVerified: user.isPhoneVerified,
          avatar: user.avatar,
        },
      },
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Driver registration
// @route   POST /api/auth/driver/register
// @access  Public
export const registerDriver = async (req, res, next) => {
  try {
    const { firstName, lastName, email, phone, password, dateOfBirth, gender, licenseNumber, licenseExpiry, vehicle } =
      req.body

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { phone }],
    })

    if (existingUser) {
      const field = existingUser.email === email ? "email" : "phone"
      throw new AppError(`User with this ${field} already exists`, 400)
    }

    // Check if license or plate number already exists
    const existingDriver = await Driver.findOne({
      $or: [{ licenseNumber }, { "vehicle.plateNumber": vehicle.plateNumber }],
    })

    if (existingDriver) {
      const field = existingDriver.licenseNumber === licenseNumber ? "license number" : "plate number"
      throw new AppError(`Driver with this ${field} already exists`, 400)
    }

    // Create user with driver role
    const user = await User.create({
      firstName,
      lastName,
      email,
      phone,
      password,
      dateOfBirth,
      gender: gender || "prefer-not-to-say",
      role: "driver",
    })

    // Create driver profile
    const driver = await Driver.create({
      userId: user._id,
      licenseNumber,
      licenseExpiry: new Date(licenseExpiry),
      vehicle: {
        ...vehicle,
        year: Number.parseInt(vehicle.year),
        capacity: Number.parseInt(vehicle.capacity),
      },
    })

    // Generate email verification token
    const emailToken = crypto.randomBytes(32).toString("hex")
    user.emailVerificationToken = emailToken
    await user.save()

    // Send verification email
    try {
      await sendEmail({
        to: user.email,
        subject: "Welcome to RideX Driver Program",
        template: "driverWelcome",
        data: {
          name: user.firstName,
          verificationLink: `${process.env.FRONTEND_URL}/verify-email?token=${emailToken}`,
        },
      })
    } catch (error) {
      console.error("Failed to send verification email:", error)
    }

    // Generate token
    const token = generateToken(user._id)

    res.status(201).json({
      success: true,
      message: "Driver registration successful. Your application is under review.",
      data: {
        token,
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
          isPhoneVerified: user.isPhoneVerified,
        },
        driver: {
          id: driver._id,
          status: driver.status,
          licenseNumber: driver.licenseNumber,
          vehicle: driver.vehicle,
        },
      },
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Verify email
// @route   GET /api/auth/verify-email/:token
// @access  Public
export const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params

    const user = await User.findOne({ emailVerificationToken: token })

    if (!user) {
      throw new AppError("Invalid or expired verification token", 400)
    }

    user.isEmailVerified = true
    user.emailVerificationToken = undefined
    await user.save()

    res.json({
      success: true,
      message: "Email verified successfully",
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Resend email verification
// @route   POST /api/auth/resend-verification
// @access  Private
export const resendVerification = async (req, res, next) => {
  try {
    if (req.user.isEmailVerified) {
      throw new AppError("Email is already verified", 400)
    }

    // Generate new verification token
    const emailToken = crypto.randomBytes(32).toString("hex")
    req.user.emailVerificationToken = emailToken
    await req.user.save()

    // Send verification email
    await sendEmail({
      to: req.user.email,
      subject: "Verify Your RideX Account",
      template: "emailVerification",
      data: {
        name: req.user.firstName,
        verificationLink: `${process.env.FRONTEND_URL}/verify-email?token=${emailToken}`,
      },
    })

    res.json({
      success: true,
      message: "Verification email sent successfully",
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body

    const user = await User.findOne({ email })

    if (!user) {
      // Don't reveal if user exists or not
      return res.json({
        success: true,
        message: "If an account with that email exists, a password reset link has been sent.",
      })
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex")
    user.passwordResetToken = resetToken
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000 // 10 minutes
    await user.save()

    // Send reset email
    try {
      await sendEmail({
        to: user.email,
        subject: "Password Reset Request",
        template: "passwordReset",
        data: {
          name: user.firstName,
          resetLink: `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`,
        },
      })
    } catch (error) {
      user.passwordResetToken = undefined
      user.passwordResetExpires = undefined
      await user.save()
      throw new AppError("Email could not be sent", 500)
    }

    res.json({
      success: true,
      message: "If an account with that email exists, a password reset link has been sent.",
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Reset password
// @route   POST /api/auth/reset-password/:token
// @access  Public
export const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params
    const { password } = req.body

    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() },
    })

    if (!user) {
      throw new AppError("Invalid or expired reset token", 400)
    }

    // Set new password
    user.password = password
    user.passwordResetToken = undefined
    user.passwordResetExpires = undefined
    user.loginAttempts = 0
    user.lockUntil = undefined
    await user.save()

    // Generate new token
    const authToken = generateToken(user._id)

    res.json({
      success: true,
      message: "Password reset successful",
      data: {
        token: authToken,
      },
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
export const getCurrentUser = async (req, res, next) => {
  try {
    const userData = {
      id: req.user._id,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      email: req.user.email,
      phone: req.user.phone,
      role: req.user.role,
      isEmailVerified: req.user.isEmailVerified,
      isPhoneVerified: req.user.isPhoneVerified,
      avatar: req.user.avatar,
      preferences: req.user.preferences,
    }

    // If user is a driver, include driver information
    if (req.user.role === "driver") {
      const driver = await Driver.findOne({ userId: req.user._id })
      if (driver) {
        userData.driver = {
          id: driver._id,
          status: driver.status,
          isOnline: driver.isOnline,
          isAvailable: driver.isAvailable,
          rating: driver.rating,
          totalRides: driver.totalRides,
          vehicle: driver.vehicle,
        }
      }
    }

    res.json({
      success: true,
      data: userData,
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
export const logoutUser = async (req, res, next) => {
  try {
    // If user is a driver, set them offline
    if (req.user.role === "driver") {
      await Driver.findOneAndUpdate({ userId: req.user._id }, { isOnline: false, isAvailable: false })
    }

    res.json({
      success: true,
      message: "Logged out successfully",
    })
  } catch (error) {
    next(error)
  }
}
