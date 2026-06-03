import { prisma } from '../../common/prisma';

export class AnalyticsService {
  async getWidgets() {
    return prisma.dashboardWidget.findMany({ orderBy: { position: 'asc' } });
  }

  async createWidget(data: { title: string; type: string; config?: string; size?: string; role?: string }) {
    return prisma.dashboardWidget.create({ data: { ...data, isActive: true, position: 0 } });
  }

  async updateWidget(id: string, data: { title?: string; config?: string; isActive?: boolean; size?: string; role?: string }) {
    return prisma.dashboardWidget.update({ where: { id }, data });
  }

  async deleteWidget(id: string) {
    return prisma.dashboardWidget.delete({ where: { id } });
  }

  async getReports() {
    return prisma.reportTemplate.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async createReport(data: { name: string; description?: string; type: string; config?: string; isActive?: boolean }) {
    return prisma.reportTemplate.create({ data: { ...data, isActive: true } });
  }

  async getEvents(query: { eventType?: string; from?: string; to?: string; page?: number; limit?: number }) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const where: any = {};
    if (query.eventType) where.name = query.eventType;
    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) where.createdAt.gte = new Date(query.from);
      if (query.to) where.createdAt.lte = new Date(query.to);
    }
    const [data, total] = await Promise.all([
      prisma.analyticsEvent.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.analyticsEvent.count({ where }),
    ]);
    return { data, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async createEvent(data: { name: string; category?: string; label?: string; value?: number; userId?: string; sessionId?: string; metadata?: string }) {
    return prisma.analyticsEvent.create({ data: { ...data, category: data.category || 'general' } });
  }

  async getSummary() {
    const [totalUsers, totalProducts, totalOrders, totalRevenue] = await Promise.all([
      prisma.user.count(),
      prisma.product.count({ where: { isActive: true } }),
      prisma.order.count(),
      prisma.order.aggregate({ _sum: { totalAmount: true } }),
    ]);
    return { totalUsers, totalProducts, totalOrders, totalRevenue: totalRevenue._sum.totalAmount || 0 };
  }

  async exportCSV() {
    return '';
  }
}

export const analyticsService = new AnalyticsService();