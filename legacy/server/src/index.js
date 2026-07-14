import express from "express"
import mongoose from "mongoose"
import cors from "cors"
import helmet from "helmet"
import morgan from "morgan"
import compression from "compression"
import { createServer } from "http"
import { Server } from "socket.io"
import dotenv from "dotenv"

dotenv.config()

import { errorHandler, notFound } from "./middleware/errorHandler.js"
import { authenticateToken } from "./middleware/auth.js"

import authRoutes from "./routes/auth.js"
import rideRoutes from "./routes/rides.js"
import driverRoutes from "./routes/drivers.js"
import adminRoutes from "./routes/admin.js"
import userRoutes from "./routes/users.js"
import socketHandler from "./socket/socketHandler.js"

// Create Express app
const app = express()
const server = createServer(app)

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
})

// Make io available to routes
app.use((req, res, next) => {
  req.io = io
  next()
})

// Security middleware
app.use(helmet())

// CORS configuration
const allowedOrigins = [
  process.env.FRONTEND_URL || "http://localhost:3000",
  "http://127.0.0.1:3000",
]
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true)
      return callback(new Error(`CORS blocked origin: ${origin}`))
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
    ],
    credentials: true,
  }),
)
// Explicitly handle preflight to avoid opaque failures (use RegExp with Express 5)
app.options(/.*/, cors())

// Compression middleware
app.use(compression())

// Logging middleware
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"))
} else {
  app.use(morgan("combined"))
}

// Rate limiting removed for local/dev

// Body parsing middleware
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true, limit: "10mb" }))

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "RideX API is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: "1.0.0",
  })
})

// Validate essential environment variables early
const validateEnv = () => {
  const required = ["MONGODB_URI", "JWT_SECRET"]
  const missing = required.filter((k) => !process.env[k] || process.env[k].trim() === "")
  if (missing.length) {
    console.error(`Missing required env vars: ${missing.join(", ")}`)
    console.error("Create a .env with MONGODB_URI and JWT_SECRET before starting the server.")
    process.exit(1)
  }
}
validateEnv()

// API Routes
app.use("/api/auth", authRoutes)
app.use("/api/rides", authenticateToken, rideRoutes)
app.use("/api/drivers", authenticateToken, driverRoutes)
app.use("/api/admin", authenticateToken, adminRoutes)
app.use("/api/users", authenticateToken, userRoutes)


// Socket.IO handler
socketHandler(io)

// Error handling middleware
app.use(notFound)
app.use(errorHandler)

// Database connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })

    console.log(`MongoDB Connected: ${conn.connection.host}`)

    // Create indexes
    await createIndexes()
  } catch (error) {
    console.error("Database connection error:", error)
    process.exit(1)
  }
}

import User from "./models/User.js"
import Driver from "./models/Driver.js"
import Ride from "./models/Ride.js"

// Create database indexes
const createIndexes = async () => {
  try {
    // User indexes
    await User.collection.createIndex({ email: 1 }, { unique: true })
    await User.collection.createIndex({ phone: 1 }, { unique: true })
    await User.collection.createIndex({ currentLocation: "2dsphere" })

    // Driver indexes
    await Driver.collection.createIndex({ userId: 1 }, { unique: true })
    await Driver.collection.createIndex({ licenseNumber: 1 }, { unique: true })
    await Driver.collection.createIndex({ "vehicle.plateNumber": 1 }, { unique: true })
    await Driver.collection.createIndex({ currentLocation: "2dsphere" })
    await Driver.collection.createIndex({ status: 1, isOnline: 1, isAvailable: 1 })

    // Ride indexes
    await Ride.collection.createIndex({ rider: 1, createdAt: -1 })
    await Ride.collection.createIndex({ driver: 1, createdAt: -1 })
    await Ride.collection.createIndex({ status: 1, createdAt: -1 })
    await Ride.collection.createIndex({ "pickup.coordinates": "2dsphere" })
    await Ride.collection.createIndex({ "destination.coordinates": "2dsphere" })

  // File indexes removed (File model not present)

    console.log("Database indexes created successfully")
  } catch (error) {
    console.error("Error creating indexes:", error)
  }
}

// Graceful shutdown
const gracefulShutdown = () => {
  console.log("Received shutdown signal, closing server...")

  server.close(() => {
    console.log("HTTP server closed")

    mongoose.connection.close(false, () => {
      console.log("MongoDB connection closed")
      process.exit(0)
    })
  })

  // Force close after 10 seconds
  setTimeout(() => {
    console.error("Could not close connections in time, forcefully shutting down")
    process.exit(1)
  }, 10000)
}

// Handle shutdown signals
process.on("SIGTERM", gracefulShutdown)
process.on("SIGINT", gracefulShutdown)

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error)
  process.exit(1)
})

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason)
  process.exit(1)
})

// Start server
const PORT = process.env.PORT || 8000

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 RideX API Server running on port ${PORT}`)
    console.log(`📱 Socket.IO server ready for real-time connections`)
    console.log(`🌍 Environment: ${process.env.NODE_ENV}`)
    console.log(`📊 Health check: http://localhost:${PORT}/health`)
  })
})

export { app, server, io }
