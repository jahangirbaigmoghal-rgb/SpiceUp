import mongoose from 'mongoose';

const availabilityScheduleSchema = new mongoose.Schema({
  days: [{ type: Number, min: 0, max: 6 }], // 0=Sun, 6=Sat
  startTime: String, // 'HH:mm' e.g. '11:00'
  endTime:   String, // 'HH:mm' e.g. '14:30'
}, { _id: false });

const channelSchema = new mongoose.Schema({
  pos: { type: Boolean, default: true },
  website: { type: Boolean, default: true },
  mobile: { type: Boolean, default: true },
}, { _id: false });

const groupAssignmentSchema = new mongoose.Schema({
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'ModifierGroup', required: true },
  isEnabled: { type: Boolean, default: true },
  requiredOverride: { type: Boolean, default: null },
  posOrder: { type: Number, default: 0 },
  websiteOrder: { type: Number, default: 0 },
  showOnPos: { type: Boolean, default: true },
  showOnWebsite: { type: Boolean, default: true },
}, { _id: false });

const menuItemSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  name:   { type: String, required: true, trim: true },
  menuCode: { type: String, trim: true }, // Kitchen reference code, e.g., 'CTM-01'
  description: String,
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
  basePricePence: { type: Number, required: true }, // e.g. 1099 = £10.99
  images: [String], // Cloudinary CDN image URLs
  dietaryTags: [{
    type: String,
    enum: ['halal', 'vegetarian', 'vegan', 'gluten-free', 'spicy', 'dairy-free', 'nut-free']
  }],
  allergens: [{ type: String }], // e.g. ['nuts', 'dairy', 'gluten']
  calories: Number,
  vatRate: { type: Number, enum: [0, 5, 20], default: 20 }, // UK VAT rates: Standard (20%), Reduced (5%), Zero (0%)
  modifierGroups: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ModifierGroup' }],
  groupAssignments: [groupAssignmentSchema],
  channels: { type: channelSchema, default: () => ({}) },
  publishStatus: {
    type: String,
    enum: ['draft', 'published'],
    default: 'published',
  },
  isAvailable: { type: Boolean, default: true },
  isFeatured:  { type: Boolean, default: false },
  availabilitySchedule: availabilityScheduleSchema, // null = always available
  sortOrder: { type: Number, default: 0 },
  backgroundColor: { type: String, default: '#1e293b' },
  textColor: { type: String, default: '#ffffff' },
  printOption: { type: String, default: 'both' }, // 'ticket', 'receipt', 'both'
  isManual: { type: Boolean, default: false },
  shorthand: { type: String },
  kitchenStationId: {
    type: String,
    enum: ['PIZZA_LINE', 'HOT_GRILL_LINE', 'CURRY_LINE', 'OTHER'],
    default: 'OTHER'
  },
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

menuItemSchema.virtual('variations', {
  ref: 'Variation',
  localField: '_id',
  foreignField: 'menuItem'
});

menuItemSchema.virtual('pricePence').get(function() {
  return this.basePricePence;
});

// Index for listing items by category and sorting
menuItemSchema.index({ tenant: 1, category: 1, isAvailable: 1, sortOrder: 1 });
// Index for search lookup
menuItemSchema.index({ name: 'text', description: 'text' });

export default mongoose.model('MenuItem', menuItemSchema);
