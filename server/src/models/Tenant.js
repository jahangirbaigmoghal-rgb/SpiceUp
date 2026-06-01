import mongoose from 'mongoose';

/**
 * Opening hours sub-document.
 * day: 0 = Sunday, 6 = Saturday (matches JS Date.getDay()).
 */
const openingHourSchema = new mongoose.Schema({
  day: { type: Number, min: 0, max: 6 }, // 0=Sun, 6=Sat
  open: String,    // '11:00'
  close: String,   // '23:00'
  isClosed: { type: Boolean, default: false },
}, { _id: false });

/**
 * Tenant — the top-level multi-tenant root.
 * Every other document carries a `tenant` ObjectId reference back here.
 */
const tenantSchema = new mongoose.Schema({
  slug: { type: String, unique: true, lowercase: true, trim: true },
  businessName: { type: String, required: true },
  address: {
    line1: String,
    line2: String,
    city: String,
    county: String,
    postcode: String,
    country: { type: String, default: 'UK' },
  },
  coords: { lat: Number, lng: Number },
  phone: String,
  email: String,
  logoUrl: String,
  bannerUrl: String,
  vatNumber: String,
  vatRegistered: { type: Boolean, default: true },
  settings: {
    deliveryEnabled:        { type: Boolean, default: true },
    collectionEnabled:      { type: Boolean, default: true },
    dineInEnabled:          { type: Boolean, default: false },
    tableOrderEnabled:      { type: Boolean, default: false },
    openingHours:           [openingHourSchema],
    deliveryLeadMinutes:    { type: Number, default: 45 },
    collectionLeadMinutes:  { type: Number, default: 20 },
    minimumOrderPence:      { type: Number, default: 1000 }, // £10.00
    isOpen:                 { type: Boolean, default: true },  // Manual override
    currency:               { type: String, default: 'GBP' },
    timezone:               { type: String, default: 'Europe/London' },
  },
  // Payment & comms integrations
  stripeAccountId: String,
  twilioPhoneNumber: String,
  // Gemini Live voice agent
  voiceAgentEnabled: { type: Boolean, default: false },
  voiceAgentPrompt:  String,
  voiceAgentVoice:   { type: String, default: 'Aoede' },
  // Subscription plan
  plan: { type: String, enum: ['starter', 'pro', 'enterprise'], default: 'pro' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('Tenant', tenantSchema);
