import { CreditCard, Lock } from 'lucide-react';
import { gbp } from '@spiceup/utils';
import type { OrderType } from '../../types';

interface OrderSummaryProps {
  subtotal: number;
  deliveryFee: number;
  total: number;
  orderType: OrderType;
  postcode?: string;
  isSubmitting: boolean;
  error?: string;
  onPay: () => void;
}

export function OrderSummary({
  subtotal,
  deliveryFee,
  total,
  orderType,
  postcode,
  isSubmitting,
  error,
  onPay,
}: OrderSummaryProps) {
  return (
    <div className="flex flex-col justify-between gap-4">
      <div className="space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-600 text-xs font-bold flex items-center justify-center">
            2
          </span>
          <h3 className="font-bold text-base text-slate-900">Order Summary</h3>
        </div>

        <div className="space-y-2 py-2">
          <div className="flex justify-between text-sm text-slate-500">
            <span>Items Subtotal</span>
            <span className="font-semibold text-slate-700">
              {gbp(subtotal)}
            </span>
          </div>
          {orderType === 'delivery' && (
            <div className="flex justify-between text-sm text-slate-500">
              <span>
                Delivery {postcode ? `(${postcode})` : ''}
              </span>
              <span className="font-semibold text-slate-700">
                {deliveryFee > 0 ? gbp(deliveryFee) : 'FREE'}
              </span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold text-slate-900 border-t border-slate-100 pt-3">
            <span>Total</span>
            <span className="text-brand-600 font-extrabold">
              {gbp(total)}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {/* Payment method */}
        <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-3 text-sm text-slate-500">
          <CreditCard className="w-5 h-5 text-brand-500 shrink-0" />
          <span>Pay securely with Stripe</span>
          <Lock className="w-3.5 h-3.5 text-slate-400 ml-auto" />
        </div>

        {error && (
          <p className="text-sm text-red-600 font-semibold" role="alert">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={onPay}
          disabled={isSubmitting}
          className="w-full h-12 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-extrabold text-sm rounded-xl transition-all shadow-md shadow-brand-500/20 disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Securing Transaction…
            </>
          ) : (
            `Pay & Submit Order (${gbp(total)})`
          )}
        </button>
      </div>
    </div>
  );
}
