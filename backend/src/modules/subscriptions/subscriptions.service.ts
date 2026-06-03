import { prisma } from '../../common/prisma';
import slugify from '../../common/slugify';
import { NotFoundError } from '../../common/errors';

function normalizeFeatures(features: any[] = []) {
  return features.map((feature) => {
    if (typeof feature === 'string') {
      return { key: feature, label: feature, value: 'true', type: 'boolean', isActive: true };
    }
    return feature;
  });
}

function serializeJson(value: any): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

function deserializeJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export class SubscriptionsService {
  async getPlans() {
    const plans = await prisma.subscriptionPlan.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
    return plans.map((plan) => ({
      ...plan,
      features: deserializeJson(plan.features, []),
      benefits: deserializeJson(plan.benefits, []),
      metadata: deserializeJson(plan.metadata, null),
    }));
  }

  async createPlan(data: any) {
    const plan = await prisma.subscriptionPlan.create({
      data: {
        name: data.name,
        slug: data.slug ? slugify(data.slug) : slugify(data.name),
        description: data.description,
        price: Number(data.price ?? 0),
        currency: data.currency || 'TZS',
        interval: data.interval || 'MONTHLY',
        trialDays: Number(data.trialDays ?? 0),
        sortOrder: Number(data.sortOrder ?? 0),
        features: serializeJson(normalizeFeatures(data.features || [])),
        benefits: serializeJson(data.benefits || []),
        metadata: serializeJson(data.metadata),
        isActive: data.isActive ?? true,
        isFeatured: data.isFeatured ?? false,
      },
    });
    return plan;
  }

  async updatePlan(id: string, data: any) {
    const existing = await prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Subscription plan not found');

    const updateData: Record<string, any> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.slug !== undefined) updateData.slug = slugify(data.slug);
    if (data.description !== undefined) updateData.description = data.description;
    if (data.price !== undefined) updateData.price = Number(data.price);
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.interval !== undefined) updateData.interval = data.interval;
    if (data.trialDays !== undefined) updateData.trialDays = Number(data.trialDays);
    if (data.sortOrder !== undefined) updateData.sortOrder = Number(data.sortOrder);
    if (data.features !== undefined) updateData.features = serializeJson(normalizeFeatures(data.features || []));
    if (data.benefits !== undefined) updateData.benefits = serializeJson(data.benefits || []);
    if (data.metadata !== undefined) updateData.metadata = serializeJson(data.metadata);
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.isFeatured !== undefined) updateData.isFeatured = data.isFeatured;

    return prisma.subscriptionPlan.update({ where: { id }, data: updateData });
  }

  async deletePlan(id: string) {
    const activeSubscriptions = await prisma.subscription.count({
      where: { planId: id, status: { in: ['ACTIVE', 'TRIALING', 'PAST_DUE'] } },
    });
    if (activeSubscriptions > 0) {
      return prisma.subscriptionPlan.update({ where: { id }, data: { isActive: false } });
    }
    return prisma.subscriptionPlan.delete({ where: { id } });
  }

  async getSubscriptions() {
    return prisma.subscription.findMany({
      include: {
        plan: true,
        user: { select: { id: true, email: true, phone: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getUserSubscriptions(userId: string) {
    return prisma.subscription.findMany({
      where: { userId },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const subscriptionsService = new SubscriptionsService();
