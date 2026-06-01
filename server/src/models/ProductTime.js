import mongoose from 'mongoose';

const productTimeSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  name: { type: String, required: true, trim: true },
  startTime: { type: String, required: true }, // 'HH:mm' format
  endTime: { type: String, required: true }, // 'HH:mm' format
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

productTimeSchema.index({ tenant: 1, isActive: 1 });

export default mongoose.model('ProductTime', productTimeSchema);
