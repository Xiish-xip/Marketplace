import { prisma } from '../../common/prisma';

export class TranslationsService {
  async getLanguages() {
    return prisma.siteLanguage.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async createLanguage(data: any) {
    const lang = await prisma.siteLanguage.create({
      data: {
        code: data.code,
        name: data.name,
        nativeName: data.nativeName,
        isRtl: data.isRtl ?? false,
        isDefault: data.isDefault ?? false,
        isActive: data.isActive ?? true,
        flagUrl: data.flagUrl,
        sortOrder: data.sortOrder ?? 0,
      },
    });
    if (lang.isDefault) {
      await prisma.siteLanguage.updateMany({
        where: { id: { not: lang.id }, isDefault: true },
        data: { isDefault: false },
      });
    }
    return this.getLanguages();
  }

  async updateLanguage(code: string, data: any) {
    const lang = await prisma.siteLanguage.update({ where: { code }, data });
    if (data.isDefault) {
      await prisma.siteLanguage.updateMany({
        where: { code: { not: code }, isDefault: true },
        data: { isDefault: false },
      });
    }
    return this.getLanguages();
  }

  async deleteLanguage(code: string) {
    await prisma.siteLanguage.delete({ where: { code } });
    return this.getLanguages();
  }

  async getTranslationKeys(group?: string, search?: string, page = 1, limit = 50) {
    const where: any = {};
    if (group) where.group = group;
    if (search) where.key = { contains: search };

    const [data, total] = await Promise.all([
      prisma.translationKey.findMany({
        where,
        include: { values: true },
        orderBy: { key: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.translationKey.count({ where }),
    ]);
    return { data, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getGroups() {
    const keys = await prisma.translationKey.findMany({
      select: { group: true },
      distinct: ['group'],
      orderBy: { group: 'asc' },
    });
    return keys.map((k) => k.group);
  }

  async createTranslationKey(data: { key: string; group: string; description?: string; values?: Record<string, string> }) {
    const key = await prisma.translationKey.create({
      data: {
        key: data.key,
        group: data.group || 'general',
        description: data.description,
      },
    });
    if (data.values) {
      for (const [language, value] of Object.entries(data.values)) {
        await prisma.translationValue.create({
          data: { translationKeyId: key.id, language, value },
        });
      }
    }
    return prisma.translationKey.findUnique({
      where: { id: key.id },
      include: { values: true },
    });
  }

  async updateTranslationKey(id: string, data: { key?: string; group?: string; description?: string }) {
    return prisma.translationKey.update({ where: { id }, data, include: { values: true } });
  }

  async deleteTranslationKey(id: string) {
    await prisma.translationValue.deleteMany({ where: { translationKeyId: id } });
    await prisma.translationKey.delete({ where: { id } });
    return { success: true };
  }

  async setTranslationValue(keyId: string, language: string, value: string) {
    return prisma.translationValue.upsert({
      where: { translationKeyId_language: { translationKeyId: keyId, language } },
      create: { translationKeyId: keyId, language, value },
      update: { value },
    });
  }

  async deleteTranslationValue(id: string) {
    await prisma.translationValue.delete({ where: { id } });
    return { success: true };
  }

  async getAllTranslations(language?: string) {
    const where: any = {};
    if (language) where.language = language;
    const values = await prisma.translationValue.findMany({
      where,
      include: { translationKey: true },
    });
    // Return as flat key-value map
    const result: Record<string, string> = {};
    for (const v of values) {
      result[v.translationKey.key] = v.value;
    }
    return result;
  }

  async getFrontendTranslations(language: string) {
    const values = await prisma.translationValue.findMany({
      where: { language },
      include: { translationKey: true },
    });
    const result: Record<string, string> = {};
    for (const v of values) {
      result[v.translationKey.key] = v.value;
    }
    return result;
  }

  // Bulk import translations (for seeding)
  async bulkImport(translations: Array<{ key: string; group: string; description?: string; values: Record<string, string> }>) {
    let created = 0;
    for (const t of translations) {
      const existing = await prisma.translationKey.findUnique({ where: { key: t.key } });
      if (existing) continue;
      const key = await prisma.translationKey.create({
        data: { key: t.key, group: t.group || 'general', description: t.description },
      });
      for (const [language, value] of Object.entries(t.values)) {
        await prisma.translationValue.create({
          data: { translationKeyId: key.id, language, value },
        });
      }
      created++;
    }
    return { created };
  }
}

export const translationsService = new TranslationsService();