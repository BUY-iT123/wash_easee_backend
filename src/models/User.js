import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 1, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  passwordHash: { type: String, required: true, select: false },
  pickupAddress: { type: String, required: true, trim: true, maxlength: 300 },
  subscriptionStatus: { type: String, enum: ['inactive', 'active'], default: 'inactive' },
  nextBillingDate: { type: Date, default: null }
}, { timestamps: true, versionKey: false });

export default mongoose.model('User', userSchema);
