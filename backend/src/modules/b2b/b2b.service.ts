import { prisma } from '../../common/prisma';

export class B2BService {
  async getAccounts() { return prisma.businessAccount.findMany({ orderBy: { createdAt: 'desc' } }); }
  async createAccount(data: any) { return prisma.businessAccount.create({ data }); }
  async updateAccount(id: string, data: any) { return prisma.businessAccount.update({ where: { id }, data }); }
  async deleteAccount(id: string) { return prisma.businessAccount.delete({ where: { id } }); }
  async getBulkPricing(productId?: string) {
    return prisma.bulkPricingTier.findMany({ where: productId ? { productId } : undefined });
  }
  async createBulkPricing(data: any) { return prisma.bulkPricingTier.create({ data }); }
  async getPurchaseOrders(accountId?: string) {
    return prisma.purchaseOrder.findMany({ where: accountId ? { businessAccountId: accountId } : undefined, orderBy: { createdAt: 'desc' } });
  }
  async createPurchaseOrder(data: any) { return prisma.purchaseOrder.create({ data }); }
  async updatePurchaseOrder(id: string, data: any) { return prisma.purchaseOrder.update({ where: { id }, data }); }
  async getQuoteRequests(accountId?: string) {
    return prisma.quoteRequest.findMany({ where: accountId ? { businessAccountId: accountId } : undefined, orderBy: { createdAt: 'desc' } });
  }
  async createQuoteRequest(data: any) { return prisma.quoteRequest.create({ data }); }
  async updateQuoteRequest(id: string, data: any) { return prisma.quoteRequest.update({ where: { id }, data }); }

  // User endpoints
  async getUserDashboard(userId: string) {
    const account = await prisma.businessAccount.findUnique({
      where: { userId },
    });
    if (!account) {
      return { account: null, purchaseOrders: [], quoteRequests: [], stats: { totalOrders: 0, totalQuotes: 0 } };
    }
    return {
      account,
      purchaseOrders: await prisma.purchaseOrder.findMany({ where: { businessAccountId: account.id }, take: 10, orderBy: { createdAt: 'desc' } }),
      quoteRequests: await prisma.quoteRequest.findMany({ where: { businessAccountId: account.id }, take: 10, orderBy: { createdAt: 'desc' } }),
      stats: {
        totalOrders: await prisma.purchaseOrder.count({ where: { businessAccountId: account.id } }),
        totalQuotes: await prisma.quoteRequest.count({ where: { businessAccountId: account.id } }),
      },
    };
  }
}

export const b2bService = new B2BService();