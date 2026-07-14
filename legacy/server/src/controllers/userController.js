import User from "../models/User.js"
import Ride from "../models/Ride.js"
import { AppError } from "../middleware/errorHandler.js"

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
export const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("-password")

    res.json({
      success: true,
      data: { user },
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
export const updateUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)

    if (!user) {
      throw new AppError("User not found", 404)
    }

    // Update allowed fields
    const allowedUpdates = [
      "firstName",
      "lastName",
      "phone",
      "dateOfBirth",
      "gender",
      "homeAddress",
      "workAddress",
      "preferences",
      "emergencyContact",
    ]

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        user[field] = req.body[field]
      }
    })

    await user.save()

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: { user },
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Upload user avatar
// @route   POST /api/users/avatar
// @access  Private
export const uploadUserAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError("Please upload an image file", 400)
    }

    const user = await User.findById(req.user._id)

    if (!user) {
      throw new AppError("User not found", 404)
    }

    // Store file data in database instead of Cloudinary
    const fileData = {
      filename: `avatar_${user._id}_${Date.now()}.${req.file.mimetype.split("/")[1]}`,
      contentType: req.file.mimetype,
      data: req.file.buffer,
      size: req.file.size,
      uploadedAt: new Date(),
    }

    // Update user avatar with file reference
    user.avatar = {
      filename: fileData.filename,
      contentType: fileData.contentType,
      size: fileData.size,
      uploadedAt: fileData.uploadedAt,
    }

    // Store the actual file data separately (we'll create a File model for this)
    user.avatarData = fileData.data
    await user.save()

    res.json({
      success: true,
      message: "Avatar uploaded successfully",
      data: {
        avatar: user.avatar,
      },
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Update user location
// @route   POST /api/users/location
// @access  Private
export const updateUserLocation = async (req, res, next) => {
  try {
    const { coordinates } = req.body
    const [longitude, latitude] = coordinates

    const user = await User.findById(req.user._id)

    if (!user) {
      throw new AppError("User not found", 404)
    }

    // Update user location
    await user.updateLocation(longitude, latitude)

    res.json({
      success: true,
      message: "Location updated successfully",
      data: {
        coordinates,
        timestamp: new Date(),
      },
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Get user's ride statistics
// @route   GET /api/users/stats
// @access  Private
export const getUserStats = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)

    if (!user) {
      throw new AppError("User not found", 404)
    }

    // Get ride statistics
    const rideStats = await Ride.aggregate([
      { $match: { rider: user._id } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalSpent: {
            $sum: {
              $cond: [{ $eq: ["$status", "completed"] }, "$fare.total", 0],
            },
          },
        },
      },
    ])

    // Get favorite destinations
    const favoriteDestinations = await Ride.aggregate([
      { $match: { rider: user._id, status: "completed" } },
      {
        $group: {
          _id: "$destination.address",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ])

    // Get recent rides
    const recentRides = await Ride.find({ rider: user._id })
      .populate({
        path: "driver",
        populate: {
          path: "userId",
          select: "firstName lastName avatar",
        },
      })
      .select("pickup destination fare status createdAt riderRating")
      .sort({ createdAt: -1 })
      .limit(5)

    // Calculate totals
    const totalRides = rideStats.reduce((sum, stat) => sum + stat.count, 0)
    const completedRides = rideStats.find((stat) => stat._id === "completed")?.count || 0
    const totalSpent = rideStats.reduce((sum, stat) => sum + stat.totalSpent, 0)

    res.json({
      success: true,
      data: {
        overview: {
          totalRides: user.totalRides,
          totalSpent: user.totalSpent,
          averageRating: user.averageRating,
          completedRides,
        },
        rideStats,
        favoriteDestinations,
        recentRides,
      },
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Add payment method
// @route   POST /api/users/payment-methods
// @access  Private
export const addPaymentMethod = async (req, res, next) => {
  try {
    const { type, provider, last4, isDefault = false } = req.body

    const user = await User.findById(req.user._id)

    if (!user) {
      throw new AppError("User not found", 404)
    }

    // If this is set as default, unset other defaults
    if (isDefault) {
      user.paymentMethods.forEach((method) => {
        method.isDefault = false
      })
    }

    // Add new payment method
    user.paymentMethods.push({
      type,
      provider,
      last4,
      isDefault,
      isActive: true,
    })

    await user.save()

    res.json({
      success: true,
      message: "Payment method added successfully",
      data: {
        paymentMethods: user.paymentMethods,
      },
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Remove payment method
// @route   DELETE /api/users/payment-methods/:id
// @access  Private
export const removePaymentMethod = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)

    if (!user) {
      throw new AppError("User not found", 404)
    }

    const paymentMethod = user.paymentMethods.id(req.params.id)

    if (!paymentMethod) {
      throw new AppError("Payment method not found", 404)
    }

    paymentMethod.remove()
    await user.save()

    res.json({
      success: true,
      message: "Payment method removed successfully",
      data: {
        paymentMethods: user.paymentMethods,
      },
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Get user notifications
// @route   GET /api/users/notifications
// @access  Private
export const getUserNotifications = async (req, res, next) => {
  try {
    // This would typically come from a notifications collection
    // For now, we'll return a mock response
    const notifications = [
      {
        id: "1",
        type: "ride_completed",
        title: "Ride Completed",
        message: "Your ride to Dhaka Airport has been completed. Please rate your driver.",
        isRead: false,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      },
      {
        id: "2",
        type: "promo_code",
        title: "New Promo Code Available",
        message: "Use code SAVE20 to get 20% off your next ride!",
        isRead: false,
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      },
      {
        id: "3",
        type: "ride_reminder",
        title: "Don't forget to rate",
        message: "Please rate your recent ride with Ahmed Khan.",
        isRead: true,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      },
    ]

    res.json({
      success: true,
      data: { notifications },
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Mark notification as read
// @route   PUT /api/users/notifications/:id/read
// @access  Private
export const markNotificationAsRead = async (req, res, next) => {
  try {
    // This would typically update a notifications collection
    // For now, we'll return a success response
    res.json({
      success: true,
      message: "Notification marked as read",
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Update notification preferences
// @route   PUT /api/users/notification-preferences
// @access  Private
export const updateNotificationPreferences = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)

    if (!user) {
      throw new AppError("User not found", 404)
    }

    // Update notification preferences
    if (req.body.email !== undefined) user.preferences.notifications.email = req.body.email
    if (req.body.sms !== undefined) user.preferences.notifications.sms = req.body.sms
    if (req.body.push !== undefined) user.preferences.notifications.push = req.body.push

    await user.save()

    res.json({
      success: true,
      message: "Notification preferences updated successfully",
      data: {
        preferences: user.preferences.notifications,
      },
    })
  } catch (error) {
    next(error)
  }
}
