import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';
import { sanitizeBody } from './middleware/security.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { tenantMiddleware } from './middleware/tenant.js';

// Route imports
import { authRoutes } from './routes/authRoutes.js';
import { menuRoutes } from './routes/menuRoutes.js';
import { orderRoutes } from './routes/orderRoutes.js';
import { deliveryRoutes } from './routes/deliveryRoutes.js';
import { paymentRoutes } from './routes/paymentRoutes.js';
import { reportRoutes } from './routes/reportRoutes.js';
import { settingsRoutes } from './routes/settingsRoutes.js';
import { promotionRoutes } from './routes/promotionRoutes.js';
import { adminRoutes } from './routes/adminRoutes.js';
import { voiceRoutes } from './routes/voiceRoutes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const app = express();

// ─── Security ────────────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: env.isProduction ? undefined : false,
}));

app.use(cors({
  origin: [
    env.clientUrl,
    env.posUrl,
    env.adminUrl,
    env.kdsUrl,
    // Local dev origins only — never exposed in production.
    ...(env.isDevelopment ? [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:3003',
    ] : []),
  ].filter(Boolean),
  credentials: true,
}));

// ─── Body Parsing ────────────────────────────────────────────────────────────
// Raw body for Stripe webhook (must be before express.json)
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  req.secret = env.cookieSecret || 'dev_cookie_secret';
  if (req.cookies && !req.signedCookies) {
    req.signedCookies = cookieParser.signedCookies(req.cookies, req.secret);
  }
  next();
});
app.use(cookieParser(env.cookieSecret || 'dev_cookie_secret'));
app.use(sanitizeBody);

// ─── Static Files ────────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.resolve(__dirname, '../../uploads')));

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({
  ok: true,
  service: 'takeaway-pos-pro-server',
  version: '1.0.0',
  timestamp: new Date().toISOString(),
}));

// ─── Tenant Middleware ───────────────────────────────────────────────────────
// Applied to all /api routes to set req.tenantId
app.use('/api', tenantMiddleware);

// ─── API Routes ──────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/promotions', promotionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/voice', voiceRoutes); // Internal — used by voice-agent service

// ─── Error Handling ──────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── Vercel Serverless Adapter ───────────────────────────────────────────────
// When imported by Vercel (either via api/index.js or auto-discovery), provide a
// ready-to-run default export that handles DB connection + seeding lazily on the
// first request. This makes app.js safe to use as a serverless entry point on
// its own, regardless of how Vercel discovers it.

let _ready;
let _initError;

async function _ensureReady() {
  if (!_ready && !_initError) {
    try {
      _ready = (async () => {
        const { connectDb } = await import('./config/db.js');
        await connectDb();
        const { seedIfEmpty, repairDefaultUserPins, ensureAdminExists } = await import('./seed_spiceup.js');
        await seedIfEmpty();
        await repairDefaultUserPins();
        await ensureAdminExists();
        console.log('✅ Serverless init complete — DB connected, seed done');
      })();
      await _ready;
    } catch (err) {
      _initError = err;
      console.error('❌ Serverless init failed:', err);
    }
  }
  if (_initError) throw _initError;
}

export default async function handler(req, res) {
  try {
    await _ensureReady();
    return app(req, res);
  } catch (err) {
    console.error('❌ Handler error:', err);
    return res.status(500).json({
      error: true,
      message: err.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
    });
  }
}

