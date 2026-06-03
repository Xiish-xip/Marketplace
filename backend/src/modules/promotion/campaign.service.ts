import { prisma } from '../../common/prisma';

export class CampaignService {
  async getCampaigns(page = 1, limit = 20) {
    const [data, total] = await Promise.all([
      prisma.campaign.findMany({
        include: { products: { include: { product: { select: { id: true, title: true, slug: true, basePrice: true, images: { take: 1, orderBy: { sortOrder: 'asc' } } } } } } },
        orderBy: { startAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.campaign.count(),
    ]);
    return { data, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getActiveCampaigns() {
    const now = new Date();
    return prisma.campaign.findMany({
      where: { isActive: true, startAt: { lte: now }, endAt: { gte: now } },
      include: { products: { include: { product: { select: { id: true, title: true, slug: true, basePrice: true, discountPrice: true, images: { take: 1, orderBy: { sortOrder: 'asc' } } } } } } },
      orderBy: { startAt: 'asc' },
    });
  }

  async getCampaign(id: string) {
    return prisma.campaign.findUnique({
      where: { id },
      include: { products: { include: { product: { include: { images: { orderBy: { sortOrder: 'asc' } } } } } } },
    });
  }

  async createCampaign(data: any) {
    const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const campaign = await prisma.campaign.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        banner: data.banner,
        type: data.type || 'FLASH_SALE',
        discountType: data.discountType,
        discountValue: data.discountValue,
        startAt: new Date(data.startAt),
        endAt: new Date(data.endAt),
        isActive: data.isActive ?? true,
      },
    });
    if (data.productIds?.length) {
      await prisma.campaignProduct.createMany({
        data: data.productIds.map((productId: string) => ({ campaignId: campaign.id, productId })),
      });
    }
    return this.getCampaign(campaign.id);
  }

  async updateCampaign(id: string, data: any) {
    const updateData: any = { ...data };
    if (data.startAt) updateData.startAt = new Date(data.startAt);
    if (data.endAt) updateData.endAt = new Date(data.endAt);
    delete updateData.productIds;
    await prisma.campaign.update({ where: { id }, data: updateData });
    if (data.productIds) {
      await prisma.campaignProduct.deleteMany({ where: { campaignId: id } });
      await prisma.campaignProduct.createMany({
        data: data.productIds.map((productId: string) => ({ campaignId: id, productId })),
      });
    }
    return this.getCampaign(id);
  }

  async deleteCampaign(id: string) {
    await prisma.campaignProduct.deleteMany({ where: { campaignId: id } });
    await prisma.campaign.delete({ where: { id } });
    return { success: true };
  }

  async addProduct(campaignId: string, productId: string) {
    return prisma.campaignProduct.create({ data: { campaignId, productId } });
  }

  async removeProduct(campaignId: string, productId: string) {
    return prisma.campaignProduct.deleteMany({ where: { campaignId, productId } });
  }
}

export const campaignService = new CampaignService();