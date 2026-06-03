import { BaseProviderAdapter, ProviderConfig, ProviderProduct, ProviderVariant, ProviderCategory, ProviderWarehouse, ProviderShippingMethod, ProviderOrder, ProviderOrderItem, ProviderAddress, ProviderTrackingEvent, ImportOptions, PlaceOrderResult, ProviderProduct as BaseProduct } from '../base-adapter';
import { cjDropshippingService } from '../../cj-dropshipping/cj-dropshipping.service';
import { prisma } from '../../../common/prisma';
import { AppError } from '../../../common/errors';

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

export class CJDropshippingAdapter extends BaseProviderAdapter {
  constructor() {
    super(
      'CJ Dropshipping',
      'cjdropshipping',
      ['catalog.import', 'order.place', 'order.track', 'inventory.sync', 'price.sync', 'webhook.receive'],
      'api_key',
      ['apiKey'],
    );
  }

  async testConnection(config: ProviderConfig): Promise<{ success: boolean; message: string }> {
    const apiKey = config.apiKey || '';
    if (!apiKey) return { success: false, message: 'API key is required' };
    return cjDropshippingService.testConnection(apiKey);
  }

  async searchProducts(config: ProviderConfig, options: ImportOptions): Promise<{ products: ProviderProduct[]; total: number; page: number; pageSize: number }> {
    const apiKey = config.apiKey || '';
    const result = await cjDropshippingService.searchProducts(apiKey, {
      keyword: options.keyword,
      categoryId: options.categoryId,
      page: options.page,
      pageSize: options.pageSize,
      minPrice: options.minPrice,
      maxPrice: options.maxPrice,
      warehouseId: options.warehouseId,
    });

    return {
      products: result.products.map(this.toProviderProduct.bind(this)),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    };
  }

  async getProductDetail(config: ProviderConfig, productId: string): Promise<ProviderProduct> {
    const apiKey = config.apiKey || '';
    const product = await cjDropshippingService.getProductDetail(apiKey, productId);
    return this.toProviderProduct(product);
  }

  async getCategories(config: ProviderConfig): Promise<ProviderCategory[]> {
    const apiKey = config.apiKey || '';
    const categories = await cjDropshippingService.getCategories(apiKey);
    return categories.map((cat) => ({
      id: cat.categoryId,
      name: cat.categoryName,
      parentId: cat.parentId || undefined,
    }));
  }

  async getWarehouses(config: ProviderConfig): Promise<ProviderWarehouse[]> {
    const apiKey = config.apiKey || '';
    const warehouses = await cjDropshippingService.getWarehouses(apiKey);
    return warehouses.map((w) => ({
      id: w.warehouseId,
      name: w.warehouseName,
      country: w.country,
    }));
  }

  async getShippingMethods(config: ProviderConfig, params: { productId?: string; warehouseId?: string; country?: string; quantity?: number }): Promise<ProviderShippingMethod[]> {
    const apiKey = config.apiKey || '';
    const methods = await cjDropshippingService.getShippingMethods(apiKey, params);
    return methods.map((m) => ({
      id: m.shippingId,
      name: m.shippingName,
      cost: m.shippingCost,
      estimatedDays: m.estimatedDays,
      warehouseName: m.warehouseName,
      warehouseId: m.warehouseId,
    }));
  }

  async calculateShippingCost(config: ProviderConfig, params: { products: Array<{ productId: string; variantId: string; quantity: number }>; country: string; shippingMethodId?: string }): Promise<{ cost: number; methods: ProviderShippingMethod[] }> {
    const apiKey = config.apiKey || '';
    const result = await cjDropshippingService.calculateShippingCost(apiKey, {
      ...params,
      products: params.products.map((product) => ({
        productId: product.productId,
        varientId: product.variantId,
        quantity: product.quantity,
      })),
    });
    return {
      cost: result.cost,
      methods: result.methods.map((m) => ({
        id: m.shippingId,
        name: m.shippingName,
        cost: m.shippingCost,
        estimatedDays: m.estimatedDays,
        warehouseName: m.warehouseName,
        warehouseId: m.warehouseId,
      })),
    };
  }

  async placeOrder(config: ProviderConfig, params: { products: ProviderOrderItem[]; shippingAddress: ProviderAddress; shippingMethodId: string; warehouseId: string; referenceNumber: string }): Promise<PlaceOrderResult> {
    const apiKey = config.apiKey || '';
    const order = await cjDropshippingService.createOrder(apiKey, {
      products: params.products.map((p) => ({
        productId: p.productId,
        varientId: p.variantId,
        quantity: p.quantity,
      })),
      shippingAddress: params.shippingAddress,
      shippingMethodId: params.shippingMethodId,
      warehouseId: params.warehouseId,
      referenceNumber: params.referenceNumber,
    });

    return {
      providerOrderId: order.orderNumber,
      status: 'PROCESSING',
      trackingNumber: order.trackNumber,
      trackingUrl: order.trackNumber ? `https://www.cjdropshipping.com/tracking/${order.trackNumber}` : undefined,
      totalCost: order.totalPrice,
      currency: order.currency,
    };
  }

