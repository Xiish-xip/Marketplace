import { prisma } from '../../common/prisma';

export class SyncService {
  async getJobs() {
    return prisma.exportJob.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async createJob(data: { type: string; format?: string; filters?: string }) {
    return prisma.exportJob.create({ data: { type: data.type, format: data.format || 'csv', filters: data.filters, status: 'PENDING' } });
  }

  async updateJob(id: string, data: { status?: string; progress?: number; error?: string }) {
    return prisma.exportJob.update({ where: { id }, data });
  }

  async deleteJob(id: string) {
    return prisma.exportJob.delete({ where: { id } });
  }

  async getLogs() {
    return prisma.workflowRun.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
  }

  async getErrors() {
    return prisma.exportJob.findMany({ where: { status: 'FAILED' }, orderBy: { createdAt: 'desc' } });
  }

  async getStats() {
    const [total, running, completed, failed] = await Promise.all([
      prisma.exportJob.count(),
      prisma.exportJob.count({ where: { status: 'PROCESSING' } }),
      prisma.exportJob.count({ where: { status: 'COMPLETED' } }),
      prisma.exportJob.count({ where: { status: 'FAILED' } }),
    ]);
    return { total, running, completed, failed };
  }
}

export const syncService = new SyncService();