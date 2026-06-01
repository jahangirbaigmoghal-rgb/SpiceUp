import AuditLog from '../models/AuditLog.js';

/**
 * Log a user action to the AuditLog collection.
 */
export async function audit(req, action, entity, entityId, metadata = {}) {
  try {
    await AuditLog.create({
      tenant: req.tenantId,
      action,
      actor: req.userId || req.user?._id,
      actorName: req.user?.name,
      actorRole: req.user?.role,
      entity,
      entityId: entityId?.toString(),
      metadata,
      ipAddress: req.ip || req.headers['x-forwarded-for'],
      userAgent: req.headers['user-agent'],
    });
  } catch (err) {
    console.error('⚠️ Failed to write audit log:', err);
  }
}
