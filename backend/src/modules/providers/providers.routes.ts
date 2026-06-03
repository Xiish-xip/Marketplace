import { Router } from 'express';
import { authenticate, authorize } from '../../common/middleware';
import { prisma } from '../../common/prisma';
import { integrationEngine } from './integration-engine';

const router = Router();
const admin = [authenticate, authorize('ADMIN', 'SUPER_ADMIN')];

function webhookPayload(body: any) {
  return {
    ...body,
    events: Array.isArray(body?.events) ? JSON.stringify(body.events) : body?.events,
    headers: body?.headers && typeof body.headers !== 'string' ? JSON.stringify(body.headers) : body?.headers,
  };
}

function adapterPayload(body: any) {
  return {
    ...body,
    methods: Array.isArray(body?.methods) ? JSON.stringify(body.methods) : (body?.methods || '[]'),
    configSchema: body?.configSchema && typeof body.configSchema !== 'string' ? JSON.stringify(body.configSchema) : body?.configSchema,
  };
}

// ═══════════════════════════════════════════════
//  PROVIDER CAPABILITIES & READINESS
// ═══════════════════════════════════════════════

router.get('/capabilities', ...admin, async (_req, res, next) => {
  try {
    res.json({ success: true, data: integrationEngine.getSupportedProviders() });
  } catch (e) { next(e); }
});

router.get('/readiness', ...admin, async (_req, res, next) => {
  try {
    res.json({ success: true, data: await integrationEngine.getReadiness() });
  } catch (e) { next(e); }
});

// ═══════════════════════════════════════════════
//  PROVIDER ADAPTERS CRUD
// ═══════════════════════════════════════════════

router.get('/adapters', ...admin, async (req, res, next) => {
  try {
    const adapters = await prisma.providerAdapter.findMany({
      include: { connections: { include: { importJobs: { take: 5, orderBy: { createdAt: 'desc' } } } } },
    });
    // Enhance with registry info
    const enhanced = adapters.map((adapter) => {
      const registryInfo = integrationEngine.getSupportedProviders().find((p) => p.provider === adapter.provider);
      return { ...adapter, registryInfo: registryInfo || null };
    });
    res.json({ success: true, data: enhanced });
  } catch (e) { next(e); }
});

router.get('/adapters/:provider', ...admin, async (req, res, next) => {
  try {
    const adapter = await prisma.providerAdapter.findFirst({
      where: { provider: req.params.provider },
      include: { connections: true },
    });
    if (!adapter) {
      // Return the registry template if not yet configured
      const registryInfo = integrationEngine.getSupportedProviders().find((p) => p.provider === req.params.provider);
      return res.json({ success: true, data: { registryInfo, notConfigured: true } });
    }
    const registryInfo = integrationEngine.getSupportedProviders().find((p) => p.provider === adapter.provider);
    res.json({ success: true, data: { ...adapter, registryInfo } });
  } catch (e) { next(e); }
});

router.post('/adapters', ...admin, async (req, res, next) => {
  try {
    res.json({ success: true, data: await prisma.providerAdapter.create({ data: adapterPayload(req.body) }) });
  } catch (e) { next(e); }
});

router.put('/adapters/:id', ...admin, async (req, res, next) => {
  try {
    const { connections, status, webhookUrl, ...body } = req.body || {};
    res.json({ success: true, data: await prisma.providerAdapter.update({ where: { id: req.params.id }, data: adapterPayload(body) }) });
  } catch (e) { next(e); }
});

router.delete('/adapters/:id', ...admin, async (req, res, next) => {
  try {
    // Also remove related connections
    await prisma.providerConnection.deleteMany({ where: { adapterId: req.params.id } });
    res.json({ success: true, data: await prisma.providerAdapter.delete({ where: { id: req.params.id } }) });
  } catch (e) { next(e); }
});

// ═══════════════════════════════════════════════
//  CONNECTIONS CRUD + OPERATIONS
// ═══════════════════════════════════════════════

