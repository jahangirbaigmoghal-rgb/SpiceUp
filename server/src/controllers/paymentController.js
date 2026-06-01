import stripePackage from 'stripe';
import Order from '../models/Order.js';
import { env } from '../config/env.js';
import { emitOrderStatusUpdate } from '../config/socket.js';

const stripe = env.stripeSecretKey ? stripePackage(env.stripeSecretKey) : null;

export async function createPaymentIntent(req, res, next) {
  try {
    const { amountPence, orderId } = req.body;
    if (!amountPence || !orderId) {
      return res.status(400).json({ error: 'Amount in pence and orderId are required' });
    }

    const order = await Order.findOne({ _id: orderId, tenant: req.tenantId });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // If Stripe is not configured (dev mode), mock payment intent
    if (!stripe) {
      console.log('⚠️ Stripe key missing — returning mocked payment intent');
      const mockClientSecret = `mock_sec_${Math.random().toString(36).slice(2, 9)}`;
      const mockIntentId = `pi_mock_${Math.random().toString(36).slice(2, 9)}`;

      // Store mocked payment intent ID in the payments list of order
      order.payments.push({
        method: 'stripe',
        amountPence,
        stripePaymentIntentId: mockIntentId,
        status: 'pending',
      });
      await order.save();

      return res.json({ clientSecret: mockClientSecret, paymentIntentId: mockIntentId, mock: true });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountPence,
      currency: 'gbp',
      metadata: {
        orderId: order._id.toString(),
        reference: order.reference,
        tenantId: req.tenantId,
      },
    });

    order.payments.push({
      method: 'stripe',
      amountPence,
      stripePaymentIntentId: paymentIntent.id,
      status: 'pending',
    });
    await order.save();

    res.json({ clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id });
  } catch (err) {
    next(err);
  }
}

export async function createPaymentLink(req, res, next) {
  try {
    const { orderId, amountPence } = req.body;
    if (!orderId || !amountPence) {
      return res.status(400).json({ error: 'orderId and amountPence are required' });
    }

    const order = await Order.findOne({ _id: orderId, tenant: req.tenantId });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Mock if Stripe not configured
    if (!stripe) {
      console.log('⚠️ Stripe key missing — returning mocked payment link');
      const mockLinkId = `plink_mock_${Math.random().toString(36).slice(2, 9)}`;
      const mockUrl = `https://checkout.stripe.dev/pay/${mockLinkId}`;

      order.payments.push({
        method: 'payment_link',
        amountPence,
        stripePaymentLinkId: mockLinkId,
        status: 'pending',
      });
      await order.save();

      return res.json({ url: mockUrl, paymentLinkId: mockLinkId, mock: true });
    }

    // Create a simple product for the checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: `Order payment ${order.reference}`,
              description: `Payment for TakeawayPOS Pro order ${order.reference}`,
            },
            unit_amount: amountPence,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${env.clientUrl}/track/${order.reference}?success=true`,
      cancel_url: `${env.clientUrl}/track/${order.reference}?cancelled=true`,
      metadata: {
        orderId: order._id.toString(),
        reference: order.reference,
        tenantId: req.tenantId,
      },
    });

    order.payments.push({
      method: 'payment_link',
      amountPence,
      stripePaymentLinkId: session.id, // using session ID as reference
      status: 'pending',
    });
    await order.save();

    res.json({ url: session.url, paymentLinkId: session.id });
  } catch (err) {
    next(err);
  }
}

export async function handleStripeWebhook(req, res, next) {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // If webhook signature or stripe object is missing, fallback directly to JSON body for dev ease
    if (!stripe || !env.stripeWebhookSecret || !sig) {
      console.log('⚠️ Stripe webhook signature verification skipped (Dev fallback)');
      event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } else {
      event = stripe.webhooks.constructEvent(req.body, sig, env.stripeWebhookSecret);
    }

    const sessionOrIntent = event.data.object;
    let orderId = sessionOrIntent.metadata?.orderId;
    let paymentIntentId = sessionOrIntent.payment_intent || sessionOrIntent.id;

    if (event.type === 'checkout.session.completed' || event.type === 'payment_intent.succeeded') {
      console.log(`💳 Stripe payment succeeded: ${paymentIntentId} for Order: ${orderId}`);

      // Handle checkout session which might have intent ID nested
      if (event.type === 'checkout.session.completed') {
        paymentIntentId = sessionOrIntent.payment_intent || sessionOrIntent.id;
      }

      if (orderId) {
        const order = await Order.findById(orderId);
        if (order) {
          // Advance payment state to paid
          let paymentRecord = order.payments.find(
            p => p.stripePaymentIntentId === paymentIntentId || p.stripePaymentLinkId === sessionOrIntent.id
          );

          if (paymentRecord) {
            paymentRecord.status = 'paid';
            paymentRecord.paidAt = new Date();
          } else {
            // Append payment record if not found (e.g. webhook triggers first)
            order.payments.push({
              method: 'stripe',
              amountPence: order.totalPence,
              stripePaymentIntentId: paymentIntentId,
              status: 'paid',
              paidAt: new Date(),
            });
          }

          // Advance order state from placed -> confirmed
          if (order.status === 'placed') {
            order.status = 'confirmed';
            order.statusHistory.push({ status: 'confirmed' });
          }

          await order.save();
          emitOrderStatusUpdate(order.tenant.toString(), order._id.toString(), order.status, { paid: true });
        }
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('❌ Webhook handler error:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
}
