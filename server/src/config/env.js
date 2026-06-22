import 'dotenv/config';

/**
 * Return the value of an environment variable. In production, throws at module
 * load time if the variable is unset, so a misconfigured deploy fails fast
 * instead of silently running on an insecure default.
 */
function required(key) {
  const val = process.env[key];
  if (!val && process.env.NODE_ENV === 'production') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return val ?? '';
}

/**
 * Resolve a secret that MUST be present in production but may use a dev-only
 * fallback otherwise. Throws at load time in production if unset.
 *
 * @param {string} key          Env var name.
 * @param {string} devFallback  Value used only when NODE_ENV !== 'production'.
 */
function secret(key, devFallback) {
  const val = process.env[key];
  if (val) return val;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`Missing required secret: ${key} (must be set in production)`);
  }
  return devFallback;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '5001', 10),
  clientUrl: process.env.CLIENT_URL ?? 'http://localhost:3004',
  posUrl: process.env.POS_URL ?? 'http://localhost:3001',
  adminUrl: process.env.ADMIN_URL ?? 'http://localhost:3002',
  kdsUrl: process.env.KDS_URL ?? 'http://localhost:3003',

  // Database
  mongoUri: process.env.MONGODB_URI ?? '',
  useMemoryDb: process.env.USE_MEMORY_DB === 'true' || !process.env.MONGODB_URI,
  dbName: process.env.MONGODB_DB_NAME || 'takeawaypos',

  // Auth — never silently fall back to a known default in production.
  jwtSecret: secret('JWT_SECRET', 'dev_secret_change_in_production'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
  cookieSecret: secret('COOKIE_SECRET', 'dev_cookie_secret'),

  // Redis (Upstash)
  redisUrl: process.env.REDIS_URL ?? '',
  useRedis: !!process.env.REDIS_URL,

  // Stripe
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
  stripePublishableKey: process.env.VITE_STRIPE_PUBLISHABLE_KEY ?? '',

  // Twilio
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID ?? '',
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN ?? '',
  twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER ?? '',

  // Cloudinary
  cloudinaryUrl: process.env.CLOUDINARY_URL ?? '',
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME ?? '',
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY ?? '',
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET ?? '',

  // Google Maps
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY ?? '',

  // Voice Agent — service-to-service bearer; must be a real secret in production.
  voiceAgentApiKey: secret('VOICE_AGENT_API_KEY', 'dev_voice_agent_key'),
  voiceAgentUrl: process.env.VOICE_AGENT_URL ?? 'http://localhost:8000',

  // Printer
  printerHost: process.env.PRINTER_HOST ?? '',
  printerPort: parseInt(process.env.PRINTER_PORT ?? '9100', 10),

  // Email
  smtpHost: process.env.SMTP_HOST ?? '',
  smtpPort: parseInt(process.env.SMTP_PORT ?? '587', 10),
  smtpUser: process.env.SMTP_USER ?? '',
  smtpPass: process.env.SMTP_PASS ?? '',
  emailFrom: process.env.EMAIL_FROM ?? 'noreply@takeawaypos.co.uk',

  // Single tenant ID (set from seeded Tenant doc)
  defaultTenantId: process.env.DEFAULT_TENANT_ID ?? '',

  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV !== 'production',
};
