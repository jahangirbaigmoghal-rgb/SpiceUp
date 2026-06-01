import mongoose from 'mongoose';

const manualProductSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  name: { type: String, required: true, trim: true },
  code: { type: String, trim: true },
  pricePence: { type: Number, default: 0 },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  description: { type: String, trim: true },
  color: { type: String, default: '#3b82f6' },
  printOption: { type: String, default: 'both' }, // 'ticket', 'receipt', 'both'
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

manualProductSchema.index({ tenant: 1, isActive: 1 });

export default mongoose.model('ManualProduct', manualProductSchema);
