import { prisma } from '../../common/prisma';
import { AppError, NotFoundError } from '../../common/errors';
import { logger } from '../../common/logger';
import { getIO } from '../../common/socket';
import { integrationEngine } from '../providers/integration-engine';

type SyncType = 'INVENTORY' | 'PRICE' | 'FULL';

type ScheduleConfig = {
  connectionId?: string;
  intervalMinutes?: number;
  type?: SyncType;
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

export class InventorySyncEngine {
  private schedules = new Map<string, ReturnType<typeof setInterval>>();

  private emit(event: string, payload: Record<string, unknown>) {
    getIO()?.to('role:ADMIN').emit(event, payload);
    getIO()?.to('role:SUPER_ADMIN').emit(event, payload);
    if (payload.supplierId) getIO()?.to(`supplier:${payload.supplierId}`).emit(event, payload);
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

  async startScheduledSync(config: ScheduleConfig = {}) {
    const intervalMinutes = [15, 30, 60, 1440].includes(Number(config.intervalMinutes))
      ? Number(config.intervalMinutes)
      : 30;
    const key = config.connectionId || 'all';

    this.stopScheduledSync(key);

    const run = () => {
      if (config.connectionId) {
        this.forceSyncConnection(config.connectionId, config.type || 'INVENTORY')
          .catch((error) => logger.error('Scheduled dropship sync failed', { error: error.message, connectionId: config.connectionId }));
      } else {
        this.syncAllConnections(config.type || 'INVENTORY')
          .catch((error) => logger.error('Scheduled dropship sync failed', { error: error.message }));
      }
    };

    run();
    const timer = setInterval(run, intervalMinutes * 60 * 1000);
    this.schedules.set(key, timer);
    return { key, intervalMinutes, type: config.type || 'INVENTORY', active: true };
  }

  stopScheduledSync(key = 'all') {
    const timer = this.schedules.get(key);
    if (timer) clearInterval(timer);
    this.schedules.delete(key);
    return { key, active: false };
  }

  listSchedules() {
    return Array.from(this.schedules.keys()).map((key) => ({ key, active: true }));
  }

  async syncAllConnections(type: SyncType = 'INVENTORY') {
    const connections = await prisma.providerConnection.findMany({
      where: { isActive: true, isVerified: true },
      include: { adapter: true },
    });
    const results: any[] = [];
    for (const connection of connections) {
      results.push(await this.forceSyncConnection(connection.id, type));
    }
    return results;
  }

  async forceSyncConnection(connectionId: string, type: SyncType = 'INVENTORY') {
    const connection = await prisma.providerConnection.findUnique({
      where: { id: connectionId },
      include: { adapter: true },
    });
    if (!connection) throw new NotFoundError('Provider connection');

    const supplier = await prisma.dropshipSupplier.findFirst({
      where: { provider: connection.adapter.provider, name: connection.name },
    });
    const totalItems = supplier
      ? await prisma.dropshipProductMapping.count({ where: { supplierId: supplier.id, isActive: true } })
      : 0;

    const job = await prisma.dropshipSyncJob.create({
      data: {
        connectionId,
        supplierId: supplier?.id,
        type,
        status: 'RUNNING',
        totalItems,
        startedAt: new Date(),
      },
    });

    const errors: string[] = [];
    let syncedItems = 0;
    let failedItems = 0;

    try {
      if (type === 'INVENTORY' || type === 'FULL') {
        const result = await integrationEngine.syncInventory(connectionId);
        syncedItems += result.updated || 0;
        errors.push(...(result.errors || []));
      }
      if (type === 'PRICE' || type === 'FULL') {
        const result = await integrationEngine.syncPricing(connectionId);
        syncedItems += result.updated || 0;
        errors.push(...(result.errors || []));
      }

      if (supplier) await this.evaluateSupplierInventory(supplier.id);
      failedItems = errors.length;
    } catch (error) {
      failedItems += 1;
      errors.push(error instanceof Error ? error.message : 'Sync failed');
    }

    const updatedJob = await prisma.dropshipSyncJob.update({
      where: { id: job.id },
      data: {
        status: errors.length && syncedItems === 0 ? 'FAILED' : 'COMPLETED',
        syncedItems,
        failedItems,
        errors: errors.length ? stringify(errors.slice(0, 50)) : null,
        completedAt: new Date(),
      },
    });

    this.emit('dropship:inventory-sync-complete', {
      connectionId,
      supplierId: supplier?.id,
      jobId: updatedJob.id,
      status: updatedJob.status,
      syncedItems,
      failedItems,
    });

    return updatedJob;
  }

  async forceSyncProducts(mappingIds: string[]) {
    const mappings = await prisma.dropshipProductMapping.findMany({
      where: { id: { in: mappingIds.slice(0, 500) }, isActive: true },
      include: { supplier: true },
    });
    if (!mappings.length) throw new AppError(400, 'No active product mappings found');

    const job = await prisma.dropshipSyncJob.create({
      data: {
        type: 'INVENTORY',
        status: 'RUNNING',
        totalItems: mappings.length,
        startedAt: new Date(),
      },
    });

    const errors: string[] = [];
    let syncedItems = 0;
    let failedItems = 0;
    const bySupplier = new Map<string, typeof mappings>();

    for (const mapping of mappings) {
      bySupplier.set(mapping.supplierId, [...(bySupplier.get(mapping.supplierId) || []), mapping]);
    }

    for (const supplierMappings of bySupplier.values()) {
      const supplier = supplierMappings[0].supplier;
      const connection = await this.findConnectionForSupplier(supplier);
      if (!connection) {
        failedItems += supplierMappings.length;
        errors.push(`No active connection for supplier ${supplier.name}`);
        continue;
      }

      try {
        const adapter = integrationEngine.getAdapter(connection.adapter.provider);
        const config = {
          ...parseJson<Record<string, any>>(connection.config, {}),
          ...parseJson<Record<string, any>>(connection.credentials, {}),
        };
        const stockMap = await adapter.syncInventory(config, supplierMappings.map((mapping) => mapping.supplierSku));
        for (const mapping of supplierMappings) {
          const nextStock = stockMap.get(mapping.supplierSku);
          if (typeof nextStock === 'number') {
            await prisma.dropshipProductMapping.update({
              where: { id: mapping.id },
              data: { quantity: nextStock, lastSyncedAt: new Date() },
            });
            syncedItems += 1;
            await this.evaluateMappingInventory(mapping.id, nextStock);
          }
        }
      } catch (error) {
        failedItems += supplierMappings.length;
        errors.push(error instanceof Error ? error.message : 'Product sync failed');
      }
    }

    const updatedJob = await prisma.dropshipSyncJob.update({
      where: { id: job.id },
      data: {
        status: failedItems && syncedItems === 0 ? 'FAILED' : 'COMPLETED',
        syncedItems,
        failedItems,
        errors: errors.length ? stringify(errors.slice(0, 50)) : null,
        completedAt: new Date(),
      },
    });

    this.emit('dropship:inventory-products-synced', { jobId: updatedJob.id, syncedItems, failedItems });
    return updatedJob;
  }

  private async evaluateSupplierInventory(supplierId: string) {
    const mappings = await prisma.dropshipProductMapping.findMany({ where: { supplierId, isActive: true } });
    for (const mapping of mappings) {
      await this.evaluateMappingInventory(mapping.id, mapping.quantity);
    }
  }

  async evaluateMappingInventory(mappingId: string, stock?: number) {
    const mapping = await prisma.dropshipProductMapping.findUnique({ where: { id: mappingId } });
    if (!mapping) throw new NotFoundError('Product mapping');
    const currentStock = typeof stock === 'number' ? stock : mapping.quantity;
    const threshold = await this.getLowStockThreshold(mapping);

    if (mapping.localProductId) {
      if (currentStock <= 0) {
        await prisma.product.update({ where: { id: mapping.localProductId }, data: { isActive: false, status: 'PAUSED' } }).catch(() => undefined);
      } else if (currentStock > threshold) {
        await prisma.product.update({ where: { id: mapping.localProductId }, data: { isActive: true, status: 'ACTIVE' } }).catch(() => undefined);
      }
    }

    if (currentStock <= 0) {
      await this.createAlert(mapping.id, 'OUT_OF_STOCK', threshold);
    } else if (currentStock <= threshold) {
      await this.createAlert(mapping.id, 'LOW_STOCK', threshold);
    } else {
      await prisma.dropshipInventoryAlert.updateMany({
        where: { mappingId: mapping.id, resolvedAt: null, type: { in: ['LOW_STOCK', 'OUT_OF_STOCK'] } },
        data: { resolvedAt: new Date() },
      });
      await this.notifyBackInStock(mapping.id);
    }

    this.emit('dropship:inventory-updated', {
      mappingId: mapping.id,
      supplierId: mapping.supplierId,
      quantity: currentStock,
      threshold,
    });

    return { mappingId: mapping.id, quantity: currentStock, threshold };
  }

  private async getLowStockThreshold(mapping: any) {
    if (!mapping.localProductId) return 5;
    const variants = await prisma.productVariant.findMany({ where: { productId: mapping.localProductId, isActive: true } });
    if (!variants.length) return 5;
    return Math.max(1, Math.min(...variants.map((variant) => variant.lowStockThreshold || 5)));
  }

  private async createAlert(mappingId: string, type: string, threshold?: number) {
    const existing = await prisma.dropshipInventoryAlert.findFirst({
      where: { mappingId, type, resolvedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) return existing;
    return prisma.dropshipInventoryAlert.create({
      data: {
        mappingId,
        type,
        threshold,
        notifiedAt: new Date(),
      },
    });
  }

  private async notifyBackInStock(mappingId: string) {
    const subscribers = await prisma.dropshipBackInStock.findMany({ where: { mappingId, notified: false } });
    for (const subscriber of subscribers) {
      await prisma.notification.create({
        data: {
          userId: subscriber.userId,
          type: 'BACK_IN_STOCK',
          title: 'Back in stock',
          body: 'A dropship product you subscribed to is available again.',
          data: stringify({ mappingId, email: subscriber.email }),
        },
      }).catch(() => undefined);
      await prisma.dropshipBackInStock.update({ where: { id: subscriber.id }, data: { notified: true } });
    }
    if (subscribers.length) await this.createAlert(mappingId, 'BACK_IN_STOCK');
  }

  async subscribeBackInStock(mappingId: string, userId: string, email?: string) {
    const mapping = await prisma.dropshipProductMapping.findUnique({ where: { id: mappingId } });
    if (!mapping) throw new NotFoundError('Product mapping');
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User');

    return prisma.dropshipBackInStock.create({
      data: {
        mappingId,
        userId,
        email: email || user.email || '',
      },
    });
  }

  async getJobs(params: { status?: string; type?: SyncType; page?: number; limit?: number }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 50));
    const where: any = {};
    if (params.status) where.status = params.status;
    if (params.type) where.type = params.type;

    const [jobs, total] = await Promise.all([
      prisma.dropshipSyncJob.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.dropshipSyncJob.count({ where }),
    ]);

    return {
      jobs: jobs.map((job) => ({ ...job, errors: parseJson<any[]>(job.errors, []) })),
      total,
      page,
      limit,
    };
  }

  async getAlerts(params: { type?: string; openOnly?: boolean; page?: number; limit?: number }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 50));
    const where: any = {};
    if (params.type) where.type = params.type;
    if (params.openOnly) where.resolvedAt = null;
    const [alerts, total] = await Promise.all([
      prisma.dropshipInventoryAlert.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.dropshipInventoryAlert.count({ where }),
    ]);
    return { alerts, total, page, limit };
  }

  async calculateSafetyStock(mappingId: string) {
    const mapping = await prisma.dropshipProductMapping.findUnique({ where: { id: mappingId }, include: { supplier: true } });
    if (!mapping) throw new NotFoundError('Product mapping');
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const items = mapping.localProductId
      ? await prisma.orderItem.findMany({
          where: { productId: mapping.localProductId, order: { createdAt: { gte: since } } },
          select: { quantity: true },
        })
      : [];
    const sold = items.reduce((sum, item) => sum + item.quantity, 0);
    const salesVelocity = sold / 30;
    const leadTime = parseJson<{ leadTimeDays?: number }>(mapping.supplier.metadata, {}).leadTimeDays || 7;
    const safetyStock = Math.ceil(salesVelocity * leadTime * 1.5);
    return { mappingId, soldLast30Days: sold, salesVelocity, leadTimeDays: leadTime, safetyStock };
  }

  async supplierHealth(supplierId: string) {
    const supplier = await prisma.dropshipSupplier.findUnique({ where: { id: supplierId } });
    if (!supplier) throw new NotFoundError('Supplier');
    const [mappings, outOfStockAlerts, syncJobs] = await Promise.all([
      prisma.dropshipProductMapping.findMany({ where: { supplierId, isActive: true } }),
      prisma.dropshipInventoryAlert.count({
        where: {
          type: 'OUT_OF_STOCK',
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          mappingId: { in: (await prisma.dropshipProductMapping.findMany({ where: { supplierId }, select: { id: true } })).map((mapping) => mapping.id) },
        },
      }),
      prisma.dropshipSyncJob.findMany({ where: { supplierId }, orderBy: { createdAt: 'desc' }, take: 10 }),
    ]);
    const inStockCount = mappings.filter((mapping) => mapping.quantity > 0).length;
    const stockAvailability = mappings.length ? Math.round((inStockCount / mappings.length) * 100) : 100;
    const recentFailureRate = syncJobs.length ? syncJobs.filter((job) => job.status === 'FAILED').length / syncJobs.length : 0;
    const healthScore = Math.max(0, Math.round(stockAvailability - outOfStockAlerts * 2 - recentFailureRate * 20));
    return {
      supplierId,
      supplierName: supplier.name,
      stockAvailability,
      outOfStockAlerts,
      recentSyncJobs: syncJobs.length,
      healthScore,
      status: healthScore >= 85 ? 'HEALTHY' : healthScore >= 60 ? 'WATCH' : 'AT_RISK',
    };
  }
}

export const inventorySyncEngine = new InventorySyncEngine();
