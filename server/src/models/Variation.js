import mongoose from 'mongoose';

const variationSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
  name: { type: String, required: true, trim: true }, // e.g. "13\" Large", "Double Patty Build"
  priceDeltaPence: { type: Number, required: true, default: 0 }, // Surcharge offset relative to item basePrice
  isDefault: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
  sku: { type: String, required: true }, // e.g. "PZ-PEP-13" (index will be unique per tenant)
}, { timestamps: true });

variationSchema.index({ tenant: 1, menuItem: 1 });
variationSchema.index({ tenant: 1, sku: 1 }, { unique: true });

export default mongoose.model('Variation', variationSchema);
