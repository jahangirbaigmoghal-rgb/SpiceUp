import mongoose from 'mongoose';

const deliveryZoneSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  name:   { type: String, required: true, trim: true }, // e.g. 'Zone 1 — Wigan Town'
  postcodePrefix: [{ type: String, uppercase: true, trim: true }], // e.g. ['WN1', 'WN2', 'WN3']
  radiusMiles: Number, // Radius boundary for delivery check using coordinates
  storeCoords: {
    lat: Number,
    lng: Number,
  },
  deliveryChargePence: { type: Number, default: 0 }, // Surcharge for delivery in this zone
  minimumOrderPence:   { type: Number, default: 1000 }, // Minimum spend for this zone, e.g. £10.00
  estimatedDeliveryMinutes: { type: Number, default: 45 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

deliveryZoneSchema.index({ tenant: 1, isActive: 1 });

export default mongoose.model('DeliveryZone', deliveryZoneSchema);
