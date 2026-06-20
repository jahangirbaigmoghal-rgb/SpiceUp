import { Router } from 'express';
import {
  getVoiceMenu,
  validateVoiceZone,
  placeVoiceOrder,
  sendVoicePaymentLink,
  getVoiceOrder,
  cancelVoiceOrder,
  modifyVoiceOrder,
  sendVoiceBillSms,
  getDebugCalls,
  calculateVoicePrice,
} from '../controllers/voiceController.js';
import { requireVoiceAgentKey } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  validateVoiceZoneSchema,
  placeVoiceOrderSchema,
  modifyVoiceOrderSchema,
  cancelVoiceOrderSchema,
  sendPaymentLinkSchema,
  sendVoiceBillSmsSchema,
  calculateVoicePriceSchema,
} from '../schemas/voiceSchema.js';

export const voiceRoutes = Router();

// Public debug route for diagnostics
voiceRoutes.get('/debug-calls', getDebugCalls);

voiceRoutes.get('/fix-model-temp', async (req, res) => {
  try {
    const mongoose = (await import('mongoose')).default;
    const db = mongoose.connection.db;
    const resultSettings = await db.collection('settings').updateMany({}, { $set: { voiceAgentModel: 'gemini-3.1-flash-live-preview' } });
    const resultTenants = await db.collection('tenants').updateMany({}, { $set: { voiceAgentModel: 'gemini-3.1-flash-live-preview' } });
    res.json({ success: true, resultSettings, resultTenants });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Apply the voice agent API key check to all internal voice routes
voiceRoutes.use(requireVoiceAgentKey);

voiceRoutes.get('/menu', getVoiceMenu);
voiceRoutes.post('/validate-zone', validate(validateVoiceZoneSchema), validateVoiceZone);
voiceRoutes.post('/calculate-price', validate(calculateVoicePriceSchema), calculateVoicePrice);
voiceRoutes.post('/orders', validate(placeVoiceOrderSchema), placeVoiceOrder);
voiceRoutes.post('/payment-link', validate(sendPaymentLinkSchema), sendVoicePaymentLink);
voiceRoutes.post('/orders/send-bill-sms', validate(sendVoiceBillSmsSchema), sendVoiceBillSms);
voiceRoutes.get('/orders/:reference', getVoiceOrder);
voiceRoutes.post('/orders/:reference/cancel', validate(cancelVoiceOrderSchema), cancelVoiceOrder);
voiceRoutes.post('/orders/:reference/modify', validate(modifyVoiceOrderSchema), modifyVoiceOrder);

