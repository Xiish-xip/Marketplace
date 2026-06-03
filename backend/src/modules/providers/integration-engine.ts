import { providerRegistry } from './registry';
import { BaseProviderAdapter, ProviderConfig, ImportOptions, ProviderProduct, ProviderOrderItem, ProviderAddress } from './base-adapter';
import { prisma } from '../../common/prisma';
import { AppError, NotFoundError } from '../../common/errors';
import { logger } from '../../common/logger';

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

/**
 * Integration Engine - The unified control layer for all provider operations.
 * Handles credential management, product import/push, order routing, 
 * inventory/price sync, and webhook dispatch across all providers.
 */
export class IntegrationEngine {
  /**
   * Get the adapter for a provider, with normalized provider name
   */
  getAdapter(provider: string): BaseProviderAdapter {
    const normalized = provider.toLowerCase().trim();
    return providerRegistry.get(normalized);
  }

  /**
   * Get all supported providers and their capabilities
   */
  getSupportedProviders() {
    return providerRegistry.getSupportedProviders();
  }

  /**
   * Get provider connection configuration from database
   */
  async getConnection(connectionId: string) {
    const connection = await prisma.providerConnection.findUnique({
      where: { id: connectionId },
      include: { adapter: true },
    });
    if (!connection) throw new NotFoundError('Provider connection not found');
    return connection;
  }

  /**
   * Get provider config (decrypted credentials) from a connection
   */
  private getProviderConfig(connection: { credentials?: string | null; config?: string | null; adapter: { provider: string } }): ProviderConfig {
    return {
      ...parseJson<Record<string, any>>(connection.config, {}),
      ...parseJson<Record<string, any>>(connection.credentials, {}),
    };
  }

  // ═══════════════════════════════════════════════════════
  //  CONNECTION MANAGEMENT
  // ═══════════════════════════════════════════════════════

  /**
   * Test a provider connection
   */
  async testConnection(connectionId: string) {
    const connection = await this.getConnection(connectionId);
    const adapter = this.getAdapter(connection.adapter.provider);
    const config = this.getProviderConfig(connection);

    // Validate required credentials
    const missing = providerRegistry.validateCredentials(connection.adapter.provider, config);
    if (missing.length) {
      await prisma.providerConnection.update({
        where: { id: connectionId },
        data: { isVerified: false, lastError: `Missing credentials: ${missing.join(', ')}` },
      });
      return { status: 'NOT_CONFIGURED', provider: connection.adapter.provider, missing, message: 'Credentials required' };
    }

    try {
      const result = await adapter.testConnection(config);
      await prisma.providerConnection.update({
        where: { id: connectionId },
        data: { isVerified: result.success, lastSyncAt: result.success ? new Date() : undefined, lastError: result.success ? null : result.message },
      });
      return { status: result.success ? 'CONNECTED' : 'FAILED', provider: connection.adapter.provider, ...result };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Connection test failed';
      await prisma.providerConnection.update({ where: { id: connectionId }, data: { isVerified: false, lastError: message } });
      return { status: 'FAILED', provider: connection.adapter.provider, message };
    }
  }

  /**
   * Get overall marketplace readiness
   */
  async getReadiness() {
    const [adapters, currencySettings, languages] = await Promise.all([
      prisma.providerAdapter.findMany({ include: { connections: true } }),
      prisma.currencySettings.findFirst(),
      prisma.siteLanguage.findMany({ where: { isActive: true } }),
    ]);

    const configuredMarketplaces = adapters.map((adapter) => {
      const provider = providerRegistry.get(adapter.provider);
      const activeConnections = adapter.connections.filter((c) => c.isActive);
      return {
        id: adapter.id,
        name: adapter.name,
        provider: adapter.provider,
        enabled: adapter.isEnabled,
        activeConnections: activeConnections.length,
        verifiedConnections: activeConnections.filter((c) => c.isVerified).length,
        capabilities: provider?.capabilities || [],
        ready: adapter.isEnabled && activeConnections.some((c) => c.isVerified),
      };
    });

    return {
      marketplaces: {
        supported: this.getSupportedProviders(),
        configured: configuredMarketplaces,
        productionReadyCount: configuredMarketplaces.filter((m) => m.ready).length,
      },
      localization: {
        baseCurrency: currencySettings?.baseCurrency || 'TZS',
        activeLanguages: languages.map((l) => ({ code: l.code, name: l.name, rtl: l.isRtl })),
      },
    };
  }

  // ═══════════════════════════════════════════════════════
  //  PRODUCT IMPORT
  // ═══════════════════════════════════════════════════════

