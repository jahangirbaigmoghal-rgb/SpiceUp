/**
 * Centralised refund service — single place for all refund logic so that
 * `orderController.refundOrder`, `orderController.cancelOrder`, and
 * `voiceController.cancelVoiceOrder` behave identically.
 *
 * Enforces balance tracking via `payment.refundedPence` and derives the
 * payment `status` automatically:
 *   refundedPence === 0           → paid
 *   refundedPence < amountPence   → partially_refunded
 *   refundedPence === amountPence  → refunded
 *
 * Prevents over-refunding by throwing if `amountPence > refundableBalance`.
 */

/**
 * Refund a specific payment on an order.
 *
 * @param {object}  order                 Mongoose Order document (already loaded)
 * @param {object}  payment               The payment sub-document to refund
 * @param {number}  amountPence          Amount to refund (must be > 0, integer pence)
 * @param {object}  opts
 * @param {string}  [opts.reason]         Free-text reason for the refund
 * @param {object}  [opts.stripe]         Stripe instance (or null for local payments)
 * @param {string}  [opts.actorId]        User ID performing the refund (or null for voice)
 * @returns {Promise<{stripeRefundId: string|null}>}
 */
export async function refundPayment(order, payment, amountPence, opts = {}) {
  const { reason, stripe, actorId } = opts;

  if (typeof amountPence !== 'number' || amountPence <= 0 || !Number.isInteger(amountPence)) {
    throw new Error('Refund amount must be a positive integer (pence)');
  }

  // ---- Balance guard: prevent over-refund ----
  const refundablePence = payment.amountPence - (payment.refundedPence || 0);
  if (amountPence > refundablePence) {
    throw new Error(
      `Over-refund blocked: requested £${(amountPence / 100).toFixed(2)} but only ` +
      `£${(refundablePence / 100).toFixed(2)} is refundable on this payment ` +
      `(amount £${(payment.amountPence / 100).toFixed(2)}, already refunded £${((payment.refundedPence || 0) / 100).toFixed(2)})`
    );
  }

  // ---- Execute Stripe refund if applicable ----
  let stripeRefundId = null;

  if (payment.method === 'stripe' && payment.stripePaymentIntentId && stripe) {
    const refund = await stripe.refunds.create({
      payment_intent: payment.stripePaymentIntentId,
      amount: amountPence,
      reason: 'requested_by_customer',
    });
    stripeRefundId = refund.id;
  }

  // ---- Update payment balance ----
  payment.refundedPence = (payment.refundedPence || 0) + amountPence;
  payment.status =
    payment.refundedPence >= payment.amountPence
      ? 'refunded'
      : 'partially_refunded';

  // ---- Append to order refund history ----
  order.refundHistory.push({
    amountPence,
    reason: reason || 'Refund processed',
    stripeRefundId,
    refundedBy: actorId || null,
    refundedAt: new Date(),
  });

  return { stripeRefundId };
}
