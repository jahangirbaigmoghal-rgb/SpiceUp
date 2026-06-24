import { useLocation, Navigate } from 'react-router-dom';
import { OrderTracker } from '../components/tracking/OrderTracker';
import type { PlacedOrder } from '../types';

export function TrackingPage() {
  const location = useLocation();
  const order = (location.state as { order?: PlacedOrder })?.order;

  // No order in state — redirect to menu
  if (!order) {
    return <Navigate to="/menu" replace />;
  }

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
      <OrderTracker order={order} />
    </div>
  );
}
