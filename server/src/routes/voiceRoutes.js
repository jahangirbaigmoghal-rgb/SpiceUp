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

