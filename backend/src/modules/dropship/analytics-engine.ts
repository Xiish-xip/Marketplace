import { prisma } from '../../common/prisma';
import { NotFoundError } from '../../common/errors';
import { financeEngine } from './finance-engine';

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

function periodStart(period: string) {
  const now = new Date();
  const start = new Date(now);
  if (period === 'today') start.setHours(0, 0, 0, 0);
  else if (period === 'week') start.setDate(now.getDate() - 7);
  else if (period === 'month') start.setMonth(now.getMonth() - 1);
  else if (period === 'quarter') start.setMonth(now.getMonth() - 3);
  else if (period === 'year') start.setFullYear(now.getFullYear() - 1);
  return start;
}

export class DropshipAnalyticsEngine {
  async dashboard() {
    const today = periodStart('today');
    const week = periodStart('week');
    const month = periodStart('month');
    const [ordersToday, ordersWeek, ordersMonth, suppliers, products, bestSelling, mappings] = await Promise.all([
      prisma.order.findMany({ where: { createdAt: { gte: today } } }),
      prisma.order.findMany({ where: { createdAt: { gte: week } } }),
      prisma.order.findMany({ where: { createdAt: { gte: month } } }),
      prisma.dropshipSupplier.count({ where: { isActive: true } }),
      prisma.dropshipProductMapping.count({ where: { isActive: true } }),
      prisma.orderItem.groupBy({
        by: ['productId'],
        _sum: { quantity: true, totalPrice: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 10,
      }).catch(() => []),
      prisma.dropshipProductMapping.findMany({ where: { isActive: true }, take: 200 }),
    ]);

    const revenue = (items: Array<{ totalAmount: number }>) => Number(items.reduce((sum, item) => sum + item.totalAmount, 0).toFixed(2));
    const aov = (items: Array<{ totalAmount: number }>) => items.length ? Number((revenue(items) / items.length).toFixed(2)) : 0;
    const highestMargin = mappings
      .map((mapping) => ({
        mappingId: mapping.id,
        title: mapping.supplierTitle,
        margin: mapping.sellingPrice ? Number((((mapping.sellingPrice - mapping.costPrice) / mapping.sellingPrice) * 100).toFixed(2)) : 0,
        profit: Number((mapping.sellingPrice - mapping.costPrice).toFixed(2)),
      }))
      .sort((a, b) => b.margin - a.margin)
      .slice(0, 10);

    return {
      revenue: {
        today: revenue(ordersToday),
        week: revenue(ordersWeek),
        month: revenue(ordersMonth),
      },
      orders: {
        today: ordersToday.length,
        week: ordersWeek.length,
        month: ordersMonth.length,
        aovToday: aov(ordersToday),
        aovMonth: aov(ordersMonth),
        conversionRate: 0,
      },
      activeSuppliers: suppliers,
      activeProducts: products,
      topSellingProducts: bestSelling,
      highestMarginProducts: highestMargin,
      generatedAt: new Date().toISOString(),
    };
  }

  async supplierScorecard(id: string) {
    const supplier = await prisma.dropshipSupplier.findUnique({ where: { id } });
    if (!supplier) throw new NotFoundError('Supplier');
    const [orders, returns, mappings, alerts] = await Promise.all([
      prisma.dropshipOrder.findMany({ where: { supplierId: id } }),
      prisma.dropshipReturn.findMany({ where: { supplierId: id } }),
      prisma.dropshipProductMapping.findMany({ where: { supplierId: id, isActive: true } }),
      prisma.dropshipInventoryAlert.count({
        where: {
          type: 'OUT_OF_STOCK',
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          mappingId: { in: (await prisma.dropshipProductMapping.findMany({ where: { supplierId: id }, select: { id: true } })).map((item) => item.id) },
        },
      }),
    ]);

    const delivered = orders.filter((order) => ['DELIVERED', 'COMPLETED'].includes(order.status)).length;
    const shippedOnTime = orders.filter((order) => ['SHIPPED', 'DELIVERED', 'COMPLETED'].includes(order.status)).length;
    const onTimeDeliveryRate = orders.length ? Math.round((shippedOnTime / orders.length) * 100) : 100;
    const returnRate = orders.length ? Math.round((returns.length / orders.length) * 100) : 0;
    const inventoryReliability = mappings.length ? Math.max(0, Math.round((mappings.filter((item) => item.quantity > 0).length / mappings.length) * 100 - alerts * 2)) : 100;
    const responseTime = parseJson<{ responseHours?: number }>(supplier.metadata, {}).responseHours || 24;
    const responseScore = Math.max(0, 100 - Math.max(0, responseTime - 2) * 3);
    const communicationRating = Number((4 + responseScore / 100).toFixed(1));
    const overallScore = Math.round(onTimeDeliveryRate * 0.3 + (100 - returnRate) * 0.25 + inventoryReliability * 0.25 + responseScore * 0.2);

    return {
      supplierId: id,
      supplierName: supplier.name,
      metrics: {
        onTimeDeliveryRate,
        returnRate,
        defectRate: returnRate,
        averageResponseHours: responseTime,
        inventoryReliability,
        communicationRating,
        delivered,
        totalOrders: orders.length,
      },
      overallScore,
      tier: overallScore >= 90 ? 'PLATINUM' : overallScore >= 75 ? 'GOLD' : overallScore >= 60 ? 'SILVER' : 'WATCHLIST',
    };
  }

  async productPerformance(params: { supplierId?: string; category?: string; page?: number; limit?: number }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 50));
    const where: any = { isActive: true };
    if (params.supplierId) where.supplierId = params.supplierId;
    if (params.category) where.category = params.category;
    const [mappings, total] = await Promise.all([
      prisma.dropshipProductMapping.findMany({ where, include: { supplier: true }, skip: (page - 1) * limit, take: limit }),
      prisma.dropshipProductMapping.count({ where }),
    ]);

