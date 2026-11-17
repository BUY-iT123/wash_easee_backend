import mongoose from 'mongoose';

const pickupSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  pickupDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  pickupSlot: { type: String, required: true, enum: ['morning', 'afternoon', 'evening'] },
  clothesCount: { type: Number, required: true, min: 1, max: 500 },
  status: { type: String, enum: ['scheduled', 'picked_washing', 'delivered'], default: 'scheduled' }
}, { timestamps: true, versionKey: false });

pickupSchema.index({ userId: 1, pickupDate: 1 }, { unique: true });

export default mongoose.model('Pickup', pickupSchema);
