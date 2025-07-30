const mongoose = require('mongoose');

const DriverProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
  licenseImage: { type: String }, // URL or filename
  isAvailable: { type: Boolean, default: false },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] } // [lng, lat]
  },
  rating: { type: Number, default: 5.0 }
}, { timestamps: true });

DriverProfileSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('DriverProfile', DriverProfileSchema);
