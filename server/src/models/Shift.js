import mongoose from 'mongoose';

const shiftSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  cashier: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  terminalId: { type: String, default: 'TERM-01' },
  openedAt: { type: Date, default: Date.now },
  closedAt: Date,
  openingFloatPence: { type: Number, required: true },
  closingCashPence: Number, // Closing cash counted by cashier
  expectedCashPence: { type: Number, default: 0 },
  cashVariancePence: { type: Number, default: 0 },
  status: { type: String, enum: ['open', 'closed'], default: 'open' },
  zReport: mongoose.Schema.Types.Mixed, // Stored copy of the Z-report generated at close
}, { timestamps: true });

shiftSchema.index({ tenant: 1, cashier: 1, status: 1 });

export default mongoose.model('Shift', shiftSchema);
