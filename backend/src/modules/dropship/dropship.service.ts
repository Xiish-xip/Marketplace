import { prisma } from '../../common/prisma';
import { AppError, NotFoundError } from '../../common/errors';
import { logger } from '../../common/logger';

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export class DropshipService {
  // ── Suppliers ──
  async getSuppliers() {
    return prisma.dropshipSupplier.findMany({ orderBy: { createdAt: 'desc' } });
  }

  // ── Seller Dropshipping Applications ──

  async getSellerAccess(userId: string) {
    const seller = await prisma.seller.findUnique({ where: { userId } });
    if (!seller) throw new NotFoundError('Seller profile not found');

    const hasAccess = seller.sellerType === 'DROPSHIP' && seller.isActive;
    const application = await prisma.dropshipApplication.findFirst({
      where: { sellerId: seller.id },
      orderBy: { createdAt: 'desc' },
    });

    return {
      hasAccess,
      sellerType: seller.sellerType,
      sellerId: seller.id,
      isVerified: seller.isVerified,
      isActive: seller.isActive,
      application: application ? {
        id: application.id,
        status: application.status,
        metadata: application.metadata,
        adminNotes: application.adminNotes,
        createdAt: application.createdAt,
      } : null,
    };
  }

  async applyForAccess(userId: string, data: {
    businessName: string;
    businessType: string;
    experience: string;
    targetMarkets?: string;
    notes?: string;
  }) {
    const seller = await prisma.seller.findUnique({ where: { userId } });
    if (!seller) throw new NotFoundError('Seller profile not found. Create a seller account first.');

    // Check if there's already a pending application
    const existing = await prisma.dropshipApplication.findFirst({
      where: { sellerId: seller.id, status: 'PENDING' },
    });
    if (existing) throw new AppError(400, 'You already have a pending application');

    const application = await prisma.dropshipApplication.create({
      data: {
        sellerId: seller.id,
        status: 'PENDING',
        metadata: JSON.stringify(data),
      },
    });

    logger.info(`Dropship application submitted by seller ${seller.id}`, { businessName: data.businessName });
    return application;
  }

  async reviewApplication(applicationId: string, action: 'APPROVED' | 'REJECTED', adminNotes?: string) {
    const application = await prisma.dropshipApplication.findUnique({
      where: { id: applicationId },
      include: { seller: { include: { user: true } } },
    });
    if (!application) throw new NotFoundError('Application not found');

    await prisma.dropshipApplication.update({
      where: { id: applicationId },
      data: { status: action, adminNotes, reviewedAt: new Date() },
    });

    if (action === 'APPROVED') {
      // Update seller type to DROPSHIP, grant access, and add verified badge
      await prisma.seller.update({
        where: { id: application.sellerId },
        data: {
          sellerType: 'DROPSHIP',
          isVerified: true,
        },
      });

      // Award verified dropshipper badge
      const badgeType = await prisma.badgeType.findFirst({
        where: { slug: 'dropship-verified' },
      });
      if (badgeType) {
        await prisma.userBadge.upsert({
          where: {
            userId_badgeTypeId: {
              userId: application.seller.userId,
              badgeTypeId: badgeType.id,
            },
          },
          create: {
            userId: application.seller.userId,
            badgeTypeId: badgeType.id,
            reason: 'Approved dropshipper',
          },
          update: {},
        }).catch(() => logger.warn('Failed to award dropship badge'));
      }

      logger.info(`Dropship application ${applicationId} approved for seller ${application.sellerId}`);
    } else {
      logger.info(`Dropship application ${applicationId} rejected for seller ${application.sellerId}`);
    }

    return { id: applicationId, status: action };
  }

  async getPendingApplications() {
    return prisma.dropshipApplication.findMany({
      where: { status: 'PENDING' },
      include: {
        seller: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAllApplications(page = 1, limit = 20) {
    const [applications, total] = await Promise.all([
      prisma.dropshipApplication.findMany({
        include: {
          seller: {
            include: {
              user: { select: { id: true, firstName: true, lastName: true, email: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.dropshipApplication.count(),
    ]);
    return { applications, total, page, limit };
  }

  // ── Seller-specific queries ──

  async getSellerDashboard(sellerId: string) {
    const [connections, mappings, orders] = await Promise.all([
      prisma.providerConnection.count({
        where: { isActive: true },
      }),
      prisma.dropshipProductMapping.count({
        where: { supplier: { isActive: true } },
      }),
      prisma.dropshipOrder.count(),
    ]);

    return { connections, mappings, orders };
  }

  async getSellerConnections(sellerId: string) {
    return prisma.providerConnection.findMany({
      where: { isActive: true },
      include: { adapter: { select: { name: true, provider: true } } },
    });
  }

  async getSellerOrders(sellerId: string) {
    return prisma.dropshipOrder.findMany({
      where: {},
      include: { supplier: { select: { name: true, provider: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getSellerMappings(sellerId: string) {
    return prisma.dropshipProductMapping.findMany({
      where: { isActive: true },
      include: { supplier: { select: { name: true, provider: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });
  }

  // ── Mappings (legacy) ──
  async getMappings(supplierId?: string) {
    const where: any = { isActive: true };
    if (supplierId) where.supplierId = supplierId;
    return prisma.dropshipProductMapping.findMany({
      where,
      include: { supplier: { select: { name: true, provider: true } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  // ── Orders (legacy) ──
  async getOrders(supplierId?: string) {
    const where: any = {};
    if (supplierId) where.supplierId = supplierId;
    return prisma.dropshipOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { supplier: { select: { name: true, provider: true } } },
    });
  }

  // ── Automations ──
  async getAutomations(supplierId?: string) {
    const where: any = { category: 'dropship' };
    return prisma.workflowTemplate.findMany({ where, orderBy: { name: 'asc' } });
  }

  async createAutomation(data: any) {
    return prisma.workflowTemplate.create({ data: { ...data, category: 'dropship' } });
  }
}

export const dropshipService = new DropshipService();