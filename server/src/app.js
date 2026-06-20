import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
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
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003',
  ],
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

app.get('/api/debug-db-temp', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const colNames = collections.map(c => c.name);
    
    // Find all bhuna/balti items in database
    const bhunaBalti = await db.collection('menuitems').find({
      name: { $regex: /bhuna|balti/i }
    }).toArray();
    
    // Find first 5 menu items
    const first5 = await db.collection('menuitems').find({}).limit(5).toArray();
    
    // Mask URI
    let maskedUri = 'not_set';
    if (process.env.MONGODB_URI) {
      maskedUri = process.env.MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//xxxx:xxxx@');
    }
    
    res.json({
      database: mongoose.connection.name,
      mongoUri: maskedUri,
      collections: colNames,
      bhunaBaltiItems: bhunaBalti,
      first5Items: first5,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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
