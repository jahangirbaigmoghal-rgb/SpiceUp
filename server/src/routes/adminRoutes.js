import { Router } from 'express';
import {
  listUsers,
  createUser,
  updateUser,
  listCustomers,
  anonymiseCustomer,
} from '../controllers/adminController.js';
import { authenticate, requireAdmin, requireManager } from '../middleware/auth.js';

export const adminRoutes = Router();

adminRoutes.get('/users', authenticate, requireAdmin, listUsers);
adminRoutes.post('/users', authenticate, requireAdmin, createUser);
adminRoutes.put('/users/:id', authenticate, requireAdmin, updateUser);
adminRoutes.get('/customers', authenticate, requireManager, listCustomers);
adminRoutes.post('/customers/:id/anonymise', authenticate, requireAdmin, anonymiseCustomer);
