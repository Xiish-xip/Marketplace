import { prisma } from '../../common/prisma';
import { AppError, NotFoundError } from '../../common/errors';
import { logger } from '../../common/logger';
import { getIO } from '../../common/socket';
import { integrationEngine } from '../providers/integration-engine';
import { ProviderAddress, ProviderOrderItem } from '../providers/base-adapter';

type FulfillmentOptions = {
  force?: boolean;
  notes?: string;
  highValueThreshold?: number;
};

type FulfillmentItem = {
  orderItemId: string;
  productId: string;
  mappingId: string;
  supplierId: string;
  supplierSku: string;
  supplierProductId?: string | null;
  variantId: string;
  quantity: number;
  unitCost: number;
  status: string;
  notes?: string;
  preorder: boolean;
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

export class FulfillmentEngine {
  private emit(event: string, payload: Record<string, unknown>) {
    getIO()?.to('role:ADMIN').emit(event, payload);
    getIO()?.to('role:SUPER_ADMIN').emit(event, payload);
    if (payload.orderId) getIO()?.to(`order:${payload.orderId}`).emit(event, payload);
  }

  private normalizeAddress(order: any): ProviderAddress {
    const rawAddress = parseJson<Record<string, any>>(order.shippingAddress, {});
    const fallback = order.user?.addresses?.find((address: any) => address.isDefault) || order.user?.addresses?.[0] || {};

    const firstName = rawAddress.firstName || order.user?.firstName || 'Customer';
    const lastName = rawAddress.lastName || order.user?.lastName || '-';
    const country = rawAddress.country || fallback.country;
    const city = rawAddress.city || fallback.city;
    const address = rawAddress.address || rawAddress.street || fallback.street;

    if (!country || !city || !address) {
      throw new AppError(400, 'Complete shipping address is required before fulfillment');
    }

    return {
      firstName,
      lastName,
      phone: rawAddress.phone || fallback.phone || '',
      country,
      state: rawAddress.state || fallback.state || '',
      city,
      address,
      zipCode: rawAddress.zipCode || rawAddress.postalCode || fallback.zipCode || '',
      email: order.user?.email || rawAddress.email,
    };
  }

  private async assessOrderRisk(order: any, highValueThreshold = 1000) {
    const previousOrders = await prisma.order.count({ where: { userId: order.userId } });
    const address = parseJson<Record<string, any>>(order.shippingAddress, {});
    const reasons: string[] = [];

    if (Number(order.totalAmount || 0) >= highValueThreshold) reasons.push('HIGH_VALUE_ORDER');
    if (previousOrders <= 1 && Number(order.totalAmount || 0) >= highValueThreshold * 0.25) reasons.push('NEW_CUSTOMER');
    if (!address.country || !address.city || !(address.address || address.street)) reasons.push('UNUSUAL_OR_INCOMPLETE_ADDRESS');

    return {
      hold: reasons.length > 0,
      reasons,
      score: Math.min(100, reasons.length * 35),
    };
  }

  private async buildSupplierGroups(order: any, notes?: string) {
    const groups = new Map<string, { supplier: any; items: FulfillmentItem[] }>();
    const unmapped: any[] = [];

    for (const item of order.items || []) {
      const mapping = await prisma.dropshipProductMapping.findFirst({
        where: { localProductId: item.productId, isActive: true },
        include: { supplier: true },
        orderBy: { updatedAt: 'desc' },
      });

      if (!mapping?.supplier) {
        unmapped.push({ orderItemId: item.id, productId: item.productId, reason: 'NO_MAPPING' });
        continue;
      }

      const specifications = parseJson<{ variants?: Array<{ id?: string; sku?: string }>; warehouses?: Array<{ id?: string }>; shippingMethods?: Array<{ id?: string }> }>(
        mapping.specifications,
        { variants: [] },
      );
      const variantId = specifications.variants?.[0]?.sku || specifications.variants?.[0]?.id || mapping.supplierSku;
      const preorder = mapping.quantity < item.quantity;

      const fulfillmentItem: FulfillmentItem = {
        orderItemId: item.id,
        productId: item.productId,
        mappingId: mapping.id,
        supplierId: mapping.supplierId,
        supplierSku: mapping.supplierSku,
        supplierProductId: mapping.supplierProductId,
        variantId,
        quantity: item.quantity,
        unitCost: mapping.costPrice,
        status: preorder ? 'PREORDER' : 'PENDING',
        notes,
        preorder,
      };

      const current = groups.get(mapping.supplierId) || { supplier: mapping.supplier, items: [] };
      current.items.push(fulfillmentItem);
      groups.set(mapping.supplierId, current);
    }

    return { groups: Array.from(groups.values()), unmapped };
  }

  private async findConnectionForSupplier(supplier: any) {
    const metadata = parseJson<{ connectionId?: string }>(supplier.metadata, {});
    if (metadata.connectionId) {
      const exact = await prisma.providerConnection.findFirst({
        where: { id: metadata.connectionId, isActive: true },
        include: { adapter: true },
      });
      if (exact) return exact;
    }

    return prisma.providerConnection.findFirst({
      where: {
        isActive: true,
        isVerified: true,
        adapter: { provider: supplier.provider },
      },
      include: { adapter: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  private async placeSupplierOrder(params: {
    fulfillmentId: string;
    order: any;
    supplier: any;
    items: FulfillmentItem[];
    notes?: string;
  }) {
    const { fulfillmentId, order, supplier, items, notes } = params;
    const connection = await this.findConnectionForSupplier(supplier);

    if (!connection) {
      const message = `No active verified connection found for ${supplier.provider}`;
      await prisma.dropshipFulfillment.update({
        where: { id: fulfillmentId },
        data: { status: 'FAILED', errorLog: message },
      });
      throw new AppError(400, message);
    }

    const adapter = integrationEngine.getAdapter(connection.adapter.provider);
    const config = {
      ...parseJson<Record<string, any>>(connection.config, {}),
      ...parseJson<Record<string, any>>(connection.credentials, {}),
    };
    const shippingAddress = this.normalizeAddress(order);
    const providerItems: ProviderOrderItem[] = items.map((item) => ({
      productId: item.supplierProductId || item.supplierSku,
      variantId: item.variantId,
      quantity: item.quantity,
      unitPrice: item.unitCost,
      sku: item.supplierSku,
    }));

    const firstMapping = await prisma.dropshipProductMapping.findUnique({ where: { id: items[0].mappingId } });
    const firstSpec = parseJson<{ warehouses?: Array<{ id?: string }>; shippingMethods?: Array<{ id?: string }> }>(firstMapping?.specifications, {});

    const result = await adapter.placeOrder(config, {
      products: providerItems,
      shippingAddress,
      shippingMethodId: firstSpec.shippingMethods?.[0]?.id || '',
      warehouseId: firstSpec.warehouses?.[0]?.id || '',
      referenceNumber: `${order.orderNumber}-${supplier.id.slice(0, 8)}`,
    });

    const subtotal = items.reduce((sum, item) => sum + item.unitCost * item.quantity, 0);
    const dropshipOrder = await prisma.dropshipOrder.create({
      data: {
        supplierId: supplier.id,
        localOrderId: order.id,
        supplierOrderId: result.providerOrderId,
        items: stringify(items.map((item) => ({ sku: item.supplierSku, qty: item.quantity, price: item.unitCost, notes }))),
        subtotal,
        shippingCost: result.totalCost ? Math.max(0, result.totalCost - subtotal) : 0,
        totalCost: result.totalCost || subtotal,
        currency: result.currency || supplier.currency || 'USD',
        status: result.status || 'SUPPLIER_ACCEPTED',
        trackingUrl: result.trackingUrl || null,
        estimatedDays: result.estimatedDelivery ? null : undefined,
      },
    });

    const nextItems = items.map((item) => ({ ...item, status: 'SUPPLIER_ACCEPTED' }));
    const fulfillment = await prisma.dropshipFulfillment.update({
      where: { id: fulfillmentId },
      data: {
        supplierOrderId: result.providerOrderId,
        status: 'SUPPLIER_ACCEPTED',
        trackingNumber: result.trackingNumber || null,
        items: stringify(nextItems),
        errorLog: null,
      },
    });

    this.emit('dropship:fulfillment-updated', {
      orderId: order.id,
      fulfillmentId,
      status: fulfillment.status,
      supplierOrderId: result.providerOrderId,
    });

    logger.info('Dropship fulfillment routed to supplier', {
      orderId: order.id,
      fulfillmentId,
      supplierId: supplier.id,
      dropshipOrderId: dropshipOrder.id,
    });

    return { fulfillment, dropshipOrder };
  }

  async autoRouteOrder(orderId: string, options: FulfillmentOptions = {}) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        user: { include: { addresses: true } },
      },
    });
    if (!order) throw new NotFoundError('Order');

    const paidStatuses = new Set(['PAID', 'COMPLETED', 'CAPTURED', 'SUCCEEDED']);
    if (!options.force && !paidStatuses.has(String(order.paymentStatus || '').toUpperCase())) {
      throw new AppError(400, 'Order must be paid before auto-routing to suppliers');
    }

    const risk = await this.assessOrderRisk(order, options.highValueThreshold);
    const { groups, unmapped } = await this.buildSupplierGroups(order, options.notes || order.notes || undefined);
    if (!groups.length && !unmapped.length) throw new AppError(400, 'Order has no dropshippable items');

    const created: any[] = [];

    for (const group of groups) {
      const hasPreorder = group.items.some((item) => item.preorder);
      const initialStatus = risk.hold && !options.force ? 'ON_HOLD' : hasPreorder ? 'PREORDER' : 'PROCESSING';
      const fulfillment = await prisma.dropshipFulfillment.create({
        data: {
          orderId,
          status: initialStatus,
          items: stringify(group.items),
          errorLog: risk.hold && !options.force ? stringify({ risk }) : null,
        },
      });

      this.emit('dropship:fulfillment-updated', {
        orderId,
        fulfillmentId: fulfillment.id,
        status: initialStatus,
        risk,
      });

      if (initialStatus === 'PROCESSING') {
        try {
          created.push(await this.placeSupplierOrder({
            fulfillmentId: fulfillment.id,
            order,
            supplier: group.supplier,
            items: group.items,
            notes: options.notes,
          }));
        } catch (error) {
          created.push({
            fulfillmentId: fulfillment.id,
            status: 'FAILED',
            message: error instanceof Error ? error.message : 'Fulfillment failed',
          });
        }
      } else {
        created.push(fulfillment);
      }
    }

    for (const item of unmapped) {
      created.push(await prisma.dropshipFulfillment.create({
        data: {
          orderId,
          status: 'FAILED',
          items: stringify([item]),
          errorLog: 'No dropship product mapping found for one or more order items',
        },
      }));
    }

    return {
      orderId,
      risk,
      splitCount: groups.length,
      unmapped,
      fulfillments: created,
    };
  }

  async batchProcess(orderIds: string[], options: FulfillmentOptions = {}) {
    const uniqueOrderIds = Array.from(new Set(orderIds)).slice(0, 500);
    const results: any[] = [];

    for (const orderId of uniqueOrderIds) {
      try {
        results.push({ orderId, success: true, data: await this.autoRouteOrder(orderId, options) });
      } catch (error) {
        results.push({ orderId, success: false, message: error instanceof Error ? error.message : 'Batch item failed' });
      }
    }

    return {
      processed: results.length,
      succeeded: results.filter((result) => result.success).length,
      failed: results.filter((result) => !result.success).length,
      results,
    };
  }

  async getQueue(params: { status?: string; page?: number; limit?: number }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 50));
    const where: any = {};
    if (params.status) where.status = params.status;

    const [fulfillments, total] = await Promise.all([
      prisma.dropshipFulfillment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.dropshipFulfillment.count({ where }),
    ]);

    return {
      fulfillments: fulfillments.map((fulfillment) => ({
        ...fulfillment,
        items: parseJson<any[]>(fulfillment.items, []),
        errorLog: parseJson<any>(fulfillment.errorLog, fulfillment.errorLog),
      })),
      total,
      page,
      limit,
    };
  }

  async getFulfillment(id: string) {
    const fulfillment = await prisma.dropshipFulfillment.findUnique({ where: { id } });
    if (!fulfillment) throw new NotFoundError('Fulfillment');
    return {
      ...fulfillment,
      items: parseJson<any[]>(fulfillment.items, []),
      errorLog: parseJson<any>(fulfillment.errorLog, fulfillment.errorLog),
      timeline: this.buildTimeline(fulfillment),
    };
  }

  private buildTimeline(fulfillment: any) {
    const timeline = [
      { label: 'Payment', status: 'COMPLETE', at: fulfillment.createdAt },
      { label: 'Processing', status: ['PROCESSING', 'SUPPLIER_ACCEPTED', 'SHIPPED', 'DELIVERED'].includes(fulfillment.status) ? 'COMPLETE' : 'PENDING' },
      { label: 'Supplier Accepted', status: ['SUPPLIER_ACCEPTED', 'SHIPPED', 'DELIVERED'].includes(fulfillment.status) ? 'COMPLETE' : 'PENDING' },
      { label: 'Shipped', status: fulfillment.shippedAt ? 'COMPLETE' : 'PENDING', at: fulfillment.shippedAt },
      { label: 'Delivered', status: fulfillment.deliveredAt ? 'COMPLETE' : 'PENDING', at: fulfillment.deliveredAt },
    ];
    if (fulfillment.status === 'ON_HOLD') timeline.splice(1, 0, { label: 'Manual Review', status: 'ACTIVE', at: fulfillment.updatedAt });
    return timeline;
  }

  async holdFulfillment(id: string, reason?: string) {
    const fulfillment = await prisma.dropshipFulfillment.update({
      where: { id },
      data: {
        status: 'ON_HOLD',
        errorLog: stringify({ reason: reason || 'Manual review requested', heldAt: new Date().toISOString() }),
      },
    });
    this.emit('dropship:fulfillment-updated', { orderId: fulfillment.orderId, fulfillmentId: id, status: fulfillment.status });
    return fulfillment;
  }

  async releaseFulfillment(id: string) {
    const fulfillment = await prisma.dropshipFulfillment.findUnique({ where: { id } });
    if (!fulfillment) throw new NotFoundError('Fulfillment');
    const items = parseJson<FulfillmentItem[]>(fulfillment.items, []);
    const supplierId = items[0]?.supplierId;
    if (!fulfillment.orderId || !supplierId) {
      return prisma.dropshipFulfillment.update({ where: { id }, data: { status: 'PENDING', errorLog: null } });
    }

    const [order, supplier] = await Promise.all([
      prisma.order.findUnique({
        where: { id: fulfillment.orderId },
        include: { items: true, user: { include: { addresses: true } } },
      }),
      prisma.dropshipSupplier.findUnique({ where: { id: supplierId } }),
    ]);
    if (!order) throw new NotFoundError('Order');
    if (!supplier) throw new NotFoundError('Supplier');

    await prisma.dropshipFulfillment.update({ where: { id }, data: { status: 'PROCESSING', errorLog: null } });
    return this.placeSupplierOrder({ fulfillmentId: id, order, supplier, items });
  }
}

export const fulfillmentEngine = new FulfillmentEngine();
