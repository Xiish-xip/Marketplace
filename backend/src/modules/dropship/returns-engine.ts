import { prisma } from '../../common/prisma';
import { AppError, NotFoundError } from '../../common/errors';
import { logger } from '../../common/logger';

type Actor = { userId: string; role: string };

type ReturnRequestInput = {
  orderId: string;
  reason: string;
  description?: string;
  evidence?: string[];
  refundMethod?: string;
  items?: Array<{
    orderItemId?: string;
    mappingId?: string;
    quantity: number;
    condition?: string;
  }>;
};

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function stringify(value: unknown) {
  return JSON.stringify(value ?? null);
}

export class ReturnsEngine {
  private canManage(actor: Actor) {
    return ['ADMIN', 'SUPER_ADMIN', 'SELLER'].includes(actor.role);
  }

  private async resolveMapping(orderItem: any, requestedMappingId?: string) {
    if (requestedMappingId) {
      const mapping = await prisma.dropshipProductMapping.findUnique({ where: { id: requestedMappingId }, include: { supplier: true } });
      if (mapping) return mapping;
    }
    return prisma.dropshipProductMapping.findFirst({
      where: { localProductId: orderItem.productId, isActive: true },
      include: { supplier: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async createReturnRequest(actor: Actor, data: ReturnRequestInput) {
    const order = await prisma.order.findUnique({
      where: { id: data.orderId },
      include: { items: { include: { product: true } } },
    });
    if (!order) throw new NotFoundError('Order');
    if (!this.canManage(actor) && order.userId !== actor.userId) throw new AppError(403, 'You can only return your own orders');

    const requestedItems: Array<{ orderItemId?: string; mappingId?: string; quantity: number; condition?: string }> = data.items?.length
      ? data.items
      : order.items.map((item) => ({ orderItemId: item.id, quantity: item.quantity }));
    const groups = new Map<string, { supplier: any | null; items: any[]; subtotal: number; restockingPercent: number; windowDays: number }>();
    const now = Date.now();

    for (const requested of requestedItems) {
      const orderItem = order.items.find((item) => item.id === requested.orderItemId) || order.items[0];
      if (!orderItem) continue;
      const mapping = await this.resolveMapping(orderItem, requested.mappingId);
      const supplier = mapping?.supplier || null;
      const metadata = parseJson<{ returnWindowDays?: number; restockingFeePercent?: number }>(supplier?.metadata, {});
      const windowDays = metadata.returnWindowDays || 30;
      const restockingPercent = metadata.restockingFeePercent || 0;
      const key = supplier?.id || 'UNASSIGNED';
      const quantity = Math.min(Math.max(1, Number(requested.quantity || 1)), orderItem.quantity);
      const unitPrice = orderItem.unitPrice;
      const current = groups.get(key) || { supplier, items: [], subtotal: 0, restockingPercent, windowDays };
      current.items.push({
        mappingId: mapping?.id,
        productTitle: orderItem.product?.title || parseJson<Record<string, any>>(orderItem.productSnapshot, {}).title || 'Returned item',
        quantity,
        unitPrice,
        refundAmount: unitPrice * quantity,
        condition: requested.condition || 'OPENED',
      });
      current.subtotal += unitPrice * quantity;
      groups.set(key, current);
    }

    if (!groups.size) throw new AppError(400, 'No returnable items were provided');

    const created: any[] = [];
    for (const group of groups.values()) {
      const daysSinceOrder = Math.floor((now - order.createdAt.getTime()) / (24 * 60 * 60 * 1000));
      const outsideWindow = daysSinceOrder > group.windowDays;
      const restockingFee = Number((group.subtotal * (group.restockingPercent / 100)).toFixed(2));
      const refundAmount = Number(Math.max(0, group.subtotal - restockingFee).toFixed(2));
      const excessiveReturns = await prisma.dropshipReturn.count({
        where: {
          userId: order.userId,
          createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
        },
      });

      const request = await prisma.dropshipReturn.create({
        data: {
          orderId: order.id,
          userId: order.userId,
          supplierId: group.supplier?.id,
          status: outsideWindow ? 'REJECTED' : excessiveReturns >= 5 ? 'PENDING_REVIEW' : 'PENDING',
          reason: data.reason,
          description: data.description,
          evidence: stringify(data.evidence || []),
          refundAmount,
          refundMethod: data.refundMethod || 'ORIGINAL',
          restockingFee,
          returnWindowDays: group.windowDays,
          adminNotes: outsideWindow ? `Outside ${group.windowDays}-day return window` : excessiveReturns >= 5 ? 'Excessive returner review flag' : null,
          disputeStatus: 'NONE',
          items: {
            create: group.items,
          },
        },
        include: { items: true },
      });
      created.push(request);
    }

    logger.info('Dropship return request created', { orderId: order.id, count: created.length });
    return { returns: created, splitCount: created.length };
  }

  async listReturns(actor: Actor, params: { status?: string; page?: number; limit?: number }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 50));
    const where: any = {};
    if (params.status) where.status = params.status;
    if (!this.canManage(actor)) where.userId = actor.userId;

    const [returns, total] = await Promise.all([
      prisma.dropshipReturn.findMany({
        where,
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.dropshipReturn.count({ where }),
    ]);

    return {
      returns: returns.map((item) => ({ ...item, evidence: parseJson(item.evidence, []) })),
      total,
      page,
      limit,
    };
  }

  async getReturn(actor: Actor, id: string) {
    const request = await prisma.dropshipReturn.findUnique({ where: { id }, include: { items: true } });
    if (!request) throw new NotFoundError('Dropship return');
    if (!this.canManage(actor) && request.userId !== actor.userId) throw new AppError(403, 'You can only view your own returns');
    return { ...request, evidence: parseJson(request.evidence, []) };
  }

  async approve(actor: Actor, id: string, notes?: string) {
    if (!this.canManage(actor)) throw new AppError(403, 'Only staff can approve returns');
    await this.getReturn(actor, id);
    return prisma.dropshipReturn.update({ where: { id }, data: { status: 'APPROVED', adminNotes: notes } });
  }

  async reject(actor: Actor, id: string, reason: string) {
    if (!this.canManage(actor)) throw new AppError(403, 'Only staff can reject returns');
    await this.getReturn(actor, id);
    return prisma.dropshipReturn.update({ where: { id }, data: { status: 'REJECTED', adminNotes: reason } });
  }

  async refund(actor: Actor, id: string, data: { amount?: number; method?: string }) {
    if (!this.canManage(actor)) throw new AppError(403, 'Only staff can process refunds');
    const request = await this.getReturn(actor, id);
    const refundAmount = Number(data.amount ?? request.refundAmount ?? 0);
    if (refundAmount <= 0) throw new AppError(400, 'Refund amount must be greater than zero');

    await prisma.dropshipEscrow.updateMany({
      where: { orderId: request.orderId, status: 'HELD' },
      data: { status: 'REFUNDED' },
    });

    return prisma.dropshipReturn.update({
      where: { id },
      data: {
        status: 'REFUNDED',
        refundAmount,
        refundMethod: data.method || request.refundMethod || 'ORIGINAL',
      },
    });
  }

  async generateReturnLabel(actor: Actor, id: string, carrierCode = 'USPS') {
    const request = await this.getReturn(actor, id);
    if (!this.canManage(actor) && request.status !== 'APPROVED') throw new AppError(400, 'Return must be approved before label generation');
    const trackingNumber = `RET${Date.now()}`;
    return {
      returnId: id,
      orderId: request.orderId,
      carrierCode,
      trackingNumber,
      labelUrl: `/api/dropship/returns/${id}/labels/${trackingNumber}.pdf`,
      emailedToCustomer: true,
      createdAt: new Date().toISOString(),
    };
  }

  async openDispute(actor: Actor, id: string, reason?: string) {
    const request = await this.getReturn(actor, id);
    return prisma.dropshipReturn.update({
      where: { id },
      data: {
        disputeStatus: 'OPEN',
        adminNotes: [request.adminNotes, reason].filter(Boolean).join('\n'),
      },
    });
  }

  async analytics(params: { supplierId?: string; from?: string; to?: string }) {
    const where: any = {};
    if (params.supplierId) where.supplierId = params.supplierId;
    if (params.from || params.to) {
      where.createdAt = {};
      if (params.from) where.createdAt.gte = new Date(params.from);
      if (params.to) where.createdAt.lte = new Date(params.to);
    }

    const [returns, orders] = await Promise.all([
      prisma.dropshipReturn.findMany({ where, include: { items: true } }),
      params.supplierId
        ? prisma.dropshipOrder.count({ where: { supplierId: params.supplierId } })
        : prisma.dropshipOrder.count(),
    ]);

    const byReason = returns.reduce<Record<string, number>>((acc, item) => {
      acc[item.reason] = (acc[item.reason] || 0) + 1;
      return acc;
    }, {});
    const bySupplier = returns.reduce<Record<string, { count: number; cost: number }>>((acc, item) => {
      const key = item.supplierId || 'UNASSIGNED';
      if (!acc[key]) acc[key] = { count: 0, cost: 0 };
      acc[key].count += 1;
      acc[key].cost += item.refundAmount || 0;
      return acc;
    }, {});

    return {
      totalReturns: returns.length,
      returnRate: orders ? Number(((returns.length / orders) * 100).toFixed(2)) : 0,
      refundCost: Number(returns.reduce((sum, item) => sum + (item.refundAmount || 0), 0).toFixed(2)),
      restockingFees: Number(returns.reduce((sum, item) => sum + item.restockingFee, 0).toFixed(2)),
      byReason,
      bySupplier,
      fraudFlags: returns.filter((item) => item.status === 'PENDING_REVIEW').length,
    };
  }
}

export const returnsEngine = new ReturnsEngine();
