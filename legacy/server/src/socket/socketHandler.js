import jwt from "jsonwebtoken"
import User from "../models/User.js"
import Driver from "../models/Driver.js"
import Ride from "../models/Ride.js"
import { calculateDistance, calculateETA } from "../utils/locationUtils.js"

// Socket authentication middleware
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token

    if (!token) {
      return next(new Error("Authentication error: No token provided"))
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.userId).select("-password")

    if (!user || !user.isActive) {
      return next(new Error("Authentication error: Invalid user"))
    }

    socket.user = user
    next()
  } catch (error) {
    next(new Error("Authentication error: Invalid token"))
  }
}

const socketHandler = (io) => {
  // Authentication middleware
  io.use(authenticateSocket)

  io.on("connection", async (socket) => {
    console.log(`User connected: ${socket.user.firstName} (${socket.user.role})`)

    // Join user to their personal room
    socket.join(`user_${socket.user._id}`)

    // If user is a driver, join driver room and handle driver-specific events
    if (socket.user.role === "driver") {
      socket.join(`driver_${socket.user._id}`)
      await handleDriverConnection(socket, io)
    }

    // If user is admin, join admin room
    if (socket.user.role === "admin") {
      socket.join("admin_room")
    }

    // Handle location updates
    socket.on("location_update", async (data) => {
      await handleLocationUpdate(socket, data, io)
    })

    // Handle ride-related events
    socket.on("join_ride", (rideId) => {
      socket.join(`ride_${rideId}`)
    })

    socket.on("leave_ride", (rideId) => {
      socket.leave(`ride_${rideId}`)
    })

    // Handle driver status changes
    socket.on("driver_status_change", async (data) => {
      await handleDriverStatusChange(socket, data, io)
    })

    // Handle ride request responses (driver accepting/declining)
    socket.on("ride_response", async (data) => {
      await handleRideResponse(socket, data, io)
    })

    // Handle in-ride messaging
    socket.on("ride_message", async (data) => {
      await handleRideMessage(socket, data, io)
    })

    // Handle emergency alerts
    socket.on("emergency_alert", async (data) => {
      await handleEmergencyAlert(socket, data, io)
    })

    // Handle typing indicators
    socket.on("typing_start", (data) => {
      socket.to(`ride_${data.rideId}`).emit("user_typing", {
        userId: socket.user._id,
        userName: socket.user.firstName,
      })
    })

    socket.on("typing_stop", (data) => {
      socket.to(`ride_${data.rideId}`).emit("user_stopped_typing", {
        userId: socket.user._id,
      })
    })

    // Handle disconnection
    socket.on("disconnect", async () => {
      console.log(`User disconnected: ${socket.user.firstName}`)

      // If driver disconnects, update their status
      if (socket.user.role === "driver") {
        await handleDriverDisconnection(socket)
      }
    })
  })
}

// Handle driver connection and status
const handleDriverConnection = async (socket, io) => {
  try {
    const driver = await Driver.findOne({ userId: socket.user._id })

    if (driver && driver.status === "approved") {
      // Update driver's online status
      driver.lastActiveAt = new Date()
      await driver.save()

      // Notify admin of driver coming online
      io.to("admin_room").emit("driver_online", {
        driverId: driver._id,
        driverName: socket.user.firstName + " " + socket.user.lastName,
        location: driver.currentLocation,
      })
    }
  } catch (error) {
    console.error("Error handling driver connection:", error)
  }
}

// Handle location updates
const handleLocationUpdate = async (socket, data, io) => {
  try {
    const { coordinates, speed, heading } = data

    if (!coordinates || coordinates.length !== 2) {
      return socket.emit("error", { message: "Invalid coordinates" })
    }

    // Update user location
    await socket.user.updateLocation(coordinates[0], coordinates[1])

    // If user is a driver, update driver location and notify relevant parties
    if (socket.user.role === "driver") {
      const driver = await Driver.findOne({ userId: socket.user._id })

      if (driver) {
        await driver.updateLocation(coordinates[0], coordinates[1])

        // Find active rides for this driver
        const activeRides = await Ride.find({
          driver: driver._id,
          status: { $in: ["accepted", "arrived", "started"] },
        })

        // Notify riders of driver location updates
        activeRides.forEach((ride) => {
          io.to(`user_${ride.rider}`).emit("driver_location_update", {
            rideId: ride._id,
            location: {
              coordinates,
              speed: speed || 0,
              heading: heading || 0,
              timestamp: new Date(),
            },
          })
        })

        // Notify admin of driver location
        io.to("admin_room").emit("driver_location_update", {
          driverId: driver._id,
          location: {
            coordinates,
            speed: speed || 0,
            heading: heading || 0,
            timestamp: new Date(),
          },
        })
      }
    }
  } catch (error) {
    console.error("Error handling location update:", error)
    socket.emit("error", { message: "Failed to update location" })
  }
}

