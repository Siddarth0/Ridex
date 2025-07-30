const mongoose = require('mongoose');

const VehicleSchema = new mongoose.Schema({
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  model: { type: String, required: true },
  plateNumber: { type: String, required: true },
  type: { type: String, enum: ['bike', 'car', 'van'], default: 'bike' }
}, { timestamps: true });

module.exports = mongoose.model('Vehicle', VehicleSchema);
