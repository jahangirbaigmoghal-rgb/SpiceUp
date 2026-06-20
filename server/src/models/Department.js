import mongoose from 'mongoose';

const departmentSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  name: { type: String, required: true, trim: true },
  colorCode: { type: String, default: '#1e293b' },
  sortOrder: { type: Number, default: 0 },
  ticketHeading: { type: String, trim: true },
  kitchenStationId: {
    type: String,
    enum: ['PIZZA_LINE', 'HOT_GRILL_LINE', 'CURRY_LINE', 'OTHER'],
    default: 'OTHER'
  },
  printerName: { type: String, trim: true },
  autoPrintEnabled: { type: Boolean, default: true },
  reprintEnabled: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

departmentSchema.index({ tenant: 1, isActive: 1, sortOrder: 1 });

export default mongoose.model('Department', departmentSchema);
