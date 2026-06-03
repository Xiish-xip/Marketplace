import { prisma } from '../../common/prisma';

export class SearchService {
  async getSynonyms(language?: string) {
    return [];
  }

  async createSynonym(data: { terms: string; language?: string }) {
    return {};
  }

  async updateSynonym(id: string, data: { terms?: string; language?: string; isActive?: boolean }) {
    return {};
  }

  async deleteSynonym(id: string) {
    return {};
  }

  async getStopWords(language?: string) {
    return [];
  }

  async createStopWord(data: { word: string; language?: string }) {
    return {};
  }

  async deleteStopWord(id: string) {
    return {};
  }

  async getFilterTemplates() {
    return [];
  }

  async createFilterTemplate(data: { name: string; slug: string; categoryId?: string; filters: string; sortOptions?: string; isDefault?: boolean }) {
    return {};
  }

  async updateFilterTemplate(id: string, data: Record<string, any>) {
    return {};
  }

  async deleteFilterTemplate(id: string) {
    return {};
  }

  async getIndexJobs() {
    return [];
  }

  async triggerReindex(filters?: string) {
    return {};
  }

  async searchProducts(query: string, filters?: Record<string, any>, page = 1, limit = 20) {
    const where: any = { isActive: true, status: 'PUBLISHED' };

    if (query) {
      where.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ];
    }

    if (filters?.categoryId) where.categoryId = filters.categoryId;
    if (filters?.minPrice) where.basePrice = { ...where.basePrice, gte: filters.minPrice };
    if (filters?.maxPrice) where.basePrice = { ...where.basePrice, lte: filters.maxPrice };
    if (filters?.sellerId) where.sellerId = filters.sellerId;
    if (filters?.brandId) where.brandId = filters.brandId;

    const [data, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: { images: { where: { isPrimary: true }, take: 1 }, category: true, seller: { select: { storeName: true } } },
        orderBy: filters?.sort || { createdAt: 'desc' },
      }),
      prisma.product.count({ where }),
    ]);

    return { data, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }
}

export const searchService = new SearchService();
