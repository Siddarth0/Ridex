const mongoose = require('mongoose')

const rideSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Rider is required'],
        },
        driver: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Driver",
            default: null,
        },

        rideType: {
            type: String,
            enum: ["standard", "premium", "shared", "motorcycle", "cng"],
            default: 'standard',
        },
        status: {
            type: String,
            enum: [
                "requested",
                "searching", 
                "accepted",
                "arrived", 
                "started", 
                "completed",
                "cancelled", 
                "no-driver", 
            ],
            default: "requested",
        },

        pickup: {
          address: { type: String, required: [true, "Pickup address is required"] },
          coordinates: {
            type: [Number],
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
    }
)

module.exports = mongoose.model("Ride", rideSchema)