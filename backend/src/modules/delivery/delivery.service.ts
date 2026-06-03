import { prisma } from '../../common/prisma';
import { AppError, NotFoundError, BadRequestError } from '../../common/errors';
import { emitNotification, emitTrackingUpdate, emitOrderUpdate, emitDriverLocationUpdate } from '../../common/socket';
import type { AuthPayload } from '../../common/middleware';

export class DeliveryService {
  // ── Delivery Person Management ──

  async registerDeliveryPerson(userId: string, data: {
    vehicleType?: string;
    serviceArea?: string;
    maxDistance?: number;
  }) {
    await prisma.user.update({
      where: { id: userId },
      data: { role: 'DELIVERY' },
    });

    return prisma.deliveryPerson.upsert({
      where: { userId },
      update: {
        vehicleType: data.vehicleType,
        isActive: true,
      },
      create: {
        userId,
        vehicleType: data.vehicleType,
        isActive: true,
      },
    });
  }

  async updateLocation(userId: string, latitude: number, longitude: number) {
    const person = await prisma.deliveryPerson.findUnique({ where: { userId } });
    if (!person) throw new NotFoundError('Delivery person not found');

    const updated = await prisma.deliveryPerson.update({
      where: { userId },
      data: {
        latitude,
        longitude,
        lastLocationUpdate: new Date(),
      },
    });

    // Notify via socket for active shipments
    const activeShipments = await prisma.shipment.findMany({
      where: { status: { in: ['PICKED_UP', 'IN_TRANSIT'] } },
      select: { id: true, orderId: true },
    });

    for (const shipment of activeShipments) {
      emitDriverLocationUpdate(shipment.orderId, {
        deliveryId: shipment.id,
        deliveryPersonId: person.id,
        latitude,
        longitude,
        updatedAt: updated.lastLocationUpdate?.toISOString() || new Date().toISOString(),
      });
    }

    return updated;
  }

  async updateStatus(userId: string, isAvailable: boolean) {
    const person = await prisma.deliveryPerson.findUnique({ where: { userId } });
    if (!person) throw new NotFoundError('Delivery person not found');

    return prisma.deliveryPerson.update({
      where: { userId },
      data: { isAvailable },
    });
  }

  async getProfile(userId: string) {
    const person = await prisma.deliveryPerson.findUnique({
      where: { userId },
    });
    if (!person) throw new NotFoundError('Delivery person not found');
    return person;
  }

  // ── Shipment/Delivery Tracking ──