// Handle driver status changes (online/offline/available)
const handleDriverStatusChange = async (socket, data, io) => {
  try {
    if (socket.user.role !== "driver") {
      return socket.emit("error", { message: "Only drivers can change status" })
    }

    const { isOnline, isAvailable } = data
    const driver = await Driver.findOne({ userId: socket.user._id })

    if (!driver) {
      return socket.emit("error", { message: "Driver profile not found" })
    }

    if (driver.status !== "approved") {
      return socket.emit("error", { message: "Driver not approved" })
    }

    // Update driver status
    if (typeof isOnline === "boolean") {
      driver.isOnline = isOnline
      if (!isOnline) {
        driver.isAvailable = false // Can't be available if offline
      }
    }

    if (typeof isAvailable === "boolean" && driver.isOnline) {
      driver.isAvailable = isAvailable
    }

    driver.lastActiveAt = new Date()
    await driver.save()

    // Notify admin of status change
    io.to("admin_room").emit("driver_status_change", {
      driverId: driver._id,
      driverName: socket.user.firstName + " " + socket.user.lastName,
      isOnline: driver.isOnline,
      isAvailable: driver.isAvailable,
      timestamp: new Date(),
    })

    // Confirm status change to driver
    socket.emit("status_updated", {
      isOnline: driver.isOnline,
      isAvailable: driver.isAvailable,
    })
  } catch (error) {
    console.error("Error handling driver status change:", error)
    socket.emit("error", { message: "Failed to update status" })
  }
}

// Handle ride request responses from drivers
const handleRideResponse = async (socket, data, io) => {
  try {
    if (socket.user.role !== "driver") {
      return socket.emit("error", { message: "Only drivers can respond to rides" })
    }

    const { rideId, response, declineReason } = data // response: 'accept' or 'decline'

    const ride = await Ride.findById(rideId).populate("rider", "firstName lastName phone")

    if (!ride) {
      return socket.emit("error", { message: "Ride not found" })
    }

    if (ride.status !== "searching") {
      return socket.emit("ride_no_longer_available", { rideId })
    }

    const driver = await Driver.findOne({ userId: socket.user._id })

    if (!driver || !driver.isOnline || !driver.isAvailable) {
      return socket.emit("error", { message: "Driver not available" })
    }

    // Add to driver history
    ride.driverHistory.push({
      driver: driver._id,
      assignedAt: new Date(),
      status: response === "accept" ? "assigned" : "declined",
      declineReason: response === "decline" ? declineReason : undefined,
    })

    if (response === "accept") {
      // Accept the ride
      ride.driver = driver._id
      ride.status = "accepted"
      ride.acceptedAt = new Date()

      // Calculate ETA to pickup
  const distance = calculateDistance(
        driver.currentLocation.coordinates[1],
        driver.currentLocation.coordinates[0],
        ride.pickup.coordinates[1],
        ride.pickup.coordinates[0],
      )
  const eta = calculateETA(distance)
      ride.estimatedArrival = new Date(Date.now() + eta * 60 * 1000)

      await ride.save()

      // Update driver availability
      driver.isAvailable = false
      await driver.save()

      // Notify rider
      io.to(`user_${ride.rider._id}`).emit("ride_accepted", {
        rideId: ride._id,
        driver: {
          id: driver._id,
          name: socket.user.firstName + " " + socket.user.lastName,
          phone: socket.user.phone,
          avatar: socket.user.avatar,
          rating: driver.rating.average,
          vehicle: driver.vehicle,
          location: driver.currentLocation.coordinates,
          estimatedArrival: ride.estimatedArrival,
        },
      })

      // Notify other drivers that ride is no longer available
      socket.broadcast.emit("ride_no_longer_available", { rideId })

      // Notify admin
      io.to("admin_room").emit("ride_accepted", {
        rideId: ride._id,
        driverId: driver._id,
        riderId: ride.rider._id,
      })
    } else if (response === "decline") {
      await ride.save()

      // Just log the decline, ride continues to be available for other drivers
      console.log(`Driver ${driver._id} declined ride ${rideId}: ${declineReason}`)
    }
  } catch (error) {
    console.error("Error handling ride response:", error)
    socket.emit("error", { message: "Failed to process ride response" })
  }
}

