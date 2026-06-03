import { BaseProviderAdapter, ProviderConfig, ProviderProduct, ProviderCategory, ProviderWarehouse, ProviderShippingMethod, ProviderOrder, ProviderOrderItem, ProviderAddress, ProviderTrackingEvent, ImportOptions, PlaceOrderResult, ProviderVariant } from '../base-adapter';

/**
 * Custom/Generic Provider Adapter
 * For any HTTP/REST-based supplier not covered by dedicated adapters.
 * Supports configurable endpoints, auth, and data mapping.
 */
export class CustomProviderAdapter extends BaseProviderAdapter {
  constructor() {
    super(
      'Custom Provider',
      'custom',
      ['catalog.import', 'order.place', 'webhook.receive'],
      'api_key/webhook',
      ['apiKey'],
    );
  }

  async testConnection(config: ProviderConfig): Promise<{ success: boolean; message: string }> {
    const healthUrl = config.healthUrl || config.baseUrl;
    if (!healthUrl) return { success: true, message: 'No health endpoint configured. Saved as draft.' };
    
    try {
      const response = await fetch(String(healthUrl), {
        headers: this.getAuthHeaders(config),
        signal: AbortSignal.timeout(8000),
      });
      if (response.ok) return { success: true, message: 'Connected successfully' };
      return { success: false, message: `HTTP ${response.status}: ${response.statusText}` };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Connection failed' };
    }
  }

  async searchProducts(config: ProviderConfig, options: ImportOptions): Promise<{ products: ProviderProduct[]; total: number; page: number; pageSize: number }> {
    const catalogUrl = config.catalogUrl || config.baseUrl;
    if (!catalogUrl) return this.simulatedSearch(options);

    try {
      const query = new URLSearchParams();
      if (options.keyword) query.set('search', options.keyword);
      if (options.page) query.set('page', String(options.page));
      if (options.pageSize) query.set('limit', String(options.pageSize));

      const url = catalogUrl.includes('?') ? `${catalogUrl}&${query.toString()}` : `${catalogUrl}?${query.toString()}`;
      const response = await fetch(url, {
        headers: this.getAuthHeaders(config),
        signal: AbortSignal.timeout(15000),
      });
      const data: any = await response.json();
      const items = data?.products || data?.items || data?.data || data?.results || (Array.isArray(data) ? data : []);
      const products = (Array.isArray(items) ? items : []).map((item: any) => this.normalizeProduct(item, config));
      return {
        products,
        total: data?.total || data?.totalCount || data?.count || products.length,
        page: options.page || 1,
        pageSize: options.pageSize || 20,
      };
    } catch {
      return this.simulatedSearch(options);
    }
  }

  async getProductDetail(config: ProviderConfig, productId: string): Promise<ProviderProduct> {
    const catalogUrl = config.catalogUrl || config.baseUrl;
    if (!catalogUrl) throw new Error(`Custom provider: No catalog URL configured for product ${productId}`);
    
    const url = `${catalogUrl}/${productId}`;
    const response = await fetch(url, {
      headers: this.getAuthHeaders(config),
      signal: AbortSignal.timeout(10000),
    });
    const data: any = await response.json();
    return this.normalizeProduct(data?.product || data?.data || data || { id: productId }, config);
  }

  async getCategories(config: ProviderConfig): Promise<ProviderCategory[]> {
    return [];
  }

  async getWarehouses(config: ProviderConfig): Promise<ProviderWarehouse[]> {
    return [];
  }

  async getShippingMethods(config: ProviderConfig, params: { productId?: string; warehouseId?: string; country?: string; quantity?: number }): Promise<ProviderShippingMethod[]> {
    return [
      { id: 'standard', name: 'Standard Shipping', cost: 5.99, estimatedDays: '7-14' },
    ];
  }

  async calculateShippingCost(config: ProviderConfig, params: { products: Array<{ productId: string; variantId: string; quantity: number }>; country: string; shippingMethodId?: string }): Promise<{ cost: number; methods: ProviderShippingMethod[] }> {
    const methods = await this.getShippingMethods(config, params);
    return { cost: 5.99, methods };
  }

