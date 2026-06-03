import { prisma } from '../../common/prisma';
import { AppError, NotFoundError } from '../../common/errors';
import { shippingEngine } from '../dropship/shipping-engine';
import { financeEngine } from '../dropship/finance-engine';
import { dropshipAnalyticsEngine } from '../dropship/analytics-engine';

function stringify(value: unknown) {
  return JSON.stringify(value ?? null);
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export class SupplierPortalService {
  async resolveSupplier(userId: string, supplierId?: string) {
    if (supplierId) {
      const supplier = await prisma.dropshipSupplier.findUnique({ where: { id: supplierId } });
      if (!supplier) throw new NotFoundError('Supplier');
      return supplier;
    }

    const seller = await prisma.seller.findUnique({ where: { userId } });
    if (!seller) throw new NotFoundError('Seller profile');

    const supplier = await prisma.dropshipSupplier.findFirst({
      where: {
        OR: [
          { name: seller.storeName },
          { metadata: { contains: seller.id } },
          { metadata: { contains: userId } },
        ],
      },
      orderBy: { updatedAt: 'desc' },
    });
    if (!supplier) throw new AppError(404, 'No dropship supplier profile is linked to this seller');
    return supplier;
  }

  async dashboard(userId: string, supplierId?: string) {
    const supplier = await this.resolveSupplier(userId, supplierId);
    const [orders, products, payouts, invoices, scorecard] = await Promise.all([
      prisma.dropshipOrder.findMany({ where: { supplierId: supplier.id }, orderBy: { createdAt: 'desc' }, take: 10 }),
      prisma.dropshipProductMapping.count({ where: { supplierId: supplier.id, isActive: true } }),
      financeEngine.listPayouts({ supplierId: supplier.id, status: 'PENDING', limit: 10 }),
      financeEngine.listInvoices({ supplierId: supplier.id, limit: 10 }),
      dropshipAnalyticsEngine.supplierScorecard(supplier.id).catch(() => null),
    ]);
    return {
      supplier,
      stats: {
        revenue: Number(orders.reduce((sum, order) => sum + order.totalCost, 0).toFixed(2)),
        orders: orders.length,
        activeProducts: products,
        pendingPayout: payouts.payouts.reduce((sum, payout) => sum + payout.netAmount, 0),
        performanceScore: scorecard?.overallScore || 0,
      },
      recentOrders: orders,
      invoices: invoices.invoices,
      scorecard,
    };
  }

  async listProducts(userId: string, supplierId?: string) {
    const supplier = await this.resolveSupplier(userId, supplierId);
    return prisma.dropshipProductMapping.findMany({
      where: { supplierId: supplier.id },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
  }

  async createProduct(userId: string, data: any) {
    const supplier = await this.resolveSupplier(userId, data.supplierId);
    return prisma.dropshipProductMapping.create({
      data: {
        supplierId: supplier.id,
        supplierSku: data.supplierSku,
        supplierProductId: data.supplierProductId,
        supplierTitle: data.supplierTitle || data.title,
        supplierPrice: Number(data.supplierPrice || data.costPrice || 0),
        supplierCurrency: data.supplierCurrency || supplier.currency,
        costPrice: Number(data.costPrice || data.supplierPrice || 0),
        sellingPrice: Number(data.sellingPrice || data.supplierPrice || data.costPrice || 0),
        quantity: Number(data.quantity || 0),
        supplierUrl: data.supplierUrl,
        imageUrl: data.imageUrl,
        category: data.category,
        specifications: stringify(data.specifications || {}),
        autoSync: data.autoSync !== false,
      },
    });
  }

  async updateProduct(userId: string, id: string, data: any) {
    const mapping = await prisma.dropshipProductMapping.findUnique({ where: { id } });
    if (!mapping) throw new NotFoundError('Product mapping');
    await this.resolveSupplier(userId, mapping.supplierId);
    const { supplier, ...body } = data;
    if (body.specifications && typeof body.specifications !== 'string') body.specifications = stringify(body.specifications);
    return prisma.dropshipProductMapping.update({ where: { id }, data: body });
  }

  async deleteProduct(userId: string, id: string) {
    const mapping = await prisma.dropshipProductMapping.findUnique({ where: { id } });
    if (!mapping) throw new NotFoundError('Product mapping');
    await this.resolveSupplier(userId, mapping.supplierId);
    return prisma.dropshipProductMapping.update({ where: { id }, data: { isActive: false } });
  }

  async bulkUpload(userId: string, data: { supplierId?: string; rows?: any[] }) {
    const supplier = await this.resolveSupplier(userId, data.supplierId);
    const rows = (data.rows || []).slice(0, 1000);
    let imported = 0;
    const errors: string[] = [];
    for (const row of rows) {
      try {
        await prisma.dropshipProductMapping.upsert({
          where: { supplierSku: row.supplierSku || row.sku },
          create: {
            supplierId: supplier.id,
            supplierSku: row.supplierSku || row.sku,
            supplierProductId: row.supplierProductId,
            supplierTitle: row.supplierTitle || row.title,
            supplierPrice: Number(row.supplierPrice || row.costPrice || 0),
            supplierCurrency: row.currency || supplier.currency,
            costPrice: Number(row.costPrice || row.supplierPrice || 0),
            sellingPrice: Number(row.sellingPrice || row.price || 0),
            quantity: Number(row.quantity || row.stock || 0),
            category: row.category,
            imageUrl: row.imageUrl,
            specifications: stringify(row.specifications || {}),
          },
          update: {
            supplierTitle: row.supplierTitle || row.title,
            supplierPrice: Number(row.supplierPrice || row.costPrice || 0),
            costPrice: Number(row.costPrice || row.supplierPrice || 0),
            sellingPrice: Number(row.sellingPrice || row.price || 0),
            quantity: Number(row.quantity || row.stock || 0),
            updatedAt: new Date(),
          },
        });
        imported += 1;
      } catch (error) {
        errors.push(error instanceof Error ? error.message : 'Row failed');
      }
    }
    return { supplierId: supplier.id, imported, failed: errors.length, errors };
  }

  async listOrders(userId: string, supplierId?: string) {
    const supplier = await this.resolveSupplier(userId, supplierId);
    return prisma.dropshipOrder.findMany({ where: { supplierId: supplier.id }, orderBy: { createdAt: 'desc' }, take: 100 });
  }

  async updateOrderStatus(userId: string, orderId: string, status: string, data: any = {}) {
    const order = await prisma.dropshipOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundError('Dropship order');
    await this.resolveSupplier(userId, order.supplierId);
    const updated = await prisma.dropshipOrder.update({
      where: { id: orderId },
      data: {
        status,
        trackingUrl: data.trackingUrl || order.trackingUrl,
        errorLog: data.reason || null,
      },
    });
    if (status === 'SHIPPED' && data.trackingNumber) {
      await prisma.dropshipTracking.create({
        data: {
          orderId: order.localOrderId,
          dropshipOrderId: order.id,
          carrierCode: data.carrierCode || 'CUSTOM',
          trackingNumber: data.trackingNumber,
          status: 'SHIPPED',
          events: stringify([{ status: 'SHIPPED', description: 'Supplier entered tracking number', at: new Date().toISOString() }]),
          lastCheckedAt: new Date(),
        },
      });
    }
    return updated;
  }

  async generateLabel(userId: string, orderId: string, carrierCode?: string) {
    const order = await prisma.dropshipOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundError('Dropship order');
    await this.resolveSupplier(userId, order.supplierId);
    return shippingEngine.generateLabel({ dropshipOrderId: orderId, carrierCode });
  }

  async payouts(userId: string, supplierId?: string) {
    const supplier = await this.resolveSupplier(userId, supplierId);
    const [payouts, invoices] = await Promise.all([
      financeEngine.listPayouts({ supplierId: supplier.id, limit: 50 }),
      financeEngine.listInvoices({ supplierId: supplier.id, limit: 50 }),
    ]);
    return { payouts: payouts.payouts, invoices: invoices.invoices };
  }

  async analytics(userId: string, supplierId?: string) {
    const supplier = await this.resolveSupplier(userId, supplierId);
    const [scorecard, products, profit] = await Promise.all([
      dropshipAnalyticsEngine.supplierScorecard(supplier.id),
      dropshipAnalyticsEngine.productPerformance({ supplierId: supplier.id, limit: 25 }),
      financeEngine.profitReport({ supplierId: supplier.id }),
    ]);
    return { scorecard, products: products.products, profit };
  }

  async messages(userId: string) {
    return prisma.conversation.findMany({
      where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
      include: { messages: { orderBy: { createdAt: 'desc' }, take: 5 } },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });
  }

  async settings(userId: string, supplierId?: string) {
    const supplier = await this.resolveSupplier(userId, supplierId);
    const metadata = parseJson<Record<string, any>>(supplier.metadata, {});
    return {
      supplier: { ...supplier, metadata },
      shippingZones: await prisma.dropshipShippingZone.findMany({ where: { isActive: true } }),
      returnPolicy: metadata.returnPolicy || null,
      warehouseAddresses: metadata.warehouseAddresses || [],
    };
  }

  async updateSettings(userId: string, data: any) {
    const supplier = await this.resolveSupplier(userId, data.supplierId);
    const metadata = { ...parseJson<Record<string, any>>(supplier.metadata, {}), ...(data.metadata || {}) };
    return prisma.dropshipSupplier.update({
      where: { id: supplier.id },
      data: {
        storeUrl: data.storeUrl ?? supplier.storeUrl,
        apiEndpoint: data.apiEndpoint ?? supplier.apiEndpoint,
        currency: data.currency ?? supplier.currency,
        metadata: stringify(metadata),
      },
    });
  }
}

export const supplierPortalService = new SupplierPortalService();
