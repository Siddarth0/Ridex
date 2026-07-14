import jwt from "jsonwebtoken"
import User from "../models/User.js"

// Generate JWT token
const generateToken = (userId) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not set in environment")
  }
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  })
}

// Verify JWT token
const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET)
}

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(" ")[1] // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access token is required",
      })
    }

    const decoded = verifyToken(token)
    const user = await User.findById(decoded.userId).select("-password")

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid token - user not found",
      })
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Account is deactivated",
      })
    }

    req.user = user
    next()
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      })
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired",
      })
    }

    console.error("Auth middleware error:", error)
    res.status(500).json({
      success: false,
      message: "Authentication error",
    })
  }
}

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      })
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required roles: ${roles.join(", ")}`,
      })
    }

    next()
  }
}

// Optional authentication (for public endpoints that can benefit from user context)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(" ")[1]

    if (token) {
      const decoded = verifyToken(token)
      const user = await User.findById(decoded.userId).select("-password")

      if (user && user.isActive) {
        req.user = user
      }
    }

    next()
  } catch (error) {
    // Ignore auth errors for optional auth
    next()
  }
}

// Check if user is verified
const requireVerification = (req, res, next) => {
  if (!req.user.isEmailVerified) {
    return res.status(403).json({
      success: false,
      message: "Email verification required",
      code: "EMAIL_NOT_VERIFIED",
    })
  }

  next()
}

// Check if account is not locked
const checkAccountLock = (req, res, next) => {
  if (req.user.isLocked) {
    return res.status(423).json({
      success: false,
      message: "Account is temporarily locked due to multiple failed login attempts",
      lockUntil: req.user.lockUntil,
    })
  }

  next()
}

// Rate limiting for sensitive operations
const sensitiveOperationLimit = (windowMs = 15 * 60 * 1000, max = 5) => {
  const attempts = new Map()

  return (req, res, next) => {
    const key = req.user ? req.user._id.toString() : req.ip
    const now = Date.now()
    const windowStart = now - windowMs

    // Clean old attempts
    if (attempts.has(key)) {
      const userAttempts = attempts.get(key).filter((time) => time > windowStart)
      attempts.set(key, userAttempts)
    }

    const currentAttempts = attempts.get(key) || []

    if (currentAttempts.length >= max) {
      return res.status(429).json({
        success: false,
        message: "Too many attempts. Please try again later.",
        retryAfter: Math.ceil((currentAttempts[0] + windowMs - now) / 1000),
      })
    }

    currentAttempts.push(now)
    attempts.set(key, currentAttempts)

    next()
  }
}

export {
  generateToken,
  verifyToken,
  authenticateToken,
  authorize,
  optionalAuth,
  requireVerification,
  checkAccountLock,
  sensitiveOperationLimit,
}
