import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { getRedis } from '../config/redis.js';

/**
 * Build a shared Redis store config for rate limiters.
 * Returns undefined when Redis is not available (falls back to in-memory).
 */
function redisStore() {
  const client = getRedis();
  return client
    ? new RedisStore({
        sendCommand: (...args) => client.sendCommand(args),
      })
    : undefined; // express-rate-limit falls back to MemoryStore
}

/** Remove dangerous keys from request body (XSS/injection mitigation). */
export function sanitizeBody(req, _res, next) {
  if (req.body && typeof req.body === 'object') {
    const dangerous = ['__proto__', 'constructor', 'prototype', '$where'];
    function clean(obj) {
      if (typeof obj !== 'object' || obj === null) return obj;
      for (const key of Object.keys(obj)) {
        if (dangerous.includes(key)) {
          delete obj[key];
        } else {
          clean(obj[key]);
        }
      }
      return obj;
    }
    clean(req.body);
  }
  next();
}

/** Standard API rate limiter. */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  store: redisStore(),
  message: { error: 'Too many requests — please try again later' },
});

/** Stricter limiter for auth endpoints. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  store: redisStore(),
  message: { error: 'Too many login attempts — please try again in 15 minutes' },
});
