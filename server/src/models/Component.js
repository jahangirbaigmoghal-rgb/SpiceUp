import mongoose from 'mongoose';

const componentSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  imageUrl: { type: String },
  color: { type: String, default: '#1e293b' },
  textColor: { type: String, default: '#f8fafc' },
  defaultPriceDeltaPence: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

componentSchema.index({ tenant: 1, isActive: 1 });

export default mongoose.model('Component', componentSchema);
