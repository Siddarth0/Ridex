export const errorHandler = (err, req, res, next) => {
  let error = { ...err }
  error.message = err.message

  // Log error
  console.error("Error:", err)

  // Mongoose bad ObjectId
  if (err.name === "CastError") {
    const message = "Resource not found"
    error = { message, statusCode: 404 }
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    let message = "Duplicate field value entered"

    // Extract field name from error
    const field = Object.keys(err.keyValue)[0]
    if (field === "email") {
      message = "Email address is already registered"
    } else if (field === "phone") {
      message = "Phone number is already registered"
    } else if (field === "licenseNumber") {
      message = "License number is already registered"
    } else if (field === "plateNumber") {
      message = "Vehicle plate number is already registered"
    }

    error = { message, statusCode: 400 }
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors)
      .map((val) => val.message)
      .join(", ")
    error = { message, statusCode: 400 }
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    const message = "Invalid token"
    error = { message, statusCode: 401 }
  }

  if (err.name === "TokenExpiredError") {
    const message = "Token expired"
    error = { message, statusCode: 401 }
  }

  // Multer errors (file upload)
  if (err.code === "LIMIT_FILE_SIZE") {
    const message = "File size too large"
    error = { message, statusCode: 400 }
  }

  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    const message = "Unexpected file field"
    error = { message, statusCode: 400 }
  }

  // Payment errors
  if (err.type === "StripeCardError") {
    const message = "Payment failed: " + err.message
    error = { message, statusCode: 400 }
  }

  // Rate limiting errors
  if (err.status === 429) {
    const message = "Too many requests, please try again later"
    error = { message, statusCode: 429 }
  }

  // Default error response
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || "Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  })
}

// Async error handler wrapper
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}

// Custom error class
export class AppError extends Error {
  constructor(message, statusCode) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = true

    Error.captureStackTrace(this, this.constructor)
  }
}

// Not found middleware
export const notFound = (req, res, next) => {
  const error = new AppError(`Not found - ${req.originalUrl}`, 404)
  next(error)
}

// ESM named exports used; no CommonJS exports
