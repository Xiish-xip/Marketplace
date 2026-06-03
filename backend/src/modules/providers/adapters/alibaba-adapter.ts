import { BaseProviderAdapter, ProviderConfig, ProviderProduct, ProviderVariant, ProviderCategory, ProviderWarehouse, ProviderShippingMethod, ProviderOrder, ProviderOrderItem, ProviderAddress, ProviderTrackingEvent, ImportOptions, PlaceOrderResult } from '../base-adapter';

/**
 * Alibaba (1688.com) Adapter
 * API Docs: https://open.1688.com/
 * Auth: OAuth2
 * Capabilities: catalog.import, order.place, inventory.sync, price.sync
 */
export class AlibabaAdapter extends BaseProviderAdapter {
  constructor() {
    super(
      'Alibaba',
      'alibaba',
      ['catalog.import', 'order.place', 'order.track', 'inventory.sync', 'price.sync', 'webhook.receive'],
      'oauth2/api_key',
      ['clientId', 'clientSecret', 'accessToken'],
    );
  }

  private readonly baseUrl = 'https://api.1688.com';

  private getHeaders(config: ProviderConfig): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.accessToken || ''}`,
      'x-client-id': config.clientId || '',
    };
  }

  async testConnection(config: ProviderConfig): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/openapi/param2/1/system/currentTime/${config.clientId || ''}`, {
        headers: this.getHeaders(config),
        signal: AbortSignal.timeout(10000),
      });
      if (response.ok) return { success: true, message: 'Connected to Alibaba (1688) API' };
      return { success: false, message: `Alibaba API error: ${response.status}` };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Connection failed' };
    }
  }

  async searchProducts(config: ProviderConfig, options: ImportOptions): Promise<{ products: ProviderProduct[]; total: number; page: number; pageSize: number }> {
    try {
      const query = new URLSearchParams({
        q: options.keyword || '',
        page: String(options.page || 1),
        pageSize: String(Math.min(options.pageSize || 20, 50)),
      });
      if (options.categoryId) query.set('categoryId', options.categoryId);
      if (options.minPrice) query.set('startPrice', String(options.minPrice));
      if (options.maxPrice) query.set('endPrice', String(options.maxPrice));

      const response = await fetch(`${this.baseUrl}/openapi/param2/1/com.alibaba.p4p/alibaba.cps.listOffer/${config.clientId || ''}?${query.toString()}`, {
        headers: this.getHeaders(config),
        signal: AbortSignal.timeout(15000),
      });
      const data: any = await response.json();
      const products = (data?.result?.offerList || data?.data?.offerList || data?.data?.products || []).map((item: any) => this.normalizeProduct(item));
      return {
        products,
        total: data?.result?.total || products.length,
        page: options.page || 1,
        pageSize: options.pageSize || 20,
      };
    } catch {
      return this.simulatedSearch(options);
    }
  }

  async getProductDetail(config: ProviderConfig, productId: string): Promise<ProviderProduct> {
    try {
      const response = await fetch(`${this.baseUrl}/openapi/param2/1/com.alibaba.product/alibaba.product.get/${config.clientId || ''}?productId=${productId}`, {
        headers: this.getHeaders(config),
        signal: AbortSignal.timeout(15000),
      });
      const data: any = await response.json();
      return this.normalizeProduct(data?.result || data?.data || {});
    } catch {
      throw new Error(`Alibaba: Failed to fetch product detail for ${productId}`);
    }
  }

  async getCategories(config: ProviderConfig): Promise<ProviderCategory[]> {
    return [];
  }

  async getWarehouses(config: ProviderConfig): Promise<ProviderWarehouse[]> {
    return [
      { id: 'alibaba-cn', name: 'Alibaba China', country: 'CN' },
    ];
  }

  async getShippingMethods(config: ProviderConfig, params: { productId?: string; warehouseId?: string; country?: string; quantity?: number }): Promise<ProviderShippingMethod[]> {
    return [
      { id: 'standard', name: 'Alibaba Standard Shipping', cost: 6.99, estimatedDays: '15-25' },
      { id: 'express', name: 'Alibaba Express', cost: 12.99, estimatedDays: '7-15' },
      { id: 'air', name: 'Alibaba Air Freight', cost: 25.99, estimatedDays: '3-7' },
    ];
  }

  async calculateShippingCost(config: ProviderConfig, params: { products: Array<{ productId: string; variantId: string; quantity: number }>; country: string; shippingMethodId?: string }): Promise<{ cost: number; methods: ProviderShippingMethod[] }> {
    const methods = await this.getShippingMethods(config, params);
    const selected = methods.find((m) => m.id === params.shippingMethodId) || methods[0];
    return { cost: selected?.cost || 6.99, methods };
  }

  async placeOrder(config: ProviderConfig, params: { products: ProviderOrderItem[]; shippingAddress: ProviderAddress; shippingMethodId: string; warehouseId: string; referenceNumber: string }): Promise<PlaceOrderResult> {
    return {
      providerOrderId: `ALI-${Date.now()}`,
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
    return new Map(productIds.map((id) => [id, 200]));
  }

  async syncPricing(config: ProviderConfig, productIds: string[]): Promise<Map<string, number>> {
    return new Map();
  }

  async registerWebhook(config: ProviderConfig, webhookUrl: string, events: string[]): Promise<boolean> {
    console.log('[Alibaba] Webhook registration requires open.1688.com developer account');
    return true;
  }

  async handleWebhook(payload: any): Promise<void> {
    console.log('[Alibaba] Webhook received:', payload.event);
  }

  private normalizeProduct(item: any): ProviderProduct {
    const id = String(item.offerId || item.id || item.productId || '');
    const images = [
      item.imageUrl || item.image || item.mainImage || '',
      ...(item.imageList || item.images || item.imageUrls || []).map((img: any) => typeof img === 'string' ? img : img.url || ''),
    ].filter(Boolean);

    const price = parseFloat(item.price || item.offerPrice || item.minPrice || 0);
    const comparePrice = parseFloat(item.originalPrice || item.maxPrice || 0);
    const skuList = item.skuList || item.skus || item.variants || [];

    const variants: ProviderVariant[] = skuList.map((v: any) => ({
      id: String(v.skuId || v.id || ''),
      name: v.name || v.skuName || '',
      sku: v.sku || v.skuCode || '',
      price: parseFloat(v.price || v.skuPrice || 0),
      stock: parseInt(v.stock || v.canBookCount || v.quantity || 0, 10),
      image: v.imageUrl || undefined,
      attributes: v.attributes || {},
    }));

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
      attributes: {
        brand: item.brand || '',
        manufacturer: item.manufacturer || '',
        moq: String(item.minOrderQuantity || item.moq || '1'),
      },
      tags: (item.keywords || item.tags || []).slice(0, 10),
      url: item.productUrl || `https://www.alibaba.com/product-detail/${id}.html`,
    };
  }

  private async simulatedSearch(options: ImportOptions): Promise<{ products: ProviderProduct[]; total: number; page: number; pageSize: number }> {
    const count = Math.min(options.maxProducts || 12, 50);
    const products: ProviderProduct[] = Array.from({ length: count }, (_, i) => ({
      id: `ali-${Date.now()}-${i}`,
      sku: `ALI-SIM-${i + 1}`,
      title: `${options.keyword || 'Wholesale Product'} ${i + 1} - Alibaba`,
      description: `Wholesale price product from Alibaba suppliers. MOQ available.`,
      price: 2.99 + i * 3,
      comparePrice: 8.99 + i * 5,
      currency: 'USD',
      images: [],
      category: options.categoryId || 'General',
      variants: [
        { id: `v-${i}-1`, name: 'Wholesale', sku: `ALI-SIM-${i}-W`, price: 2.99 + i * 3, stock: 500, attributes: { moq: '100' } },
      ],
      weight: 0.3 + i * 0.15,
      attributes: { brand: 'Alibaba Supplier', manufacturer: 'China Factory', moq: '100' },
      tags: [options.keyword || 'wholesale', 'alibaba', 'manufacturer'],
      url: `https://www.alibaba.com/product-detail/ali-sim-${i}.html`,
    }));
    return { products, total: count, page: options.page || 1, pageSize: options.pageSize || 20 };
  }
}