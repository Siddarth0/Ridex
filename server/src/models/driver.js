import mongoose from "mongoose"

const driverSchema = new mongoose.Schema(
  {
    // Reference to User
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    // Driver License Information
    licenseNumber: {
      type: String,
      required: [true, "License number is required"],
      unique: true,
    },
    licenseExpiry: {
      type: Date,
      required: [true, "License expiry date is required"],
    },
    licenseImage: {
      front: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "File",
      },
      back: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "File",
      },
    },

    // Vehicle Information
    vehicle: {
      make: { type: String, required: [true, "Vehicle make is required"] },
      model: { type: String, required: [true, "Vehicle model is required"] },
      year: { type: Number, required: [true, "Vehicle year is required"] },
      color: { type: String, required: [true, "Vehicle color is required"] },
      plateNumber: { type: String, required: [true, "Plate number is required"], unique: true },
      type: {
        type: String,
        enum: ["sedan", "suv", "hatchback", "motorcycle", "cng", "rickshaw"],
        required: [true, "Vehicle type is required"],
      },
      capacity: { type: Number, required: [true, "Vehicle capacity is required"], min: 1, max: 8 },
      images: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "File",
        },
      ],

      // Vehicle Documents
      registration: {
        number: String,
        expiry: Date,
        image: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "File",
        },
      },
      insurance: {
        provider: String,
        policyNumber: String,
        expiry: Date,
        image: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "File",
        },
      },
      fitness: {
        certificateNumber: String,
        expiry: Date,
        image: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "File",
        },
      },
    },

    // Driver Status
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "suspended", "inactive"],
      default: "pending",
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    isAvailable: {
      type: Boolean,
      default: false,
    },

    // Location and Service Area
    currentLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0],
      },
    },
    serviceAreas: [
      {
        name: String,
        coordinates: [[Number]], // Polygon coordinates
      },
    ],

    // Performance Metrics
    rating: {
      average: { type: Number, default: 5.0, min: 1, max: 5 },
      count: { type: Number, default: 0 },
    },
    totalRides: { type: Number, default: 0 },
    completedRides: { type: Number, default: 0 },
    cancelledRides: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },

    // Working Hours and Availability
    workingHours: {
      monday: { start: String, end: String, isWorking: { type: Boolean, default: true } },
      tuesday: { start: String, end: String, isWorking: { type: Boolean, default: true } },
      wednesday: { start: String, end: String, isWorking: { type: Boolean, default: true } },
      thursday: { start: String, end: String, isWorking: { type: Boolean, default: true } },
      friday: { start: String, end: String, isWorking: { type: Boolean, default: true } },
      saturday: { start: String, end: String, isWorking: { type: Boolean, default: true } },
      sunday: { start: String, end: String, isWorking: { type: Boolean, default: false } },
    },

    // Financial Information
    bankAccount: {
      accountNumber: String,
      bankName: String,
      accountHolderName: String,
      routingNumber: String,
    },
    mobileWallet: {
      provider: String, // 'bkash', 'nagad', 'rocket'
      accountNumber: String,
    },

    // Background Check
    backgroundCheck: {
      status: { type: String, enum: ["pending", "passed", "failed"], default: "pending" },
      completedAt: Date,
      reportId: String,
    },

    // Training and Certification
    trainingCompleted: {
      type: Boolean,
      default: false,
    },
    trainingCompletedAt: Date,
    certifications: [String],

    // Reviews and Feedback
    recentReviews: [
      {
        rideId: { type: mongoose.Schema.Types.ObjectId, ref: "Ride" },
        rating: { type: Number, min: 1, max: 5 },
        comment: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // Driver Preferences
    preferences: {
      acceptCashPayments: { type: Boolean, default: true },
      acceptLongDistanceRides: { type: Boolean, default: true },
      maxRideDistance: { type: Number, default: 50 }, // in kilometers
      autoAcceptRides: { type: Boolean, default: false },
      preferredRideTypes: [String],
    },

    // Emergency Information
    emergencyContact: {
      name: String,
      phone: String,
      relationship: String,
    },

    // Verification Status
    verification: {
      identity: { type: Boolean, default: false },
      license: { type: Boolean, default: false },
      vehicle: { type: Boolean, default: false },
      insurance: { type: Boolean, default: false },
      backgroundCheck: { type: Boolean, default: false },
    },

    // Application Information
    applicationDate: { type: Date, default: Date.now },
    approvedDate: Date,
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    rejectionReason: String,

    // Activity Tracking
    lastActiveAt: { type: Date, default: Date.now },
    totalOnlineHours: { type: Number, default: 0 },

    // Earnings Summary
    earnings: {
      today: { type: Number, default: 0 },
      thisWeek: { type: Number, default: 0 },
      thisMonth: { type: Number, default: 0 },
      lastPayout: {
        amount: Number,
        date: Date,
        method: String,
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

// Indexes
driverSchema.index({ currentLocation: "2dsphere" })
driverSchema.index({ userId: 1 })
driverSchema.index({ status: 1, isOnline: 1, isAvailable: 1 })
driverSchema.index({ "vehicle.plateNumber": 1 })
driverSchema.index({ licenseNumber: 1 })
driverSchema.index({ rating: -1 })

// Virtual for completion rate
driverSchema.virtual("completionRate").get(function () {
  if (this.totalRides === 0) return 100
  return Math.round((this.completedRides / this.totalRides) * 100)
})

// Virtual for cancellation rate
driverSchema.virtual("cancellationRate").get(function () {
  if (this.totalRides === 0) return 0
  return Math.round((this.cancelledRides / this.totalRides) * 100)
})

// Virtual for verification completion
driverSchema.virtual("verificationComplete").get(function () {
  const verifications = Object.values(this.verification)
  return verifications.every((v) => v === true)
})

driverSchema.virtual("licenseImageUrls").get(function () {
  return {
    front: this.licenseImage?.front
      ? `/api/files/${this.licenseImage.front.filename || this.licenseImage.front}`
      : null,
    back: this.licenseImage?.back ? `/api/files/${this.licenseImage.back.filename || this.licenseImage.back}` : null,
  }
})

driverSchema.virtual("vehicleImageUrls").get(function () {
  if (!this.vehicle?.images) return []
  return this.vehicle.images.map((img) =>
    typeof img === "object" && img.filename ? `/api/files/${img.filename}` : `/api/files/${img}`,
  )
})

// Method to update location
driverSchema.methods.updateLocation = function (longitude, latitude) {
  this.currentLocation = {
    type: "Point",
    coordinates: [longitude, latitude],
  }
  this.lastActiveAt = new Date()
  return this.save()
}

// Method to go online
driverSchema.methods.goOnline = function () {
  this.isOnline = true
  this.isAvailable = true
  this.lastActiveAt = new Date()
  return this.save()
}

// Method to go offline
driverSchema.methods.goOffline = function () {
  this.isOnline = false
  this.isAvailable = false
  return this.save()
}

// Method to update rating
driverSchema.methods.updateRating = function (newRating) {
  const totalRating = this.rating.average * this.rating.count + newRating
  this.rating.count += 1
  this.rating.average = totalRating / this.rating.count
  return this.save()
}

driverSchema.methods.updateLicenseImages = function (frontFileId, backFileId) {
  if (frontFileId) this.licenseImage.front = frontFileId
  if (backFileId) this.licenseImage.back = backFileId
  return this.save()
}

driverSchema.methods.addVehicleImage = function (fileId) {
  if (!this.vehicle.images) this.vehicle.images = []
  this.vehicle.images.push(fileId)
  return this.save()
}

driverSchema.methods.updateDocumentImage = function (documentType, fileId) {
  if (this.vehicle[documentType]) {
    this.vehicle[documentType].image = fileId
  }
  return this.save()
}

// Static method to find nearby available drivers
driverSchema.statics.findNearbyAvailable = function (longitude, latitude, maxDistance = 5000, vehicleType = null) {
  const query = {
    currentLocation: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [longitude, latitude],
        },
        $maxDistance: maxDistance,
      },
    },
    status: "approved",
    isOnline: true,
    isAvailable: true,
  }

  if (vehicleType) {
    query["vehicle.type"] = vehicleType
  }

  return this.find(query).populate("userId", "firstName lastName phone avatar").sort({ "rating.average": -1 })
}

// Static method to get driver statistics
driverSchema.statics.getStatistics = function () {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalDrivers: { $sum: 1 },
        activeDrivers: { $sum: { $cond: [{ $eq: ["$isOnline", true] }, 1, 0] } },
        approvedDrivers: { $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] } },
        pendingDrivers: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
        averageRating: { $avg: "$rating.average" },
        totalRides: { $sum: "$totalRides" },
        totalEarnings: { $sum: "$totalEarnings" },
      },
    },
  ])
}

export default mongoose.model("Driver", driverSchema)
