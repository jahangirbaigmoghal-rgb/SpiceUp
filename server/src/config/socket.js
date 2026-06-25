import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from './env.js';
import { SOCKET_EVENTS } from '../constants/socketEvents.js';

let io = null;

/**
 * Parse a cookie header string and return the value for the given name.
 */
function parseCookie(cookieHeader, name) {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

const STAFF_ROLES = ['staff', 'manager', 'admin', 'kitchen', 'owner'];
const KITCHEN_ROLES = ['kitchen', 'manager', 'admin', 'owner'];

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: [
        env.clientUrl,
        env.posUrl,
        env.adminUrl,
        env.kdsUrl,
        ...(env.isDevelopment ? [
          'http://localhost:3000',
          'http://localhost:3001',
          'http://localhost:3002',
          'http://localhost:3003',
          'http://localhost:3004',
        ] : []),
      ].filter(Boolean),
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // ─── Socket Authentication Middleware ────────────────────────────────────────
  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      parseCookie(socket.handshake.headers?.cookie, 'accessToken');

    if (!token) {
      if (env.isDevelopment) {
        console.warn(`⚠️ Socket ${socket.id}: no JWT — allowing as guest (dev mode)`);
        socket.data.isGuest = true;
        return next();
      }
      // In production, allow guest connections (customer tracking) but mark them
      socket.data.isGuest = true;
      return next();
    }

    try {
      // SECURITY (Phase A): pin the algorithm — never let the token header decide.
      const decoded = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] });
      socket.data.userId = decoded.userId || decoded.sub || decoded.id;
      socket.data.tenantId = decoded.tenantId;
      socket.data.role = decoded.role;
      socket.data.isGuest = false;
      return next();
    } catch (err) {
      if (env.isDevelopment) {
        console.warn(`⚠️ Socket ${socket.id}: invalid JWT — allowing as guest (dev mode):`, err.message);
        socket.data.isGuest = true;
        return next();
      }
      // Invalid token in production — still allow as guest for customer sockets
      socket.data.isGuest = true;
      return next();
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id} (guest=${socket.data.isGuest}, role=${socket.data.role || 'none'})`);

    // Join restaurant room (staff only — use server-derived tenantId)
    socket.on(SOCKET_EVENTS.JOIN_RESTAURANT, () => {
      if (socket.data.isGuest || !STAFF_ROLES.includes(socket.data.role)) {
        return socket.emit('error', { message: 'Unauthorized: staff role required for restaurant room' });
      }
      const tenantId = socket.data.tenantId;
      if (!tenantId) return socket.emit('error', { message: 'No tenantId in token' });
      socket.join(`restaurant:${tenantId}`);
      console.log(`Socket ${socket.id} joined restaurant:${tenantId}`);
    });

    // Join order room (staff join any order in their tenant; guests join by orderId)
    socket.on(SOCKET_EVENTS.JOIN_ORDER, async ({ orderId }) => {
      if (!orderId) return socket.emit('error', { message: 'orderId required' });
      try {
        const { default: Order } = await import('../models/Order.js');
        const order = await Order.findById(orderId).lean();
        if (!order) {
          return socket.emit('error', { message: 'Order not found' });
        }

        // Staff can join if tenant matches
        if (!socket.data.isGuest && STAFF_ROLES.includes(socket.data.role)) {
          if (order.tenant.toString() !== socket.data.tenantId.toString()) {
            return socket.emit('error', { message: 'Unauthorized: tenant mismatch' });
          }
        }
        
        socket.join(`order:${orderId}`);
      } catch (err) {
        socket.emit('error', { message: 'Failed to authorize order room join' });
      }
    });

    // Join KDS room (kitchen/manager/admin only — use server-derived tenantId)
    socket.on(SOCKET_EVENTS.JOIN_KDS, () => {
      if (socket.data.isGuest || !KITCHEN_ROLES.includes(socket.data.role)) {
        return socket.emit('error', { message: 'Unauthorized: kitchen/manager/admin role required for KDS room' });
      }
      const tenantId = socket.data.tenantId;
      if (!tenantId) return socket.emit('error', { message: 'No tenantId in token' });
      socket.join(`kds:${tenantId}`);
      console.log(`Socket ${socket.id} joined kds:${tenantId}`);
    });

    // Driver joins their room (validate driverId matches userId)
    socket.on(SOCKET_EVENTS.JOIN_DRIVER, ({ driverId }) => {
      if (socket.data.isGuest) {
        return socket.emit('error', { message: 'Authentication required for driver room' });
      }
      if (driverId !== socket.data.userId) {
        return socket.emit('error', { message: 'Unauthorized: driverId must match authenticated user' });
      }
      socket.join(`driver:${driverId}`);
    });

    // KDS bump — kitchen marks order ready (role-gated)
    socket.on(SOCKET_EVENTS.KDS_BUMP, async ({ orderId }) => {
      if (socket.data.isGuest || !KITCHEN_ROLES.includes(socket.data.role)) {
        return socket.emit('error', { message: 'Unauthorized: kitchen/manager/admin role required for kds:bump' });
      }
      const tenantId = socket.data.tenantId;
      // Emit status update to all listeners
      io.to(`order:${orderId}`).emit(SOCKET_EVENTS.ORDER_STATUS_UPDATED, {
        orderId,
        status: 'ready',
        timestamp: new Date().toISOString(),
      });
      io.to(`restaurant:${tenantId}`).emit(SOCKET_EVENTS.ORDER_STATUS_UPDATED, {
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
  io.to(`restaurant:${tenantId}`).emit(SOCKET_EVENTS.ORDER_NEW, payload);
  io.to(`kds:${tenantId}`).emit(SOCKET_EVENTS.ORDER_NEW, payload);
  console.log(`📡 Emitted ${SOCKET_EVENTS.ORDER_NEW} to restaurant:${tenantId} — ${order.reference}`);
}

export function emitOrderStatusUpdate(tenantId, orderId, status, extra = {}) {
  if (!io) return;
  const payload = { orderId, status, timestamp: new Date().toISOString(), ...extra };
  io.to(`order:${orderId}`).emit(SOCKET_EVENTS.ORDER_STATUS_UPDATED, payload);
  io.to(`restaurant:${tenantId}`).emit(SOCKET_EVENTS.ORDER_STATUS_UPDATED, payload);
  io.to(`kds:${tenantId}`).emit(SOCKET_EVENTS.ORDER_STATUS_UPDATED, payload);
}

export function emitMenuAvailabilityChange(tenantId, itemId, isAvailable) {
  if (!io) return;
  const payload = { tenantId: tenantId?.toString(), itemId, isAvailable, timestamp: new Date().toISOString() };
  io.to(`restaurant:${tenantId}`).emit('menu:availability_changed', payload);
  if (!env.isProduction) {
    io.emit('menu:availability_changed', payload);
  }
}

export function emitMenuChanged(tenantId, detail = {}) {
  if (!io) return;
  const payload = {
    tenantId: tenantId?.toString(),
    timestamp: new Date().toISOString(),
    ...detail,
  };
  io.to(`restaurant:${tenantId}`).emit('menu:changed', payload);
  if (!env.isProduction) {
    io.emit('menu:changed', payload);
  }
}

export function emitSettingsChanged(tenantId, settings) {
  if (!io) return;
  const payload = {
    tenantId: tenantId?.toString(),
    timestamp: new Date().toISOString(),
    settings,
  };
  io.to(`restaurant:${tenantId}`).emit('settings:changed', payload);
  if (!env.isProduction) {
    io.emit('settings:changed', payload);
  }
}

