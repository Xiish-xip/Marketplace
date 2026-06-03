import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { config } from './config';
import { logger } from './logger';
import jwt from 'jsonwebtoken';
import { prisma } from './prisma';

let io: Server | null = null;

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

function isAdminSocket(socket: AuthenticatedSocket): boolean {
  return socket.userRole === 'ADMIN' || socket.userRole === 'SUPER_ADMIN';
}

function emitSocketAuthError(socket: AuthenticatedSocket, event: string) {
  socket.emit('socket-error', { event, message: 'Not authorized' });
}

async function canAccessSellerRoom(socket: AuthenticatedSocket, sellerId: string): Promise<boolean> {
  if (!socket.userId || typeof sellerId !== 'string' || !sellerId) return false;
  if (isAdminSocket(socket)) return true;
  try {
    const seller = await prisma.seller.findUnique({
      where: { id: sellerId },
      select: { userId: true },
    });
    return seller?.userId === socket.userId;
  } catch (error: any) {
    logger.warn('Socket seller room authorization failed', { sellerId, error: error.message });
    return false;
  }
}

async function canAccessOrderRoom(socket: AuthenticatedSocket, orderId: string): Promise<boolean> {
  if (!socket.userId || typeof orderId !== 'string' || !orderId) return false;
  if (isAdminSocket(socket)) return true;
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { userId: true, seller: { select: { userId: true } } },
    });
    if (!order) return false;
    if (order.userId === socket.userId || order.seller.userId === socket.userId) return true;
    if (socket.userRole === 'DELIVERY') {
      const shipment = await prisma.shipment.findFirst({ where: { orderId }, select: { id: true } });
      return Boolean(shipment);
    }
    return false;
  } catch (error: any) {
    logger.warn('Socket order room authorization failed', { orderId, error: error.message });
    return false;
  }
}

function emitPresenceEvent(event: 'user-online' | 'user-offline', userId: string) {
  io?.to('role:ADMIN').to('role:SUPER_ADMIN').emit(event, { userId });
}

export function getIO(): Server | null {
  return io;
}

