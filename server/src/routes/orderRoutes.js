import { Router } from 'express';
import {
  listOrders,
  createOrder,
  getOrderDetails,
  advanceOrderStatus,
  cancelOrder,
  refundOrder,
  generateReceiptPdf,
  getOrderByRef,
  getCustomerOrders,
} from '../controllers/orderController.js';
import { authenticate, requireManager } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createOrderSchema } from '../schemas/orderSchema.js';

export const orderRoutes = Router();

// Public / Customer PWA endpoints
orderRoutes.post('/', validate(createOrderSchema), createOrder); // Anyone can create an order (guest checkout supported)
orderRoutes.get('/ref/:reference', getOrderByRef); // Public tracker page
orderRoutes.get('/my-orders', authenticate, getCustomerOrders); // Logged-in customer orders

// Authenticated staff endpoints
orderRoutes.get('/', authenticate, requireManager, listOrders);
orderRoutes.get('/:id', authenticate, getOrderDetails);
orderRoutes.put('/:id/status', authenticate, advanceOrderStatus);
orderRoutes.post('/:id/cancel', authenticate, requireManager, cancelOrder);
orderRoutes.post('/:id/refund', authenticate, requireManager, refundOrder);
orderRoutes.get('/:id/receipt', authenticate, generateReceiptPdf);
