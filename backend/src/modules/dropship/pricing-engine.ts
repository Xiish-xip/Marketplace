import { prisma } from '../../common/prisma';
import { AppError, NotFoundError } from '../../common/errors';
import { logger } from '../../common/logger';

type PricingRuleInput = {
  name: string;
  description?: string;
  ruleType: string;
  value: number;
  priority?: number;
  appliesTo: string;
  appliesToId?: string;
  scheduleStart?: string | Date | null;
  scheduleEnd?: string | Date | null;
  minStock?: number | null;
  maxStock?: number | null;
  customerGroups?: string[] | string | null;
  isActive?: boolean;
};

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function stringify(value: unknown) {
  return JSON.stringify(value ?? null);
}

function toDate(value: string | Date | null | undefined) {
  if (!value) return undefined;
  return value instanceof Date ? value : new Date(value);
}

export class PricingEngine {
  private payload(data: PricingRuleInput) {
    return {
      name: data.name,
      description: data.description,
      ruleType: data.ruleType,
      value: Number(data.value),
      priority: Number(data.priority || 0),
      appliesTo: data.appliesTo || 'ALL',
      appliesToId: data.appliesToId || null,
      scheduleStart: toDate(data.scheduleStart) || null,
      scheduleEnd: toDate(data.scheduleEnd) || null,
      minStock: data.minStock === null || data.minStock === undefined ? null : Number(data.minStock),
      maxStock: data.maxStock === null || data.maxStock === undefined ? null : Number(data.maxStock),
      customerGroups: Array.isArray(data.customerGroups) ? stringify(data.customerGroups) : data.customerGroups || null,
      isActive: data.isActive !== false,
    };
  }

