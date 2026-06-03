import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { prisma } from '../../common/prisma';
import { config } from '../../common/config';

export interface MigrationResult {
  total: number;
  migrated: number;
  skipped: number;
  errors: string[];
}

type SourceAsset = {
  url: string | null | undefined;
  entityType: string;
  entityId: string;
  category: string;
  subtype: string;
  title?: string | null;
  altText?: string | null;
};

function emptyResult(): MigrationResult {
  return { total: 0, migrated: 0, skipped: 0, errors: [] };
}

export class AssetMigrationService {
  private async createFromUrl(source: SourceAsset, result: MigrationResult) {
    result.total += 1;
    if (!source.url) {
      result.skipped += 1;
      return;
    }

    const existing = await prisma.asset.findFirst({
      where: { url: source.url, entityType: source.entityType, entityId: source.entityId },
      select: { id: true },
    });
    if (existing) {
      result.skipped += 1;
      return;
    }

    try {
      const filename = path.basename(source.url.split('?')[0]) || 'asset';
      const extension = path.extname(filename).replace('.', '').toLowerCase() || 'file';
      const localPath = source.url.startsWith('/uploads/')
        ? path.join(config.uploadDir, source.url.replace(/^\/uploads\//, ''))
        : '';

      let size = 0;
      let width: number | undefined;
      let height: number | undefined;
      let mimeType = extension ? `image/${extension === 'jpg' ? 'jpeg' : extension}` : 'application/octet-stream';

      if (localPath) {
        const stat = await fs.stat(localPath).catch(() => null);
        size = stat?.size || 0;
        if (stat) {
          const metadata = await sharp(localPath).metadata().catch(() => null);
          width = metadata?.width;
          height = metadata?.height;
          if (metadata?.format) mimeType = `image/${metadata.format === 'jpg' ? 'jpeg' : metadata.format}`;
        }
      }

await prisma.asset.create({
       data: {
         filename,
         originalName: filename,
         mimeType,
         size,
         width,
         height,
         url: source.url,
         alt: source.altText,
         entityType: source.entityType,
         entityId: source.entityId,
       },
     });
      result.migrated += 1;
    } catch (error) {
      result.errors.push(`${source.entityType}:${source.entityId}:${source.url} - ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async migrateProductImages(): Promise<MigrationResult> {
    const result = emptyResult();
    const images = await prisma.productImage.findMany({ include: { product: { select: { title: true } } } });
    for (const image of images) {
      await this.createFromUrl({
        url: image.url,
        entityType: 'product',
        entityId: image.productId,
        category: 'product',
        subtype: image.isPrimary || image.sortOrder === 0 ? 'product_main' : 'product_gallery',
        title: image.product?.title,
        altText: image.alt,
      }, result);
    }
    return result;
  }

  async migrateUserAvatars(): Promise<MigrationResult> {
    const result = emptyResult();
    const users = await prisma.user.findMany({ where: { avatar: { not: null } }, select: { id: true, avatar: true, firstName: true, lastName: true } });
    for (const user of users) {
      await this.createFromUrl({
        url: user.avatar,
        entityType: 'user',
        entityId: user.id,
        category: 'profile',
        subtype: 'avatar',
        title: [user.firstName, user.lastName].filter(Boolean).join(' ') || 'User avatar',
      }, result);
    }
    return result;
  }

  async migrateCategoryImages(): Promise<MigrationResult> {
    const result = emptyResult();
    const categories = await prisma.category.findMany({ where: { image: { not: null } }, select: { id: true, name: true, image: true } });
    for (const category of categories) {
      await this.createFromUrl({ url: category.image, entityType: 'category', entityId: category.id, category: 'banner', subtype: 'category_banner', title: category.name }, result);
    }
    return result;
  }

  async migrateBrandLogos(): Promise<MigrationResult> {
    const result = emptyResult();
    const brands = await prisma.brand.findMany({ where: { logo: { not: null } }, select: { id: true, name: true, logo: true } });
    for (const brand of brands) {
      await this.createFromUrl({ url: brand.logo, entityType: 'brand', entityId: brand.id, category: 'logo', subtype: 'logo_brand', title: brand.name }, result);
    }
    return result;
  }

  async migrateSellerImages(): Promise<MigrationResult> {
    const result = emptyResult();
    const sellers = await prisma.seller.findMany({ select: { id: true, storeName: true, storeLogo: true, storeBanner: true } });
    for (const seller of sellers) {
      await this.createFromUrl({ url: seller.storeLogo, entityType: 'seller', entityId: seller.id, category: 'logo', subtype: 'seller_logo', title: seller.storeName }, result);
      await this.createFromUrl({ url: seller.storeBanner, entityType: 'seller', entityId: seller.id, category: 'banner', subtype: 'seller_banner', title: seller.storeName }, result);
    }
    return result;
  }

  async migrateBlogCovers(): Promise<MigrationResult> {
    const result = emptyResult();
    const posts = await prisma.blogPost.findMany({ where: { coverImage: { not: null } }, select: { id: true, title: true, coverImage: true } });
    for (const post of posts) {
      await this.createFromUrl({ url: post.coverImage, entityType: 'blog', entityId: post.id, category: 'content', subtype: 'blog_cover', title: post.title }, result);
    }
    return result;
  }

  async runAll(): Promise<Record<string, MigrationResult>> {
    return {
      products: await this.migrateProductImages(),
      users: await this.migrateUserAvatars(),
      categories: await this.migrateCategoryImages(),
      brands: await this.migrateBrandLogos(),
      sellers: await this.migrateSellerImages(),
      blog: await this.migrateBlogCovers(),
    };
  }
}
