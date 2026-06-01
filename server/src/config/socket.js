import { Server } from 'socket.io';
import { env } from './env.js';

let io = null;

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: [
        env.clientUrl,
        env.posUrl,
        env.adminUrl,
        env.kdsUrl,
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
        'http://localhost:3003',
      ],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // Join restaurant room (all staff)
    socket.on('join:restaurant', ({ tenantId }) => {
      socket.join(`restaurant:${tenantId}`);
      console.log(`Socket ${socket.id} joined restaurant:${tenantId}`);
    });

    // Join order room (customer tracking)
    socket.on('join:order', ({ orderId }) => {
      socket.join(`order:${orderId}`);
    });

    // Join KDS room
    socket.on('join:kds', ({ tenantId }) => {
      socket.join(`kds:${tenantId}`);
      console.log(`Socket ${socket.id} joined kds:${tenantId}`);
    });

    // Driver joins their room
    socket.on('join:driver', ({ driverId }) => {
      socket.join(`driver:${driverId}`);
    });

    // KDS bump — kitchen marks order ready
    socket.on('kds:bump', async ({ orderId, tenantId }) => {
      // Emit status update to all listeners
      io.to(`order:${orderId}`).emit('order:status_updated', {
        orderId,
        status: 'ready',
        timestamp: new Date().toISOString(),
      });
      io.to(`restaurant:${tenantId}`).emit('order:status_updated', {
        orderId,
        status: 'ready',
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getIO() {
  if (!io) throw new Error('Socket.io not initialised — call initSocket() first');
  return io;
}

/**
 * Emit a new order event to restaurant staff and KDS.
 * Called from the Order controller after creating an order.
 */
export function emitNewOrder(tenantId, order) {
  if (!io) return;
  const payload = {
    orderId: order._id?.toString(),
    reference: order.reference,
    orderType: order.orderType,
    channel: order.channel,
    customer: order.customer,
    lines: order.lines,
    totalPence: order.totalPence,
    status: order.status,
    estimatedReadyAt: order.estimatedReadyAt,
    createdAt: order.createdAt,
  };
  io.to(`restaurant:${tenantId}`).emit('order:new', payload);
  io.to(`kds:${tenantId}`).emit('order:new', payload);
  console.log(`📡 Emitted order:new to restaurant:${tenantId} — ${order.reference}`);
}

export function emitOrderStatusUpdate(tenantId, orderId, status, extra = {}) {
  if (!io) return;
  const payload = { orderId, status, timestamp: new Date().toISOString(), ...extra };
  io.to(`order:${orderId}`).emit('order:status_updated', payload);
  io.to(`restaurant:${tenantId}`).emit('order:status_updated', payload);
}

export function emitMenuAvailabilityChange(tenantId, itemId, isAvailable) {
  if (!io) return;
  io.to(`restaurant:${tenantId}`).emit('menu:availability_changed', { itemId, isAvailable });
}
