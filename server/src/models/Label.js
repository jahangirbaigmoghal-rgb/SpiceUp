import mongoose from 'mongoose';

const labelSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  name: { type: String, required: true, trim: true },
  kitchenText: { type: String, trim: true },
  backgroundColor: { type: String, default: '#334155' },
  textColor: { type: String, default: '#f8fafc' },
  sortOrder: { type: Number, default: 0 },
  allowedGroupIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ModifierGroup' }],
  allowedDepartmentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Department' }],
  priceImpactPence: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

labelSchema.index({ tenant: 1, isActive: 1, sortOrder: 1 });

export default mongoose.model('Label', labelSchema);
