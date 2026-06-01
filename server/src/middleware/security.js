import rateLimit from 'express-rate-limit';

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
  message: { error: 'Too many requests — please try again later' },
});

/** Stricter limiter for auth endpoints. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts — please try again in 15 minutes' },
});
