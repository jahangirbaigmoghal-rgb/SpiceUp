import mongoose from 'mongoose';

const bundleItemSchema = new mongoose.Schema({
  menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
  menuItemSnapshot: {
    name: { type: String, required: true },
    menuCode: String,
    basePricePence: { type: Number, required: true },
    vatRate: { type: Number, enum: [0, 5, 20], required: true },
    kitchenStationId: String,
  },
  variation: {
    variationId: mongoose.Schema.Types.ObjectId,
    name: String,
    priceDeltaPence: { type: Number, default: 0 },
    sku: String,
  },
  modifiers: [{
    groupName: String,
    groupId: mongoose.Schema.Types.ObjectId,
    optionName: String,
    optionId: mongoose.Schema.Types.ObjectId,
    priceDeltaPence: { type: Number, default: 0 },
  }],
  itemNote: String,
  slotLabel: String, // e.g. "Burger Selection", "Side Selection"
}, { _id: false });

const orderLineSchema = new mongoose.Schema({
  menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: false },
  menuItemSnapshot: {
    name: { type: String },
    menuCode: String,
    basePricePence: { type: Number },
    vatRate: { type: Number, enum: [0, 5, 20] },
    kitchenStationId: String,
  },
  variation: {
    variationId: mongoose.Schema.Types.ObjectId,
    name: String,
    priceDeltaPence: { type: Number, default: 0 },
    sku: String,
  },
  quantity: { type: Number, required: true, min: 1 },
  modifiers: [{
    groupName: String,
    groupId: mongoose.Schema.Types.ObjectId,
    optionName: String,
    optionId: mongoose.Schema.Types.ObjectId,
    priceDeltaPence: { type: Number, default: 0 },
  }],
  itemNote: String,
  lineTotalPence: { type: Number, required: true }, // (base + sum(modifiers)) * qty for single, or bundle price for bundle
  
  // Bundle details
  isBundle: { type: Boolean, default: false },
  bundleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bundle' },
  bundleSnapshot: {
    name: String,
    bundlePricePence: Number,
  },
  bundleItems: [bundleItemSchema],
});

const paymentSchema = new mongoose.Schema({
  method: {
    type: String,
    enum: ['cash', 'card', 'stripe', 'payment_link', 'complimentary'],
    required: true,
  },
  amountPence: { type: Number, required: true },
  stripePaymentIntentId: String,
  stripePaymentLinkId: String,
  status: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending',
  },
  paidAt: Date,
});

const orderSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  reference: { type: String, required: true }, // ORD-YYYYMMDD-XXXX
  idempotencyKey: { type: String, unique: true, sparse: true },
  channel: {
    type: String,
    enum: ['online', 'pos-walkin', 'pos-phone', 'pos-dinein', 'voice-agent'],
    required: true,
  },
  orderType: {
    type: String,
    enum: ['delivery', 'collection', 'dine-in'],
    required: true,
  },
  status: {
    type: String,
    enum: ['placed', 'confirmed', 'preparing', 'ready', 'dispatched', 'delivered', 'collected', 'cancelled'],
    default: 'placed',
  },
  customer: {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: String,
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    address: {
      line1: String,
      line2: String,
      city: String,
      postcode: String,
      coords: { lat: Number, lng: Number },
    },
  },
  tableNumber: String,
  scheduledFor: Date, // null means ASAP
  estimatedReadyAt: Date,
  lines: [orderLineSchema],
  payments: [paymentSchema],
  promoCode: String,
  discountPence: { type: Number, default: 0 },
  discountReason: String,
  deliveryZoneId: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryZone' },
  deliveryChargePence: { type: Number, default: 0 },
  subtotalPence: { type: Number, required: true },
  vatBreakdown: { type: mongoose.Schema.Types.Mixed }, // e.g. { '20': { netPence: 1000, vatPence: 200 } }
  vatPence: { type: Number, required: true },
  totalPence: { type: Number, required: true },
  assignedDriver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // POS order taker/manager
  terminalId: String,
  voiceCallSid: String, // Twilio Call SID for voice orders
  notes: String,
  refundHistory: [{
    amountPence: { type: Number, required: true },
    reason: String,
    stripeRefundId: String,
    refundedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    refundedAt: { type: Date, default: Date.now },
  }],
  statusHistory: [{
    status: { type: String, required: true },
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  }],
}, { timestamps: true });

// Compound indexes
orderSchema.index({ tenant: 1, status: 1, createdAt: -1 });
orderSchema.index({ tenant: 1, reference: 1 }, { unique: true });
orderSchema.index({ tenant: 1, 'customer.phone': 1 });

export default mongoose.model('Order', orderSchema);
