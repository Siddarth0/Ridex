import express from "express"
import Driver from "../models/Driver.js"

const router = express.Router()

// @desc    Public: Get pending driver applications (limited fields)
// @route   GET /api/public/pending-drivers
// @access  Public
router.get("/pending-drivers", async (req, res, next) => {
  try {
    const page = Number.parseInt(req.query.page) || 1
    const limit = Math.min(Number.parseInt(req.query.limit) || 5, 50)
    const skip = (page - 1) * limit

    const pipeline = [
      { $match: { status: "pending" } },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          _id: 1,
          status: 1,
          createdAt: 1,
          // Minimal user info
          user: {
            firstName: "$user.firstName",
            lastName: "$user.lastName",
            email: "$user.email",
            phone: "$user.phone",
          },
          // Minimal vehicle info if available
          vehicle: {
            make: "$vehicle.make",
            model: "$vehicle.model",
            year: "$vehicle.year",
            plateNumber: "$vehicle.plateNumber",
          },
          licenseNumber: 1,
        },
      },
    ]

    const [drivers, total] = await Promise.all([
      Driver.aggregate(pipeline),
      Driver.countDocuments({ status: "pending" }),
    ])

    res.json({
      success: true,
      data: {
        drivers,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    })
  } catch (err) {
    next(err)
  }
})

export default router
