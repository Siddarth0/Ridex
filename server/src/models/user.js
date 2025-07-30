import mongoose from 'mongoose';
const {Schema} = mongoose;

const userSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['admin', 'driver', 'customer'],
    default: 'customer'
  }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
export default User;
