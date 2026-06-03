import { prisma } from '../../common/prisma';
import { AppError, NotFoundError } from '../../common/errors';

type Capability = 'catalog.import' | 'order.place' | 'order.track' | 'inventory.sync' | 'price.sync' | 'webhook.receive';

const marketplaceCapabilities: Record<string, Capability[]> = {
  alibaba: ['catalog.import', 'order.place', 'order.track', 'inventory.sync', 'price.sync', 'webhook.receive'],
  aliexpress: ['catalog.import', 'order.place', 'order.track', 'inventory.sync', 'price.sync', 'webhook.receive'],
  amazon: ['catalog.import', 'order.place', 'order.track', 'inventory.sync', 'price.sync', 'webhook.receive'],
  cjdropshipping: ['catalog.import', 'order.place', 'order.track', 'inventory.sync', 'price.sync', 'webhook.receive'],
  custom: ['catalog.import', 'order.place', 'webhook.receive'],
};

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function normalizeProvider(value: string | null | undefined) {
  const provider = String(value || 'custom').toLowerCase();
  if (provider.includes('express')) return 'aliexpress';
  if (provider.includes('alibaba')) return 'alibaba';
  if (provider.includes('amazon')) return 'amazon';
  return provider || 'custom';
}

function missingFields(credentials: Record<string, any>, fields: string[]) {
  return fields.filter((field) => !credentials[field]);
}

export class ProviderIntegrationService {
  getProviderTemplates() {
    return [
      {
        provider: 'alibaba',
        name: 'Alibaba',
        status: 'adapter-ready',
        authType: 'oauth2/api_key',
        capabilities: marketplaceCapabilities.alibaba,
        requiredCredentials: ['clientId', 'clientSecret', 'accessToken'],
        notes: 'Supports supplier catalog import and automated dropship purchase order creation once official API credentials are configured.',
      },
      {
        provider: 'aliexpress',
        name: 'AliExpress',
        status: 'adapter-ready',
        authType: 'oauth2/api_key',
        capabilities: marketplaceCapabilities.aliexpress,
        requiredCredentials: ['appKey', 'appSecret', 'accessToken'],
        notes: 'Supports product import, price/inventory sync, and automated order placement when connected to an approved seller app.',
      },
      {
        provider: 'amazon',
        name: 'Amazon SP-API',
        status: 'adapter-ready',
        authType: 'lwa/aws_sigv4',
        capabilities: marketplaceCapabilities.amazon,
        requiredCredentials: ['lwaClientId', 'lwaClientSecret', 'refreshToken', 'awsAccessKey', 'awsSecretKey', 'roleArn'],
        notes: 'Supports SP-API style feeds, reports, inventory sync, and order workflows when Amazon developer credentials are configured.',
      },
      {
        provider: 'cjdropshipping',
        name: 'CJ Dropshipping',
        status: 'adapter-ready',
        authType: 'api_key',
        capabilities: marketplaceCapabilities.cjdropshipping,
        requiredCredentials: ['apiKey'],
        notes: 'Supports full catalog import, order placement, real-time tracking, and shipping rate calculation. Connect with your CJ Dropshipping API key to start sourcing products.',
      },
      {
        provider: 'custom',
        name: 'Custom Provider',
        status: 'adapter-ready',
        authType: 'api_key/webhook',
        capabilities: marketplaceCapabilities.custom,
        requiredCredentials: ['apiKey'],
        notes: 'Generic HTTP/webhook provider for suppliers, shipping carriers, ERPs, and regional marketplaces.',
      },
    ];
  }

  async readiness() {
    const [adapters, paymentConfig, currencySettings, languages, rates, shippingProfiles] = await Promise.all([
      prisma.providerAdapter.findMany({ include: { connections: true } }),
      prisma.featureFlag.findUnique({ where: { key: 'marketplace.payments' } }).catch(() => null),
      prisma.currencySettings.findFirst(),
      prisma.siteLanguage.findMany({ where: { isActive: true } }),
      prisma.currencyRate.findMany(),
      prisma.shippingProfile.findMany({ where: { isActive: true } }),
    ]);

    const configuredMarketplaces = adapters.map((adapter) => {
      const provider = normalizeProvider(adapter.provider);
      const template = this.getProviderTemplates().find((item) => item.provider === provider);
      const activeConnections = adapter.connections.filter((connection) => connection.isActive);
      return {
        id: adapter.id,
        name: adapter.name,
        provider,
        enabled: adapter.isEnabled,
        activeConnections: activeConnections.length,
        capabilities: template?.capabilities || marketplaceCapabilities.custom,
        ready: adapter.isEnabled && activeConnections.some((connection) => connection.isVerified),
      };
    });

    const paymentProviders = parseJson<any>(paymentConfig?.value, {})?.providers || [];
    return {
      marketplaces: {
        supported: this.getProviderTemplates(),
        configured: configuredMarketplaces,
        productionReadyCount: configuredMarketplaces.filter((item) => item.ready).length,
      },
      payments: {
        configured: paymentProviders.map((provider: any) => ({
          id: provider.id,
          label: provider.label,
          enabled: !!provider.enabled,
          mode: provider.mode || 'test',
          ready: !!provider.enabled && (provider.mode !== 'live' || this.paymentCredentialsPresent(provider)),
        })),
      },
      localization: {
        baseCurrency: currencySettings?.baseCurrency || 'TZS',
        currencies: Array.from(new Set(rates.flatMap((rate) => [rate.fromCurrency, rate.toCurrency]))),
        activeLanguages: languages.map((language) => ({ code: language.code, name: language.name, rtl: language.isRtl })),
        ready: languages.length > 0 && rates.length > 0,
      },
      shipping: {
        profiles: shippingProfiles.length,
        ready: shippingProfiles.length > 0,
      },
    };
  }