    const products = [];
    for (const mapping of mappings) {
      const orderItems = mapping.localProductId
        ? await prisma.orderItem.findMany({ where: { productId: mapping.localProductId } })
        : [];
      const revenue = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
      const cogs = orderItems.reduce((sum, item) => sum + item.quantity * mapping.costPrice, 0);
      const platformFees = revenue * 0.1;
      const shippingCost = orderItems.reduce((sum, item) => sum + item.quantity * 1.5, 0);
      const netProfit = revenue - cogs - platformFees - shippingCost;
      products.push({
        mappingId: mapping.id,
        title: mapping.supplierTitle,
        supplier: mapping.supplier.name,
        revenue: Number(revenue.toFixed(2)),
        cogs: Number(cogs.toFixed(2)),
        shippingCost: Number(shippingCost.toFixed(2)),
        platformFees: Number(platformFees.toFixed(2)),
        netProfit: Number(netProfit.toFixed(2)),
        margin: revenue ? Number(((netProfit / revenue) * 100).toFixed(2)) : 0,
        breakEvenUnits: mapping.sellingPrice > mapping.costPrice ? Math.ceil(platformFees / (mapping.sellingPrice - mapping.costPrice)) : null,
      });
    }

    return { products, total, page, limit };
  }

  async shippingAnalytics() {
    const [trackings, labels, zones] = await Promise.all([
      prisma.dropshipTracking.findMany({ orderBy: { updatedAt: 'desc' }, take: 500 }),
      prisma.dropshipLabel.findMany({ orderBy: { createdAt: 'desc' }, take: 500 }),
      prisma.dropshipShippingZone.findMany({ where: { isActive: true } }),
    ]);
    const byCarrier = labels.reduce<Record<string, { shipments: number; cost: number }>>((acc, label) => {
      if (!acc[label.carrierCode]) acc[label.carrierCode] = { shipments: 0, cost: 0 };
      acc[label.carrierCode].shipments += 1;
      acc[label.carrierCode].cost += label.cost;
      return acc;
    }, {});
    return {
      carrierPerformance: Object.entries(byCarrier).map(([carrierCode, value]) => ({
        carrierCode,
        shipments: value.shipments,
        averageCost: value.shipments ? Number((value.cost / value.shipments).toFixed(2)) : 0,
      })),
      zoneCount: zones.length,
      trackingStatusBreakdown: trackings.reduce<Record<string, number>>((acc, tracking) => {
        acc[tracking.status] = (acc[tracking.status] || 0) + 1;
        return acc;
      }, {}),
    };
  }

  async customerAnalytics() {
    const orders = await prisma.order.findMany({ take: 1000, orderBy: { createdAt: 'desc' } });
    const byCustomer = orders.reduce<Record<string, { orders: number; spend: number }>>((acc, order) => {
      if (!acc[order.userId]) acc[order.userId] = { orders: 0, spend: 0 };
      acc[order.userId].orders += 1;
      acc[order.userId].spend += order.totalAmount;
      return acc;
    }, {});
    const values = Object.values(byCustomer);
    return {
      customerCount: values.length,
      averageClv: values.length ? Number((values.reduce((sum, item) => sum + item.spend, 0) / values.length).toFixed(2)) : 0,
      repeatPurchaseRate: values.length ? Number(((values.filter((item) => item.orders > 1).length / values.length) * 100).toFixed(2)) : 0,
      geographicDistribution: {},
      deviceBreakdown: {},
      acquisitionChannels: {},
    };
  }

  async profitLoss(params: { supplierId?: string; from?: string; to?: string; period?: string }) {
    return financeEngine.profitReport(params);
  }

  async inventoryForecast(params: { supplierId?: string; window?: number }) {
    const windowDays = Number(params.window || 30);
    const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
    const where: any = { isActive: true };
    if (params.supplierId) where.supplierId = params.supplierId;
    const mappings = await prisma.dropshipProductMapping.findMany({ where, take: 200 });
    const forecasts = [];

    for (const mapping of mappings) {
      const orderItems = mapping.localProductId
        ? await prisma.orderItem.findMany({ where: { productId: mapping.localProductId, order: { createdAt: { gte: since } } } })
        : [];
      const sold = orderItems.reduce((sum, item) => sum + item.quantity, 0);
      const salesVelocity = sold / windowDays;
      const reorderPoint = Math.ceil(salesVelocity * 14 * 1.5);
      forecasts.push({
        mappingId: mapping.id,
        title: mapping.supplierTitle,
        currentStock: mapping.quantity,
        salesVelocity: Number(salesVelocity.toFixed(2)),
        seasonalTrend: sold > 0 ? 'STABLE' : 'INSUFFICIENT_DATA',
        reorderPoint,
        suggestedStockLevel: Math.max(reorderPoint * 2, mapping.quantity),
      });
    }
    return { forecasts, windowDays };
  }

  async listAlertRules() {
    const rules = await prisma.dropshipAutomation.findMany({ where: { trigger: 'ALERT' }, orderBy: { createdAt: 'desc' } });
    return rules.map((rule) => ({ ...rule, triggerConfig: parseJson(rule.triggerConfig, {}), actions: parseJson(rule.actions, []), conditions: parseJson(rule.conditions, {}) }));
  }

  async createAlertRule(data: any) {
    return prisma.dropshipAutomation.create({
      data: {
        name: data.name,
        trigger: 'ALERT',
        triggerConfig: stringify(data.triggerConfig || { type: data.type || 'LOW_STOCK' }),
        actions: stringify(data.actions || [{ type: 'EMAIL' }]),
        conditions: stringify(data.conditions || {}),
        isActive: data.isActive !== false,
      },
    });
  }

  async updateAlertRule(id: string, data: any) {
    return prisma.dropshipAutomation.update({
      where: { id },
      data: {
        name: data.name,
        triggerConfig: data.triggerConfig ? stringify(data.triggerConfig) : undefined,
        actions: data.actions ? stringify(data.actions) : undefined,
        conditions: data.conditions ? stringify(data.conditions) : undefined,
        isActive: data.isActive,
      },
    });
  }

  async deleteAlertRule(id: string) {
    return prisma.dropshipAutomation.delete({ where: { id } });
  }

  async generateCustomReport(data: { metrics?: string[]; filters?: any; dateRange?: any; format?: string; schedule?: any }) {
    const report = {
      reportId: `rpt_${Date.now()}`,
      metrics: data.metrics || ['revenue', 'orders', 'margin'],
      filters: data.filters || {},
      dateRange: data.dateRange || { preset: 'last_30_days' },
      format: data.format || 'JSON',
      generatedAt: new Date().toISOString(),
      sections: {
        dashboard: await this.dashboard(),
        profitLoss: await this.profitLoss(data.filters || {}),
      },
    };
    if (data.schedule) {
      await prisma.dropshipAutomation.create({
        data: {
          name: `Scheduled report ${report.reportId}`,
          trigger: 'SCHEDULED_REPORT',
          triggerConfig: stringify(data.schedule),
          actions: stringify([{ type: 'EMAIL_REPORT', reportId: report.reportId }]),
          conditions: stringify(data.filters || {}),
        },
      });
    }
    return report;
  }

  async scheduledReports() {
    return prisma.dropshipAutomation.findMany({ where: { trigger: 'SCHEDULED_REPORT' }, orderBy: { createdAt: 'desc' } });
  }

  async exportReport(reportId: string, format = 'json') {
    return {
      reportId,
      format,
      fileName: `${reportId}.${format}`,
      url: `/api/dropship/analytics/export/${reportId}?format=${format}`,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    };
  }
}

export const dropshipAnalyticsEngine = new DropshipAnalyticsEngine();
