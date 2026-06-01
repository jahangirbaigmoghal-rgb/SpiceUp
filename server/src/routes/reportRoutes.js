import { Router } from 'express';
import {
  getDashboardMetrics,
  getSalesReport,
  getZReport,
  getVatReport,
  getVoiceAgentMetrics,
  getAuditLogReport,
  getVoiceCallLogs,
} from '../controllers/reportController.js';
import { authenticate, requireManager, requireAdmin } from '../middleware/auth.js';

export const reportRoutes = Router();

reportRoutes.get('/dashboard', authenticate, requireManager, getDashboardMetrics);
reportRoutes.get('/sales', authenticate, requireManager, getSalesReport);
reportRoutes.get('/zreport', authenticate, requireManager, getZReport);
reportRoutes.get('/vat', authenticate, requireManager, getVatReport);
reportRoutes.get('/voice-agent', authenticate, requireManager, getVoiceAgentMetrics);
reportRoutes.get('/voice-calls', authenticate, requireManager, getVoiceCallLogs);
reportRoutes.get('/audit', authenticate, requireAdmin, getAuditLogReport);