// Handle in-ride messaging
const handleRideMessage = async (socket, data, io) => {
  try {
    const { rideId, message, messageType = "text" } = data

    const ride = await Ride.findById(rideId)

    if (!ride) {
      return socket.emit("error", { message: "Ride not found" })
    }

    // Check if user is part of this ride
    const isRider = ride.rider.toString() === socket.user._id.toString()
    const isDriver = ride.driver && ride.driver.toString() === socket.user._id.toString()

    if (!isRider && !isDriver) {
      return socket.emit("error", { message: "Unauthorized to send message" })
    }

    const messageData = {
      rideId,
      senderId: socket.user._id,
      senderName: socket.user.firstName,
      senderRole: socket.user.role,
      message,
      messageType,
      timestamp: new Date(),
    }

    // Send message to all participants in the ride
    io.to(`ride_${rideId}`).emit("ride_message", messageData)

    // Also send to the other party specifically
    if (isRider && ride.driver) {
      const driver = await Driver.findById(ride.driver).populate("userId")
      io.to(`driver_${driver.userId._id}`).emit("ride_message", messageData)
    } else if (isDriver) {
      io.to(`user_${ride.rider}`).emit("ride_message", messageData)
    }
  } catch (error) {
    console.error("Error handling ride message:", error)
    socket.emit("error", { message: "Failed to send message" })
  }
}

// Handle emergency alerts
const handleEmergencyAlert = async (socket, data, io) => {
  try {
    const { rideId, emergencyType, location, message } = data

    const emergencyData = {
      userId: socket.user._id,
      userName: socket.user.firstName + " " + socket.user.lastName,
      userRole: socket.user.role,
      rideId,
      emergencyType,
      location,
      message,
      timestamp: new Date(),
    }

    // Notify all admins immediately
    io.to("admin_room").emit("emergency_alert", emergencyData)

    // If there's a ride involved, notify the other party
    if (rideId) {
      const ride = await Ride.findById(rideId)

      if (ride) {
        const isRider = ride.rider.toString() === socket.user._id.toString()

        if (isRider && ride.driver) {
          const driver = await Driver.findById(ride.driver).populate("userId")
          io.to(`driver_${driver.userId._id}`).emit("emergency_alert", emergencyData)
        } else if (!isRider) {
          io.to(`user_${ride.rider}`).emit("emergency_alert", emergencyData)
        }
      }
    }

    // Log emergency for audit trail
    console.log("EMERGENCY ALERT:", emergencyData)

    // Here you could also trigger external emergency services, SMS alerts, etc.
  } catch (error) {
    console.error("Error handling emergency alert:", error)
    socket.emit("error", { message: "Failed to send emergency alert" })
  }
}

// Handle driver disconnection
const handleDriverDisconnection = async (socket) => {
  try {
    const driver = await Driver.findOne({ userId: socket.user._id })

    if (driver) {
      // Don't automatically set driver offline on disconnect
      // Just update last active time
      driver.lastActiveAt = new Date()
      await driver.save()

      // Notify admin of driver disconnection
      socket.to("admin_room").emit("driver_disconnected", {
        driverId: driver._id,
        driverName: socket.user.firstName + " " + socket.user.lastName,
        lastActiveAt: driver.lastActiveAt,
      })
    }
  } catch (error) {
    console.error("Error handling driver disconnection:", error)
  }
}

// Utility function to broadcast system messages
const broadcastSystemMessage = (io, room, message, data = {}) => {
  io.to(room).emit("system_message", {
    message,
    data,
    timestamp: new Date(),
  })
}

// Utility function to get online users count
const getOnlineUsersCount = (io) => {
  const sockets = io.sockets.sockets
  let riders = 0
  let drivers = 0
  let admins = 0

  sockets.forEach((socket) => {
    if (socket.user) {
      switch (socket.user.role) {
        case "rider":
          riders++
          break
        case "driver":
          drivers++
          break
        case "admin":
          admins++
          break
      }
    }
  })

  return { riders, drivers, admins, total: riders + drivers + admins }
}

export default socketHandler
