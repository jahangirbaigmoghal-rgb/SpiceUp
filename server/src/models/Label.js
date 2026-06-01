import mongoose from 'mongoose';

const labelSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  name: { type: String, required: true, trim: true },
  backgroundColor: { type: String, default: '#334155' },
  textColor: { type: String, default: '#f8fafc' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

labelSchema.index({ tenant: 1, isActive: 1 });

export default mongoose.model('Label', labelSchema);
