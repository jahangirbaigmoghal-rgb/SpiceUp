import { Router } from 'express';
import {
  createPaymentIntent,
  createPaymentLink,
  handleStripeWebhook,
} from '../controllers/paymentController.js';
import { authenticate } from '../middleware/auth.js';

export const paymentRoutes = Router();

// Stripe PaymentIntents & links (for customer PWA or staff-triggered links)
paymentRoutes.post('/intent', authenticate, createPaymentIntent);
paymentRoutes.post('/payment-link', authenticate, createPaymentLink);

// Stripe raw signature-verified webhook handler
paymentRoutes.post('/webhook', handleStripeWebhook);
