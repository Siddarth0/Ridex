import mongoose from "mongoose"

const rideSchema = new mongoose.Schema(
  {
    // Ride Participants
    rider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Rider is required"],
    },
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      default: null,
    },

    // Ride Details
    rideType: {
      type: String,
      enum: ["standard", "premium", "shared", "motorcycle", "cng"],
      default: "standard",
    },
    status: {
      type: String,
      enum: [
        "requested", // Ride requested by rider
        "searching", // Looking for driver
        "accepted", // Driver accepted
        "arrived", // Driver arrived at pickup
        "started", // Ride started
        "completed", // Ride completed
        "cancelled", // Ride cancelled
        "no-driver", // No driver found
      ],
      default: "requested",
    },

    // Location Information
    pickup: {
      address: { type: String, required: [true, "Pickup address is required"] },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: [true, "Pickup coordinates are required"],
      },
      landmark: String,
    },
    destination: {
      address: { type: String, required: [true, "Destination address is required"] },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: [true, "Destination coordinates are required"],
      },
      landmark: String,
    },

    // Route Information
    route: {
      distance: { type: Number, default: 0 }, // in kilometers
      duration: { type: Number, default: 0 }, // in minutes
      polyline: String, // Encoded polyline for route
      waypoints: [String], // Additional stops
    },

    // Timing
    requestedAt: { type: Date, default: Date.now },
    acceptedAt: Date,
    arrivedAt: Date,
    startedAt: Date,
    completedAt: Date,
    cancelledAt: Date,

    // Estimated times
    estimatedArrival: Date,
    estimatedDuration: Number, // in minutes
    estimatedFare: Number,

    // Fare Information
    fare: {
      baseFare: { type: Number, default: 0 },
      distanceFare: { type: Number, default: 0 },
      timeFare: { type: Number, default: 0 },
      surgeFare: { type: Number, default: 0 },
      tolls: { type: Number, default: 0 },
      tips: { type: Number, default: 0 },
      discount: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
      currency: { type: String, default: "BDT" },
    },

    // Surge Pricing
    surgeMultiplier: { type: Number, default: 1.0, min: 1.0, max: 5.0 },

    // Payment Information
    payment: {
      method: {
        type: String,
        enum: ["cash", "card", "mobile-banking", "wallet"],
        required: [true, "Payment method is required"],
      },
      status: {
        type: String,
        enum: ["pending", "processing", "completed", "failed", "refunded"],
        default: "pending",
      },
      transactionId: String,
      paidAt: Date,
      refundedAt: Date,
      refundAmount: Number,
    },

    // Promo Code
    promoCode: {
      code: String,
      discount: Number,
      discountType: { type: String, enum: ["percentage", "fixed"] },
    },

    // Driver Tracking
    driverLocation: [
      {
        coordinates: [Number], // [longitude, latitude]
        timestamp: { type: Date, default: Date.now },
        speed: Number, // km/h
        heading: Number, // degrees
      },
    ],

    // Ratings and Reviews
    riderRating: {
      rating: { type: Number, min: 1, max: 5 },
      comment: String,
      ratedAt: Date,
    },
    driverRating: {
      rating: { type: Number, min: 1, max: 5 },
      comment: String,
      ratedAt: Date,
    },

    // Special Requests
    specialRequests: {
      childSeat: { type: Boolean, default: false },
      wheelchairAccessible: { type: Boolean, default: false },
      petFriendly: { type: Boolean, default: false },
      quietRide: { type: Boolean, default: false },
      helpWithLuggage: { type: Boolean, default: false },
      notes: String,
    },

    // Ride Sharing (for shared rides)
    sharedRide: {
      isShared: { type: Boolean, default: false },
      maxPassengers: { type: Number, default: 1 },
      currentPassengers: { type: Number, default: 1 },
      otherRiders: [
        {
          rider: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
          pickup: {
            address: String,
            coordinates: [Number],
          },
          destination: {
            address: String,
            coordinates: [Number],
          },
          fare: Number,
          status: { type: String, enum: ["active", "completed", "cancelled"] },
        },
      ],
    },

    // Issues and Support
    issues: [
      {
        type: {
          type: String,
          enum: ["driver-late", "wrong-route", "unsafe-driving", "vehicle-issue", "payment-issue", "other"],
        },
        description: String,
        reportedBy: { type: String, enum: ["rider", "driver"] },
        reportedAt: { type: Date, default: Date.now },
        status: { type: String, enum: ["open", "investigating", "resolved"], default: "open" },
        resolution: String,
        resolvedAt: Date,
      },
    ],

    // Cancellation Information
    cancellation: {
      cancelledBy: { type: String, enum: ["rider", "driver", "system"] },
      reason: {
        type: String,
        enum: [
          "rider-no-show",
          "driver-no-show",
          "wrong-location",
          "change-of-plans",
          "found-alternative",
          "emergency",
          "vehicle-issue",
          "weather",
          "other",
        ],
      },
      fee: { type: Number, default: 0 },
      description: String,
    },

    // Driver Assignment History
    driverHistory: [
      {
        driver: { type: mongoose.Schema.Types.ObjectId, ref: "Driver" },
        assignedAt: { type: Date, default: Date.now },
        status: { type: String, enum: ["assigned", "declined", "timeout"] },
        declineReason: String,
      },
    ],

    // Metadata
    appVersion: String,
    platform: { type: String, enum: ["ios", "android", "web"] },
    deviceInfo: String,

    // Admin Notes
    adminNotes: [
      {
        note: String,
        addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        addedAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

// Indexes
rideSchema.index({ rider: 1, createdAt: -1 })
rideSchema.index({ driver: 1, createdAt: -1 })
rideSchema.index({ status: 1, createdAt: -1 })
rideSchema.index({ "pickup.coordinates": "2dsphere" })
rideSchema.index({ "destination.coordinates": "2dsphere" })
rideSchema.index({ requestedAt: -1 })
rideSchema.index({ "payment.status": 1 })

// Virtual for ride duration
rideSchema.virtual("actualDuration").get(function () {
  if (this.startedAt && this.completedAt) {
    return Math.round((this.completedAt - this.startedAt) / (1000 * 60)) // in minutes
  }
  return null
})

// Virtual for waiting time
rideSchema.virtual("waitingTime").get(function () {
  if (this.arrivedAt && this.startedAt) {
    return Math.round((this.startedAt - this.arrivedAt) / (1000 * 60)) // in minutes
  }
  return null
})

// Virtual for response time
rideSchema.virtual("responseTime").get(function () {
  if (this.requestedAt && this.acceptedAt) {
    return Math.round((this.acceptedAt - this.requestedAt) / 1000) // in seconds
  }
  return null
})

// Method to calculate fare
rideSchema.methods.calculateFare = function () {
  const baseFare = Number.parseFloat(process.env.BASE_FARE) || 2.5
  const pricePerKm = Number.parseFloat(process.env.PRICE_PER_KM) || 1.2
  const pricePerMinute = Number.parseFloat(process.env.PRICE_PER_MINUTE) || 0.25

  this.fare.baseFare = baseFare
  this.fare.distanceFare = this.route.distance * pricePerKm
  this.fare.timeFare = this.route.duration * pricePerMinute
  this.fare.surgeFare = (this.fare.baseFare + this.fare.distanceFare + this.fare.timeFare) * (this.surgeMultiplier - 1)

  const subtotal =
    this.fare.baseFare + this.fare.distanceFare + this.fare.timeFare + this.fare.surgeFare + this.fare.tolls

  // Apply discount
  if (this.promoCode && this.promoCode.discount) {
    if (this.promoCode.discountType === "percentage") {
      this.fare.discount = subtotal * (this.promoCode.discount / 100)
    } else {
      this.fare.discount = this.promoCode.discount
    }
  }

  this.fare.total = Math.max(0, subtotal - this.fare.discount + this.fare.tips)

  return this.fare.total
}

// Method to update status
rideSchema.methods.updateStatus = function (newStatus, additionalData = {}) {
  this.status = newStatus

  switch (newStatus) {
    case "accepted":
      this.acceptedAt = new Date()
      break
    case "arrived":
      this.arrivedAt = new Date()
      break
    case "started":
      this.startedAt = new Date()
      break
    case "completed":
      this.completedAt = new Date()
      this.calculateFare()
      break
    case "cancelled":
      this.cancelledAt = new Date()
      if (additionalData.cancellation) {
        this.cancellation = additionalData.cancellation
      }
      break
  }

  return this.save()
}

// Method to add driver location
rideSchema.methods.addDriverLocation = function (longitude, latitude, speed = 0, heading = 0) {
  this.driverLocation.push({
    coordinates: [longitude, latitude],
    timestamp: new Date(),
    speed,
    heading,
  })

  // Keep only last 100 location points to avoid document size issues
  if (this.driverLocation.length > 100) {
    this.driverLocation = this.driverLocation.slice(-100)
  }

  return this.save()
}

// Static method to get ride statistics
rideSchema.statics.getStatistics = function (startDate, endDate) {
  const matchStage = {}
  if (startDate && endDate) {
    matchStage.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) }
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalRides: { $sum: 1 },
        completedRides: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
        cancelledRides: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
        totalRevenue: { $sum: "$fare.total" },
        averageFare: { $avg: "$fare.total" },
        averageDistance: { $avg: "$route.distance" },
        averageDuration: { $avg: "$route.duration" },
      },
    },
  ])
}

// Static method to find rides by location
rideSchema.statics.findByLocation = function (longitude, latitude, radius = 5000) {
  return this.find({
    $or: [
      {
        "pickup.coordinates": {
          $near: {
            $geometry: { type: "Point", coordinates: [longitude, latitude] },
            $maxDistance: radius,
          },
        },
      },
      {
        "destination.coordinates": {
          $near: {
            $geometry: { type: "Point", coordinates: [longitude, latitude] },
            $maxDistance: radius,
          },
        },
      },
    ],
  })
}

export default mongoose.model("Ride", rideSchema)
