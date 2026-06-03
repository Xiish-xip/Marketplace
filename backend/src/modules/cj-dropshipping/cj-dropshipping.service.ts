import { prisma } from '../../common/prisma';
import { AppError, NotFoundError } from '../../common/errors';
import { logger } from '../../common/logger';

// ──────────────────────────────────────────────────────────────
// CJ Dropshipping API Client
// ──────────────────────────────────────────────────────────────
// CJ API Docs: https://developers.cjdropshipping.com/
// Base URL: https://developers.cjdropshipping.com/api2.0/v1
// Auth: exchange API key for access token, then send CJ-Access-Token
// ──────────────────────────────────────────────────────────────

interface CJAuthConfig {
  apiKey: string;
  baseUrl?: string;
}

interface CJProduct {
  pid: string;
  productName: string;
  productImage: string;
  productImages?: string[];
  productUrl: string;
  description?: string;
  originalPrice: number;
  sellPrice: number;
  currency: string;
  varient: CJVariant[];
  category: string;
  weight: number;
  length: number;
  width: number;
  height: number;
  shipping: CJShippingMethod[];
  warehouse: CJWarehouse[];
}

interface CJVariant {
  varientId: string;
  varientName: string;
  price: number;
  stock: number;
  image: string;
  sku: string;
  attributes?: Record<string, string>;
  weight?: number | null;
  dimensions?: { length?: number; width?: number; height?: number };
}

interface CJShippingMethod {
  shippingId: string;
  shippingName: string;
  shippingCost: number;
  estimatedDays: string;
  warehouseName: string;
  warehouseId: string;
}

interface CJWarehouse {
  warehouseId: string;
  warehouseName: string;
  country: string;
}

interface CJOrder {
  orderNumber: string;
  referenceNumber: string;
  orderStatus: number;
  totalPrice: number;
  shippingPrice: number;
  currency: string;
  trackNumber: string;
  shippingMethod: string;
  createDate: string;
  warehouse: string;
  items: CJOrderItem[];
}

interface CJOrderItem {
  productId: string;
  varientId: string;
  quantity: number;
  unitPrice: number;
}

interface CJCreateOrderParams {
  products: Array<{
    productId: string;
    varientId: string;
    quantity: number;
  }>;
  shippingAddress: {
    firstName: string;
    lastName: string;
    phone: string;
    country: string;
    state: string;
    city: string;
    address: string;
    zipCode: string;
    email?: string;
  };
  shippingMethodId: string;
  warehouseId: string;
  referenceNumber: string;
}

interface CJWebhookPayload {
  event: string;
  orderNumber: string;
  referenceNumber: string;
  status: number;
  trackNumber?: string;
  shippingMethod?: string;
  estimatedDelivery?: string;
  timestamp: string;
}

interface CJAccessToken {
  accessToken: string;
  accessTokenExpiryDate?: string;
  refreshToken?: string;
  refreshTokenExpiryDate?: string;
}

type CJApiResponse<T> = {
  code: string | number;
  result?: boolean;
  success?: boolean;
  message: string;
  data: T;
  requestId?: string;
};

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

function firstNumber(...values: unknown[]) {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number) && number > 0) return number;
  }
  return 0;
}

export class CJDropshippingService {
  private readonly baseUrl = 'https://developers.cjdropshipping.com/api2.0/v1';
  private readonly tokenCache = new Map<string, { accessToken: string; expiresAt: number }>();

  private isSuccessResponse(payload: CJApiResponse<unknown>) {
    if (payload.result === false || payload.success === false) return false;
    return payload.result === true || payload.success === true || ['1', '0', '200'].includes(String(payload.code));
  }

