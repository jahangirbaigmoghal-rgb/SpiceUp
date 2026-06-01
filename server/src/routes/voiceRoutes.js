import { Router } from 'express';
import {
  getVoiceMenu,
  validateVoiceZone,
  placeVoiceOrder,
  sendVoicePaymentLink,
  getVoiceOrder,
  cancelVoiceOrder,
  modifyVoiceOrder,
  searchVoiceMenu,
} from '../controllers/voiceController.js';
import { requireVoiceAgentKey } from '../middleware/auth.js';

export const voiceRoutes = Router();

// Apply the voice agent API key check to all internal voice routes
voiceRoutes.use(requireVoiceAgentKey);

voiceRoutes.get('/menu', getVoiceMenu);
voiceRoutes.get('/menu/search', searchVoiceMenu);
voiceRoutes.post('/validate-zone', validateVoiceZone);
voiceRoutes.post('/orders', placeVoiceOrder);
voiceRoutes.post('/payment-link', sendVoicePaymentLink);
voiceRoutes.get('/orders/:reference', getVoiceOrder);
voiceRoutes.post('/orders/:reference/cancel', cancelVoiceOrder);
voiceRoutes.post('/orders/:reference/modify', modifyVoiceOrder);