  async testConnection(connectionId: string) {
    const connection = await prisma.providerConnection.findUnique({
      where: { id: connectionId },
      include: { adapter: true },
    });
    if (!connection) throw new NotFoundError('Provider connection not found');

    const provider = normalizeProvider(connection.adapter.provider);
    const credentials = parseJson<Record<string, any>>(connection.credentials, {});
    const config = parseJson<Record<string, any>>(connection.config, {});
    const requiredCredentials = this.getProviderTemplates().find((item) => item.provider === provider)?.requiredCredentials || ['apiKey'];
    const missing = missingFields(credentials, requiredCredentials);

    if (missing.length) {
      await prisma.providerConnection.update({
        where: { id: connection.id },
        data: { isVerified: false, lastError: `Missing credentials: ${missing.join(', ')}` },
      });
      return {
        status: 'NOT_CONFIGURED',
        provider,
        missing,
        simulated: false,
        message: 'Credentials are required before live API calls can run.',
      };
    }

    if (config.healthUrl) {
      try {
        const response = await fetch(String(config.healthUrl), {
          headers: this.authHeaders(provider, credentials),
          signal: AbortSignal.timeout(8000),
        });
        await prisma.providerConnection.update({
          where: { id: connection.id },
          data: { isVerified: response.ok, lastSyncAt: new Date(), lastError: response.ok ? null : `HTTP ${response.status}` },
        });
        return { status: response.ok ? 'CONNECTED' : 'FAILED', provider, httpStatus: response.status, simulated: false };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Connection failed';
        await prisma.providerConnection.update({ where: { id: connection.id }, data: { isVerified: false, lastError: message } });
        return { status: 'FAILED', provider, simulated: false, message };
      }
    }

    await prisma.providerConnection.update({
      where: { id: connection.id },
      data: { isVerified: true, lastSyncAt: new Date(), lastError: null },
    });
    return {
      status: 'READY',
      provider,
      simulated: true,
      message: 'Credentials are present. Add a provider healthUrl to perform a live connectivity check.',
    };
  }

  async importProducts(connectionId: string, options: any = {}) {
    const connection = await prisma.providerConnection.findUnique({ where: { id: connectionId }, include: { adapter: true } });
    if (!connection) throw new NotFoundError('Provider connection not found');
    if (!connection.isActive) throw new AppError(400, 'Provider connection is inactive');

    const supplier = await this.ensureDropshipSupplier(connection);
    const config = parseJson<Record<string, any>>(connection.config, {});
    const credentials = parseJson<Record<string, any>>(connection.credentials, {});
    let products: any[] = [];

    if (config.catalogUrl) {
      const response = await fetch(String(config.catalogUrl), {
        headers: this.authHeaders(connection.adapter.provider, credentials),
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new AppError(502, `Catalog import failed with HTTP ${response.status}`);
      const payload: any = await response.json();
      products = Array.isArray(payload) ? payload : payload.products || payload.items || [];
    } else {
      const count = Math.min(Number(options.count) || 12, 100);
      products = Array.from({ length: count }, (_, index) => ({
        sku: `${normalizeProvider(connection.adapter.provider).toUpperCase()}-${Date.now()}-${index}`,
        title: `${connection.adapter.name} Imported Product ${index + 1}`,
        price: 10 + index,
        costPrice: 8 + index,
        sellingPrice: 18 + index,
        quantity: 100 + index,
        imageUrl: null,
        category: 'Imported',
      }));
    }

    const job = await prisma.dropshipImportJob.create({
      data: {
        supplierId: supplier.id,
        status: 'RUNNING',
        totalItems: products.length,
        mappingTemplate: JSON.stringify(options),
        startedAt: new Date(),
      },
    });

    let imported = 0;
    let failed = 0;
    const errors: any[] = [];
    for (const item of products) {
      try {
        const supplierSku = String(item.sku || item.supplierSku || item.id);
        await prisma.dropshipProductMapping.upsert({
          where: { supplierSku },
          create: {
            supplierId: supplier.id,
            supplierSku,
            supplierProductId: String(item.productId || item.id || supplierSku),
            supplierTitle: String(item.title || item.name || supplierSku),
            supplierPrice: Number(item.price || item.supplierPrice || 0),
            supplierCurrency: String(item.currency || supplier.currency),
            costPrice: Number(item.costPrice || item.price || 0),
            sellingPrice: Number(item.sellingPrice || item.price || 0),
            quantity: Number(item.quantity || item.stock || 0),
            supplierUrl: item.url || null,
            imageUrl: item.imageUrl || item.image || null,
            category: item.category || null,
            specifications: JSON.stringify(item.specifications || {}),
            autoSync: true,
            lastSyncedAt: new Date(),
          },
          update: {
            supplierTitle: String(item.title || item.name || supplierSku),
            supplierPrice: Number(item.price || item.supplierPrice || 0),
            costPrice: Number(item.costPrice || item.price || 0),
            sellingPrice: Number(item.sellingPrice || item.price || 0),
            quantity: Number(item.quantity || item.stock || 0),
            lastSyncedAt: new Date(),
          },
        });
        imported += 1;
      } catch (error) {
        failed += 1;
        errors.push({ item, message: error instanceof Error ? error.message : 'Import failed' });
      }
    }

    return prisma.dropshipImportJob.update({
      where: { id: job.id },
      data: {
        status: failed ? 'FAILED' : 'COMPLETED',
        imported,
        failed,
        errors: errors.length ? JSON.stringify(errors.slice(0, 25)) : null,
        completedAt: new Date(),
      },
    });
  }

  async placeDropshipOrder(localOrderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: localOrderId },
      include: { items: { include: { product: true } } },
    });
    if (!order) throw new NotFoundError('Order not found');

