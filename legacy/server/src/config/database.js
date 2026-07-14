// Database configuration and connection management
// Handles MongoDB connection with retry logic and connection pooling

import mongoose from "mongoose"

const connectDB = async () => {
  try {
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      family: 4, // Use IPv4, skip trying IPv6
      retryWrites: true,
      retryReads: true,
    }

    const conn = await mongoose.connect(process.env.MONGODB_URI, options)

    console.log(`MongoDB Connected: ${conn.connection.host}`)
    console.log(`Database: ${conn.connection.name}`)

    // Connection event listeners
    mongoose.connection.on("connected", () => {
      console.log("Mongoose connected to MongoDB")
    })

    mongoose.connection.on("error", (err) => {
      console.error("Mongoose connection error:", err)
    })

    mongoose.connection.on("disconnected", () => {
      console.log("📴 Mongoose disconnected from MongoDB")
    })

    // Create indexes after connection
    await createIndexes()

    return conn
  } catch (error) {
    console.error("Database connection failed:", error)
    process.exit(1)
  }
}

// Create database indexes for optimal performance
const createIndexes = async () => {
  try {
    const { default: User } = await import("../models/User.js")
    const { default: Driver } = await import("../models/Driver.js")
    const { default: Ride } = await import("../models/Ride.js")

    console.log("🔧 Creating database indexes...")

    // User indexes
    await User.collection.createIndex({ email: 1 }, { unique: true })
    await User.collection.createIndex({ phone: 1 }, { unique: true })
    await User.collection.createIndex({ currentLocation: "2dsphere" })
    await User.collection.createIndex({ role: 1, isActive: 1 })

    // Driver indexes
    await Driver.collection.createIndex({ userId: 1 }, { unique: true })
    await Driver.collection.createIndex({ licenseNumber: 1 }, { unique: true })
    await Driver.collection.createIndex({ "vehicle.plateNumber": 1 }, { unique: true })
    await Driver.collection.createIndex({ currentLocation: "2dsphere" })
    await Driver.collection.createIndex({ status: 1, isOnline: 1, isAvailable: 1 })
    await Driver.collection.createIndex({ "rating.average": -1 })

    // Ride indexes
    await Ride.collection.createIndex({ rider: 1, createdAt: -1 })
    await Ride.collection.createIndex({ driver: 1, createdAt: -1 })
    await Ride.collection.createIndex({ status: 1, createdAt: -1 })
    await Ride.collection.createIndex({ "pickup.coordinates": "2dsphere" })
    await Ride.collection.createIndex({ "destination.coordinates": "2dsphere" })
    await Ride.collection.createIndex({ createdAt: -1 })

    console.log("✅ Database indexes created successfully")
  } catch (error) {
    console.error("Error creating indexes:", error)
  }
}

// Graceful shutdown
const closeDB = async () => {
  try {
    await mongoose.connection.close()
    console.log("📴 Database connection closed")
  } catch (error) {
    console.error("Error closing database connection:", error)
  }
}

export { connectDB, closeDB, createIndexes }
