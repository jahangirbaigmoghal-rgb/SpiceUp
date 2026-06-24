import { useEffect, useState } from 'react';
import { getSocket, disconnectSocket } from '../lib/socket';
import type { PlacedOrder, OrderStatus } from '../types';

export function useOrderTracking(order: PlacedOrder | null) {
  const [current, setCurrent] = useState<PlacedOrder | null>(order);

  useEffect(() => {
    setCurrent(order);
    if (!order) return;

    const socket = getSocket();
    socket.on(
      'order:status_updated',
      (updated: { _id: string; status: OrderStatus }) => {
        if (updated._id === order._id) {
          setCurrent((prev) =>
            prev ? { ...prev, status: updated.status } : prev
          );
        }
      }
    );

    return () => {
      disconnectSocket();
    };
  }, [order]);

  return current;
}
