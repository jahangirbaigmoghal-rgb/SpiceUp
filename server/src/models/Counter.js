import mongoose from 'mongoose';

/**
 * Counter — per-tenant, per-name monotonic sequence used to generate
 * collision-free order references (and any other sequential codes).
 *
 * Replaces the previous `Order.countDocuments() + 1` pattern, which raced
 * under concurrent order creation and collided on the unique
 * `{ tenant, reference }` index (E11000).
 *
 * The sequence is advanced atomically with `findOneAndUpdate` + `$inc`, so
 * concurrent callers always receive distinct values — no transaction required.
 */
const counterSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  name: { type: String, required: true, trim: true },
  seq: { type: Number, default: 0 },
}, { timestamps: true });

// One sequence per (tenant, name).
counterSchema.index({ tenant: 1, name: 1 }, { unique: true });

export default mongoose.model('Counter', counterSchema);