  async getOrderDetail(config: ProviderConfig, orderId: string): Promise<ProviderOrder> {
    const apiKey = config.apiKey || '';
    const order = await cjDropshippingService.getOrderDetail(apiKey, orderId);
    const statusMap: Record<number, string> = { 0: 'PENDING', 1: 'PROCESSING', 2: 'SHIPPED', 3: 'DELIVERED', 4: 'CANCELLED', 5: 'REFUNDED' };

    return {
      id: order.orderNumber,
      providerOrderId: order.orderNumber,
      status: statusMap[order.orderStatus] || 'PENDING',
      items: (order.items || []).map((item) => ({
        productId: item.productId,
        variantId: item.varientId || '',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        sku: item.productId,
      })),
      shippingAddress: {
        firstName: '',
        lastName: '',
        phone: '',
        country: '',
        state: '',
        city: '',
        address: '',
        zipCode: '',
      },
      shippingMethod: order.shippingMethod,
      shippingCost: order.shippingPrice,
      totalCost: order.totalPrice,
      currency: order.currency,
      trackingNumber: order.trackNumber,
      trackingUrl: order.trackNumber ? `https://www.cjdropshipping.com/tracking/${order.trackNumber}` : undefined,
      createdAt: order.createDate,
      events: [],
    };
  }

  async listOrders(config: ProviderConfig, params: { page?: number; pageSize?: number; status?: string; startDate?: string; endDate?: string }): Promise<{ orders: ProviderOrder[]; total: number }> {
    const apiKey = config.apiKey || '';
    const statusNum = params.status ? parseInt(params.status, 10) : undefined;
    const result = await cjDropshippingService.listOrders(apiKey, {
      page: params.page,
      pageSize: params.pageSize,
      status: statusNum,
      startDate: params.startDate,
      endDate: params.endDate,
    });

    const orders = await Promise.all(result.orders.map(async (order) => this.getOrderDetail(config, order.orderNumber)));
    return { orders, total: result.total };
  }

  async getTrackingInfo(config: ProviderConfig, orderId: string): Promise<{ trackingNumber: string; shippingMethod: string; status: string; estimatedDelivery: string; events: ProviderTrackingEvent[] }> {
    const apiKey = config.apiKey || '';
    const tracking = await cjDropshippingService.getTrackingInfo(apiKey, orderId);
    return {
      trackingNumber: tracking.trackNumber,
      shippingMethod: tracking.shippingMethod,
      status: tracking.status,
      estimatedDelivery: tracking.estimatedDelivery,
      events: tracking.events.map((e) => ({
        date: e.date,
        description: e.description,
        location: e.location,
      })),
    };
  }

  async syncInventory(config: ProviderConfig, productIds: string[]): Promise<Map<string, number>> {
    const apiKey = config.apiKey || '';
    const inventoryMap = new Map<string, number>();

    for (const pid of productIds) {
      try {
        const product = await cjDropshippingService.getProductDetail(apiKey, pid);
        const stock = product.varient?.reduce((sum, v) => sum + Number(v.stock || 0), 0) || 0;
        inventoryMap.set(pid, stock);
      } catch {
        inventoryMap.set(pid, 0);
      }
    }

    return inventoryMap;
  }

  async syncPricing(config: ProviderConfig, productIds: string[]): Promise<Map<string, number>> {
    const apiKey = config.apiKey || '';
    const priceMap = new Map<string, number>();

    for (const pid of productIds) {
      try {
        const product = await cjDropshippingService.getProductDetail(apiKey, pid);
        priceMap.set(pid, product.sellPrice || 0);
      } catch {
        priceMap.set(pid, 0);
      }
    }

    return priceMap;
  }

  async registerWebhook(config: ProviderConfig, webhookUrl: string, events: string[]): Promise<boolean> {
    const apiKey = config.apiKey || '';
    return cjDropshippingService.registerWebhook(apiKey, webhookUrl, events);
  }

  async handleWebhook(payload: any): Promise<void> {
    await cjDropshippingService.handleWebhook(payload);
  }

  // ─── Import Products with Job Tracking ───

