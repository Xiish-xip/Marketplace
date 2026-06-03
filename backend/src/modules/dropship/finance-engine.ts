import { prisma } from '../../common/prisma';
import { AppError, NotFoundError } from '../../common/errors';
import { logger } from '../../common/logger';

type TaxRuleInput = {
  country: string;
  region?: string | null;
  rate: number;
  type: string;
  isActive?: boolean;
};

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

export class FinanceEngine {
  async dashboard() {
    const [payouts, invoices, commissions, escrows, openReturns] = await Promise.all([
      prisma.dropshipPayout.findMany({ orderBy: { createdAt: 'desc' }, take: 20 }),
      prisma.dropshipInvoice.findMany({ orderBy: { createdAt: 'desc' }, take: 20 }),
      prisma.dropshipCommission.findMany({ orderBy: { createdAt: 'desc' }, take: 50 }),
      prisma.dropshipEscrow.findMany({ orderBy: { heldAt: 'desc' }, take: 50 }),
      prisma.dropshipReturn.count({ where: { status: { in: ['PENDING', 'PENDING_REVIEW', 'APPROVED'] } } }),
    ]);

    const totalCommission = commissions.reduce((sum, item) => sum + item.totalFee, 0);
    const heldEscrow = escrows.filter((item) => item.status === 'HELD').reduce((sum, item) => sum + item.amount, 0);
    const pendingPayouts = payouts.filter((item) => item.status === 'PENDING').reduce((sum, item) => sum + item.netAmount, 0);
    const invoiceReceivable = invoices.filter((item) => ['DRAFT', 'SENT', 'OVERDUE'].includes(item.status)).reduce((sum, item) => sum + item.totalAmount, 0);

    return {
      totals: {
        totalCommission: Number(totalCommission.toFixed(2)),
        heldEscrow: Number(heldEscrow.toFixed(2)),
        pendingPayouts: Number(pendingPayouts.toFixed(2)),
        invoiceReceivable: Number(invoiceReceivable.toFixed(2)),
        openReturns,
      },
      recentPayouts: payouts,
      recentInvoices: invoices.map((invoice) => ({ ...invoice, items: parseJson(invoice.items, []) })),
      recentCommissions: commissions,
    };
  }

