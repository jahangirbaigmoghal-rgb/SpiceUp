import { useState, useEffect, type ReactNode } from 'react';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { CreditCard, Lock } from 'lucide-react';

// Singleton promise — loadStripe is idempotent
let stripePromise: Promise<Stripe | null> | null = null;

function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    const key = (import.meta as any).env?.VITE_STRIPE_PUBLISHABLE_KEY;
    if (!key) {
      console.warn(
        'VITE_STRIPE_PUBLISHABLE_KEY not set — Stripe payment form disabled. Falling back to mock order.'
      );
      return Promise.resolve(null);
    }
    stripePromise = loadStripe(key);
  }
  return stripePromise;
}

interface StripePaymentProps {
  children: ReactNode;
  /** Called when Stripe is unavailable, so parent can fall back to mock */
  onUnavailable?: () => void;
}

/**
 * Wraps children in Stripe Elements provider.
 * Gracefully detects when no publishable key is configured and
 * notifies the parent to fall back to mock-order behaviour.
 */
export function StripePayment({ children, onUnavailable }: StripePaymentProps) {
  const [stripe, setStripe] = useState<Stripe | null | undefined>(undefined);

  useEffect(() => {
    let mounted = true;
    getStripe().then((s) => {
      if (!mounted) return;
      setStripe(s);
      if (!s) onUnavailable?.();
    });
    return () => {
      mounted = false;
    };
  }, [onUnavailable]);

  // Loading state
  if (stripe === undefined) {
    return (
      <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-3 text-sm text-slate-400">
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        Loading secure payment…
      </div>
    );
  }

  // No key configured — render a note; parent will use mock
  if (stripe === null) {
    return (
      <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-center gap-3 text-sm text-amber-700">
        <Lock className="w-4 h-4 shrink-0" />
        <span>
          Stripe not configured — order will be placed as pay-on-arrival/collection.
        </span>
      </div>
    );
  }

  return (
    <Elements
      stripe={stripe}
      options={{ appearance: { theme: 'stripe' } }}
    >
      <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <CreditCard className="w-4 h-4 text-brand-500" />
          Card Details
        </div>
        {children}
      </div>
    </Elements>
  );
}

/** Re-export the CardElement for consumers */
export { CardElement } from '@stripe/react-stripe-js';
