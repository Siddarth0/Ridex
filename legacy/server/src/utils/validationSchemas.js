// Validation schemas for request data validation
// Using Joi for comprehensive data validation

import Joi from "joi"

// User validation schemas
const userSchemas = {
  register: Joi.object({
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    phone: Joi.string()
      .pattern(/^\+?[1-9]\d{1,14}$/)
      .required(),
    password: Joi.string()
      .min(8)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .required(),
    dateOfBirth: Joi.date().max("now").required(),
    gender: Joi.string().valid("male", "female", "other", "prefer-not-to-say").optional(),
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),

  updateProfile: Joi.object({
    firstName: Joi.string().min(2).max(50).optional(),
    lastName: Joi.string().min(2).max(50).optional(),
    phone: Joi.string()
      .pattern(/^\+?[1-9]\d{1,14}$/)
      .optional(),
    dateOfBirth: Joi.date().max("now").optional(),
    gender: Joi.string().valid("male", "female", "other", "prefer-not-to-say").optional(),
  }),
}

// Driver validation schemas
const driverSchemas = {
  register: Joi.object({
    // User fields
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    phone: Joi.string()
      .pattern(/^\+?[1-9]\d{1,14}$/)
      .required(),
    password: Joi.string()
      .min(8)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .required(),
    dateOfBirth: Joi.date().max("now").required(),

    // Driver specific fields
    licenseNumber: Joi.string().required(),
    licenseExpiry: Joi.date().greater("now").required(),
    vehicle: Joi.object({
      make: Joi.string().required(),
      model: Joi.string().required(),
      year: Joi.number()
        .integer()
        .min(1990)
        .max(new Date().getFullYear() + 1)
        .required(),
      color: Joi.string().required(),
      plateNumber: Joi.string().required(),
      type: Joi.string().valid("sedan", "suv", "hatchback", "motorcycle", "cng").required(),
    }).required(),
  }),

  updateVehicle: Joi.object({
    make: Joi.string().optional(),
    model: Joi.string().optional(),
    year: Joi.number()
      .integer()
      .min(1990)
      .max(new Date().getFullYear() + 1)
      .optional(),
    color: Joi.string().optional(),
    plateNumber: Joi.string().optional(),
    type: Joi.string().valid("sedan", "suv", "hatchback", "motorcycle", "cng").optional(),
  }),
}

// Ride validation schemas
const rideSchemas = {
  request: Joi.object({
    pickup: Joi.object({
      coordinates: Joi.array().items(Joi.number()).length(2).required(),
      address: Joi.string().required(),
    }).required(),
    destination: Joi.object({
      coordinates: Joi.array().items(Joi.number()).length(2).required(),
      address: Joi.string().required(),
    }).required(),
    rideType: Joi.string().valid("standard", "premium", "shared", "motorcycle").required(),
    paymentMethod: Joi.string().required(),
    specialRequests: Joi.string().max(500).optional(),
  }),

  updateLocation: Joi.object({
    coordinates: Joi.array().items(Joi.number()).length(2).required(),
    heading: Joi.number().min(0).max(360).optional(),
    speed: Joi.number().min(0).optional(),
  }),

  rating: Joi.object({
    rating: Joi.number().integer().min(1).max(5).required(),
    comment: Joi.string().max(500).optional(),
  }),
}

// Admin validation schemas
const adminSchemas = {
  updateDriverStatus: Joi.object({
    status: Joi.string().valid("pending", "approved", "rejected", "suspended", "inactive").required(),
    reason: Joi.string().max(500).optional(),
  }),

  analytics: Joi.object({
    period: Joi.string().valid("7d", "30d", "90d", "1y").optional(),
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional(),
  }),
}

export { userSchemas, driverSchemas, rideSchemas, adminSchemas }