  /**
   * Import products from a provider connection
   */
  async importProducts(connectionId: string, options: ImportOptions = {}) {
    const connection = await this.getConnection(connectionId);
    if (!connection.isActive) throw new AppError(400, 'Provider connection is inactive');

    const adapter = this.getAdapter(connection.adapter.provider);
    const config = this.getProviderConfig(connection);

    // Ensure supplier exists
    const supplier = await this.ensureSupplier(connection);
    const profitMargin = options.profitMargin ?? parseJson<{ profitMargin?: number }>(supplier.metadata, {}).profitMargin ?? 0.3;

    // Create import job
    const job = await prisma.dropshipImportJob.create({
      data: {
        supplierId: supplier.id,
        connectionId,
        status: 'RUNNING',
        totalItems: 0,
        mappingTemplate: JSON.stringify(options),
        startedAt: new Date(),
      },
    });

    let imported = 0;
    let failed = 0;
    const errors: string[] = [];

    try {
      const result = await adapter.searchProducts(config, {
        ...options,
        maxProducts: options.maxProducts || 50,
        profitMargin,
      });

      await prisma.dropshipImportJob.update({
        where: { id: job.id },
        data: { totalItems: result.products.length },
      });

      for (const product of result.products) {
        try {
          await this.createMapping(supplier.id, product, profitMargin);
          imported += 1;
        } catch (error) {
          failed += 1;
          errors.push(`Product ${product.sku}: ${error instanceof Error ? error.message : 'Import failed'}`);
        }
      }
    } catch (error) {
      errors.push(`Search/import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    await prisma.dropshipImportJob.update({
      where: { id: job.id },
      data: {
        status: failed && imported === 0 ? 'FAILED' : 'COMPLETED',
        imported,
        failed,
        errors: errors.length ? JSON.stringify(errors.slice(0, 50)) : null,
        completedAt: new Date(),
      },
    });

    // Also sync inventory after import
    if (imported > 0) {
      this.syncInventory(connectionId).catch((e) => logger.warn('Post-import inventory sync failed', { error: e.message }));
    }

    return { jobId: job.id, imported, total: imported + failed, errors };
  }

  /**
   * Import a single product by ID from a provider
   */
  async importSingleProduct(connectionId: string, productId: string) {
    const connection = await this.getConnection(connectionId);
    const adapter = this.getAdapter(connection.adapter.provider);
    const config = this.getProviderConfig(connection);
    const supplier = await this.ensureSupplier(connection);
    const supplierMeta = parseJson<{ profitMargin?: number }>(supplier.metadata, {});
    const profitMargin = supplierMeta.profitMargin ?? 0.3;

    const product = await adapter.getProductDetail(config, productId);
    const mapping = await this.createMapping(supplier.id, product, profitMargin);
    return mapping;
  }

  /**
   * Ensure a DropshipSupplier exists for a connection
   */
  private async ensureSupplier(connection: any) {
    const provider = connection.adapter.provider.toLowerCase();
    const existing = await prisma.dropshipSupplier.findFirst({ where: { provider, name: connection.name } });
    if (existing) return existing;

    const config = parseJson<Record<string, any>>(connection.config, {});
    return prisma.dropshipSupplier.create({
      data: {
        name: connection.name,
        provider,
        storeUrl: config.storeUrl || connection.adapter.baseUrl,
        apiEndpoint: config.catalogUrl || config.orderUrl || connection.adapter.baseUrl,
        currency: config.currency || 'USD',
        isVerified: connection.isVerified,
        isActive: connection.isActive,
        metadata: JSON.stringify({ connectionId: connection.id }),
      },
    });
  }

  /**
   * Create/update a dropship product mapping from a normalized provider product
   */
  private async createMapping(supplierId: string, product: ProviderProduct, profitMargin: number) {
    const sellingPrice = Number((product.price * (1 + profitMargin)).toFixed(2));
    const totalStock = product.variants.reduce((sum, v) => sum + (v.stock || 0), 0);

    return prisma.dropshipProductMapping.upsert({
      where: { supplierSku: product.sku },
      create: {
        supplierId,
        supplierSku: product.sku,
        supplierProductId: product.id,
        supplierTitle: product.title,
        supplierPrice: product.price,
        supplierCurrency: product.currency || 'USD',
        costPrice: product.price,
        sellingPrice,
        quantity: totalStock,
        supplierUrl: product.url,
        imageUrl: product.images?.[0] || '',
        category: product.category,
        specifications: JSON.stringify({
          description: product.description,
          images: product.images || [],
          variants: product.variants || [],
          weight: product.weight,
          attributes: product.attributes,
          shippingMethods: product.shippingMethods,
          warehouses: product.warehouses,
        }),
        autoSync: true,
        lastSyncedAt: new Date(),
      },
      update: {
        supplierTitle: product.title,
        supplierPrice: product.price,
        costPrice: product.price,
        sellingPrice,
        quantity: totalStock,
        imageUrl: product.images?.[0] || '',
        category: product.category,
        lastSyncedAt: new Date(),
        specifications: JSON.stringify({
          description: product.description,
          images: product.images || [],
          variants: product.variants || [],
          weight: product.weight,
          attributes: product.attributes,
          shippingMethods: product.shippingMethods,
          warehouses: product.warehouses,
        }),
      },
    });
  }

  // ═══════════════════════════════════════════════════════
  //  INVENTORY & PRICE SYNC
  // ═══════════════════════════════════════════════════════

  /**
   * Sync inventory for all active mappings on a connection
   */
  async syncInventory(connectionId: string) {
    const connection = await this.getConnection(connectionId);
    const adapter = this.getAdapter(connection.adapter.provider);
    const config = this.getProviderConfig(connection);

    // Find supplier for this connection
    const supplier = await prisma.dropshipSupplier.findFirst({
      where: { provider: connection.adapter.provider, name: connection.name },
    });
    if (!supplier) return { updated: 0, errors: ['No supplier found for this connection'] };

    const mappings = await prisma.dropshipProductMapping.findMany({
      where: { supplierId: supplier.id, isActive: true, autoSync: true },
      take: 200,
    });

    const errors: string[] = [];
    let updated = 0;

    for (const mapping of mappings) {
      try {
        const inventoryMap = await adapter.syncInventory(config, [mapping.supplierSku]);
        const newStock = inventoryMap.get(mapping.supplierSku);
        if (newStock !== undefined && newStock !== mapping.quantity) {
          await prisma.dropshipProductMapping.update({
            where: { id: mapping.id },
            data: { quantity: newStock, lastSyncedAt: new Date() },
          });
          updated += 1;
        }
      } catch (error) {
        errors.push(`Sync ${mapping.supplierSku}: ${error instanceof Error ? error.message : 'Sync failed'}`);
      }
    }

    await prisma.providerConnection.update({
      where: { id: connectionId },
      data: { lastSyncAt: new Date(), lastError: errors.length ? errors.slice(0, 3).join('; ') : null },
    });

    return { updated, errors };
  }

  /**
   * Sync pricing for all active mappings on a connection
   */
  async syncPricing(connectionId: string) {
    const connection = await this.getConnection(connectionId);
    const adapter = this.getAdapter(connection.adapter.provider);
    const config = this.getProviderConfig(connection);

    const supplier = await prisma.dropshipSupplier.findFirst({
      where: { provider: connection.adapter.provider, name: connection.name },
    });
    if (!supplier) return { updated: 0, errors: ['No supplier found'] };

    const mappings = await prisma.dropshipProductMapping.findMany({
      where: { supplierId: supplier.id, isActive: true, autoSync: true },
      take: 100,
    });

    const errors: string[] = [];
    let updated = 0;
    const supplierMeta = parseJson<{ profitMargin?: number }>(supplier.metadata, {});
    const profitMultiplier = 1 + (supplierMeta.profitMargin ?? 0.3);

    for (const mapping of mappings) {
      try {
        const priceMap = await adapter.syncPricing(config, [mapping.supplierSku]);
        const newPrice = priceMap.get(mapping.supplierSku);
        if (newPrice !== undefined && newPrice > 0 && Math.abs(newPrice - mapping.supplierPrice) / Math.max(newPrice, 0.01) > 0.01) {
          const newSellingPrice = Number((newPrice * profitMultiplier).toFixed(2));
          await prisma.dropshipProductMapping.update({
            where: { id: mapping.id },
            data: { supplierPrice: newPrice, costPrice: newPrice, sellingPrice: newSellingPrice, lastSyncedAt: new Date() },
          });
          updated += 1;
        }
      } catch (error) {
        errors.push(`Price sync ${mapping.supplierSku}: ${error instanceof Error ? error.message : 'Sync failed'}`);
      }
    }

    return { updated, errors };
  }

  /**
   * Full sync (inventory + pricing) for all connections
   */
  async syncAll() {
    const connections = await prisma.providerConnection.findMany({
      where: { isActive: true, isVerified: true },
      include: { adapter: true },
    });

    const results: Array<{ connectionId: string; name: string; provider: string; inventory: any; pricing: any }> = [];

    for (const connection of connections) {
      try {
        const inventory = await this.syncInventory(connection.id);
        const pricing = await this.syncPricing(connection.id);
        results.push({ connectionId: connection.id, name: connection.name, provider: connection.adapter.provider, inventory, pricing });
      } catch (error) {
        results.push({ connectionId: connection.id, name: connection.name, provider: connection.adapter.provider, inventory: { updated: 0, errors: [error instanceof Error ? error.message : 'Sync failed'] }, pricing: { updated: 0, errors: [] } });
      }
    }

    return results;
  }

  // ═══════════════════════════════════════════════════════
  //  ORDER ROUTING
  // ═══════════════════════════════════════════════════════

  /**
   * Place a dropship order to the appropriate provider
   */
  async placeOrder(connectionId: string, localOrderId: string) {
    const connection = await this.getConnection(connectionId);
    const adapter = this.getAdapter(connection.adapter.provider);
    const config = this.getProviderConfig(connection);

    const order = await prisma.order.findUnique({
      where: { id: localOrderId },
      include: {
        items: { include: { product: true } },
        user: { include: { addresses: true } },
      },
    });
    if (!order) throw new NotFoundError('Order not found');

    const shippingAddress = order.shippingAddress
      ? parseJson<ProviderAddress>(order.shippingAddress, {} as ProviderAddress)
      : null;
    if (!shippingAddress) throw new AppError(400, 'Shipping address is required');

    const supplier = await prisma.dropshipSupplier.findFirst({
      where: { provider: connection.adapter.provider, name: connection.name },
    });
    if (!supplier) throw new NotFoundError('No supplier found for this connection');

    const created: any[] = [];

    for (const item of order.items) {
      const mapping = await prisma.dropshipProductMapping.findFirst({
        where: { localProductId: item.productId, supplierId: supplier.id, isActive: true },
      });
      if (!mapping) continue;

      const spec = parseJson<{ variants?: Array<{ id: string; sku: string }> }>(mapping.specifications, { variants: [] });
      const variantId = spec.variants?.[0]?.sku || mapping.supplierSku;

      try {
        const result = await adapter.placeOrder(config, {
          products: [{
            productId: mapping.supplierProductId || mapping.supplierSku,
            variantId,
            quantity: item.quantity,
            unitPrice: mapping.costPrice,
            sku: mapping.supplierSku,
          }],
          shippingAddress,
          shippingMethodId: '',
          warehouseId: '',
          referenceNumber: `${order.orderNumber}-${item.id.slice(0, 8)}`,
        });

        const dropshipOrder = await prisma.dropshipOrder.create({
          data: {
            supplierId: supplier.id,
            localOrderId: order.id,
            supplierOrderId: result.providerOrderId,
            items: JSON.stringify([{ sku: mapping.supplierSku, qty: item.quantity, price: mapping.costPrice }]),
            subtotal: mapping.costPrice * item.quantity,
            shippingCost: 0,
            totalCost: result.totalCost || mapping.costPrice * item.quantity,
            currency: result.currency || mapping.supplierCurrency,
            status: result.status || 'PROCESSING',
            trackingUrl: result.trackingUrl || null,
            estimatedDays: null,
          },
        });

        created.push(dropshipOrder);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Order placement failed';
        await prisma.dropshipOrder.create({
          data: {
            supplierId: supplier.id,
            localOrderId: order.id,
            supplierOrderId: `FAILED-${Date.now()}`,
            items: JSON.stringify([{ sku: mapping.supplierSku, qty: item.quantity, price: mapping.costPrice }]),
            subtotal: mapping.costPrice * item.quantity,
            shippingCost: 0,
            totalCost: mapping.costPrice * item.quantity,
            currency: mapping.supplierCurrency,
            status: 'FAILED',
            errorLog: message,
          },
        });
        created.push({ error: message, sku: mapping.supplierSku });
      }
    }

    return { localOrderId, dropshipOrders: created, placed: created.length > 0 };
  }

  /**
   * Auto-route order to the best provider based on product mappings
   */
  async autoRouteOrder(localOrderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: localOrderId },
      include: { items: true },
    });
    if (!order) throw new NotFoundError('Order not found');

    const results: any[] = [];

    for (const item of order.items) {
      const mapping = await prisma.dropshipProductMapping.findFirst({
        where: { localProductId: item.productId, isActive: true },
        include: { supplier: true },
      });

      if (!mapping || !mapping.supplier) {
        results.push({ itemId: item.id, status: 'NO_MAPPING', message: 'No dropship mapping found' });
        continue;
      }

      // Find the connection for this supplier
      const connection = await prisma.providerConnection.findFirst({
        where: {
          isActive: true,
          isVerified: true,
        },
        include: { adapter: true },
      });

      if (connection) {
        try {
          const result = await this.placeOrder(connection.id, localOrderId);
          results.push({ itemId: item.id, ...result });
        } catch (error) {
          results.push({ itemId: item.id, status: 'FAILED', message: error instanceof Error ? error.message : 'Failed' });
        }
      }
    }

    return { orderId: localOrderId, results };
  }

  // ═══════════════════════════════════════════════════════
  //  WEBHOOK HANDLING
  // ═══════════════════════════════════════════════════════

  /**
   * Handle incoming webhook from a provider
   */
  async handleWebhook(provider: string, payload: any) {
    const adapter = this.getAdapter(provider);
    await adapter.handleWebhook(payload);
  }

  /**
   * Register a webhook for a provider connection
   */
  async registerWebhook(connectionId: string, webhookUrl: string, events: string[]) {
    const connection = await this.getConnection(connectionId);
    const adapter = this.getAdapter(connection.adapter.provider);
    const config = this.getProviderConfig(connection);
    return adapter.registerWebhook(config, webhookUrl, events);
  }

  // ═══════════════════════════════════════════════════════
  //  PRODUCT PUSH (Local → Provider)
  // ═══════════════════════════════════════════════════════

  /**
   * Push a local product to a provider marketplace (for selling on their platform)
   */
  async pushProduct(connectionId: string, localProductId: string) {
    const connection = await this.getConnection(connectionId);
    const product = await prisma.product.findUnique({ where: { id: localProductId } });
    if (!product) throw new NotFoundError('Product not found');

    // Provider-specific product creation would go here
    // This is a placeholder for the "sell on provider marketplace" feature
    return { connectionId, localProductId, status: 'PENDING', message: 'Product push requires provider-specific API implementation' };
  }

  // ═══════════════════════════════════════════════════════
  //  DASHBOARD / STATISTICS
  // ═══════════════════════════════════════════════════════

  /**
   * Get comprehensive dashboard stats
   */
  async getDashboardStats() {
    const [connections, suppliers, mappings, orders, importJobs, adapters] = await Promise.all([
      prisma.providerConnection.findMany({ include: { adapter: true } }),
      prisma.dropshipSupplier.findMany(),
      prisma.dropshipProductMapping.findMany({ where: { isActive: true } }),
      prisma.dropshipOrder.findMany({ orderBy: { createdAt: 'desc' }, take: 50 }),
      prisma.dropshipImportJob.findMany({ orderBy: { createdAt: 'desc' }, take: 20 }),
      prisma.providerAdapter.findMany(),
    ]);

    // Group by provider
    const byProvider = connections.reduce<Record<string, any>>((acc, conn) => {
      const prov = conn.adapter.provider;
      if (!acc[prov]) acc[prov] = { provider: prov, connections: 0, verified: 0, active: 0 };
      acc[prov].connections += 1;
      if (conn.isVerified) acc[prov].verified += 1;
      if (conn.isActive) acc[prov].active += 1;
      return acc;
    }, {});

    const orderStatusCounts = orders.reduce<Record<string, number>>((acc, o) => {
      acc[o.status] = (acc[o.status] || 0) + 1;
      return acc;
    }, {});

    return {
      overview: {
        totalConnections: connections.length,
        verifiedConnections: connections.filter((c) => c.isVerified).length,
        activeConnections: connections.filter((c) => c.isActive).length,
        totalSuppliers: suppliers.length,
        totalMappings: mappings.length,
        totalDropshipOrders: orders.length,
        adaptersCount: adapters.length,
      },
      byProvider: Object.values(byProvider),
      orderStatusBreakdown: orderStatusCounts,
      recentOrders: orders.slice(0, 10).map((o) => ({
        id: o.id,
        supplierOrderId: o.supplierOrderId,
        status: o.status,
        totalCost: o.totalCost,
        currency: o.currency,
        createdAt: o.createdAt,
      })),
      recentImportJobs: importJobs.slice(0, 5).map((j) => ({
        id: j.id,
        status: j.status,
        totalItems: j.totalItems,
        imported: j.imported,
        failed: j.failed,
        createdAt: j.createdAt,
      })),
    };
  }
}

export const integrationEngine = new IntegrationEngine();