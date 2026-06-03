import { prisma } from '../../common/prisma';

export class CacheService {
  async getConfigs() {
    return prisma.cacheConfig.findMany({ orderBy: { key: 'asc' } });
  }

  async createConfig(data: { key: string; value?: string; type?: string; description?: string; isActive?: boolean }) {
    return prisma.cacheConfig.create({
      data: {
        key: data.key,
        value: data.value ?? '',
        type: data.type ?? 'string',
        description: data.description,
        isActive: data.isActive ?? true,
      },
    });
  }

  async updateConfig(id: string, data: { value?: string; type?: string; description?: string; isActive?: boolean }) {
    return prisma.cacheConfig.update({ where: { id }, data });
  }

  async deleteConfig(id: string) {
    return prisma.cacheConfig.delete({ where: { id } });
  }

  async getQueues() {
    return prisma.queueMonitor.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async createQueue(data: { name: string; type?: string; isActive?: boolean }) {
    return prisma.queueMonitor.create({
      data: {
        name: data.name,
        type: data.type ?? 'default',
        isActive: data.isActive ?? true,
      },
    });
  }

  async updateQueue(id: string, data: { status?: string; isActive?: boolean }) {
    return prisma.queueMonitor.update({ where: { id }, data });
  }

  async getRateLimits() {
    return prisma.rateLimitRule.findMany({ orderBy: { name: 'asc' } });
  }

  async createRateLimit(data: { name: string; route: string; method?: string; maxRequests?: number; windowMs?: number; isActive?: boolean }) {
    return prisma.rateLimitRule.create({
      data: {
        name: data.name,
        route: data.route,
        method: data.method ?? 'ALL',
        maxRequests: data.maxRequests ?? 100,
        windowMs: data.windowMs ?? 60000,
        isActive: data.isActive ?? true,
      },
    });
  }

  async updateRateLimit(id: string, data: { name?: string; route?: string; method?: string; maxRequests?: number; windowMs?: number; isActive?: boolean }) {
    return prisma.rateLimitRule.update({ where: { id }, data });
  }

  async deleteRateLimit(id: string) {
    return prisma.rateLimitRule.delete({ where: { id } });
  }

  async clearCache() {
    return { cleared: true, clearedAt: new Date().toISOString() };
  }
}

export const cacheService = new CacheService();