import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  action: { type: String, required: true }, // e.g. 'delete_item', 'refund_order'
  actor:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  actorName: String,
  actorRole: String,
  entity: String,   // 'Order', 'MenuItem', etc.
  entityId: String,
  metadata: mongoose.Schema.Types.Mixed, // Any relevant data snapshot
  ipAddress: String,
  userAgent: String,
}, { timestamps: true });

// Audit logs are append-only — no update/delete routes exposed
auditLogSchema.index({ tenant: 1, action: 1, createdAt: -1 });
auditLogSchema.index({ tenant: 1, entityId: 1 });

export default mongoose.model('AuditLog', auditLogSchema);