  async listPayouts(params: { supplierId?: string; status?: string; page?: number; limit?: number }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 50));
    const where: any = {};
    if (params.supplierId) where.supplierId = params.supplierId;
    if (params.status) where.status = params.status;
    const [payouts, total] = await Promise.all([
      prisma.dropshipPayout.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.dropshipPayout.count({ where }),
    ]);
    return { payouts, total, page, limit };
  }

  async getPayout(id: string) {
    const payout = await prisma.dropshipPayout.findUnique({ where: { id } });
    if (!payout) throw new NotFoundError('Payout');
    return payout;
  }

  async processPendingPayouts(data: { supplierId?: string; method?: string; minimumAmount?: number } = {}) {
    const pending = await prisma.dropshipPayout.findMany({
      where: {
        status: 'PENDING',
        supplierId: data.supplierId,
        netAmount: { gte: Number(data.minimumAmount || 0) },
      },
      take: 200,
    });

    const processed: any[] = [];
    for (const payout of pending) {
      try {
        const updated = await prisma.dropshipPayout.update({
          where: { id: payout.id },
          data: {
            status: 'COMPLETED',
            method: data.method || payout.method,
            reference: `${data.method || payout.method}-${Date.now()}-${payout.id.slice(0, 6)}`,
            paidAt: new Date(),
            errorLog: null,
          },
        });
        processed.push(updated);
      } catch (error) {
        await prisma.dropshipPayout.update({
          where: { id: payout.id },
          data: { status: 'FAILED', errorLog: error instanceof Error ? error.message : 'Payout failed' },
        });
      }
    }

    logger.info('Dropship payouts processed', { count: processed.length });
    return { processed: processed.length, payouts: processed };
  }

  async listInvoices(params: { supplierId?: string; status?: string; page?: number; limit?: number }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 50));
    const where: any = {};
    if (params.supplierId) where.supplierId = params.supplierId;
    if (params.status) where.status = params.status;
    const [invoices, total] = await Promise.all([
      prisma.dropshipInvoice.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.dropshipInvoice.count({ where }),
    ]);
    return { invoices: invoices.map((invoice) => ({ ...invoice, items: parseJson(invoice.items, []) })), total, page, limit };
  }

  async generateInvoicePdf(id: string) {
    const invoice = await prisma.dropshipInvoice.findUnique({ where: { id } });
    if (!invoice) throw new NotFoundError('Invoice');
    return prisma.dropshipInvoice.update({
      where: { id },
      data: {
        pdfUrl: `/api/dropship/finance/invoices/${id}.pdf`,
        status: invoice.status === 'DRAFT' ? 'SENT' : invoice.status,
      },
    });
  }

  async listCommissions(params: { supplierId?: string; status?: string; page?: number; limit?: number }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 50));
    const where: any = {};
    if (params.supplierId) where.supplierId = params.supplierId;
    if (params.status) where.status = params.status;
    const [commissions, total] = await Promise.all([
      prisma.dropshipCommission.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.dropshipCommission.count({ where }),
    ]);
    return { commissions, total, page, limit };
  }

  async ensureCommission(orderId: string, supplierId?: string, amount?: number) {
    const existing = await prisma.dropshipCommission.findFirst({ where: { orderId, supplierId } });
    if (existing) return existing;
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { seller: true } });
    if (!order && amount === undefined) throw new NotFoundError('Order');
    const percentage = order?.seller?.commissionRate ? order.seller.commissionRate * 100 : 10;
    const gross = Number(amount ?? order?.totalAmount ?? 0);
    const fixedFee = 0.3;
    const transactionFee = gross * 0.029;
    const commissionAmount = gross * (percentage / 100);
    return prisma.dropshipCommission.create({
      data: {
        orderId,
        supplierId,
        amount: gross,
        percentage,
        fixedFee,
        transactionFee: Number(transactionFee.toFixed(2)),
        totalFee: Number((commissionAmount + fixedFee + transactionFee).toFixed(2)),
        currency: (order as any)?.currency || 'USD',
        status: 'PENDING',
      } as any,
    });
  }

  async escrowStatus(orderId: string) {
    const escrow = await prisma.dropshipEscrow.findFirst({ where: { orderId }, orderBy: { heldAt: 'desc' } });
    if (escrow) return escrow;
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundError('Order');
    return prisma.dropshipEscrow.create({
      data: {
        orderId,
        amount: order.totalAmount,
        currency: (order as any).currency || 'USD',
        status: 'HELD',
        autoReleaseAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
    });
  }

  private taxPayload(data: TaxRuleInput) {
    return {
      country: data.country,
      region: data.region || null,
      rate: Number(data.rate),
      type: data.type,
      isActive: data.isActive !== false,
    };
  }

  async listTaxRules(params: { country?: string; active?: string; page?: number; limit?: number }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 50));
    const where: any = {};
    if (params.country) where.country = params.country;
    if (params.active === 'true') where.isActive = true;
    if (params.active === 'false') where.isActive = false;
    const [taxRules, total] = await Promise.all([
      prisma.dropshipTaxRule.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.dropshipTaxRule.count({ where }),
    ]);
    return { taxRules, total, page, limit };
  }

  async createTaxRule(data: TaxRuleInput) {
    return prisma.dropshipTaxRule.create({ data: this.taxPayload(data) });
  }

  async updateTaxRule(id: string, data: Partial<TaxRuleInput>) {
    const existing = await prisma.dropshipTaxRule.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Tax rule');
    return prisma.dropshipTaxRule.update({
      where: { id },
      data: this.taxPayload({
        country: data.country || existing.country,
        region: data.region ?? existing.region,
        rate: data.rate ?? existing.rate,
        type: data.type || existing.type,
        isActive: data.isActive ?? existing.isActive,
      }),
    });
  }

  async deleteTaxRule(id: string) {
    const existing = await prisma.dropshipTaxRule.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Tax rule');
    return prisma.dropshipTaxRule.delete({ where: { id } });
  }

  async calculateTax(data: { country: string; region?: string; subtotal: number; shipping?: number }) {
    const rules = await prisma.dropshipTaxRule.findMany({
      where: { country: data.country, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    const rule = rules.find((item) => item.region && data.region && item.region === data.region) || rules.find((item) => !item.region) || rules[0];
    const taxable = Number(data.subtotal || 0) + Number(data.shipping || 0);
    const taxAmount = rule ? taxable * (rule.rate / 100) : 0;
    return {
      country: data.country,
      region: data.region,
      type: rule?.type || 'NONE',
      rate: rule?.rate || 0,
      taxableAmount: taxable,
      taxAmount: Number(taxAmount.toFixed(2)),
      total: Number((taxable + taxAmount).toFixed(2)),
    };
  }

  async reconciliation(params: { date?: string }) {
    const day = params.date ? new Date(params.date) : new Date();
    const start = new Date(day);
    start.setHours(0, 0, 0, 0);
    const end = new Date(day);
    end.setHours(23, 59, 59, 999);

    const [orders, commissions, payouts] = await Promise.all([
      prisma.order.findMany({ where: { createdAt: { gte: start, lte: end } } }),
      prisma.dropshipCommission.findMany({ where: { createdAt: { gte: start, lte: end } } }),
      prisma.dropshipPayout.findMany({ where: { createdAt: { gte: start, lte: end } } }),
    ]);
    const orderTotal = orders.reduce((sum, item) => sum + item.totalAmount, 0);
    const commissionTotal = commissions.reduce((sum, item) => sum + item.totalFee, 0);
    const payoutTotal = payouts.reduce((sum, item) => sum + item.netAmount, 0);
    const discrepancy = Number((orderTotal - commissionTotal - payoutTotal).toFixed(2));

    return {
      date: start.toISOString().slice(0, 10),
      orderTotal: Number(orderTotal.toFixed(2)),
      commissionTotal: Number(commissionTotal.toFixed(2)),
      payoutTotal: Number(payoutTotal.toFixed(2)),
      discrepancy,
      status: Math.abs(discrepancy) < 0.01 ? 'MATCHED' : 'REVIEW_REQUIRED',
      counts: { orders: orders.length, commissions: commissions.length, payouts: payouts.length },
    };
  }

  async createChargeback(data: { orderId: string; amount: number; reason: string; evidence?: any[] }) {
    const order = await prisma.order.findUnique({ where: { id: data.orderId } });
    if (!order) throw new NotFoundError('Order');
    const event = await prisma.webhookEvent.create({
      data: {
        eventType: 'DROPSHIP_CHARGEBACK',
        source: 'dropship-finance',
        payload: stringify({
          orderId: data.orderId,
          amount: data.amount,
          reason: data.reason,
          evidence: data.evidence || [],
          representmentStatus: 'GATHERING_EVIDENCE',
        }),
        status: 'PENDING',
      },
    });
    return { chargebackId: event.id, status: 'OPEN', evidenceRequired: true };
  }

  async profitReport(params: { supplierId?: string; from?: string; to?: string }) {
    const where: any = {};
    if (params.supplierId) where.supplierId = params.supplierId;
    if (params.from || params.to) {
      where.createdAt = {};
      if (params.from) where.createdAt.gte = new Date(params.from);
      if (params.to) where.createdAt.lte = new Date(params.to);
    }

    const [orders, commissions, payouts, returns] = await Promise.all([
      prisma.dropshipOrder.findMany({ where }),
      prisma.dropshipCommission.findMany({ where: params.supplierId ? { supplierId: params.supplierId } : {} }),
      prisma.dropshipPayout.findMany({ where: params.supplierId ? { supplierId: params.supplierId } : {} }),
      prisma.dropshipReturn.findMany({ where: params.supplierId ? { supplierId: params.supplierId } : {} }),
    ]);
    const revenue = orders.reduce((sum, item) => sum + item.totalCost, 0);
    const cogs = orders.reduce((sum, item) => sum + item.subtotal, 0);
    const shipping = orders.reduce((sum, item) => sum + item.shippingCost, 0);
    const fees = commissions.reduce((sum, item) => sum + item.totalFee, 0);
    const payoutsTotal = payouts.reduce((sum, item) => sum + item.netAmount, 0);
    const refunds = returns.reduce((sum, item) => sum + (item.refundAmount || 0), 0);
    const netProfit = revenue - cogs - shipping - fees - payoutsTotal - refunds;

    return {
      revenue: Number(revenue.toFixed(2)),
      cogs: Number(cogs.toFixed(2)),
      shipping: Number(shipping.toFixed(2)),
      platformFees: Number(fees.toFixed(2)),
      payouts: Number(payoutsTotal.toFixed(2)),
      refunds: Number(refunds.toFixed(2)),
      netProfit: Number(netProfit.toFixed(2)),
      margin: revenue ? Number(((netProfit / revenue) * 100).toFixed(2)) : 0,
    };
  }
}

export const financeEngine = new FinanceEngine();
