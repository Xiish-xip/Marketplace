/**
 * Base adapter interface and abstract class for all marketplace/dropshipping providers.
 * Each provider (Alibaba, AliExpress, Amazon, CJ Dropshipping, etc.) implements this.
 */
export interface ProviderProduct {
  id: string;
  sku: string;
  title: string;
  description: string;
  price: number;
  comparePrice?: number;
  currency: string;
  images: string[];
  category: string;
  categoryId?: string;
  variants: ProviderVariant[];
  weight: number;
  length?: number;
  width?: number;
  height?: number;
  attributes: Record<string, string>;
  tags: string[];
  url: string;
  shippingMethods?: ProviderShippingMethod[];
  warehouses?: ProviderWarehouse[];
  metadata?: Record<string, any>;
}

export interface ProviderVariant {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  image?: string;
  attributes: Record<string, string>;
  weight?: number;
  dimensions?: { length?: number; width?: number; height?: number };
}

export interface ProviderShippingMethod {
  id: string;
  name: string;
  cost: number;
  estimatedDays: string;
  warehouseName?: string;
  warehouseId?: string;
}

export interface ProviderWarehouse {
  id: string;
  name: string;
  country: string;
  address?: string;
}

export interface ProviderCategory {
  id: string;
  name: string;
  parentId?: string;
  children?: ProviderCategory[];
}

export interface ProviderOrder {
  id: string;
  providerOrderId: string;
  status: string;
  items: ProviderOrderItem[];
  shippingAddress: ProviderAddress;
  shippingMethod: string;
  shippingCost: number;
  totalCost: number;
  currency: string;
  trackingNumber?: string;
  trackingUrl?: string;
  estimatedDelivery?: string;
  createdAt: string;
  events: ProviderTrackingEvent[];
}

export interface ProviderOrderItem {
  productId: string;
  variantId: string;
  quantity: number;
  unitPrice: number;
  sku: string;
}

export interface ProviderAddress {
  firstName: string;
  lastName: string;
  phone: string;
  country: string;
  state: string;
  city: string;
  address: string;
  zipCode: string;
  email?: string;
}

export interface ProviderTrackingEvent {
  date: string;
  description: string;
  location: string;
}

export interface ProviderConfig {
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  clientId?: string;
  clientSecret?: string;
  awsAccessKey?: string;
  awsSecretKey?: string;
  roleArn?: string;
  lwaClientId?: string;
  lwaClientSecret?: string;
  baseUrl?: string;
  storeUrl?: string;
  webhookUrl?: string;
  [key: string]: any;
}

export interface ImportOptions {
  keyword?: string;
  categoryId?: string;
  maxProducts?: number;
  page?: number;
  pageSize?: number;
  minPrice?: number;
  maxPrice?: number;
  warehouseId?: string;
  autoMap?: boolean;
  profitMargin?: number;
}

export interface ImportResult {
  jobId: string;
  imported: number;
  total: number;
  errors: string[];
  products: ProviderProduct[];
}

export interface SyncResult {
  updated: number;
  errors: string[];
}

export interface PlaceOrderResult {
  providerOrderId: string;
  status: string;
  trackingNumber?: string;
  trackingUrl?: string;
  estimatedDelivery?: string;
  totalCost: number;
  currency: string;
}

export abstract class BaseProviderAdapter {
  public readonly name: string;
  public readonly provider: string;
  public readonly capabilities: string[];
  public readonly authType: string;
  public readonly requiredCredentials: string[];

  constructor(
    name: string,
    provider: string,
    capabilities: string[],
    authType: string,
    requiredCredentials: string[],
  ) {
    this.name = name;
    this.provider = provider;
    this.capabilities = capabilities;
    this.authType = authType;
    this.requiredCredentials = requiredCredentials;
  }

  abstract testConnection(config: ProviderConfig): Promise<{ success: boolean; message: string }>;
  abstract searchProducts(config: ProviderConfig, options: ImportOptions): Promise<{ products: ProviderProduct[]; total: number; page: number; pageSize: number }>;
  abstract getProductDetail(config: ProviderConfig, productId: string): Promise<ProviderProduct>;
  abstract getCategories(config: ProviderConfig): Promise<ProviderCategory[]>;
  abstract getWarehouses(config: ProviderConfig): Promise<ProviderWarehouse[]>;
  abstract getShippingMethods(config: ProviderConfig, params: { productId?: string; warehouseId?: string; country?: string; quantity?: number }): Promise<ProviderShippingMethod[]>;
  abstract calculateShippingCost(config: ProviderConfig, params: { products: Array<{ productId: string; variantId: string; quantity: number }>; country: string; shippingMethodId?: string }): Promise<{ cost: number; methods: ProviderShippingMethod[] }>;
  abstract placeOrder(config: ProviderConfig, params: { products: ProviderOrderItem[]; shippingAddress: ProviderAddress; shippingMethodId: string; warehouseId: string; referenceNumber: string }): Promise<PlaceOrderResult>;
  abstract getOrderDetail(config: ProviderConfig, orderId: string): Promise<ProviderOrder>;
  abstract listOrders(config: ProviderConfig, params: { page?: number; pageSize?: number; status?: string; startDate?: string; endDate?: string }): Promise<{ orders: ProviderOrder[]; total: number }>;
  abstract getTrackingInfo(config: ProviderConfig, orderId: string): Promise<{ trackingNumber: string; shippingMethod: string; status: string; estimatedDelivery: string; events: ProviderTrackingEvent[] }>;
  abstract syncInventory(config: ProviderConfig, productIds: string[]): Promise<Map<string, number>>;
  abstract syncPricing(config: ProviderConfig, productIds: string[]): Promise<Map<string, number>>;
  abstract registerWebhook(config: ProviderConfig, webhookUrl: string, events: string[]): Promise<boolean>;
  abstract handleWebhook(payload: any): Promise<void>;
}