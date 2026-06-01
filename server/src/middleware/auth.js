import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import User from '../models/User.js';

/**
 * Authenticate request via httpOnly JWT cookie or Authorization Bearer header.
 * Sets req.user on success.
 */
export async function authenticate(req, res, next) {
  try {
    let token;

    // 1. Try httpOnly cookie (POS/Admin)
    if (req.signedCookies?.accessToken) {
      token = req.signedCookies.accessToken;
    } else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }
    // 2. Try Authorization Bearer header (Customer PWA / Voice Agent internal)
    else if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.slice(7);
    }
    // 3. Try Voice Agent API key
    else if (req.headers['x-voice-agent-key'] === env.voiceAgentApiKey) {
      req.isVoiceAgent = true;
      req.tenantId = req.tenantId || env.defaultTenantId;
      return next();
    }

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(decoded.userId).select('-passwordHash -pin').lean();

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    req.user = user;
    req.userId = user._id.toString();
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired — please log in again' });
    }
    return res.status(401).json({ error: 'Invalid authentication token' });
  }
}

/** Require one of the specified roles. */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied — requires role: ${roles.join(' or ')}`,
      });
    }
    next();
  };
}

/** Shorthand role checks. */
export const requireManager = requireRole('manager', 'admin', 'super_admin');
export const requireAdmin = requireRole('admin', 'super_admin');
export const requireKitchen = requireRole('kitchen', 'manager', 'admin', 'super_admin');

/** Voice Agent internal API key check. */
export function requireVoiceAgentKey(req, res, next) {
  const key = req.headers['x-voice-agent-key'];
  if (!key || key !== env.voiceAgentApiKey) {
    return res.status(403).json({ error: 'Invalid voice agent API key' });
  }
  next();
}
