import type { OrderStatus } from '../../types';

const MESSAGES: Record<OrderStatus, string> = {
  placed: 'Waiting for restaurant confirmation',
  confirmed: 'Restaurant accepted your order',
  preparing: 'Chef is preparing your meal',
  ready: 'Order is ready for collection',
  dispatched: 'Out for delivery with driver',
  delivered: 'Delivered successfully! Enjoy!',
  collected: 'Collected successfully! Enjoy!',
};

interface StatusCardProps {
  status: OrderStatus;
}

export function StatusCard({ status }: StatusCardProps) {
  return (
    <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl text-center space-y-1">
      <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
        Current Status
      </span>
      <h4 className="text-base font-extrabold text-brand-600 uppercase tracking-wide">
        {MESSAGES[status] || MESSAGES.placed}
      </h4>
    </div>
  );
}
