import mongoose from 'mongoose';

const componentSlotSchema = new mongoose.Schema({
  label: { type: String, required: true }, // e.g. "Burger Selection", "Side Selection"
  allowedCategoryIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  minChoices: { type: Number, default: 1 },
  maxChoices: { type: Number, default: 1 },
  required: { type: Boolean, default: true }
}, { _id: false });

const bundleSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  name: { type: String, required: true, trim: true }, // e.g. "Burger Meal Deal"
  description: String,
  bundlePricePence: { type: Number, required: true }, // Fixed target price (e.g. 1099 for £10.99)
  components: [componentSlotSchema],
  isActive: { type: Boolean, default: true },
  backgroundColor: { type: String, default: '#1e293b' },
  textColor: { type: String, default: '#ffffff' },
}, { timestamps: true });

bundleSchema.index({ tenant: 1, isActive: 1 });

export default mongoose.model('Bundle', bundleSchema);
