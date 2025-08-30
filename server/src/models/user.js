import mongoose from "mongoose"
import bcrypt from "bcryptjs"

const userSchema = new mongoose.Schema(
  {
    // Basic Information
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      maxlength: [50, "First name cannot exceed 50 characters"],
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      maxlength: [50, "Last name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Please enter a valid email"],
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      unique: true,
      match: [/^\+?[\d\s-()]+$/, "Please enter a valid phone number"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },

    // Profile Information
    avatar: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "File",
      default: null,
    },
    dateOfBirth: {
      type: Date,
      required: [true, "Date of birth is required"],
    },
    gender: {
      type: String,
      enum: ["male", "female", "other", "prefer-not-to-say"],
      default: "prefer-not-to-say",
    },

    // Account Status
    role: {
      type: String,
      enum: ["rider", "driver", "admin"],
      default: "rider",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },

    // Location Information
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
    homeAddress: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: { type: String, default: "Bangladesh" },
    },
    workAddress: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: { type: String, default: "Bangladesh" },
    },

    // Preferences
    preferences: {
      language: { type: String, default: "en" },
      currency: { type: String, default: "BDT" },
      notifications: {
        email: { type: Boolean, default: true },
        sms: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
      },
      ridePreferences: {
        musicPreference: { type: String, enum: ["no-music", "low-volume", "any"], default: "any" },
        temperaturePreference: { type: String, enum: ["cool", "warm", "any"], default: "any" },
        conversationPreference: { type: String, enum: ["quiet", "friendly", "any"], default: "any" },
      },
    },

    // Security
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    emailVerificationToken: String,
    phoneVerificationCode: String,
    phoneVerificationExpires: Date,

    // Statistics
    totalRides: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    averageRating: { type: Number, default: 5.0, min: 1, max: 5 },

    // Payment Information
    paymentMethods: [
      {
        type: { type: String, enum: ["card", "mobile-banking", "cash"] },
        provider: String, // 'visa', 'mastercard', 'bkash', 'nagad', etc.
        last4: String,
        isDefault: { type: Boolean, default: false },
        isActive: { type: Boolean, default: true },
      },
    ],

    // Emergency Contact
    emergencyContact: {
      name: String,
      phone: String,
      relationship: String,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

// Indexes
userSchema.index({ currentLocation: "2dsphere" })
userSchema.index({ email: 1 })
userSchema.index({ phone: 1 })
userSchema.index({ role: 1, isActive: 1 })

// Virtual for account lock status
userSchema.virtual("isLocked").get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now())
})

userSchema.virtual("avatarUrl").get(function () {
  if (this.avatar && this.populated("avatar")) {
    return `/api/files/${this.avatar.filename}`
  }
  return "/api/files/default-avatar.png" // Default avatar served from database
})

// Pre-save middleware to hash password
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next()

  try {
    const salt = await bcrypt.genSalt(12)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (error) {
    next(error)
  }
})

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false
  return await bcrypt.compare(candidatePassword, this.password)
}

// Method to increment login attempts
userSchema.methods.incLoginAttempts = function () {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 },
    })
  }

  const updates = { $inc: { loginAttempts: 1 } }

  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 } // 2 hours
  }

  return this.updateOne(updates)
}

// Method to reset login attempts
userSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 },
  })
}

// Method to update location
userSchema.methods.updateLocation = function (longitude, latitude) {
  this.currentLocation = {
    type: "Point",
    coordinates: [longitude, latitude],
  }
  return this.save()
}

userSchema.methods.updateAvatar = async function (fileId) {
  this.avatar = fileId
  return this.save()
}

// Static method to find nearby users
userSchema.statics.findNearby = function (longitude, latitude, maxDistance = 10000) {
  return this.find({
    currentLocation: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [longitude, latitude],
        },
        $maxDistance: maxDistance,
      },
    },
    isActive: true,
  })
}

export default mongoose.model("User", userSchema)
