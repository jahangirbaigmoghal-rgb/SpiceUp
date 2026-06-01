import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

/**
 * User — staff account for a single tenant.
 * Supports both password-based login (web/admin) and PIN-based
 * quick-login (POS terminal).
 *
 * Compound unique index ensures usernames are only unique within
 * the same tenant, not globally.
 */
const userSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  name:   { type: String, required: true, trim: true },
  username: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  email: { type: String, lowercase: true, trim: true },
  passwordHash: String,
  pin: String, // Bcrypt hash of 4–6 digit PIN for POS quick-login
  role: {
    type: String,
    enum: ['super_admin', 'admin', 'manager', 'cashier', 'kitchen', 'driver'],
    default: 'cashier',
  },
  isActive:   { type: Boolean, default: true },
  terminalId: String, // Assigned POS terminal (optional)
  avatarUrl:  String,
  lastLoginAt: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// username must be unique per tenant, not globally
userSchema.index({ tenant: 1, username: 1 }, { unique: true });

// ─── Instance methods ──────────────────────────────────────────────────────────

/** Compare a plaintext password against the stored bcrypt hash. */
userSchema.methods.verifyPassword = async function (password) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(password, this.passwordHash);
};

/** Compare a plaintext PIN against the stored bcrypt hash. */
userSchema.methods.verifyPin = async function (pin) {
  if (!this.pin) return false;
  return bcrypt.compare(String(pin), this.pin);
};

// ─── Static helpers ────────────────────────────────────────────────────────────

/** Hash a plaintext password ready to store as passwordHash. */
userSchema.statics.hashPassword = async (password) => bcrypt.hash(password, 12);

/** Hash a plaintext PIN ready to store as pin. */
userSchema.statics.hashPin = async (pin) => bcrypt.hash(String(pin), 10);

export default mongoose.model('User', userSchema);
