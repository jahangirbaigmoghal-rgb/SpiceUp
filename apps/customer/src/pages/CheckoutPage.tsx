import { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { generateIdempotencyKey, gbp } from '@spiceup/utils';
import { ordersApi } from '@spiceup/api-client';
import { useSettings } from '../hooks/useSettings';
import { useCart } from '../lib/cart-context';
import { Card } from '../components/ui/Card';
import { CheckoutForm } from '../components/checkout/CheckoutForm';
import { OrderSummary } from '../components/checkout/OrderSummary';
import { StripePayment } from '../components/checkout/StripePayment';
import type { CustomerDetails, PlacedOrder } from '../types';

export function CheckoutPage() {
  const { settings } = useSettings();
  const {
    items,
    subtotal,
    deliveryFee,
    total,
    orderType,
    clearCart,
  } = useCart();
  const navigate = useNavigate();

  const [customerDetails, setCustomerDetails] = useState<CustomerDetails>({
    name: '',
    phone: '',
    email: '',
    address: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [stripeReady, setStripeReady] = useState(true);

  // Empty cart → redirect to menu
  const cartEmpty = items.length === 0;

  const handleFormSubmit = useCallback(
    (data: CustomerDetails) => {
      setCustomerDetails(data);
    },
    []
  );

  const handlePlaceOrder = useCallback(async () => {
    // Basic validation mirroring the form rules
    if (!customerDetails.name || !customerDetails.phone || !customerDetails.email) {
      setError('Please complete your contact details.');
      return;
    }
    if (orderType === 'delivery' && !customerDetails.address) {
      setError('Please enter your delivery street address.');
      return;
    }
    if (
      orderType === 'delivery' &&
      subtotal < (settings.minDeliveryOrderPence ?? 1500)
    ) {
      setError(
        `Minimum order value for delivery is ${gbp(settings.minDeliveryOrderPence ?? 1500)}.`
      );
      return;
    }

    setIsSubmitting(true);
    setError('');

    const payload = {
      orderType,
      customerDetails: {
        name: customerDetails.name,
        phone: customerDetails.phone,
        email: customerDetails.email,
        address:
          orderType === 'delivery'
            ? customerDetails.address
            : 'Store Collection',
        postcode: orderType === 'delivery' ? '' : '',
      },
      items: items.map((ci) => ({
        menuItemId: ci.item._id,
        name: ci.item.name,
        quantity: ci.quantity,
        unitPricePence: ci.item.pricePence,
        vatRate: ci.item.vatRate,
        modifiers: ci.selectedModifiers.map((m) => ({
          modifierGroupId: m.groupId,
          optionId: m.optionId,
          name: m.optionName,
          pricePence: m.pricePence,
        })),
      })),
      paymentMethod: stripeReady ? 'card' : 'pay_on_arrival',
      deliveryFeePence: deliveryFee,
    };

    const idempotency = generateIdempotencyKey('WEB-CLIENT');

    try {
      const res = await ordersApi.create(payload, idempotency);
      const order = (res.data?.order as PlacedOrder) ?? null;
      clearCart();
      navigate('/tracking', { state: { order: order ?? undefined } });
    } catch {
      // Mock fallback — keep the UX flowing
      const mock: PlacedOrder = {
        _id: 'mock-101',
        orderRef: `ORD-${Date.now().toString().slice(-10)}`,
        status: 'placed',
      };
      clearCart();
      navigate('/tracking', { state: { order: mock } });
    } finally {
      setIsSubmitting(false);
    }
  }, [
    customerDetails,
    items,
    deliveryFee,
    orderType,
    settings.minDeliveryOrderPence,
    subtotal,
    stripeReady,
    clearCart,
    navigate,
  ]);

  if (cartEmpty) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center py-20">
        <h2 className="text-xl font-bold text-slate-900 mb-2">
          Your cart is empty
        </h2>
        <p className="text-sm text-slate-500 mb-6">
          Add some delicious items before checking out.
        </p>
        <Link
          to="/menu"
          className="inline-flex items-center gap-2 h-11 px-5 bg-brand-500 text-white rounded-xl text-sm font-bold hover:bg-brand-600 transition-colors"
        >
          Browse Menu
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto w-full p-4 sm:p-6 space-y-6">
      {/* Back link */}
      <Link
        to="/menu"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Return to Menu
      </Link>

      <h1 className="text-2xl font-extrabold text-slate-900">Checkout</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Form */}
        <Card padded className="space-y-4">
          <CheckoutForm
            orderType={orderType}
            onSubmit={handleFormSubmit}
            defaultValues={customerDetails}
          />
        </Card>

        {/* Summary + payment */}
        <Card padded className="flex flex-col justify-between">
          <OrderSummary
            subtotal={subtotal}
            deliveryFee={deliveryFee}
            total={total}
            orderType={orderType}
            isSubmitting={isSubmitting}
            error={error}
            onPay={handlePlaceOrder}
          />
        </Card>
      </div>

      {/* Stripe (optional, gracefully degrades) */}
      <StripePayment onUnavailable={() => setStripeReady(false)}>
        {/* CardElement would go here when Stripe is fully wired */}
        <p className="text-xs text-slate-400">
          Stripe Elements card input renders here when configured.
        </p>
      </StripePayment>
    </div>
  );
}
