import mongoose from 'mongoose';

const channelSchema = new mongoose.Schema({
  pos: { type: Boolean, default: true },
  website: { type: Boolean, default: true },
  mobile: { type: Boolean, default: true },
  voice: { type: Boolean, default: true },
}, { _id: false });

const componentSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  name: { type: String, required: true, trim: true },
  kitchenName: { type: String, trim: true },
  description: { type: String, trim: true },
  imageUrl: { type: String },
  color: { type: String, default: '#1e293b' },
  textColor: { type: String, default: '#f8fafc' },
  defaultPriceDeltaPence: { type: Number, default: 0 },
  sortOrder: { type: Number, default: 0 },
  allergenTags: [{ type: String, trim: true }],
  dietaryTags: [{ type: String, trim: true }],
  channels: { type: channelSchema, default: () => ({}) },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

componentSchema.index({ tenant: 1, isActive: 1, sortOrder: 1 });

export default mongoose.model('Component', componentSchema);