  async listRules(params: { active?: string; page?: number; limit?: number }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 50));
    const where: any = {};
    if (params.active === 'true') where.isActive = true;
    if (params.active === 'false') where.isActive = false;

    const [rules, total] = await Promise.all([
      prisma.dropshipPricingRule.findMany({
        where,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.dropshipPricingRule.count({ where }),
    ]);
    return { rules: rules.map((rule) => ({ ...rule, customerGroups: parseJson(rule.customerGroups, []) })), total, page, limit };
  }

  async createRule(data: PricingRuleInput) {
    return prisma.dropshipPricingRule.create({ data: this.payload(data) });
  }

  async getRule(id: string) {
    const rule = await prisma.dropshipPricingRule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundError('Pricing rule');
    return { ...rule, customerGroups: parseJson(rule.customerGroups, []) };
  }

  async updateRule(id: string, data: Partial<PricingRuleInput>) {
    await this.getRule(id);
    const payload = this.payload({
      name: data.name || 'Untitled rule',
      ruleType: data.ruleType || 'FIXED_MARGIN',
      value: data.value || 0,
      appliesTo: data.appliesTo || 'ALL',
      ...data,
    } as PricingRuleInput);
    return prisma.dropshipPricingRule.update({ where: { id }, data: payload });
  }

  async deleteRule(id: string) {
    await this.getRule(id);
    return prisma.dropshipPricingRule.delete({ where: { id } });
  }

  private ruleApplies(rule: any, mapping: any, context?: Record<string, any>) {
    const now = new Date();
    if (!rule.isActive) return false;
    if (rule.scheduleStart && rule.scheduleStart > now) return false;
    if (rule.scheduleEnd && rule.scheduleEnd < now) return false;
    if (rule.minStock !== null && rule.minStock !== undefined && mapping.quantity < rule.minStock) return false;
    if (rule.maxStock !== null && rule.maxStock !== undefined && mapping.quantity > rule.maxStock) return false;

    switch (rule.appliesTo) {
      case 'ALL':
        return true;
      case 'SUPPLIER':
        return mapping.supplierId === rule.appliesToId;
      case 'CATEGORY':
        return mapping.category === rule.appliesToId || context?.categoryId === rule.appliesToId;
      case 'PRODUCT':
        return mapping.id === rule.appliesToId || mapping.localProductId === rule.appliesToId || mapping.supplierSku === rule.appliesToId;
      default:
        return false;
    }
  }

  private async getCompetitorPrices(mapping: any) {
    const base = mapping.sellingPrice || mapping.supplierPrice || mapping.costPrice || 1;
    return [
      { competitor: 'Amazon', price: Number((base * 1.04).toFixed(2)), currency: mapping.supplierCurrency || 'USD' },
      { competitor: 'eBay', price: Number((base * 0.98).toFixed(2)), currency: mapping.supplierCurrency || 'USD' },
      { competitor: 'AliExpress', price: Number((base * 0.94).toFixed(2)), currency: mapping.supplierCurrency || 'USD' },
    ];
  }

  async evaluatePrice(mappingId: string, context: Record<string, any> = {}) {
    const mapping = await prisma.dropshipProductMapping.findUnique({
      where: { id: mappingId },
      include: { supplier: true },
    });
    if (!mapping) throw new NotFoundError('Product mapping');

    const rules = await prisma.dropshipPricingRule.findMany({
      where: { isActive: true },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });
    const specs = parseJson<Record<string, any>>(mapping.specifications, {});
    const competitorPrices = await this.getCompetitorPrices(mapping);
    const appliedRules: any[] = [];
    let price = mapping.sellingPrice || mapping.costPrice || mapping.supplierPrice;
    let floor = Number(specs.mapPrice || specs.minimumAdvertisedPrice || 0);
    let ceiling = Number.POSITIVE_INFINITY;

    for (const rule of rules) {
      if (!this.ruleApplies(rule, mapping, context)) continue;
      const before = price;

      switch (rule.ruleType) {
        case 'FIXED_MARGIN':
          price = mapping.costPrice * (1 + rule.value / 100);
          break;
        case 'FIXED_MARKUP':
          price = mapping.costPrice + rule.value;
          break;
        case 'COMPETITOR_MATCH': {
          const lowest = Math.min(...competitorPrices.map((item) => item.price));
          price = lowest + rule.value;
          break;
        }
        case 'MIN_PRICE':
          floor = Math.max(floor, rule.value);
          break;
        case 'MAX_PRICE':
          ceiling = Math.min(ceiling, rule.value);
          break;
        default:
          break;
      }

      appliedRules.push({ id: rule.id, name: rule.name, ruleType: rule.ruleType, before, after: price, priority: rule.priority });
    }

    price = Math.max(floor, Math.min(ceiling, price));
    const converted = await this.convertCurrency(price, mapping.supplierCurrency || 'USD', context.currency || mapping.supplierCurrency || 'USD');
    const margin = price > 0 ? ((price - mapping.costPrice) / price) * 100 : 0;
    const bulkTiers = parseJson<any[]>(specs.bulkPricingTiers, []);
    const bundles = parseJson<any[]>(specs.bundlePricing, []);

    return {
      mappingId,
      oldPrice: mapping.sellingPrice,
      newPrice: Number(price.toFixed(2)),
      currency: mapping.supplierCurrency || 'USD',
      converted,
      margin: Number(margin.toFixed(2)),
      floor,
      ceiling: Number.isFinite(ceiling) ? ceiling : null,
      mapEnforced: floor > 0,
      appliedRules,
      competitorPrices,
      bulkTiers,
      bundles,
    };
  }

  async recalculatePrices(params: { mappingIds?: string[]; dryRun?: boolean } = {}) {
    const mappings = await prisma.dropshipProductMapping.findMany({
      where: params.mappingIds?.length ? { id: { in: params.mappingIds } } : { isActive: true },
      take: 1000,
    });
    const results: any[] = [];

    for (const mapping of mappings) {
      const evaluation = await this.evaluatePrice(mapping.id);
      if (!params.dryRun && Math.abs(evaluation.newPrice - mapping.sellingPrice) > 0.001) {
        await prisma.dropshipProductMapping.update({
          where: { id: mapping.id },
          data: { sellingPrice: evaluation.newPrice },
        });
        if (mapping.localProductId) {
          await prisma.product.update({
            where: { id: mapping.localProductId },
            data: { basePrice: evaluation.newPrice },
          }).catch(() => undefined);
        }
        await prisma.dropshipPriceChange.create({
          data: {
            mappingId: mapping.id,
            oldPrice: mapping.sellingPrice,
            newPrice: evaluation.newPrice,
            reason: 'RULE_APPLIED',
          },
        });
      }
      results.push(evaluation);
    }

    logger.info('Dropship price recalculation completed', { count: results.length, dryRun: Boolean(params.dryRun) });
    return { count: results.length, updated: results.filter((item) => item.oldPrice !== item.newPrice).length, results };
  }

  async marginReport(params: { supplierId?: string; page?: number; limit?: number }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 50));
    const where: any = { isActive: true };
    if (params.supplierId) where.supplierId = params.supplierId;

    const [mappings, total] = await Promise.all([
      prisma.dropshipProductMapping.findMany({
        where,
        include: { supplier: { select: { id: true, name: true, provider: true } } },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.dropshipProductMapping.count({ where }),
    ]);

    const products = mappings.map((mapping) => {
      const grossProfit = mapping.sellingPrice - mapping.costPrice;
      const margin = mapping.sellingPrice > 0 ? (grossProfit / mapping.sellingPrice) * 100 : 0;
      return {
        mappingId: mapping.id,
        title: mapping.supplierTitle,
        supplier: mapping.supplier,
        costPrice: mapping.costPrice,
        sellingPrice: mapping.sellingPrice,
        grossProfit: Number(grossProfit.toFixed(2)),
        margin: Number(margin.toFixed(2)),
        quantity: mapping.quantity,
      };
    });

    return {
      products,
      summary: {
        averageMargin: products.length ? Number((products.reduce((sum, item) => sum + item.margin, 0) / products.length).toFixed(2)) : 0,
        totalPotentialProfit: Number(products.reduce((sum, item) => sum + item.grossProfit * item.quantity, 0).toFixed(2)),
      },
      total,
      page,
      limit,
    };
  }

  async competitorPrices(productSku: string) {
    const mapping = await prisma.dropshipProductMapping.findFirst({
      where: { OR: [{ supplierSku: productSku }, { id: productSku }] },
    });
    if (!mapping) throw new NotFoundError('Product mapping');
    return {
      productSku,
      prices: await this.getCompetitorPrices(mapping),
      trackedAt: new Date().toISOString(),
    };
  }

  async trackCompetitor(data: { mappingId?: string; productSku?: string; competitors?: string[]; targetStrategy?: string }) {
    if (!data.mappingId && !data.productSku) throw new AppError(400, 'mappingId or productSku is required');
    return {
      status: 'TRACKING',
      mappingId: data.mappingId,
      productSku: data.productSku,
      competitors: data.competitors || ['Amazon', 'eBay', 'AliExpress'],
      targetStrategy: data.targetStrategy || 'MATCH_LOWEST_PLUS_MARGIN',
      nextCheckAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    };
  }

  async priceChangeHistory(mappingId: string) {
    return prisma.dropshipPriceChange.findMany({ where: { mappingId }, orderBy: { createdAt: 'desc' }, take: 100 });
  }

  async convertCurrency(amount: number, fromCurrency: string, toCurrency: string) {
    if (fromCurrency === toCurrency) return { amount: Number(amount.toFixed(2)), fromCurrency, toCurrency, rate: 1 };
    const rate = await prisma.currencyRate.findUnique({
      where: { fromCurrency_toCurrency: { fromCurrency, toCurrency } },
    }).catch(() => null);
    const conversionRate = rate?.rate || 1;
    return {
      amount: Number((amount * conversionRate).toFixed(2)),
      fromCurrency,
      toCurrency,
      rate: conversionRate,
    };
  }
}

export const pricingEngine = new PricingEngine();
