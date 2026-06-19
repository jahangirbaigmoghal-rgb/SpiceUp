import { Router } from 'express';
import { getSettings, updateSettings, getPublicSettings, testPrinterConnection } from '../controllers/settingsController.js';
import { authenticate, requireManager } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { updateSettingsSchema } from '../schemas/settingsSchema.js';

export const settingsRoutes = Router();

// Public storefront settings (unauthenticated)
settingsRoutes.get('/public', getPublicSettings);

// Settings endpoints (restricted to manager/admin)
settingsRoutes.get('/', authenticate, requireManager, getSettings);
settingsRoutes.put('/', authenticate, requireManager, validate(updateSettingsSchema), updateSettings);
settingsRoutes.post('/test-printer', authenticate, requireManager, testPrinterConnection);
