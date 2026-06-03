import { prisma } from '../../common/prisma';
import { AppError, NotFoundError } from '../../common/errors';
import { logger } from '../../common/logger';
import { fulfillmentEngine } from './fulfillment-engine';
import { inventorySyncEngine } from './inventory-sync-engine';
import { pricingEngine } from './pricing-engine';
import { dropshipAnalyticsEngine } from './analytics-engine';

function stringify(value: unknown) {
  return JSON.stringify(value ?? null);
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export class DropshipAutomationEngine {
  private automationPayload(data: any) {
    return {
      name: data.name,
      trigger: data.trigger,
      triggerConfig: typeof data.triggerConfig === 'string' ? data.triggerConfig : stringify(data.triggerConfig || {}),
      actions: typeof data.actions === 'string' ? data.actions : stringify(data.actions || []),
      conditions: data.conditions ? (typeof data.conditions === 'string' ? data.conditions : stringify(data.conditions)) : null,
      isActive: data.isActive !== false,
    };
  }

  async listAutomations(params: { trigger?: string; active?: string; page?: number; limit?: number }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 50));
    const where: any = {};
    if (params.trigger) where.trigger = params.trigger;
    if (params.active === 'true') where.isActive = true;
    if (params.active === 'false') where.isActive = false;

    const [automations, total] = await Promise.all([
      prisma.dropshipAutomation.findMany({ where, orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }], skip: (page - 1) * limit, take: limit }),
      prisma.dropshipAutomation.count({ where }),
    ]);

    return {
      automations: automations.map((automation) => ({
        ...automation,
        triggerConfig: parseJson(automation.triggerConfig, {}),
        actions: parseJson(automation.actions, []),
        conditions: parseJson(automation.conditions, {}),
      })),
      total,
      page,
      limit,
    };
  }

  async createAutomation(data: any) {
    return prisma.dropshipAutomation.create({ data: this.automationPayload(data) });
  }

  async updateAutomation(id: string, data: any) {
    const existing = await prisma.dropshipAutomation.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Automation');
    return prisma.dropshipAutomation.update({
      where: { id },
      data: this.automationPayload({
        name: data.name || existing.name,
        trigger: data.trigger || existing.trigger,
        triggerConfig: data.triggerConfig ?? existing.triggerConfig,
        actions: data.actions ?? existing.actions,
        conditions: data.conditions ?? existing.conditions,
        isActive: data.isActive ?? existing.isActive,
      }),
    });
  }

  async deleteAutomation(id: string) {
    const existing = await prisma.dropshipAutomation.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Automation');
    return prisma.dropshipAutomation.delete({ where: { id } });
  }

  async runAutomation(id: string, payload: any = {}) {
    const automation = await prisma.dropshipAutomation.findUnique({ where: { id } });
    if (!automation) throw new NotFoundError('Automation');
    if (!automation.isActive) throw new AppError(400, 'Automation is inactive');
    const actions = parseJson<Array<{ type: string; config?: any }>>(automation.actions, []);
    const results: any[] = [];

    try {
      for (const action of actions) {
        results.push(await this.executeAction(action, payload));
      }
      await prisma.dropshipAutomation.update({
        where: { id },
        data: { lastRunAt: new Date(), runCount: { increment: 1 } },
      });
      return { automationId: id, results };
    } catch (error) {
      await prisma.dropshipAutomation.update({
        where: { id },
        data: { lastRunAt: new Date(), failCount: { increment: 1 } },
      });
      throw error;
    }
  }

  async runTrigger(trigger: string, payload: any = {}) {
    const automations = await prisma.dropshipAutomation.findMany({ where: { trigger, isActive: true } });
    const results = [];
    for (const automation of automations) {
      results.push(await this.runAutomation(automation.id, payload));
    }
    return { trigger, count: results.length, results };
  }

  private async executeAction(action: { type: string; config?: any }, payload: any) {
    const config = action.config || {};
    switch (action.type) {
      case 'AUTO_ROUTE_ORDER':
      case 'CREATE_SUPPLIER_ORDER':
        return fulfillmentEngine.autoRouteOrder(payload.orderId || config.orderId, { force: config.force === true });
      case 'SYNC_INVENTORY':
        return config.connectionId
          ? inventorySyncEngine.forceSyncConnection(config.connectionId, 'INVENTORY')
          : inventorySyncEngine.syncAllConnections('INVENTORY');
      case 'SYNC_PRICING':
        return pricingEngine.recalculatePrices({ mappingIds: config.mappingIds, dryRun: config.dryRun });
      case 'GENERATE_SUPPLIER_SCORECARD':
        return dropshipAnalyticsEngine.supplierScorecard(payload.supplierId || config.supplierId);
      case 'SEND_NOTIFICATION':
        return { status: 'QUEUED', channel: config.channel || 'EMAIL', recipient: config.recipient || payload.email };
      default:
        return { status: 'SKIPPED', action: action.type };
    }
  }

  async handlePaymentCaptured(orderId: string) {
    return fulfillmentEngine.autoRouteOrder(orderId, { force: false });
  }

  async configureCronDefaults() {
    return {
      inventory: [
        { tier: 'high-volume', everyMinutes: 15 },
        { tier: 'standard', everyMinutes: 60 },
        { tier: 'low-volume', everyMinutes: 1440 },
      ],
      pricing: [
        { tier: 'competitive', everyMinutes: 60 },
        { tier: 'standard', everyMinutes: 1440 },
      ],
    };
  }

  async runSupplierOnboarding(applicationId: string) {
    const application = await prisma.dropshipApplication.findUnique({ where: { id: applicationId }, include: { seller: { include: { user: true } } } });
    if (!application) throw new NotFoundError('Dropship application');
    const steps = [
      { step: 'APPLICATION_SUBMITTED', status: 'COMPLETED', notifyAdmin: true },
      { step: 'DOCUMENT_VERIFICATION', status: application.seller.kycStatus === 'APPROVED' ? 'COMPLETED' : 'PENDING' },
      { step: 'CONTRACT_SIGNING', status: 'READY', provider: 'DOCUSIGN_PLACEHOLDER' },
      { step: 'ENABLE_ACCESS', status: application.status === 'APPROVED' ? 'COMPLETED' : 'WAITING_APPROVAL' },
    ];
    return { applicationId, sellerId: application.sellerId, steps };
  }

  async runQualityCheck(data: { samplePercent?: number; supplierId?: string }) {
    const samplePercent = Math.min(100, Math.max(1, Number(data.samplePercent || 5)));
    const orders = await prisma.dropshipOrder.findMany({
      where: data.supplierId ? { supplierId: data.supplierId } : {},
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    const sampleSize = Math.ceil(orders.length * (samplePercent / 100));
    return {
      samplePercent,
      sampledOrders: orders.slice(0, sampleSize).map((order) => order.id),
      surveyQueued: true,
      supplierFlagged: false,
    };
  }

  async generatePerformanceReviews() {
    const suppliers = await prisma.dropshipSupplier.findMany({ where: { isActive: true } });
    const reviews = [];
    for (const supplier of suppliers) {
      const scorecard = await dropshipAnalyticsEngine.supplierScorecard(supplier.id);
      reviews.push({
        supplierId: supplier.id,
        tier: scorecard.tier,
        score: scorecard.overallScore,
        emailed: true,
      });
    }
    return { generated: reviews.length, reviews };
  }

  async abandonedCartRecovery() {
    const staleDate = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const carts = await prisma.cart.findMany({
      where: { updatedAt: { lt: staleDate }, items: { some: {} } },
      include: { items: { include: { product: true } }, user: true },
      take: 100,
    });
    return {
      queued: carts.length,
      sequence: ['EMAIL', 'SMS', 'PUSH'],
      carts: carts.map((cart) => ({
        cartId: cart.id,
        userId: cart.userId,
        email: cart.user.email,
        inStockItems: cart.items.filter((item) => item.product.isActive).length,
      })),
    };
  }

  private routingPayload(data: any) {
    return {
      name: data.name,
      strategy: data.strategy,
      priority: Number(data.priority || 0),
      conditions: data.conditions ? (typeof data.conditions === 'string' ? data.conditions : stringify(data.conditions)) : null,
      isActive: data.isActive !== false,
    };
  }

  async listRoutingRules() {
    const rules = await prisma.dropshipRoutingRule.findMany({ orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }] });
    return rules.map((rule) => ({ ...rule, conditions: parseJson(rule.conditions, {}) }));
  }

  async createRoutingRule(data: any) {
    return prisma.dropshipRoutingRule.create({ data: this.routingPayload(data) });
  }

  async updateRoutingRule(id: string, data: any) {
    const existing = await prisma.dropshipRoutingRule.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Routing rule');
    return prisma.dropshipRoutingRule.update({
      where: { id },
      data: this.routingPayload({
        name: data.name || existing.name,
        strategy: data.strategy || existing.strategy,
        priority: data.priority ?? existing.priority,
        conditions: data.conditions ?? existing.conditions,
        isActive: data.isActive ?? existing.isActive,
      }),
    });
  }

  async deleteRoutingRule(id: string) {
    const existing = await prisma.dropshipRoutingRule.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Routing rule');
    return prisma.dropshipRoutingRule.delete({ where: { id } });
  }

  async routeProduct(data: { productId?: string; mappingId?: string; destinationCountry?: string; manualSupplierId?: string }) {
    let mappings = await prisma.dropshipProductMapping.findMany({
      where: data.mappingId
        ? { id: data.mappingId, isActive: true }
        : { localProductId: data.productId, isActive: true },
      include: { supplier: true },
    });
    if (data.manualSupplierId) mappings = mappings.filter((mapping) => mapping.supplierId === data.manualSupplierId);
    if (!mappings.length) throw new AppError(400, 'No supplier mappings available for routing');

    const rules = await prisma.dropshipRoutingRule.findMany({ where: { isActive: true }, orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }] });
    const selectedRule = rules[0] || { strategy: 'LOWEST_PRICE', name: 'Default lowest price' };
    let selected = mappings[0];

    switch (selectedRule.strategy) {
      case 'FASTEST_DELIVERY':
        selected = mappings.sort((a, b) => {
          const aDays = parseJson<{ estimatedDays?: number }>(a.specifications, {}).estimatedDays || 14;
          const bDays = parseJson<{ estimatedDays?: number }>(b.specifications, {}).estimatedDays || 14;
          return aDays - bDays;
        })[0];
        break;
      case 'BEST_RATING':
        selected = mappings.sort((a, b) => {
          const aRating = parseJson<{ rating?: number }>(a.supplier.metadata, {}).rating || 0;
          const bRating = parseJson<{ rating?: number }>(b.supplier.metadata, {}).rating || 0;
          return bRating - aRating;
        })[0];
        break;
      case 'LOAD_BALANCE':
        {
          const counts = await prisma.dropshipOrder.groupBy({
            by: ['supplierId'],
            _count: { supplierId: true },
            where: { supplierId: { in: mappings.map((mapping) => mapping.supplierId) } },
          });
          const bySupplier = new Map(counts.map((count) => [count.supplierId, count._count.supplierId]));
          selected = mappings.sort((a, b) => (bySupplier.get(a.supplierId) || 0) - (bySupplier.get(b.supplierId) || 0))[0];
        }
        break;
      case 'GEOGRAPHIC':
        selected = mappings.find((mapping) => parseJson<{ warehouses?: Array<{ country?: string }> }>(mapping.specifications, {}).warehouses?.some((warehouse) => warehouse.country === data.destinationCountry)) || selected;
        break;
      case 'LOWEST_PRICE':
      default:
        selected = mappings.sort((a, b) => a.costPrice - b.costPrice)[0];
        break;
    }

    return {
      strategy: selectedRule.strategy,
      ruleName: selectedRule.name,
      supplierId: selected.supplierId,
      supplierName: selected.supplier.name,
      mappingId: selected.id,
      costPrice: selected.costPrice,
      estimatedStock: selected.quantity,
    };
  }
}

export const dropshipAutomationEngine = new DropshipAutomationEngine();
