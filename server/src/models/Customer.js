import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  name:   { type: String, required: true, trim: true },
  email:  { type: String, lowercase: true, sparse: true, trim: true },
  phone:  { type: String, required: true, trim: true },
  passwordHash: String, // Null for guest / voice agent accounts
  emailVerified: { type: Boolean, default: false },
  addresses: [{
    line1: String,
    city: String,
    postcode: { type: String, uppercase: true, trim: true },
    coords: {
      lat: Number,
      lng: Number,
    },
    isDefault: { type: Boolean, default: false },
  }],
  loyaltyPoints: { type: Number, default: 0 },
  loyaltyTier: {
    type: String,
    enum: ['bronze', 'silver', 'gold'],
    default: 'bronze',
  },
  gdprConsent: {
    granted: { type: Boolean, default: false },
    date: Date,
    method: String,
  },
  marketingConsent: { type: Boolean, default: false },
  blacklisted:      { type: Boolean, default: false },
  blacklistReason:  String,
  stripeCustomerId: String,
  oneSignalPlayerId: String,
  notes: String, // Staff notes or instructions
}, { timestamps: true });

// Email & Phone unique per tenant
customerSchema.index({ tenant: 1, phone: 1 }, { unique: true });
customerSchema.index(
  { tenant: 1, email: 1 },
  { 
    unique: true, 
    partialFilterExpression: { email: { $type: "string" } } 
  }
);

export default mongoose.model('Customer', customerSchema);
