import 'dotenv/config';

function required(key) {
  const val = process.env[key];
  if (!val && process.env.NODE_ENV === 'production') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return val ?? '';
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

  // Auth
  jwtSecret: process.env.JWT_SECRET ?? 'dev_secret_change_in_production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
  cookieSecret: process.env.COOKIE_SECRET || 'dev_cookie_secret',

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

  // Voice Agent
  voiceAgentApiKey: process.env.VOICE_AGENT_API_KEY ?? 'dev_voice_agent_key',
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
