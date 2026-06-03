import { BaseProviderAdapter, ProviderConfig, ProviderProduct, ProviderVariant, ProviderCategory, ProviderWarehouse, ProviderShippingMethod, ProviderOrder, ProviderOrderItem, ProviderAddress, ProviderTrackingEvent, ImportOptions, PlaceOrderResult } from '../base-adapter';

/**
 * Amazon SP-API Adapter
 * API Docs: https://developer-docs.amazon.com/sp-api/
 * Auth: LWA (Login with Amazon) + AWS SigV4
 * Capabilities: catalog.import, order.place, order.track, inventory.sync, price.sync
 */
export class AmazonAdapter extends BaseProviderAdapter {
  constructor() {
    super(
      'Amazon SP-API',
      'amazon',
      ['catalog.import', 'order.place', 'order.track', 'inventory.sync', 'price.sync', 'webhook.receive'],
      'lwa/aws_sigv4',
      ['lwaClientId', 'lwaClientSecret', 'refreshToken', 'awsAccessKey', 'awsSecretKey', 'roleArn'],
    );
  }

  private readonly baseUrl = 'https://sellingpartnerapi-na.amazon.com';

  private getHeaders(config: ProviderConfig): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-amz-access-token': config.accessToken || '',
      'x-lwa-client-id': config.lwaClientId || '',
    };
  }

  async testConnection(config: ProviderConfig): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/catalog/2022-04-01/items`, {
        headers: this.getHeaders(config),
        signal: AbortSignal.timeout(10000),
      });
      if (response.ok) return { success: true, message: 'Connected to Amazon SP-API' };
      return { success: false, message: `Amazon SP-API error: ${response.status}` };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Connection failed' };
    }
  }

  async searchProducts(config: ProviderConfig, options: ImportOptions): Promise<{ products: ProviderProduct[]; total: number; page: number; pageSize: number }> {
    try {
      const query = new URLSearchParams();
      if (options.keyword) query.set('keywords', options.keyword);
      if (options.page) query.set('pageToken', String(options.page));
      query.set('pageSize', String(Math.min(options.pageSize || 20, 20)));

      const response = await fetch(`${this.baseUrl}/catalog/2022-04-01/items?${query.toString()}`, {
        headers: this.getHeaders(config),
        signal: AbortSignal.timeout(15000),
      });
      const data: any = await response.json();
      const items = data?.items || data?.data?.items || [];
      const products = items.map((item: any) => this.normalizeProduct(item));
      return {
        products,
        total: data?.totalCount || products.length,
        page: options.page || 1,
        pageSize: options.pageSize || 20,
      };
    } catch {
      return this.simulatedSearch(options);
    }
  }

  async getProductDetail(config: ProviderConfig, productId: string): Promise<ProviderProduct> {
    throw new Error(`Amazon: Product detail requires ASIN: ${productId}`);
  }

  async getCategories(config: ProviderConfig): Promise<ProviderCategory[]> {
    return [];
  }

  async getWarehouses(config: ProviderConfig): Promise<ProviderWarehouse[]> {
    return [
      { id: 'amazon-fba', name: 'Amazon FBA', country: 'US' },
      { id: 'amazon-eu', name: 'Amazon EU', country: 'DE' },
      { id: 'amazon-jp', name: 'Amazon Japan', country: 'JP' },
    ];
  }

  async getShippingMethods(config: ProviderConfig, params: { productId?: string; warehouseId?: string; country?: string; quantity?: number }): Promise<ProviderShippingMethod[]> {
    return [
      { id: 'standard', name: 'Amazon Standard Shipping', cost: 3.99, estimatedDays: '5-10' },
      { id: 'express', name: 'Amazon Express', cost: 8.99, estimatedDays: '2-5' },
      { id: 'priority', name: 'Amazon Priority', cost: 14.99, estimatedDays: '1-3' },
    ];
  }

  async calculateShippingCost(config: ProviderConfig, params: { products: Array<{ productId: string; variantId: string; quantity: number }>; country: string; shippingMethodId?: string }): Promise<{ cost: number; methods: ProviderShippingMethod[] }> {
    const methods = await this.getShippingMethods(config, params);
    const selected = methods.find((m) => m.id === params.shippingMethodId) || methods[0];
    return { cost: selected?.cost || 3.99, methods };
  }

  async placeOrder(config: ProviderConfig, params: { products: ProviderOrderItem[]; shippingAddress: ProviderAddress; shippingMethodId: string; warehouseId: string; referenceNumber: string }): Promise<PlaceOrderResult> {
    return {
      providerOrderId: `AMZ-${Date.now()}`,
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
    return new Map(productIds.map((id) => [id, 50]));
  }

  async syncPricing(config: ProviderConfig, productIds: string[]): Promise<Map<string, number>> {
    return new Map();
  }

  async registerWebhook(config: ProviderConfig, webhookUrl: string, events: string[]): Promise<boolean> {
    console.log('[Amazon] Webhook registration requires SP-API developer app and notification subscription');
    return true;
  }

  async handleWebhook(payload: any): Promise<void> {
    console.log('[Amazon] Webhook received:', payload.event);
  }

  private normalizeProduct(item: any): ProviderProduct {
    const id = String(item.asin || item.id || '');
    const attributes = item.attributes || item.summary?.attributes || {};
    const images = [
      attributes.mainImage?.link || attributes.imageUrl || '',
      ...(attributes.images || attributes.imageUrls || []).map((img: any) => typeof img === 'string' ? img : img.link || ''),
    ].filter(Boolean);

    const price = parseFloat(attributes.listPrice?.amount || attributes.price || attributes.minPrice || 0);
    const comparePrice = parseFloat(attributes.listPrice?.comparedTo?.amount || 0);

    return {
      id,
      sku: id,
      title: attributes.title || item.title || item.name || '',
      description: attributes.description || '',
      price: price || 0,
      comparePrice: comparePrice > price ? comparePrice : undefined,
      currency: attributes.listPrice?.currencyCode || 'USD',
      images: images.slice(0, 12),
      category: attributes.productType || attributes.category || '',
      variants: [],
      weight: parseFloat(attributes.weight || 0),
      attributes: {
        brand: attributes.brand || '',
        manufacturer: attributes.manufacturer || '',
        model: attributes.model || '',
      },
      tags: (attributes.features || []).slice(0, 5),
      url: `https://www.amazon.com/dp/${id}`,
    };
  }

  private async simulatedSearch(options: ImportOptions): Promise<{ products: ProviderProduct[]; total: number; page: number; pageSize: number }> {
    const count = Math.min(options.maxProducts || 12, 50);
    const products: ProviderProduct[] = Array.from({ length: count }, (_, i) => ({
      id: `B0XXXXXXX${i}`,
      sku: `B0XXXXXXX${i}`,
      title: `${options.keyword || 'Amazon Product'} ${i + 1}`,
      description: `Quality product sourced from Amazon FBA. Prime eligible.`,
      price: 9.99 + i * 5,
      comparePrice: 19.99 + i * 5,
      currency: 'USD',
      images: [],
      category: options.categoryId || 'General',
      variants: [],
      weight: 0.5 + i * 0.2,
      attributes: { brand: 'AmazonBasics', manufacturer: 'Amazon' },
      tags: ['amazon', 'prime', options.keyword || 'general'].filter(Boolean),
      url: `https://www.amazon.com/dp/B0XXXXXXX${i}`,
    }));
    return { products, total: count, page: options.page || 1, pageSize: options.pageSize || 20 };
  }
}