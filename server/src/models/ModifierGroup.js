import mongoose from 'mongoose';

/**
 * ModifierOption — a single selectable option within a modifier group.
 * priceDeltaPence: positive = surcharge, 0 = included, negative = discount.
 */
const modifierOptionSchema = new mongoose.Schema({
  component: { type: mongoose.Schema.Types.ObjectId, ref: 'Component' },
  name: { type: String, required: true },
  priceDeltaPence: { type: Number, default: 0 }, // +200 = +£2.00; 0 = free
  isDefault:    { type: Boolean, default: false },
  isAvailable:  { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
  calories: Number,
}, { toJSON: { virtuals: true }, toObject: { virtuals: true } });

modifierOptionSchema.virtual('pricePence').get(function() {
  return this.priceDeltaPence;
});

/**
 * ModifierGroup — a named set of options attached to one or more MenuItems.
 * e.g. "Choose your size" (required, single), "Extra Toppings" (optional, multiple).
 *
 * Groups are defined at tenant level and referenced by MenuItem.modifierGroups[]
 * so they can be reused across the menu without duplication.
 */
const modifierGroupSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  name: { type: String, required: true }, // Internal name e.g. 'Choose your size'
  displayName: String, // Override shown to customers; falls back to name
  dashboardHeading: String, // e.g. 'EXTRA ADDONS FOR CURRIES'
  staticLabelsEnabled: { type: Boolean, default: true }, // Whether Labels apply to this group's options
  allowedLabelIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Label' }],
  samePrice: { type: Boolean, default: false }, // Use same price for all choices
  samePricePence: { type: Number, default: 0 }, // The same price to charge
  type: {
    type: String,
    enum: ['required', 'optional'],
    default: 'optional',
  },
  selectionType: {
    type: String,
    enum: ['single', 'multiple'],
    default: 'single',
  },
  minSelections: { type: Number, default: 0 },
  maxSelections: { type: Number, default: 1 },
  options:   [modifierOptionSchema],
  isActive:  { type: Boolean, default: true },
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

modifierGroupSchema.virtual('minSelection').get(function() {
  return this.minSelections;
});

modifierGroupSchema.virtual('maxSelection').get(function() {
  return this.maxSelections;
});

modifierGroupSchema.index({ tenant: 1, isActive: 1 });

export default mongoose.model('ModifierGroup', modifierGroupSchema);
