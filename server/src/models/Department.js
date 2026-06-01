import mongoose from 'mongoose';

const departmentSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  name: { type: String, required: true, trim: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

departmentSchema.index({ tenant: 1, isActive: 1 });

export default mongoose.model('Department', departmentSchema);