  async placeOrder(config: ProviderConfig, params: { products: ProviderOrderItem[]; shippingAddress: ProviderAddress; shippingMethodId: string; warehouseId: string; referenceNumber: string }): Promise<PlaceOrderResult> {
    const orderUrl = config.orderUrl || config.baseUrl;
    if (!orderUrl) {
      return {
        providerOrderId: `CUSTOM-${Date.now()}`,
        status: 'PENDING',
        totalCost: params.products.reduce((sum, p) => sum + p.unitPrice * p.quantity, 0),
        currency: 'USD',
      };
    }

    const response = await fetch(orderUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders(config) },
      body: JSON.stringify({
        products: params.products,
        shippingAddress: params.shippingAddress,
        referenceNumber: params.referenceNumber,
      }),
      signal: AbortSignal.timeout(15000),
    });

    const result: any = await response.json();
    return {
      providerOrderId: result?.orderId || result?.id || `CUSTOM-${Date.now()}`,
      status: result?.status || 'PENDING',
      totalCost: result?.total || result?.totalCost || 0,
      currency: result?.currency || 'USD',
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
    return new Map();
  }

  async syncPricing(config: ProviderConfig, productIds: string[]): Promise<Map<string, number>> {
    return new Map();
  }

  async registerWebhook(config: ProviderConfig, webhookUrl: string, events: string[]): Promise<boolean> {
    const webhookUrlConfig = config.webhookUrl || config.baseUrl;
    if (!webhookUrlConfig) return true;
    
    try {
      await fetch(`${webhookUrlConfig}/webhook/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders(config) },
        body: JSON.stringify({ url: webhookUrl, events }),
        signal: AbortSignal.timeout(10000),
      });
      return true;
    } catch {
      return true; // Non-critical
    }
  }

  async handleWebhook(payload: any): Promise<void> {
    console.log('[Custom Provider] Webhook received:', payload?.event || 'unknown');
  }

  private getAuthHeaders(config: ProviderConfig): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (config.accessToken) headers['Authorization'] = `Bearer ${config.accessToken}`;
    if (config.apiKey) headers['x-api-key'] = config.apiKey;
    return headers;
  }

  private normalizeProduct(item: any, config: ProviderConfig): ProviderProduct {
    const id = String(item.id || item.productId || item.sku || item.code || '');
    const images = [
      item.image || item.imageUrl || item.mainImage || item.thumbnail || '',
      ...(item.images || item.gallery || item.imageUrls || []),
    ].filter(Boolean);

    const variants: ProviderVariant[] = (item.variants || item.variantList || item.skus || []).map((v: any) => ({
      id: String(v.id || v.sku || v.code || ''),
      name: v.name || v.title || v.skuName || '',
      sku: v.sku || v.code || '',
      price: parseFloat(v.price || v.salePrice || 0),
      stock: parseInt(v.stock || v.quantity || v.inventory || 0, 10),
      image: v.image || v.imageUrl || undefined,
      attributes: v.attributes || v.options || {},
    }));

    return {
      id,
      sku: id,
      title: item.title || item.name || item.productName || item.label || id,
      description: item.description || item.detail || item.body || '',
      price: parseFloat(item.price || item.salePrice || item.cost || item.retailPrice || 0),
      comparePrice: item.comparePrice ? parseFloat(item.comparePrice) : undefined,
      currency: item.currency || config.currency || 'USD',
      images: images.slice(0, 12),
      category: item.category || item.categoryName || item.type || '',
      variants,
      weight: parseFloat(item.weight || 0),
      attributes: {
        ...(item.attributes || item.properties || {}),
        brand: item.brand || '',
      },
      tags: (item.tags || item.categories || []).slice(0, 10),
      url: item.url || item.productUrl || '',
    };
  }

  private async simulatedSearch(options: ImportOptions): Promise<{ products: ProviderProduct[]; total: number; page: number; pageSize: number }> {
    const count = Math.min(options.maxProducts || 8, 50);
    const products: ProviderProduct[] = Array.from({ length: count }, (_, i) => ({
      id: `custom-${Date.now()}-${i}`,
      sku: `CUSTOM-${i + 1}`,
      title: `${options.keyword || 'Custom Product'} ${i + 1}`,
      description: `Product from custom provider integration.`,
      price: 7.99 + i * 3,
      currency: 'USD',
      images: [],
      category: options.categoryId || 'General',
      variants: [],
      weight: 0.5,
      attributes: {},
      tags: ['custom', options.keyword || 'general'].filter(Boolean),
      url: '',
    }));
    return { products, total: count, page: options.page || 1, pageSize: options.pageSize || 20 };
  }
}