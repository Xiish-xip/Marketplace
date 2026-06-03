import { prisma } from '../../common/prisma';
import { NotFoundError, AppError } from '../../common/errors';

export class BadgesService {
  // ─── Admin: Badge Type Management ───

  async getBadgeTypes() {
    return prisma.badgeType.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createBadgeType(data: {
    name: string;
    slug: string;
    description?: string;
    icon?: string;
    color?: string;
    category: string;
    criteria?: string;
  }) {
    const existing = await prisma.badgeType.findUnique({ where: { slug: data.slug } });
    if (existing) throw new AppError(409, 'Badge type with this slug already exists');
    return prisma.badgeType.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        icon: data.icon,
        color: data.color || '#6366f1',
        category: data.category,
        criteria: data.criteria,
        sortOrder: 0,
        isActive: true,
      },
    });
  }

  async updateBadgeType(id: string, data: any) {
    const existing = await prisma.badgeType.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Badge type not found');
    return prisma.badgeType.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.icon !== undefined && { icon: data.icon }),
        ...(data.color !== undefined && { color: data.color }),
        ...(data.criteria !== undefined && { criteria: data.criteria }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
      },
    });
  }

  async deleteBadgeType(id: string) {
    const existing = await prisma.badgeType.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Badge type not found');
    await prisma.userBadge.deleteMany({ where: { badgeTypeId: id } });
    return prisma.badgeType.delete({ where: { id } });
  }

  // ─── Admin: User Badge Management ───

  async getAllUserBadges(query: { badgeTypeId?: string; userId?: string; isVisible?: boolean }) {
    const where: any = {};
    if (query.badgeTypeId) where.badgeTypeId = query.badgeTypeId;
    if (query.userId) where.userId = query.userId;
    if (query.isVisible !== undefined) where.isVisible = query.isVisible;
    return prisma.userBadge.findMany({
      where,
      include: { badgeType: true },
      orderBy: { awardedAt: 'desc' },
    });
  }

  async giveBadge(userId: string, badgeTypeId: string, awardedBy?: string, reason?: string) {
    const existing = await prisma.userBadge.findUnique({
      where: { userId_badgeTypeId: { userId, badgeTypeId } },
    });
    if (existing) throw new AppError(400, 'User already has this badge');

    return prisma.userBadge.create({
      data: { userId, badgeTypeId, awardedBy, reason, isVisible: true },
      include: { badgeType: true },
    });
  }

  async revokeBadge(id: string) {
    const userBadge = await prisma.userBadge.findUnique({ where: { id } });
    if (!userBadge) throw new NotFoundError('Badge not found');
    return prisma.userBadge.delete({ where: { id } });
  }

  async toggleVisibility(id: string) {
    const userBadge = await prisma.userBadge.findUnique({ where: { id } });
    if (!userBadge) throw new NotFoundError('Badge not found');
    return prisma.userBadge.update({
      where: { id },
      data: { isVisible: !userBadge.isVisible },
      include: { badgeType: true },
    });
  }

  // ─── User: Apply for a Badge ───

  async applyForBadge(userId: string, badgeTypeSlug: string) {
    const badgeType = await prisma.badgeType.findUnique({ where: { slug: badgeTypeSlug } });
    if (!badgeType) throw new NotFoundError('Badge type not found');
    if (!badgeType.isActive) throw new AppError(400, 'This badge type is not available');

    const existing = await prisma.userBadge.findUnique({
      where: { userId_badgeTypeId: { userId, badgeTypeId: badgeType.id } },
    });
    if (existing) {
      throw new AppError(400, 'You already have this badge');
    }

    return prisma.userBadge.create({
      data: { userId, badgeTypeId: badgeType.id, isVisible: true },
      include: { badgeType: true },
    });
  }

  async getUserBadges(userId: string) {
    return prisma.userBadge.findMany({
      where: { userId },
      include: { badgeType: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Public: Get available badge types ───

  async getAvailableBadgeTypes(category?: string) {
    const where: any = { isActive: true };
    if (category) where.category = category;
    return prisma.badgeType.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });
  }
}

export const badgesService = new BadgesService();