import { Router } from 'express';
import {
  listPromotions,
  createPromotion,
  updatePromotion,
  deletePromotion,
  validatePromoCode,
  getLoyaltyBalance,
  awardLoyaltyPoints,
  redeemLoyaltyPoints,
} from '../controllers/promotionController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

export const promotionRoutes = Router();

// Public checkout endpoints
promotionRoutes.post('/validate', validatePromoCode);

// Admin promotions CRUD
promotionRoutes.get('/', authenticate, requireAdmin, listPromotions);
promotionRoutes.post('/', authenticate, requireAdmin, createPromotion);
promotionRoutes.put('/:id', authenticate, requireAdmin, updatePromotion);
promotionRoutes.delete('/:id', authenticate, requireAdmin, deletePromotion);

// Loyalty endpoints
promotionRoutes.get('/loyalty/:customerId', authenticate, getLoyaltyBalance);
promotionRoutes.post('/loyalty/:customerId/award', authenticate, requireAdmin, awardLoyaltyPoints); // Admin/System only
promotionRoutes.post('/loyalty/:customerId/redeem', authenticate, redeemLoyaltyPoints);
