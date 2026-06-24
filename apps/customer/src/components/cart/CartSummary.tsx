import { useNavigate } from 'react-router-dom';
import { gbp } from '@spiceup/utils';
import { Button } from '../ui/Button';
import { useCart } from '../../lib/cart-context';
import type { OrderType } from '../../types';

interface CartSummaryProps {
  orderType: OrderType;
}

export function CartSummary({ orderType }: CartSummaryProps) {
  const { subtotal, deliveryFee, total } = useCart();
  const navigate = useNavigate();

  return (
    <div className="border-t border-slate-100 pt-4 space-y-3">
      <div className="flex justify-between text-sm text-slate-500">
        <span>Subtotal</span>
        <span className="font-semibold text-slate-700">{gbp(subtotal)}</span>
      </div>
      {orderType === 'delivery' && (
        <div className="flex justify-between text-sm text-slate-500">
          <span>Delivery Fee</span>
          <span className="font-semibold text-slate-700">
            {deliveryFee > 0 ? gbp(deliveryFee) : 'FREE'}
          </span>
        </div>
      )}
      <div className="flex justify-between text-base font-bold text-slate-900 border-t border-slate-100 pt-3">
        <span>Total</span>
        <span className="text-brand-600 font-extrabold">{gbp(total)}</span>
      </div>

      <Button fullWidth size="lg" onClick={() => navigate('/checkout')}>
        Checkout Order
      </Button>
    </div>
  );
}
