import { env } from '../config/env.js';
import Tenant from '../models/Tenant.js';

// Cache the single tenant ID to avoid DB lookup on every request
let cachedTenantId = null;

/**
 * Tenant middleware — sets req.tenantId on every API request.
 * Single-tenant mode: resolves DEFAULT_TENANT_ID from env or DB.
 * Future multi-tenant: resolve from subdomain or header.
 */
export async function tenantMiddleware(req, res, next) {
  try {
    // In single-tenant mode, use env var or look up the first tenant in DB
    if (env.defaultTenantId) {
      req.tenantId = env.defaultTenantId;
      return next();
    }

    if (cachedTenantId) {
      req.tenantId = cachedTenantId;
      return next();
    }

    // Look up the first/only tenant
    const tenant = await Tenant.findOne().select('_id').lean();
    if (tenant) {
      cachedTenantId = tenant._id.toString();
      req.tenantId = cachedTenantId;
    } else {
      // No tenant exists yet (pre-seed) — set placeholder
      req.tenantId = 'unseeded';
    }
    next();
  } catch (err) {
    next(err);
  }
}

/** Clear cached tenant ID (call after seeding). */
export function clearTenantCache() {
  cachedTenantId = null;
}