  async getAvailableDeliveries() {
    return prisma.shipment.findMany({
      where: { status: 'PENDING' },
      include: {
        order: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, phone: true } },
            items: { include: { product: { select: { id: true, title: true, slug: true } } } },
            seller: { select: { storeName: true, storeLocation: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getMyDeliveries(userId: string) {
    // Find shipments for orders where this user is relevant
    return prisma.shipment.findMany({
      include: {
        order: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, phone: true } },
            items: { include: { product: { select: { id: true, title: true, slug: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDeliveryById(shipmentId: string) {
    const delivery = await prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: {
        order: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, phone: true } },
            items: { include: { product: { select: { id: true, title: true, slug: true } } } },
            seller: { select: { storeName: true, userId: true } },
          },
        },
      },
    });
    if (!delivery) throw new NotFoundError('Delivery not found');
    return delivery;
  }

  async getDeliveryByOrder(orderId: string, user: AuthPayload) {
    const delivery = await prisma.shipment.findFirst({
      where: { orderId },
      include: {
        order: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, phone: true } },
            seller: { select: { id: true, storeName: true, storeLocation: true, userId: true } },
            items: { include: { product: { select: { id: true, title: true, slug: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!delivery) throw new NotFoundError('Delivery not found for this order');

    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(user.role);
    const isCustomer = delivery.order.userId === user.userId;
    const isSeller = delivery.order.seller?.userId === user.userId;
    if (!isAdmin && !isCustomer && !isSeller) {
      throw new AppError(403, 'Not authorized');
    }

    return delivery;
  }

  // ── Delivery Workflow ──

  async acceptDelivery(deliveryId: string, userId: string) {
    const person = await prisma.deliveryPerson.findUnique({ where: { userId } });
    if (!person) throw new NotFoundError('Delivery person not found');

    const shipment = await prisma.shipment.findUnique({
      where: { id: deliveryId },
      include: { order: { include: { seller: true, user: true } } },
    });
    if (!shipment) throw new NotFoundError('Delivery not found');

    const updated = await prisma.shipment.update({
      where: { id: deliveryId },
      data: { status: 'PICKED_UP' },
    });

    await prisma.deliveryPerson.update({
      where: { id: person.id },
      data: { isAvailable: false },
    });

    if (shipment.order?.seller?.userId) {
      emitNotification(shipment.order.seller.userId, {
        type: 'DELIVERY_ACCEPTED',
        deliveryId,
        orderId: shipment.orderId,
      });
    }

    if (shipment.order?.user?.id) {
      emitNotification(shipment.order.user.id, {
        type: 'DELIVERY_ACCEPTED',
        deliveryId,
        orderId: shipment.orderId,
      });
    }

    emitOrderUpdate(shipment.orderId, {
      status: 'DELIVERY_ACCEPTED',
      deliveryId,
      message: 'Delivery person assigned',
    });

    return updated;
  }

  async markPickedUp(deliveryId: string) {
    const updated = await prisma.shipment.update({
      where: { id: deliveryId },
      data: { status: 'IN_TRANSIT' },
    });

    await prisma.order.update({
      where: { id: updated.orderId },
      data: { status: 'IN_TRANSIT' },
    });

    emitTrackingUpdate(updated.orderId, 'IN_TRANSIT', 'Package picked up');
    emitOrderUpdate(updated.orderId, { status: 'IN_TRANSIT', message: 'Package in transit' });

    return updated;
  }

  async markDelivered(deliveryId: string) {
    const shipment = await prisma.shipment.findUnique({
      where: { id: deliveryId },
      include: { order: { include: { user: true, seller: true } } },
    });
    if (!shipment) throw new NotFoundError('Delivery not found');

    const updated = await prisma.shipment.update({
      where: { id: deliveryId },
      data: { status: 'DELIVERED', deliveredAt: new Date() },
    });

    await prisma.order.update({
      where: { id: shipment.orderId },
      data: { status: 'AWAITING_CONFIRMATION' },
    });

    const events = shipment.events ? JSON.parse(shipment.events) : [];
    events.push({
      status: 'DELIVERED',
      location: 'Customer location',
      description: 'Package delivered, awaiting customer confirmation',
      timestamp: new Date().toISOString(),
    });
    await prisma.shipment.update({
      where: { id: shipment.id },
      data: { events: JSON.stringify(events) },
    });

    emitTrackingUpdate(shipment.orderId, 'DELIVERED', 'Package delivered');
    emitOrderUpdate(shipment.orderId, {
      status: 'AWAITING_CONFIRMATION',
      message: 'Delivered, awaiting customer confirmation',
    });

    return updated;
  }

  async confirmReceived(deliveryId: string, userId: string) {
    const shipment = await prisma.shipment.findUnique({
      where: { id: deliveryId },
      include: { order: { include: { seller: true, user: true } } },
    });
    if (!shipment) throw new NotFoundError('Delivery not found');
    if (shipment.order.userId !== userId) {
      const actor = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
      if (!actor || !['ADMIN', 'SUPER_ADMIN'].includes(actor.role)) {
        throw new BadRequestError('Only the customer can confirm receipt');
      }
    }

    const updated = await prisma.shipment.update({
      where: { id: deliveryId },
      data: { status: 'CONFIRMED' },
    });

    await prisma.order.update({
      where: { id: shipment.orderId },
      data: { status: 'DELIVERED', deliveredAt: new Date() },
    });

    const events = shipment.events ? JSON.parse(shipment.events) : [];
    events.push({
      status: 'CONFIRMED',
      location: 'Customer location',
      description: 'Customer confirmed receipt',
      timestamp: new Date().toISOString(),
    });
    await prisma.shipment.update({
      where: { id: shipment.id },
      data: { events: JSON.stringify(events) },
    });

    emitOrderUpdate(shipment.orderId, {
      status: 'DELIVERED',
      message: 'Customer confirmed receipt',
    });

    return updated;
  }

  // ── Admin: Create & Manage Deliveries ──

  async createDelivery(orderId: string, data: {
    courierCode?: string;
    origin?: string;
    destination?: string;
  }) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { seller: { select: { storeLocation: true } } },
    });
    if (!order) throw new NotFoundError('Order not found');

    const delivery = await prisma.shipment.create({
      data: {
        orderId,
        courierCode: data.courierCode || 'MANUAL',
        status: 'PENDING',
        origin: data.origin || order.seller?.storeLocation,
        destination: data.destination,
      },
      include: {
        order: {
          include: {
            items: { include: { product: { select: { id: true, title: true } } } },
            seller: { select: { storeName: true } },
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    return delivery;
  }

  async getAllDeliveries(query: { status?: string; page?: number; limit?: number }) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (query.status) where.status = query.status;

    const [deliveries, total] = await Promise.all([
      prisma.shipment.findMany({
        where,
        include: {
          order: {
            include: {
              user: { select: { id: true, firstName: true, lastName: true, phone: true } },
              seller: { select: { storeName: true, storeLocation: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.shipment.count({ where }),
    ]);

    return {
      data: deliveries,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getSellerDeliveries(userId: string, query: { status?: string; page?: number; limit?: number }) {
    const seller = await prisma.seller.findUnique({ where: { userId }, select: { id: true } });
    if (!seller) throw new NotFoundError('Seller profile not found');

    const page = Number(query.page || 1);
    const limit = Number(query.limit || 50);
    const skip = (page - 1) * limit;
    const where: any = { order: { sellerId: seller.id } };
    if (query.status) where.status = query.status;

    const [deliveries, total] = await Promise.all([
      prisma.shipment.findMany({
        where,
        include: {
          order: {
            include: {
              user: { select: { id: true, firstName: true, lastName: true, phone: true } },
              items: { include: { product: { select: { id: true, title: true } } } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.shipment.count({ where }),
    ]);

    return { data: deliveries, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getDeliveryPersons() {
    return prisma.deliveryPerson.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateDeliveryPerson(id: string, data: { isActive?: boolean; isAvailable?: boolean }) {
    return prisma.deliveryPerson.update({
      where: { id },
      data,
    });
  }

  async getDeliveryStats() {
    const [total, pending, inTransit, delivered, completed, drivers, activeDrivers] = await Promise.all([
      prisma.shipment.count(),
      prisma.shipment.count({ where: { status: 'PENDING' } }),
      prisma.shipment.count({ where: { status: 'IN_TRANSIT' } }),
      prisma.shipment.count({ where: { status: 'DELIVERED' } }),
      prisma.shipment.count({ where: { status: 'CONFIRMED' } }),
      prisma.deliveryPerson.count(),
      prisma.deliveryPerson.count({ where: { isActive: true, isAvailable: true } }),
    ]);

    return { total, pending, inTransit, delivered, completed, drivers, activeDrivers };
  }

  async getPayouts(query: { status?: string; page?: number; limit?: number }) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 50);
    const skip = (page - 1) * limit;
    const where: any = {};
    if (query.status) where.status = query.status;

    const [payouts, total] = await Promise.all([
      prisma.sellerPayout.findMany({
        where,
        include: {
          seller: { include: { user: { select: { firstName: true, lastName: true, phone: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.sellerPayout.count({ where }),
    ]);

    return { data: payouts, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async markPayoutPaid(id: string) {
    return prisma.sellerPayout.update({
      where: { id },
      data: { status: 'PAID', paidAt: new Date() },
    });
  }

  private async createNotification(userId: string, type: string, title: string, body: string, data: any) {
    try {
      await prisma.notification.create({
        data: { userId, type, title, body, data: JSON.stringify(data) },
      });
    } catch {
      // Silently fail
    }
  }
}

export const deliveryService = new DeliveryService();