  private async getAccessToken(apiKey: string): Promise<string> {
    const normalizedKey = apiKey.trim();
    if (!normalizedKey) throw new AppError(400, 'CJ API key is required');

    const cached = this.tokenCache.get(normalizedKey);
    if (cached && cached.expiresAt > Date.now()) return cached.accessToken;

    const response = await fetch(`${this.baseUrl}/authentication/getAccessToken`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ apiKey: normalizedKey }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => 'Unknown error');
      throw new AppError(502, `CJ token request failed (${response.status}): ${text.slice(0, 500)}`);
    }

    const payload = await response.json() as CJApiResponse<CJAccessToken | null>;
    const accessToken = payload.data?.accessToken;

    if (!this.isSuccessResponse(payload) || !accessToken) {
      throw new AppError(400, `CJ authentication failed: ${payload.message || 'Invalid API key'}`);
    }

    const expiryMs = payload.data?.accessTokenExpiryDate
      ? new Date(payload.data.accessTokenExpiryDate).getTime()
      : Date.now() + 14 * 24 * 60 * 60 * 1000;

    this.tokenCache.set(normalizedKey, {
      accessToken,
      expiresAt: Number.isFinite(expiryMs) ? expiryMs - 60_000 : Date.now() + 14 * 24 * 60 * 60 * 1000,
    });

    return accessToken;
  }

  private getHeaders(accessToken: string): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'CJ-Access-Token': accessToken,
      'Accept': 'application/json',
    };
  }

  private parseName(value: unknown): string | undefined {
    if (!value) return undefined;
    if (typeof value !== 'string') return String(value);
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter(Boolean).join(', ');
    } catch {
      // CJ sometimes returns plain strings and sometimes JSON arrays.
    }
    return value;
  }

  private parseStringList(value: unknown): string[] {
    if (!value) return [];
    if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean);
    if (typeof value !== 'string') return [String(value)].filter(Boolean);
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map((item) => String(item)).filter(Boolean);
    } catch {
      // Plain URL string.
    }
    return value ? [value] : [];
  }

  private normalizeVariant(item: any, productKeys: string[] = [], inventoryByVid: Record<string, number> = {}): CJVariant {
    const varientId = String(item.varientId || item.vid || item.id || item.variantId || item.variantSku || item.sku || '');
    const sku = String(item.sku || item.variantSku || item.productSku || item.varientSku || varientId);
    const keyParts = String(item.variantKey || item.varientKey || item.variantNameEn || item.varientName || '')
      .split('-')
      .map((part) => part.trim())
      .filter(Boolean);
    const attributes = keyParts.reduce<Record<string, string>>((acc, value, index) => {
      acc[productKeys[index] || `Option ${index + 1}`] = value;
      return acc;
    }, {});
    const stock = firstNumber(
      inventoryByVid[varientId],
      item.stock,
      item.inventoryNum,
      item.totalInventoryNum,
      item.totalInventory,
      item.cjInventoryNum,
      item.factoryInventoryNum,
    );

    return {
      ...item,
      varientId,
      varientName: item.varientName || item.variantNameEn || item.variantName || item.variantKey || sku,
      price: firstNumber(item.price, item.variantSellPrice, item.sellPrice, item.nowPrice),
      stock,
      image: item.image || item.variantImage || item.productImage || '',
      sku,
      attributes,
      weight: item.weight ? Number(item.weight) : (item.variantWeight ? Number(item.variantWeight) : null),
      dimensions: {
        length: item.variantLength ? Number(item.variantLength) : undefined,
        width: item.variantWidth ? Number(item.variantWidth) : undefined,
        height: item.variantHeight ? Number(item.variantHeight) : undefined,
      },
    };
  }

  private buildInventoryLookup(inventory: any): Record<string, number> {
    const lookup: Record<string, number> = {};
    for (const item of inventory?.variantInventories || []) {
      const total = (item.inventory || []).reduce((sum: number, warehouse: any) => {
        return sum + firstNumber(warehouse.totalInventory, warehouse.totalInventoryNum, warehouse.cjInventory, warehouse.factoryInventory, warehouse.stock);
      }, 0);
      if (item.vid) lookup[String(item.vid)] = total;
    }
    return lookup;
  }

  private normalizeProduct(item: any): CJProduct {
    const pid = String(item.pid || item.id || item.productId || item.productSku || item.sku || '');
    const sellPrice = firstNumber(item.sellPrice, item.nowPrice, item.discountPrice, item.originalPrice);
    const productName = item.productNameEn || item.nameEn || this.parseName(item.productName) || item.sku || pid;
    const productImages = [
      ...this.parseStringList(item.productImageSet),
      ...this.parseStringList(item.productImage),
      ...this.parseStringList(item.bigImage),
      ...this.parseStringList(item.image),
    ].filter((url, index, list) => url && list.indexOf(url) === index);
    const productKeys = this.parseStringList(item.productKeyEnSet).length
      ? this.parseStringList(item.productKeyEnSet)
      : String(item.productKeyEn || '').split('-').filter(Boolean);

    return {
      ...item,
      pid,
      productName,
      productImage: productImages[0] || '',
      productImages,
      productUrl: item.productUrl || (pid ? `https://app.cjdropshipping.com/product-detail.html?id=${pid}` : ''),
      description: item.description || '',
      originalPrice: firstNumber(item.originalPrice, item.sellPrice),
      sellPrice,
      currency: item.currency || 'USD',
      varient: (item.varient || item.variantList || item.variants || []).map((variant: any) => this.normalizeVariant(variant, productKeys)),
      category: item.category || item.categoryName || item.threeCategoryName || item.categoryId || '',
      weight: Number.parseFloat(String(item.weight ?? item.productWeight ?? 0)) || 0,
      length: Number(item.length ?? 0),
      width: Number(item.width ?? 0),
      height: Number(item.height ?? 0),
      shipping: item.shipping || [],
      warehouse: item.warehouse || [],
    };
  }

  private buildMappingSpecifications(product: CJProduct, fallback?: CJProduct) {
    const variants = product.varient || fallback?.varient || [];
    const images = (product.productImages?.length ? product.productImages : fallback?.productImages?.length ? fallback.productImages : [product.productImage || fallback?.productImage])
      .filter(Boolean)
      .slice(0, 12);

    return {
      description: product.description || fallback?.description || '',
      images,
      variants: variants.map((v) => ({
        id: v.varientId,
        name: v.varientName,
        price: v.price,
        stock: v.stock,
        sku: v.sku,
        image: v.image,
        attributes: v.attributes || {},
        weight: v.weight,
        dimensions: v.dimensions,
      })),
      weight: product.weight || fallback?.weight,
      dimensions: product.length && product.width && product.height
        ? `${product.length}x${product.width}x${product.height}`
        : undefined,
      warehouses: ((product.warehouse?.length ? product.warehouse : fallback?.warehouse) || []).map((w) => ({
        id: w.warehouseId,
        name: w.warehouseName,
        country: w.country,
      })),
      shippingMethods: ((product.shipping?.length ? product.shipping : fallback?.shipping) || []).map((s) => ({
        id: s.shippingId,
        name: s.shippingName,
        cost: s.shippingCost,
        estimatedDays: s.estimatedDays,
      })),
    };
  }

  private async fetchCJ<T>(
    endpoint: string,
    apiKey: string,
    options: RequestInit = {},
    baseUrlOverride?: string,
  ): Promise<CJApiResponse<T>> {
    const accessToken = await this.getAccessToken(apiKey);
    const url = `${baseUrlOverride || this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(accessToken),
        ...(options.headers || {}),
      },
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => 'Unknown error');
      throw new AppError(502, `CJ API error (${response.status}): ${text.slice(0, 500)}`);
    }

    const payload = await response.json() as CJApiResponse<T>;

    if (!this.isSuccessResponse(payload)) {
      throw new AppError(502, `CJ API business error: ${payload.message || 'Unknown error'} (code: ${payload.code})`);
    }

    return payload;
  }

  // ─── Authentication / Connection Test ───

  async testConnection(apiKey: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.getAccessToken(apiKey);
      await this.fetchCJ<any>('/product/getCategory', apiKey, { method: 'GET' });
      return { success: true, message: 'Connected successfully.' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Connection failed';
      return { success: false, message };
    }
  }

  // ─── Product Catalog ───

  async searchProducts(
    apiKey: string,
    params: {
      keyword?: string;
      categoryId?: string;
      page?: number;
      pageSize?: number;
      sort?: string;
      minPrice?: number;
      maxPrice?: number;
      warehouseId?: string;
    } = {},
  ): Promise<{ products: CJProduct[]; total: number; page: number; pageSize: number }> {
    const query = new URLSearchParams();
    if (params.keyword) query.set('keyword', params.keyword);
    if (params.keyword) query.set('keyWord', params.keyword);
    if (params.categoryId) query.set('categoryId', params.categoryId);
    if (params.page) query.set('page', String(params.page));
    if (params.page) query.set('pageNum', String(params.page));
    if (params.pageSize) query.set('pageSize', String(params.pageSize || 20));
    if (params.pageSize) query.set('size', String(Math.min(params.pageSize || 20, 100)));
    if (params.sort) query.set('sort', params.sort);
    if (params.minPrice) query.set('minPrice', String(params.minPrice));
    if (params.minPrice) query.set('startSellPrice', String(params.minPrice));
    if (params.maxPrice) query.set('maxPrice', String(params.maxPrice));
    if (params.maxPrice) query.set('endSellPrice', String(params.maxPrice));
    if (params.warehouseId) query.set('warehouseId', params.warehouseId);

    const result = await this.fetchCJ<{
      list: CJProduct[];
      total: number;
      page: number;
      pageSize: number;
      content?: Array<{ productList?: any[] }>;
      totalRecords?: number;
      pageNumber?: number;
    }>(`/product/listV2?${query.toString()}`, apiKey, { method: 'GET' });

    const rawProducts = result.data.content
      ? result.data.content.flatMap((item) => item.productList || [])
      : result.data.list || [];

    return {
      products: rawProducts.map((item) => this.normalizeProduct(item)),
      total: result.data.totalRecords || result.data.total || 0,
      page: result.data.pageNumber || result.data.page || 1,
      pageSize: result.data.pageSize || 20,
    };
  }

  async getProductDetail(apiKey: string, pid: string): Promise<CJProduct> {
    const result = await this.fetchCJ<CJProduct>(`/product/query?pid=${encodeURIComponent(pid)}`, apiKey, { method: 'GET' });
    const product = this.normalizeProduct(result.data);
    try {
      const inventory = await this.getProductInventory(apiKey, pid);
      const inventoryByVid = this.buildInventoryLookup(inventory);
      const productKeys = this.parseStringList((result.data as any).productKeyEnSet).length
        ? this.parseStringList((result.data as any).productKeyEnSet)
        : String((result.data as any).productKeyEn || '').split('-').filter(Boolean);
      product.varient = ((result.data as any).varient || (result.data as any).variantList || (result.data as any).variants || [])
        .map((variant: any) => this.normalizeVariant(variant, productKeys, inventoryByVid));
    } catch (error) {
      logger.warn('CJ inventory lookup failed', { pid, error: error instanceof Error ? error.message : 'Unknown error' });
    }
    return product;
  }

  async getProductInventory(apiKey: string, pid: string): Promise<any> {
    const result = await this.fetchCJ<any>(`/product/stock/getInventoryByPid?pid=${encodeURIComponent(pid)}`, apiKey, { method: 'GET' });
    return result.data || {};
  }

  async getCategories(apiKey: string): Promise<Array<{ categoryId: string; categoryName: string; parentId: string }>> {
    const result = await this.fetchCJ<any[]>(
      '/product/getCategory',
      apiKey,
      { method: 'GET' },
    );
    const categories: Array<{ categoryId: string; categoryName: string; parentId: string }> = [];

    const collect = (node: any, parentId = '') => {
      if (!node || typeof node !== 'object') return;
      if (node.categoryId && node.categoryName) {
        categories.push({
          categoryId: String(node.categoryId),
          categoryName: String(node.categoryName),
          parentId,
        });
      }
      const nextParentId = node.categoryId ? String(node.categoryId) : parentId;
      for (const key of ['categoryFirstList', 'categorySecondList', 'children', 'list']) {
        if (Array.isArray(node[key])) node[key].forEach((child: any) => collect(child, nextParentId));
      }
    };

    (result.data || []).forEach((item) => collect(item));
    return categories;
  }

  // ─── Warehouses ───

  async getWarehouses(apiKey: string): Promise<CJWarehouse[]> {
    const result = await this.fetchCJ<any[]>('/product/globalWarehouseList', apiKey, { method: 'GET' });
    return (result.data || []).map((warehouse) => ({
      warehouseId: String(warehouse.id || warehouse.areaId || warehouse.valueEn || ''),
      warehouseName: warehouse.areaEn || warehouse.en || warehouse.nameEn || warehouse.areaCn || '',
      country: warehouse.countryCode || warehouse.valueEn || '',
    }));
  }

  // ─── Shipping ───

  async getShippingMethods(
    apiKey: string,
    params: {
      productId?: string;
      warehouseId?: string;
      country?: string;
      quantity?: number;
    } = {},
  ): Promise<CJShippingMethod[]> {
    const query = new URLSearchParams();
    if (params.productId) query.set('productId', params.productId);
    if (params.warehouseId) query.set('warehouseId', params.warehouseId);
    if (params.country) query.set('country', params.country);
    if (params.quantity) query.set('quantity', String(params.quantity));

    const result = await this.fetchCJ<CJShippingMethod[]>(
      `/shipping/list?${query.toString()}`,
      apiKey,
      { method: 'GET' },
    );
    return result.data || [];
  }

  async calculateShippingCost(
    apiKey: string,
    params: {
      products: Array<{ productId: string; varientId: string; quantity: number }>;
      country: string;
      shippingMethodId?: string;
    },
  ): Promise<{ cost: number; methods: CJShippingMethod[] }> {
    const result = await this.fetchCJ<{
      cost: number;
      methods: CJShippingMethod[];
    }>('/shipping/calculate', apiKey, {
      method: 'POST',
      body: JSON.stringify(params),
    });
    return result.data;
  }

  // ─── Orders ───

  async createOrder(apiKey: string, params: CJCreateOrderParams): Promise<CJOrder> {
    const body = {
      products: params.products.map((p) => ({
        productId: p.productId,
        varientId: p.varientId,
        quantity: p.quantity,
      })),
      shippingAddress: params.shippingAddress,
      shippingMethodId: params.shippingMethodId,
      warehouseId: params.warehouseId,
      referenceNumber: params.referenceNumber,
    };

    const result = await this.fetchCJ<CJOrder>('/order/create', apiKey, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return result.data;
  }

  async getOrderDetail(apiKey: string, orderNumber: string): Promise<CJOrder> {
    const result = await this.fetchCJ<CJOrder>(`/order/detail?orderNumber=${orderNumber}`, apiKey, { method: 'GET' });
    return result.data;
  }

  async listOrders(
    apiKey: string,
    params: {
      page?: number;
      pageSize?: number;
      status?: number;
      startDate?: string;
      endDate?: string;
      referenceNumber?: string;
    } = {},
  ): Promise<{ orders: CJOrder[]; total: number }> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.pageSize) query.set('pageSize', String(params.pageSize || 20));
    if (params.status !== undefined) query.set('status', String(params.status));
    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);
    if (params.referenceNumber) query.set('referenceNumber', params.referenceNumber);

    const result = await this.fetchCJ<{
      list: CJOrder[];
      total: number;
    }>(`/order/list?${query.toString()}`, apiKey, { method: 'GET' });
    return { orders: result.data.list || [], total: result.data.total || 0 };
  }

  async getTrackingInfo(apiKey: string, orderNumber: string): Promise<{
    trackNumber: string;
    shippingMethod: string;
    status: string;
    estimatedDelivery: string;
    events: Array<{ date: string; description: string; location: string }>;
  }> {
    const result = await this.fetchCJ<{
      trackNumber: string;
      shippingMethod: string;
      status: string;
      estimatedDelivery: string;
      events: Array<{ date: string; description: string; location: string }>;
    }>(`/order/tracking?orderNumber=${orderNumber}`, apiKey, { method: 'GET' });
    return result.data;
  }

  // ─── Webhook ───

  async registerWebhook(apiKey: string, webhookUrl: string, events: string[]): Promise<boolean> {
    try {
      await this.fetchCJ('/webhook/register', apiKey, {
        method: 'POST',
        body: JSON.stringify({ url: webhookUrl, events }),
      });
      return true;
    } catch (error) {
      logger.error('Failed to register CJ webhook', { error: (error as Error).message, webhookUrl });
      return false;
    }
  }

  async handleWebhook(payload: CJWebhookPayload): Promise<void> {
    const { event, orderNumber, referenceNumber, status, trackNumber, shippingMethod, estimatedDelivery } = payload;

    logger.info(`CJ webhook received: ${event} for order ${orderNumber}`, { referenceNumber });

    switch (event) {
      case 'order.status': {
        // Update the local DropshipOrder tracking
        const dropshipOrder = await prisma.dropshipOrder.findFirst({
          where: { supplierOrderId: orderNumber },
        });
        if (dropshipOrder) {
          const statusMap: Record<number, string> = {
            0: 'PENDING',
            1: 'PROCESSING',
            2: 'SHIPPED',
            3: 'DELIVERED',
            4: 'CANCELLED',
            5: 'REFUNDED',
          };

          await prisma.dropshipOrder.update({
            where: { id: dropshipOrder.id },
            data: {
              status: statusMap[status] || 'PROCESSING',
              trackingUrl: trackNumber ? `https://www.cjdropshipping.com/tracking/${trackNumber}` : undefined,
              errorLog: estimatedDelivery ? JSON.stringify({ estimatedDelivery, shippingMethod }) : undefined,
            },
          });

          // If the local order has a tracking number and we just got one, update the local Order
          if (trackNumber && dropshipOrder.localOrderId) {
            await prisma.order.update({
              where: { id: dropshipOrder.localOrderId },
              data: {
                trackingNumber: trackNumber,
                courierCode: 'CJ',
                status: status === 2 ? 'SHIPPED' : status === 3 ? 'DELIVERED' : undefined,
                ...(estimatedDelivery ? { deliveryEstimate: new Date(estimatedDelivery) } : {}),
              },
            });
          }
        }
        break;
      }
      case 'order.tracking': {
        if (trackNumber && referenceNumber) {
          await prisma.dropshipOrder.updateMany({
            where: { supplierOrderId: orderNumber },
            data: {
              trackingUrl: `https://www.cjdropshipping.com/tracking/${trackNumber}`,
            },
          });
        }
        break;
      }
      default:
        logger.warn(`Unknown CJ webhook event: ${event}`);
    }
  }

  // ─── Sync / Import Products from CJ → Local ───

  async importProducts(
    supplierId: string,
    apiKey: string,
    options: {
      keyword?: string;
      categoryId?: string;
      maxProducts?: number;
      autoMap?: boolean;
    } = {},
  ): Promise<{
    jobId: string;
    imported: number;
    total: number;
    errors: string[];
  }> {
    const supplier = await prisma.dropshipSupplier.findUnique({ where: { id: supplierId } });
    if (!supplier) throw new NotFoundError('Dropship supplier not found');

    const job = await prisma.dropshipImportJob.create({
      data: {
        supplierId: supplier.id,
        status: 'RUNNING',
        totalItems: 0,
        mappingTemplate: JSON.stringify(options),
        startedAt: new Date(),
      },
    });

    const maxProducts = Math.min(options.maxProducts || 8, 8);
    const supplierMeta = parseJson<{ profitMargin?: number }>(supplier.metadata, {});
    const profitMultiplier = 1 + Number(supplierMeta.profitMargin ?? 0.3);
    const errors: string[] = [];
    let imported = 0;

    try {
      const searchResult = await this.searchProducts(apiKey, {
        keyword: options.keyword,
        categoryId: options.categoryId,
        pageSize: maxProducts,
        page: 1,
      });

      await prisma.dropshipImportJob.update({
        where: { id: job.id },
        data: { totalItems: searchResult.products.length },
      });

      for (const product of searchResult.products) {
        try {
          // Get full product detail with variants
          let detail: CJProduct;
          try {
            detail = await this.getProductDetail(apiKey, product.pid);
          } catch {
            detail = product;
          }

          const variants: CJVariant[] = detail.varient || product.varient || [];
          const variantPrices = variants.map((variant) => Number(variant.price || 0)).filter((price) => price > 0);
          const mainPrice = Number(product.sellPrice || detail.sellPrice || product.originalPrice || detail.originalPrice || variantPrices[0] || 0);
          const sellingPrice = Number((mainPrice * profitMultiplier).toFixed(2));
          const stock = variants.reduce((sum, variant) => sum + Number(variant.stock || 0), 0);
          const specifications = this.buildMappingSpecifications(detail, product);
          const images = specifications.images
            .filter(Boolean)
            .slice(0, 12);

          // Upsert dropship product mapping
          await prisma.dropshipProductMapping.upsert({
            where: { supplierSku: product.pid },
            create: {
              supplierId: supplier.id,
              supplierSku: product.pid,
              supplierProductId: product.pid,
              supplierTitle: product.productName,
              supplierPrice: mainPrice,
              supplierCurrency: product.currency || 'USD',
              costPrice: mainPrice,
              sellingPrice,
              quantity: stock,
              supplierUrl: product.productUrl,
              imageUrl: images[0] || product.productImage,
              category: detail.category || product.category,
              specifications: JSON.stringify(specifications),
              autoSync: true,
              lastSyncedAt: new Date(),
            },
            update: {
              supplierTitle: product.productName,
              supplierPrice: mainPrice,
              costPrice: mainPrice,
              sellingPrice,
              quantity: stock,
              imageUrl: images[0] || product.productImage,
              category: detail.category || product.category,
              lastSyncedAt: new Date(),
              specifications: JSON.stringify(specifications),
            },
          });
          imported += 1;
        } catch (error) {
          errors.push(`Product ${product.pid}: ${error instanceof Error ? error.message : 'Import failed'}`);
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

  // ─── Sync Pricing From CJ ───

  async syncPricing(supplierId: string, apiKey: string): Promise<{ updated: number; errors: string[] }> {
    const mappings = await prisma.dropshipProductMapping.findMany({
      where: { supplierId, isActive: true, autoSync: true },
      take: 100,
    });

    const errors: string[] = [];
    let updated = 0;

    for (const mapping of mappings) {
      try {
        const detail = await this.getProductDetail(apiKey, mapping.supplierSku);
        const price = detail.sellPrice || 0;
        const supplier = await prisma.dropshipSupplier.findUnique({ where: { id: supplierId } });
        const supplierMeta = parseJson<{ profitMargin?: number }>(supplier?.metadata, {});
        const profitMultiplier = 1 + Number(supplierMeta.profitMargin ?? 0.3);
        const stock = detail.varient?.reduce((sum, v) => sum + Number(v.stock || 0), 0) || mapping.quantity;

        if (price > 0 && Math.abs(price - mapping.supplierPrice) / Math.max(price, 0.01) > 0.01) {
          await prisma.dropshipProductMapping.update({
            where: { id: mapping.id },
            data: {
              supplierPrice: price,
              costPrice: price,
              sellingPrice: Number((price * profitMultiplier).toFixed(2)),
              lastSyncedAt: new Date(),
              quantity: stock,
            },
          });
          updated += 1;
        } else if (stock !== mapping.quantity) {
          await prisma.dropshipProductMapping.update({
            where: { id: mapping.id },
            data: { quantity: stock, lastSyncedAt: new Date() },
          });
          updated += 1;
        }
      } catch (error) {
        errors.push(`Sync ${mapping.supplierSku}: ${error instanceof Error ? error.message : 'Sync failed'}`);
      }
    }

    return { updated, errors };
  }

  // ─── Place Order on CJ ───

  async placeOrder(
    supplierId: string,
    apiKey: string,
    localOrderId: string,
  ): Promise<{ dropshipOrders: any[]; placed: boolean }> {
    const order = await prisma.order.findUnique({
      where: { id: localOrderId },
      include: {
        items: { include: { product: true } },
        user: { include: { addresses: true } },
      },
    });
    if (!order) throw new NotFoundError('Order not found');

    const shippingAddress = order.shippingAddress ? parseJson<{
      street: string;
      city: string;
      state: string;
      country: string;
      zipCode: string;
      phone: string;
      firstName: string;
      lastName: string;
      email?: string;
      address?: string;
    }>(order.shippingAddress, {
      street: '',
      city: '',
      state: '',
      country: '',
      zipCode: '',
      phone: '',
      firstName: '',
      lastName: '',
    }) : null;

    if (!shippingAddress) throw new AppError(400, 'Shipping address is required');

    const created: any[] = [];

    for (const item of order.items) {
      const mapping = await prisma.dropshipProductMapping.findFirst({
        where: { localProductId: item.productId, supplierId, isActive: true },
      });
      if (!mapping) continue;

      const spec = parseJson<{ variants?: Array<{ id: string; name: string; price: number; stock: number; sku: string }> }>(
        mapping.specifications,
        { variants: [] },
      );

      // Try to find the variant SKU
      const variantSku = spec.variants?.[0]?.sku || '';

      try {
        const cjOrder = await this.createOrder(apiKey, {
          products: [
            {
              productId: mapping.supplierProductId || mapping.supplierSku,
              varientId: variantSku,
              quantity: item.quantity,
            },
          ],
          shippingAddress: {
            firstName: shippingAddress.firstName || shippingAddress.address?.split(' ')[0] || 'Customer',
            lastName: shippingAddress.lastName || '',
            phone: shippingAddress.phone || order.user?.firstName || '',
            country: shippingAddress.country,
            state: shippingAddress.state || '',
            city: shippingAddress.city,
            address: shippingAddress.street || shippingAddress.address || '',
            zipCode: shippingAddress.zipCode,
            email: order.user?.email || undefined,
          },
          shippingMethodId: '',
          warehouseId: '',
          referenceNumber: `${order.orderNumber}-${item.id.slice(0, 8)}`,
        });

        const dropshipOrder = await prisma.dropshipOrder.create({
          data: {
            supplierId,
            localOrderId: order.id,
            supplierOrderId: cjOrder.orderNumber,
            items: JSON.stringify([{ sku: mapping.supplierSku, qty: item.quantity, price: mapping.costPrice }]),
            subtotal: mapping.costPrice * item.quantity,
            shippingCost: cjOrder.shippingPrice || 0,
            totalCost: (mapping.costPrice * item.quantity) + (cjOrder.shippingPrice || 0),
            currency: mapping.supplierCurrency,
            status: 'PROCESSING',
            trackingUrl: cjOrder.trackNumber ? `https://www.cjdropshipping.com/tracking/${cjOrder.trackNumber}` : null,
            estimatedDays: null,
          },
        });

        created.push(dropshipOrder);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'CJ order placement failed';
        // Create a failed order record
        await prisma.dropshipOrder.create({
          data: {
            supplierId,
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

    return { dropshipOrders: created, placed: created.length > 0 };
  }
}

export const cjDropshippingService = new CJDropshippingService();