export function initSocketServer(httpServer: HttpServer): Server {
  const isDev = config.nodeEnv !== 'production';
  io = new Server(httpServer, {
    cors: {
      origin: isDev
        ? [/^https?:\/\/(localhost|127\.0\.0\.1):\d+$/, /^https?:\/\/192\.168\.\d+\.\d+:\d+$/]
        : [config.frontendUrl],
      credentials: true,
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Authentication middleware
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      // Allow unauthenticated connections for public events
      next();
      return;
    }
    try {
      const decoded = jwt.verify(token as string, config.jwtSecret) as any;
      socket.userId = decoded.userId;
      socket.userRole = decoded.role;
      next();
    } catch {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (rawSocket: Socket) => {
    const socket = rawSocket as AuthenticatedSocket;
    logger.info(`Socket connected: ${socket.id}${socket.userId ? ` (user: ${socket.userId})` : ''}`);

    // Join user-specific room for private messages
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
      socket.join(`role:${socket.userRole}`);
    }

    // Join public rooms
    socket.join('public');

    // Track active users
    socket.on('track-presence', (data: { sellerId?: string }) => {
      if (socket.userId) {
        emitPresenceEvent('user-online', socket.userId);
        if (data?.sellerId) {
          socket.join(`seller-presence:${data.sellerId}`);
        }
      }
    });

    // Join an order's group chat room (customer, seller, and driver can all chat together)
    socket.on('join-order-chat', async (orderId: string) => {
      if (!await canAccessOrderRoom(socket, orderId)) {
        emitSocketAuthError(socket, 'join-order-chat');
        return;
      }
      socket.join(`order-chat:${orderId}`);
      logger.info(`User ${socket.userId} joined order chat: ${orderId}`);
    });

    socket.on('leave-order-chat', (orderId: string) => {
      socket.leave(`order-chat:${orderId}`);
    });

    // Group chat message for orders (sent to all participants in the order-chat room)
    socket.on('send-order-chat-message', async (data: {
      orderId: string;
      senderId: string;
      senderName?: string;
      senderRole?: string;
      content: string;
      attachments?: string[];
    }) => {
      if (!await canAccessOrderRoom(socket, data.orderId)) {
        emitSocketAuthError(socket, 'send-order-chat-message');
        return;
      }
      io?.to(`order-chat:${data.orderId}`).emit('order-chat-message', {
        ...data,
        senderId: socket.userId,
        senderName: data.senderName,
        senderRole: data.senderRole || socket.userRole,
        timestamp: new Date().toISOString(),
      });
    });

    // Messaging events (1-on-1)
    socket.on('send-message', (data: { to: string; message: string; conversationId: string }) => {
      if (!socket.userId) return;
      io?.to(`user:${data.to}`).emit('new-message', {
        from: socket.userId,
        message: data.message,
        conversationId: data.conversationId,
        timestamp: new Date().toISOString(),
      });
    });

    // Typing indicators
    socket.on('typing', (data: { to: string; conversationId: string; isTyping: boolean }) => {
      io?.to(`user:${data.to}`).emit('user-typing', {
        userId: socket.userId,
        conversationId: data.conversationId,
        isTyping: data.isTyping,
      });
    });

    // Typing indicator for order group chat
    socket.on('order-chat-typing', (data: { orderId: string; userId: string; userName?: string; isTyping: boolean }) => {
      if (!socket.userId) return;
      socket.to(`order-chat:${data.orderId}`).emit('order-chat-typing-indicator', {
        userId: socket.userId,
        userName: data.userName,
        isTyping: data.isTyping,
      });
    });

    // Order tracking events
    socket.on('join-order', async (orderId: string) => {
      if (!await canAccessOrderRoom(socket, orderId)) {
        emitSocketAuthError(socket, 'join-order');
        return;
      }
      socket.join(`order:${orderId}`);
    });

    socket.on('leave-order', (orderId: string) => {
      socket.leave(`order:${orderId}`);
    });

    // Vendor/Admin notifications
    socket.on('join-seller-room', async (sellerId: string) => {
      if (!await canAccessSellerRoom(socket, sellerId)) {
        emitSocketAuthError(socket, 'join-seller-room');
        return;
      }
      socket.join(`seller:${sellerId}`);
    });

    // Disconnect
    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
      if (socket.userId) {
        emitPresenceEvent('user-offline', socket.userId);
      }
    });

    // Error handling
    socket.on('error', (err: Error) => {
      logger.error('Socket error', { error: err.message, socketId: socket.id });
    });
  });

  logger.info('WebSocket server initialized');
  return io;
}

// Helper functions to emit events throughout the app
export function emitOrderUpdate(orderId: string, data: any) {
  io?.to(`order:${orderId}`).emit('order-updated', data);
}

export function emitNotification(userId: string, notification: any) {
  io?.to(`user:${userId}`).emit('notification', notification);
}

export function emitSellerNotification(sellerId: string, data: any) {
  io?.to(`seller:${sellerId}`).emit('seller-notification', data);
}

export function emitNewOrderToAdmin(data: any) {
  io?.to('role:ADMIN').emit('new-order', data);
  io?.to('role:SUPER_ADMIN').emit('new-order', data);
}

export function emitTrackingUpdate(orderId: string, status: string, location?: string) {
  io?.to(`order:${orderId}`).emit('tracking-update', {
    orderId,
    status,
    location,
    timestamp: new Date().toISOString(),
  });
}

export function emitDriverLocationUpdate(orderId: string, data: {
  deliveryId: string;
  deliveryPersonId: string;
  latitude: number;
  longitude: number;
  updatedAt: string;
}) {
  io?.to(`order:${orderId}`).emit('driver-location-update', {
    orderId,
    ...data,
  });
}

export function emitCurrencyRatesUpdated(data: {
  base: string;
  rates?: Record<string, number>;
  updatedAt: string;
}) {
  io?.to('public').emit('currency-rates-updated', data);
}

export function emitChatMessage(conversationId: string, message: any) {
  io?.to(`conversation:${conversationId}`).emit('chat-message', message);
}
