import { Router } from 'express';
import {
  validatePostcodeZone,
  listDeliveryZones,
  createDeliveryZone,
  updateDeliveryZone,
  deleteDeliveryZone,
} from '../controllers/deliveryController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

export const deliveryRoutes = Router();

// Public validation endpoint (fast checkout validation)
deliveryRoutes.post('/validate', validatePostcodeZone);

// Delivery zone admin endpoints
deliveryRoutes.get('/zones', authenticate, listDeliveryZones);
deliveryRoutes.post('/zones', authenticate, requireAdmin, createDeliveryZone);
deliveryRoutes.put('/zones/:id', authenticate, requireAdmin, updateDeliveryZone);
deliveryRoutes.delete('/zones/:id', authenticate, requireAdmin, deleteDeliveryZone);