  async importProductsWithJob(
    config: ProviderConfig,
    connectionId: string,
    supplierId: string,
    options: ImportOptions = {},
  ): Promise<{ jobId: string; imported: number; total: number; errors: string[] }> {
    const apiKey = config.apiKey || '';
    // Check stock using the adapters
    const apiKeyFromConfig = config.apiKey || '';
    
    // Create import job
    const job = await prisma.dropshipImportJob.create({
      data: {
        supplierId,
        connectionId,
        status: 'RUNNING',
        totalItems: 0,
        mappingTemplate: JSON.stringify(options),
        startedAt: new Date(),
      },
    });

    const profitMultiplier = 1 + (options.profitMargin ?? 0.3);
    const errors: string[] = [];
    let imported = 0;

    try {
      const searchResult = await this.searchProducts(config, {
        keyword: options.keyword,
        categoryId: options.categoryId,
        maxProducts: options.maxProducts || 50,
        page: options.page || 1,
        pageSize: options.pageSize || 20,
      });

      await prisma.dropshipImportJob.update({
        where: { id: job.id },
        data: { totalItems: searchResult.products.length },
      });

      for (const product of searchResult.products) {
        try {
          let detail: ProviderProduct;
          try {
            detail = await this.getProductDetail(config, product.sku);
          } catch {
            detail = product;
          }

          const variantPrices = (detail.variants || []).map((v) => v.price).filter(Boolean);
          const mainPrice = product.price || detail.price || variantPrices[0] || 0;
          const sellingPrice = Number((mainPrice * profitMultiplier).toFixed(2));
          const totalStock = (detail.variants || []).reduce((sum, v) => sum + (v.stock || 0), 0);

          await prisma.dropshipProductMapping.upsert({
            where: { supplierSku: product.sku },
            create: {
              supplierId,
              supplierSku: product.sku,
              supplierProductId: product.id,
              supplierTitle: product.title,
              supplierPrice: mainPrice,
              supplierCurrency: product.currency || 'USD',
              costPrice: mainPrice,
              sellingPrice,
              quantity: totalStock,
              supplierUrl: product.url,
              imageUrl: product.images?.[0] || '',
              category: product.category,
              specifications: JSON.stringify({
                description: product.description,
                images: product.images || [],
                variants: detail.variants || [],
                weight: product.weight,
                attributes: product.attributes,
              }),
              autoSync: true,
              lastSyncedAt: new Date(),
            },
            update: {
              supplierTitle: product.title,
              supplierPrice: mainPrice,
              costPrice: mainPrice,
              sellingPrice,
              quantity: totalStock,
              imageUrl: product.images?.[0] || '',
              category: product.category,
              lastSyncedAt: new Date(),
              specifications: JSON.stringify({
                description: product.description,
                images: product.images || [],
                variants: detail.variants || [],
                weight: product.weight,
                attributes: product.attributes,
              }),
            },
          });
          imported += 1;
        } catch (error) {
          errors.push(`Product ${product.sku}: ${error instanceof Error ? error.message : 'Import failed'}`);
        }
      }
    } catch (error) {
      errors.push(`Search/import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    await prisma.dropshipImportJob.update({
      where: { id: job.id },
      data: {
        status: errors.length && imported === 0 ? 'FAILED' : 'COMPLETED',
        imported,
        failed: errors.length,
        errors: errors.length ? JSON.stringify(errors.slice(0, 50)) : null,
        completedAt: new Date(),
      },
    });

    return { jobId: job.id, imported, total: imported + errors.length, errors };
  }

  private toProviderProduct(cjProduct: any): ProviderProduct {
    const variants: ProviderVariant[] = (cjProduct.varient || []).map((v: any) => ({
      id: v.varientId,
      name: v.varientName,
      sku: v.sku,
      price: v.price || 0,
      stock: v.stock || 0,
      image: v.image || undefined,
      attributes: v.attributes || {},
      weight: v.weight || undefined,
      dimensions: v.dimensions || undefined,
    }));

    return {
      id: cjProduct.pid,
      sku: cjProduct.pid,
      title: cjProduct.productName,
      description: cjProduct.description || '',
      price: cjProduct.sellPrice || cjProduct.originalPrice || 0,
      comparePrice: cjProduct.originalPrice || undefined,
      currency: cjProduct.currency || 'USD',
      images: (cjProduct.productImages || [cjProduct.productImage]).filter(Boolean),
      category: cjProduct.category || '',
      variants,
      weight: cjProduct.weight || 0,
      length: cjProduct.length,
      width: cjProduct.width,
      height: cjProduct.height,
      attributes: {},
      tags: [],
      url: cjProduct.productUrl || '',
      shippingMethods: (cjProduct.shipping || []).map((s: any) => ({
        id: s.shippingId,
        name: s.shippingName,
        cost: s.shippingCost,
        estimatedDays: s.estimatedDays,
        warehouseName: s.warehouseName,
        warehouseId: s.warehouseId,
      })),
      warehouses: (cjProduct.warehouse || []).map((w: any) => ({
        id: w.warehouseId,
        name: w.warehouseName,
        country: w.country,
      })),
    };
  }
}
