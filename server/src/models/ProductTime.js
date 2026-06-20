import mongoose from 'mongoose';

const productTimeSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  name: { type: String, required: true, trim: true },
  startTime: { type: String, required: true }, // 'HH:mm' format
  endTime: { type: String, required: true }, // 'HH:mm' format
  days: [{ type: Number, min: 0, max: 6 }],
  appliesToProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' }],
  appliesToCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  appliesToBundles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Bundle' }],
  channels: {
    pos: { type: Boolean, default: true },
    website: { type: Boolean, default: true },
    mobile: { type: Boolean, default: true },
    voice: { type: Boolean, default: true },
  },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

productTimeSchema.index({ tenant: 1, isActive: 1 });

export default mongoose.model('ProductTime', productTimeSchema);
