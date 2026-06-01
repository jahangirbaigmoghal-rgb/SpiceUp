import mongoose from 'mongoose';

const shortHandSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
  shorthandCode: { type: String, required: true, trim: true },
  printOnReceipt: { type: Boolean, default: false },
  printOnTicket: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

shortHandSchema.index({ tenant: 1, menuItem: 1 });

export default mongoose.model('ShortHand', shortHandSchema);
