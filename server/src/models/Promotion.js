import mongoose from 'mongoose';

const tierSchema = new mongoose.Schema({
  quantity: { type: Number, required: true, min: 1 },
  pricePence: { type: Number, required: true, min: 0 }
}, { _id: false });

const bundleGroupSchema = new mongoose.Schema({
  name: String,
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  quantity: { type: Number, default: 1, min: 1 }
}, { _id: false });

const promotionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: {
    type: String,
    enum: [
      'simple_discount',
      'multibuy_price',
      'tiered_price',
      'buy_x_get_y',
      'bogof',
      'bogohp',
      'combo_bundle',
      'meal_deal',
      'mix_match',
      'cheapest_free',
      'cheapest_half_price',
      'min_spend',
      'coupon',
      'member_price',
      'clearance'
    ],
    required: true
  },
  active: { type: Boolean, default: true },
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  excludedProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  discountPercent: Number,
  discountPence: Number,
  buyQuantity: Number,
  getQuantity: Number,
  bundlePricePence: Number,
  tiers: [tierSchema],
  bundleGroups: [bundleGroupSchema],
  maxApplications: Number,
  minSpendPence: Number,
  couponCode: { type: String, uppercase: true, trim: true, index: true },
  memberOnly: { type: Boolean, default: false },
  receiptLabel: String,
  posBadge: String,
  startsAt: Date,
  endsAt: Date,
  priority: { type: Number, default: 0 },
  stackable: { type: Boolean, default: false },
  usageCount: { type: Number, default: 0 },
  totalDiscountPence: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model('Promotion', promotionSchema);