router.get('/connections', ...admin, async (req, res, next) => {
  try {
    const connections = await prisma.providerConnection.findMany({
      include: { adapter: true, importJobs: { take: 3, orderBy: { createdAt: 'desc' } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: connections });
  } catch (e) { next(e); }
});

router.post('/connections', ...admin, async (req, res, next) => {
  try {
    let { adapterId, provider, ...body } = req.body;
    
    // If no adapterId provided, find or create a ProviderAdapter for this provider
    if (!adapterId && provider) {
      let adapter = await prisma.providerAdapter.findFirst({ where: { provider } });
      if (!adapter) {
        adapter = await prisma.providerAdapter.create({
          data: {
            name: provider.charAt(0).toUpperCase() + provider.slice(1),
            provider,
            methods: '[]',
            isEnabled: true,
            isActive: true,
          },
        });
      }
      adapterId = adapter.id;
    }

    const data = {
      ...body,
      adapterId,
      provider,
      credentials: typeof req.body.credentials === 'object' ? JSON.stringify(req.body.credentials) : req.body.credentials,
      config: typeof req.body.config === 'object' ? JSON.stringify(req.body.config) : req.body.config,
    };
    res.json({ success: true, data: await prisma.providerConnection.create({ data }) });
  } catch (e) { next(e); }
});

router.put('/connections/:id', ...admin, async (req, res, next) => {
  try {
    const data: any = { ...req.body };
    if (typeof data.credentials === 'object') data.credentials = JSON.stringify(data.credentials);
    if (typeof data.config === 'object') data.config = JSON.stringify(data.config);
    // Remove nested relations
    delete data.adapter;
    delete data.importJobs;
    const result = await prisma.providerConnection.update({ where: { id: req.params.id }, data, include: { adapter: true } });
    res.json({ success: true, data: result });
  } catch (e) { next(e); }
});

router.delete('/connections/:id', ...admin, async (req, res, next) => {
  try {
    await prisma.dropshipImportJob.deleteMany({ where: { connectionId: req.params.id } });
    res.json({ success: true, data: await prisma.providerConnection.delete({ where: { id: req.params.id } }) });
  } catch (e) { next(e); }
});

// ═══════════════════════════════════════════════
//  CONNECTION OPERATIONS
// ═══════════════════════════════════════════════

router.post('/connections/:id/test', ...admin, async (req, res, next) => {
  try {
    res.json({ success: true, data: await integrationEngine.testConnection(req.params.id) });
  } catch (e) { next(e); }
});

router.post('/connections/:id/import-products', ...admin, async (req, res, next) => {
  try {
    const options = {
      keyword: req.body.keyword,
      categoryId: req.body.categoryId,
      maxProducts: Math.min(Number(req.body.maxProducts) || 50, 200),
      page: Number(req.body.page) || 1,
      pageSize: Math.min(Number(req.body.pageSize) || 20, 50),
      minPrice: req.body.minPrice ? Number(req.body.minPrice) : undefined,
      maxPrice: req.body.maxPrice ? Number(req.body.maxPrice) : undefined,
      profitMargin: req.body.profitMargin ? Number(req.body.profitMargin) : undefined,
      autoMap: req.body.autoMap !== false,
    };
    const result = await integrationEngine.importProducts(req.params.id, options);
    res.status(201).json({ success: true, data: result });
  } catch (e) { next(e); }
});

router.post('/connections/:id/import-single', ...admin, async (req, res, next) => {
  try {
    const { productId } = req.body;
    if (!productId) return res.status(400).json({ success: false, message: 'productId is required' });
    const result = await integrationEngine.importSingleProduct(req.params.id, productId);
    res.status(201).json({ success: true, data: result });
  } catch (e) { next(e); }
});

router.post('/connections/:id/sync-inventory', ...admin, async (req, res, next) => {
  try {
    res.json({ success: true, data: await integrationEngine.syncInventory(req.params.id) });
  } catch (e) { next(e); }
});

router.post('/connections/:id/sync-pricing', ...admin, async (req, res, next) => {
  try {
    res.json({ success: true, data: await integrationEngine.syncPricing(req.params.id) });
  } catch (e) { next(e); }
});

router.post('/connections/:id/register-webhook', ...admin, async (req, res, next) => {
  try {
    const { webhookUrl, events } = req.body;
    res.json({ success: true, data: await integrationEngine.registerWebhook(req.params.id, webhookUrl || `${req.protocol}://${req.get('host')}/api/providers/webhooks/${req.params.id}`, events || ['order.status', 'order.tracking']) });
  } catch (e) { next(e); }
});

// ═══════════════════════════════════════════════
//  SUPPLIERS CRUD
// ═══════════════════════════════════════════════

router.get('/suppliers', ...admin, async (req, res, next) => {
  try {
    const suppliers = await prisma.dropshipSupplier.findMany({
      include: {
        _count: { select: { mappings: true, orders: true, jobs: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: suppliers });
  } catch (e) { next(e); }
});

router.put('/suppliers/:id', ...admin, async (req, res, next) => {
  try {
    const { mappings, orders, jobs, ...data } = req.body;
    if (data.metadata && typeof data.metadata === 'object') data.metadata = JSON.stringify(data.metadata);
    res.json({ success: true, data: await prisma.dropshipSupplier.update({ where: { id: req.params.id }, data }) });
  } catch (e) { next(e); }
});

// ═══════════════════════════════════════════════
//  PRODUCT MAPPINGS
// ═══════════════════════════════════════════════

router.get('/mappings', ...admin, async (req, res, next) => {
  try {
    const { supplierId, search, active, page = '1', limit = '50' } = req.query;
    const where: any = {};
    if (supplierId) where.supplierId = supplierId;
    if (active === 'true') where.isActive = true;
    if (active === 'false') where.isActive = false;
    if (search) where.OR = [
      { supplierTitle: { contains: search as string, mode: 'insensitive' } },
      { supplierSku: { contains: search as string, mode: 'insensitive' } },
      { category: { contains: search as string, mode: 'insensitive' } },
    ];

    const [mappings, total] = await Promise.all([
      prisma.dropshipProductMapping.findMany({
        where,
        include: { supplier: { select: { name: true, provider: true } } },
        orderBy: { updatedAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.dropshipProductMapping.count({ where }),
    ]);

    res.json({ success: true, data: { mappings, total, page: Number(page), limit: Number(limit) } });
  } catch (e) { next(e); }
});

router.put('/mappings/:id', ...admin, async (req, res, next) => {
  try {
    const { supplier, ...data } = req.body;
    if (data.specifications && typeof data.specifications === 'object') data.specifications = JSON.stringify(data.specifications);
    res.json({ success: true, data: await prisma.dropshipProductMapping.update({ where: { id: req.params.id }, data }) });
  } catch (e) { next(e); }
});

router.delete('/mappings/:id', ...admin, async (req, res, next) => {
  try {
    res.json({ success: true, data: await prisma.dropshipProductMapping.delete({ where: { id: req.params.id } }) });
  } catch (e) { next(e); }
});

// ═══════════════════════════════════════════════
//  DROPSHIP ORDERS
// ═══════════════════════════════════════════════

router.get('/dropship-orders', ...admin, async (req, res, next) => {
  try {
    const { supplierId, status, page = '1', limit = '50' } = req.query;
    const where: any = {};
    if (supplierId) where.supplierId = supplierId;
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      prisma.dropshipOrder.findMany({
        where,
        include: { supplier: { select: { name: true, provider: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.dropshipOrder.count({ where }),
    ]);

    res.json({ success: true, data: { orders, total, page: Number(page), limit: Number(limit) } });
  } catch (e) { next(e); }
});

router.post('/dropship-orders/:orderId/place', ...admin, async (req, res, next) => {
  try {
    const { connectionId } = req.body;
    const result = connectionId
      ? await integrationEngine.placeOrder(connectionId, req.params.orderId)
      : await integrationEngine.autoRouteOrder(req.params.orderId);
    res.status(201).json({ success: true, data: result });
  } catch (e) { next(e); }
});

// ═══════════════════════════════════════════════
//  IMPORT JOBS
// ═══════════════════════════════════════════════

router.get('/import-jobs', ...admin, async (req, res, next) => {
  try {
    const { supplierId, status, page = '1', limit = '20' } = req.query;
    const where: any = {};
    if (supplierId) where.supplierId = supplierId;
    if (status) where.status = status;

    const [jobs, total] = await Promise.all([
      prisma.dropshipImportJob.findMany({
        where,
        include: { supplier: { select: { name: true, provider: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.dropshipImportJob.count({ where }),
    ]);

    res.json({ success: true, data: { jobs, total, page: Number(page), limit: Number(limit) } });
  } catch (e) { next(e); }
});

router.get('/import-jobs/:id', ...admin, async (req, res, next) => {
  try {
    const job = await prisma.dropshipImportJob.findUnique({
      where: { id: req.params.id },
      include: { supplier: true, connection: { include: { adapter: true } } },
    });
    if (!job) return res.status(404).json({ success: false, message: 'Import job not found' });
    // Parse errors JSON for display
    const parsed = { ...job, errors: job.errors ? JSON.parse(job.errors) : [] };
    res.json({ success: true, data: parsed });
  } catch (e) { next(e); }
});

// ═══════════════════════════════════════════════
//  SYNC ALL CONNECTIONS
// ═══════════════════════════════════════════════

router.post('/sync-all', ...admin, async (req, res, next) => {
  try {
    res.json({ success: true, data: await integrationEngine.syncAll() });
  } catch (e) { next(e); }
});

// ═══════════════════════════════════════════════
//  DASHBOARD STATS
// ═══════════════════════════════════════════════

router.get('/dashboard', ...admin, async (req, res, next) => {
  try {
    res.json({ success: true, data: await integrationEngine.getDashboardStats() });
  } catch (e) { next(e); }
});

// ═══════════════════════════════════════════════
//  EXTERNAL PROVIDER SEARCH (search without importing)
// ═══════════════════════════════════════════════

router.post('/connections/:id/search', ...admin, async (req, res, next) => {
  try {
    const connection = await prisma.providerConnection.findUnique({
      where: { id: req.params.id },
      include: { adapter: true },
    });
    if (!connection) return res.status(404).json({ success: false, message: 'Connection not found' });

    const adapter = integrationEngine.getAdapter(connection.adapter.provider);
    const config = {
      ...JSON.parse(connection.config || '{}'),
      ...JSON.parse(connection.credentials || '{}'),
    };

    const result = await adapter.searchProducts(config, {
      keyword: req.body.keyword,
      categoryId: req.body.categoryId,
      page: Number(req.body.page) || 1,
      pageSize: Math.min(Number(req.body.pageSize) || 20, 50),
      minPrice: req.body.minPrice ? Number(req.body.minPrice) : undefined,
      maxPrice: req.body.maxPrice ? Number(req.body.maxPrice) : undefined,
    });

    res.json({ success: true, data: result });
  } catch (e) { next(e); }
});

// ═══════════════════════════════════════════════
//  WEBHOOKS MANAGEMENT
// ═══════════════════════════════════════════════

router.get('/webhooks', ...admin, async (req, res, next) => {
  try {
    res.json({ success: true, data: await prisma.webhookEndpoint.findMany() });
  } catch (e) { next(e); }
});

router.post('/webhooks', ...admin, async (req, res, next) => {
  try {
    res.json({ success: true, data: await prisma.webhookEndpoint.create({ data: webhookPayload(req.body) }) });
  } catch (e) { next(e); }
});

router.put('/webhooks/:id', ...admin, async (req, res, next) => {
  try {
    res.json({ success: true, data: await prisma.webhookEndpoint.update({ where: { id: req.params.id }, data: webhookPayload(req.body) }) });
  } catch (e) { next(e); }
});

router.delete('/webhooks/:id', ...admin, async (req, res, next) => {
  try {
    res.json({ success: true, data: await prisma.webhookEndpoint.delete({ where: { id: req.params.id } }) });
  } catch (e) { next(e); }
});

// ═══════════════════════════════════════════════
//  EXTERNAL WEBHOOK RECEIVER (for provider callbacks)
// ═══════════════════════════════════════════════

router.post('/webhooks/cj-dropshipping', async (req, res, next) => {
  try {
    await integrationEngine.handleWebhook('cjdropshipping', req.body);
    res.json({ success: true });
  } catch (e) { next(e); }
});

router.post('/webhooks/aliexpress', async (req, res, next) => {
  try {
    await integrationEngine.handleWebhook('aliexpress', req.body);
    res.json({ success: true });
  } catch (e) { next(e); }
});

router.post('/webhooks/amazon', async (req, res, next) => {
  try {
    await integrationEngine.handleWebhook('amazon', req.body);
    res.json({ success: true });
  } catch (e) { next(e); }
});

router.post('/webhooks/alibaba', async (req, res, next) => {
  try {
    await integrationEngine.handleWebhook('alibaba', req.body);
    res.json({ success: true });
  } catch (e) { next(e); }
});

router.post('/webhooks/:provider', async (req, res, next) => {
  try {
    await integrationEngine.handleWebhook(req.params.provider, req.body);
    res.json({ success: true });
  } catch (e) { next(e); }
});

export default router;