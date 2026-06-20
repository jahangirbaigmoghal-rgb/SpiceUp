import mongoose from 'mongoose';

/**
 * Availability schedule sub-document.
 * When set on a category (or menu item), it is only visible/orderable
 * during the specified days and time window.
 * null = always available.
 */
const availabilityScheduleSchema = new mongoose.Schema({
  days: [{ type: Number, min: 0, max: 6 }], // 0=Sun, 6=Sat
  startTime: String, // 'HH:mm' e.g. '11:00'
  endTime:   String, // 'HH:mm' e.g. '14:30'
}, { _id: false });

const channelSchema = new mongoose.Schema({
  pos: { type: Boolean, default: true },
  website: { type: Boolean, default: true },
  mobile: { type: Boolean, default: true },
  voice: { type: Boolean, default: true },
}, { _id: false });

/**
 * Category — top-level menu section (e.g. "Starters", "Burgers", "Desserts").
 * Items belong to exactly one category.
 */
const categorySchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  name:   { type: String, required: true, trim: true },
  slug:   { type: String, lowercase: true, trim: true },
  description: String,
  imageUrl: String,
  displayOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  channels: { type: channelSchema, default: () => ({}) },
  availabilitySchedule: availabilityScheduleSchema, // null = always available
  color: String, // Optional accent colour for POS UI display
  backgroundColor: { type: String, default: '#f59e0b' },
  textColor: { type: String, default: '#ffffff' },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
}, { timestamps: true });

// Fast active-category listing sorted by displayOrder
categorySchema.index({ tenant: 1, isActive: 1, displayOrder: 1 });
// Slug must be unique per tenant (sparse allows null slugs)
categorySchema.index({ tenant: 1, slug: 1 }, { unique: true, sparse: true });

export default mongoose.model('Category', categorySchema);