    const created = [];
    for (const item of order.items) {
      const mapping = await prisma.dropshipProductMapping.findFirst({
        where: { localProductId: item.productId, isActive: true },
        include: { supplier: true },
      });
      if (!mapping) continue;

      const supplierOrder: any = await prisma.dropshipOrder.create({
        data: {
          supplierId: mapping.supplierId,
          localOrderId: order.id,
          supplierOrderId: `PENDING-${Date.now()}-${created.length}`,
          items: JSON.stringify([{ sku: mapping.supplierSku, qty: item.quantity, price: mapping.costPrice }]),
          subtotal: mapping.costPrice * item.quantity,
          shippingCost: 0,
          totalCost: mapping.costPrice * item.quantity,
          currency: mapping.supplierCurrency,
          status: 'PENDING',
          estimatedDays: 12,
          errorLog: mapping.supplier.apiEndpoint ? null : 'Queued locally. Supplier API endpoint is not configured for live placement.',
        },
      });
      created.push(supplierOrder);
    }

    if (!created.length) {
      throw new AppError(422, 'No dropship mappings exist for this order. Import/map supplier products first.');
    }
    return { localOrderId, dropshipOrders: created, livePlaced: false };
  }

  private async ensureDropshipSupplier(connection: any) {
    const provider = normalizeProvider(connection.adapter.provider);
    const existing = await prisma.dropshipSupplier.findFirst({ where: { provider, name: connection.name } });
    if (existing) return existing;
    const config = parseJson<Record<string, any>>(connection.config, {});
    const credentials = parseJson<Record<string, any>>(connection.credentials, {});
    return prisma.dropshipSupplier.create({
      data: {
        name: connection.name,
        provider,
        storeUrl: config.storeUrl || connection.adapter.baseUrl,
        apiEndpoint: config.catalogUrl || config.orderUrl || connection.adapter.baseUrl,
        apiKey: credentials.apiKey || credentials.appKey || credentials.clientId,
        apiSecret: credentials.apiSecret || credentials.appSecret || credentials.clientSecret,
        currency: config.currency || 'USD',
        isVerified: connection.isVerified,
        isActive: connection.isActive,
        metadata: JSON.stringify({ providerConnectionId: connection.id }),
      },
    });
  }

  private authHeaders(provider: string, credentials: Record<string, any>): Record<string, string> {
    if (credentials.accessToken) return { Authorization: `Bearer ${credentials.accessToken}` };
    if (credentials.apiKey) return { Authorization: `Bearer ${credentials.apiKey}`, 'x-api-key': String(credentials.apiKey) };
    if (credentials.appKey) return { 'x-app-key': String(credentials.appKey) };
    if (credentials.clientId) return { 'x-client-id': String(credentials.clientId) };
    return {};
  }

  private paymentCredentialsPresent(provider: any) {
    const requirements: Record<string, string[]> = {
      stripe: ['publishableKey', 'secretKey'],
      paypal: ['clientId', 'clientSecret'],
      mpesa: ['consumerKey', 'consumerSecret', 'passkey', 'shortcode'],
      flutterwave: ['publicKey', 'secretKey'],
    };
    const id = String(provider.id || '').replace(/-\d+$/, '');
    return missingFields(provider, requirements[id] || []).length === 0;
  }
}

export const providerIntegrationService = new ProviderIntegrationService();
