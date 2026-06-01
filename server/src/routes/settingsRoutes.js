import { Router } from 'express';
import { getSettings, updateSettings, getPublicSettings } from '../controllers/settingsController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

export const settingsRoutes = Router();

// Public storefront settings (unauthenticated)
settingsRoutes.get('/public', getPublicSettings);

// Settings endpoints (restricted to admin)
settingsRoutes.get('/', authenticate, requireAdmin, getSettings);
settingsRoutes.put('/', authenticate, requireAdmin, updateSettings);
