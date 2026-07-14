// Validation middleware using Joi schemas
// Provides request validation for all API endpoints

import { userSchemas, driverSchemas, rideSchemas, adminSchemas } from "../utils/validationSchemas.js"

// Generic validation middleware
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // Return all validation errors
      stripUnknown: true, // Remove unknown fields
    })

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      }))

      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      })
    }

    // Replace req.body with validated and sanitized data
    req.body = value
    next()
  }
}

// Query parameter validation
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    })

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      }))

      return res.status(400).json({
        success: false,
        message: "Query validation failed",
        errors,
      })
    }

    req.query = value
    next()
  }
}

// Specific validation middlewares
const validateUserRegistration = validate(userSchemas.register)
const validateUserLogin = validate(userSchemas.login)
const validateUserUpdate = validate(userSchemas.updateProfile)

const validateDriverRegistration = validate(driverSchemas.register)
const validateDriverVehicleUpdate = validate(driverSchemas.updateVehicle)

const validateRideRequest = validate(rideSchemas.request)
const validateLocationUpdate = validate(rideSchemas.updateLocation)
const validateRating = validate(rideSchemas.rating)

const validateDriverStatusUpdate = validate(adminSchemas.updateDriverStatus)
const validateAnalyticsQuery = validateQuery(adminSchemas.analytics)

export {
  validate,
  validateQuery,
  validateUserRegistration,
  validateUserLogin,
  validateUserUpdate,
  validateDriverRegistration,
  validateDriverVehicleUpdate,
  validateRideRequest,
  validateLocationUpdate,
  validateRating,
  validateDriverStatusUpdate,
  validateAnalyticsQuery,
}
