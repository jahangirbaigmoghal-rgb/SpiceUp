import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { StatusTimeline } from './StatusTimeline';
import { StatusCard } from './StatusCard';
import { useOrderTracking } from '../../hooks/useOrderTracking';
import { useCart } from '../../lib/cart-context';
import type { PlacedOrder } from '../../types';

interface OrderTrackerProps {
  order: PlacedOrder;
}

export function OrderTracker({ order }: OrderTrackerProps) {
  const tracked = useOrderTracking(order);
  const navigate = useNavigate();
  const { clearCart } = useCart();

  const status = tracked?.status ?? order.status;

  return (
    <motion.div
      className="w-full max-w-xl mx-auto bg-white p-8 rounded-3xl border border-slate-200 shadow-xl space-y-8 flex flex-col items-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      {/* Confirmation icon */}
      <motion.div
        className="w-14 h-14 bg-green-50 border border-green-100 text-green-600 rounded-full flex items-center justify-center"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
      >
        <CheckCircle2 className="w-7 h-7" />
      </motion.div>

      {/* Order info */}
      <div className="text-center space-y-1.5">
        <h2 className="text-xl font-bold text-slate-900">Order Confirmed!</h2>
        <p className="text-sm text-slate-500">
          Reference ID:{' '}
          <span className="font-mono font-semibold text-slate-700">
            {order.orderRef}
          </span>
        </p>
      </div>

      {/* Timeline */}
      <div className="w-full space-y-6 pt-2">
        <StatusTimeline status={status} />
        <StatusCard status={status} />
      </div>

      <Button
        variant="secondary"
        size="md"
        onClick={() => {
          clearCart();
          navigate('/menu');
        }}
      >
        Order Something Else
      </Button>
    </motion.div>
  );
}
