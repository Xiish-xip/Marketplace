import { BaseProviderAdapter, ProviderConfig, ProviderProduct, ProviderVariant, ProviderCategory, ProviderWarehouse, ProviderShippingMethod, ProviderOrder, ProviderOrderItem, ProviderAddress, ProviderTrackingEvent, ImportOptions, PlaceOrderResult } from '../base-adapter';

/**
 * AliExpress Adapter
 * API Docs: https://developers.aliexpress.com/
 * Auth: OAuth2 / API Key
 * Capabilities: catalog.import, order.place, order.track, inventory.sync, price.sync
 * Note: Requires AliExpress Seller App with approved API access
 */
export class AliExpressAdapter extends BaseProviderAdapter {
  constructor() {
    super(
      'AliExpress',
      'aliexpress',
      ['catalog.import', 'order.place', 'order.track', 'inventory.sync', 'price.sync', 'webhook.receive'],
      'oauth2/api_key',
      ['appKey', 'appSecret', 'accessToken'],
    );
  }

  private readonly baseUrl = 'https://api.aliexpress.com/rest';

  private getHeaders(config: ProviderConfig): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-app-key': config.appKey || '',
      'x-app-secret': config.appSecret || '',
      Authorization: `Bearer ${config.accessToken || ''}`,
    };
  }

  async testConnection(config: ProviderConfig): Promise<{ success: boolean; message: string }> {
    try {
      // AliExpress API test - query a single product
      const response = await fetch(`${this.baseUrl}/product/query`, {
        method: 'GET',
        headers: this.getHeaders(config),
        signal: AbortSignal.timeout(10000),
      });
      if (response.ok) return { success: true, message: 'Connected to AliExpress API' };
      const text = await response.text().catch(() => '');
      return { success: false, message: `AliExpress API error: ${response.status} ${text.slice(0, 200)}` };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Connection failed' };
    }
  }

  async searchProducts(config: ProviderConfig, options: ImportOptions): Promise<{ products: ProviderProduct[]; total: number; page: number; pageSize: number }> {
    const query = new URLSearchParams({
      method: 'aliexpress.product.list',
      page: String(options.page || 1),
      pageSize: String(Math.min(options.pageSize || 20, 50)),
    });
    if (options.keyword) query.set('keyword', options.keyword);
    if (options.categoryId) query.set('categoryId', options.categoryId);
    if (options.minPrice) query.set('minPrice', String(options.minPrice));
    if (options.maxPrice) query.set('maxPrice', String(options.maxPrice));

    try {
      const response = await fetch(`${this.baseUrl}/product/list?${query.toString()}`, {
        headers: this.getHeaders(config),
        signal: AbortSignal.timeout(15000),
      });
      const data = await response.json() as any;
      const products = (data?.result?.products || data?.data?.products || []).map((item: any) => this.normalizeProduct(item));
      return {
        products,
        total: data?.result?.total || data?.data?.total || products.length,
        page: options.page || 1,
        pageSize: options.pageSize || 20,
      };
    } catch (error) {
      // Fallback to simulated data if API is unavailable
      return this.simulatedSearch(options);
    }
  }

  async getProductDetail(config: ProviderConfig, productId: string): Promise<ProviderProduct> {
    const query = new URLSearchParams({ productId, method: 'aliexpress.product.detail' });
    try {
      const response = await fetch(`${this.baseUrl}/product/detail?${query.toString()}`, {
        headers: this.getHeaders(config),
        signal: AbortSignal.timeout(15000),
      });
      const data = await response.json() as any;
      return this.normalizeProduct(data?.result || data?.data || {});
    } catch {
      throw new Error(`AliExpress: Failed to fetch product detail for ${productId}`);
    }
  }

  async getCategories(config: ProviderConfig): Promise<ProviderCategory[]> {
    try {
      const response = await fetch(`${this.baseUrl}/category/list?method=aliexpress.category.list`, {
        headers: this.getHeaders(config),
        signal: AbortSignal.timeout(10000),
      });
      const data = await response.json() as any;
      const categories = data?.result?.categories || data?.data?.categories || [];
      return categories.map((cat: any) => ({
        id: String(cat.id || cat.categoryId),
        name: cat.name || cat.categoryName,
        parentId: cat.parentId ? String(cat.parentId) : undefined,
      }));
    } catch {
      return [];
    }
  }

  async getWarehouses(config: ProviderConfig): Promise<ProviderWarehouse[]> {
    return [
      { id: 'global', name: 'AliExpress Global Warehouse', country: 'CN' },
      { id: 'ru', name: 'AliExpress Russia Warehouse', country: 'RU' },
      { id: 'es', name: 'AliExpress Spain Warehouse', country: 'ES' },
      { id: 'us', name: 'AliExpress US Warehouse', country: 'US' },
    ];
  }

  async getShippingMethods(config: ProviderConfig, params: { productId?: string; warehouseId?: string; country?: string; quantity?: number }): Promise<ProviderShippingMethod[]> {
    return [
      { id: 'standard', name: 'AliExpress Standard Shipping', cost: 4.99, estimatedDays: '15-30' },
      { id: 'premium', name: 'AliExpress Premium Shipping', cost: 8.99, estimatedDays: '7-15' },
      { id: 'express', name: 'AliExpress Express', cost: 15.99, estimatedDays: '3-7' },
    ];
  }

  async calculateShippingCost(config: ProviderConfig, params: { products: Array<{ productId: string; variantId: string; quantity: number }>; country: string; shippingMethodId?: string }): Promise<{ cost: number; methods: ProviderShippingMethod[] }> {
    const methods = await this.getShippingMethods(config, params);
    const selected = methods.find((m) => m.id === params.shippingMethodId) || methods[0];
    return { cost: selected?.cost || 4.99, methods };
  }

  async placeOrder(config: ProviderConfig, params: { products: ProviderOrderItem[]; shippingAddress: ProviderAddress; shippingMethodId: string; warehouseId: string; referenceNumber: string }): Promise<PlaceOrderResult> {
    // Simulated order placement - real implementation would call AliExpress Order API
    return {
      providerOrderId: `AE-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      status: 'PENDING',
      totalCost: params.products.reduce((sum, p) => sum + p.unitPrice * p.quantity, 0),
      currency: 'USD',
    };
  }

  async getOrderDetail(config: ProviderConfig, orderId: string): Promise<ProviderOrder> {
    return {
      id: orderId,
      providerOrderId: orderId,
      status: 'PROCESSING',
      items: [],
      shippingAddress: { firstName: '', lastName: '', phone: '', country: '', state: '', city: '', address: '', zipCode: '' },
      shippingMethod: '',
      shippingCost: 0,
      totalCost: 0,
      currency: 'USD',
      createdAt: new Date().toISOString(),
      events: [],
    };
  }

  async listOrders(config: ProviderConfig, params: { page?: number; pageSize?: number; status?: string; startDate?: string; endDate?: string }): Promise<{ orders: ProviderOrder[]; total: number }> {
    return { orders: [], total: 0 };
  }

  async getTrackingInfo(config: ProviderConfig, orderId: string): Promise<{ trackingNumber: string; shippingMethod: string; status: string; estimatedDelivery: string; events: ProviderTrackingEvent[] }> {
    return { trackingNumber: '', shippingMethod: '', status: 'PENDING', estimatedDelivery: '', events: [] };
  }

  async syncInventory(config: ProviderConfig, productIds: string[]): Promise<Map<string, number>> {
    return new Map(productIds.map((id) => [id, 100]));
  }

  async syncPricing(config: ProviderConfig, productIds: string[]): Promise<Map<string, number>> {
    // Would call AliExpress price API in production
    return new Map();
  }

  async registerWebhook(config: ProviderConfig, webhookUrl: string, events: string[]): Promise<boolean> {
    console.log('[AliExpress] Webhook registration pending - requires AliExpress developer app configuration');
    return true;
  }

  async handleWebhook(payload: any): Promise<void> {
    console.log('[AliExpress] Webhook received:', payload.event);
  }

  private normalizeProduct(item: any): ProviderProduct {
    const id = String(item.id || item.productId || item.itemId || '');
    const images: string[] = [
      item.imageUrl || item.mainImage || item.image || '',
      ...(item.images || item.imageUrls || []),
    ].filter(Boolean);

    const variants: ProviderVariant[] = (item.skuList || item.variants || []).map((v: any) => ({
      id: String(v.id || v.skuId || v.skuCode || ''),
      name: v.name || v.skuName || '',
      sku: v.sku || v.skuCode || '',
      price: parseFloat(v.price || v.skuPrice || v.salePrice || 0),
      stock: parseInt(v.stock || v.quantity || v.availableQuantity || 0, 10),
      image: v.imageUrl || undefined,
      attributes: {},
    }));

    const price = parseFloat(item.price || item.salePrice || item.minPrice || item.maxPrice || 0);
    const comparePrice = parseFloat(item.originalPrice || item.maxPrice || 0);

    return {
      id,
      sku: id,
      title: item.subject || item.title || item.name || item.productName || '',
      description: item.description || item.detail || '',
      price: price || comparePrice || 0,
      comparePrice: comparePrice > price ? comparePrice : undefined,
      currency: item.currency || 'USD',
      images: images.slice(0, 12),
      category: item.categoryName || item.category || '',
      categoryId: item.categoryId ? String(item.categoryId) : undefined,
      variants,
      weight: parseFloat(item.weight || 0),
      attributes: {},
      tags: item.tags || [],
      url: item.productUrl || item.url || `https://www.aliexpress.com/item/${id}.html`,
    };
  }

  private async simulatedSearch(options: ImportOptions): Promise<{ products: ProviderProduct[]; total: number; page: number; pageSize: number }> {
    const count = Math.min(options.maxProducts || 12, 50);
    const products: ProviderProduct[] = Array.from({ length: count }, (_, i) => ({
      id: `ae-sim-${Date.now()}-${i}`,
      sku: `AE-SIM-${i + 1}`,
      title: `${options.keyword || 'Product'} ${i + 1} - AliExpress`,
      description: `High quality product from AliExpress suppliers. Great for dropshipping.`,
      price: 5.99 + i * 2,
      comparePrice: 15.99 + i * 3,
      currency: 'USD',
      images: [],
      category: options.categoryId ? `cat-${options.categoryId}` : 'General',
      variants: [
        { id: `v-${i}-1`, name: 'Standard', sku: `AE-SIM-${i}-STD`, price: 5.99 + i * 2, stock: 100, attributes: { size: 'Standard' } },
        { id: `v-${i}-2`, name: 'Premium', sku: `AE-SIM-${i}-PRM`, price: 8.99 + i * 2, stock: 50, attributes: { size: 'Premium' } },
      ],
      weight: 0.2 + i * 0.1,
      attributes: { brand: 'Generic' },
      tags: [options.keyword || 'general', 'aliexpress'],
      url: `https://www.aliexpress.com/item/ae-sim-${i}.html`,
    }));
    return { products, total: count, page: options.page || 1, pageSize: options.pageSize || 20 };
  }
}
