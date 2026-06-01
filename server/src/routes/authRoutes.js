import { Router } from 'express';
import {
  login,
  loginPin,
  logout,
  me,
  openShift,
  closeShift,
  currentShift,
  verifyPin,
} from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { authLimiter } from '../middleware/security.js';

export const authRoutes = Router();

authRoutes.post('/login', authLimiter, login);
authRoutes.post('/login-pin', authLimiter, loginPin);
authRoutes.post('/logout', authenticate, logout);
authRoutes.get('/me', authenticate, me);
authRoutes.get('/shift/current', authenticate, currentShift);
authRoutes.post('/shift/open', authenticate, openShift);
authRoutes.post('/shift/close', authenticate, closeShift);
authRoutes.post('/verify-pin', authenticate, verifyPin);
