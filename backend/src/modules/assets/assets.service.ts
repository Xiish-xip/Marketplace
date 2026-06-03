import { Prisma } from '@prisma/client';
import path from 'path';
import { prisma } from '../../common/prisma';
import { config } from '../../common/config';
import { BadRequestError, NotFoundError } from '../../common/errors';
import { createStorageProvider } from '../../common/storage/storage.factory';
import { StorageProvider } from '../../common/storage/storage.interface';
import type { AuthPayload } from '../../common/middleware';

export interface CreateAssetData {
  groupId?: string | null;
  description?: string | null;
  altText?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  filename?: string;
  originalName?: string;
  mimeType?: string;
  size?: number;
  url?: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  duration?: number;
}

const ASSET_TYPES = ['image', 'video', 'document', 'audio', 'other'] as const;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_ASSET_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/x-icon',
  'image/vnd.microsoft.icon',
  'image/avif',
  'image/bmp',
  'image/tiff',
  'image/heic',
  'image/heif',
  'application/pdf',
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'video/mp4',
  'video/webm',
  'audio/mpeg',
  'audio/wav',
  'audio/webm',
]);
const ALLOWED_ASSET_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.webp', '.gif', '.ico', '.avif', '.bmp', '.tif', '.tiff', '.heic', '.heif',
  '.pdf', '.csv', '.xls', '.xlsx', '.mp4', '.webm', '.mp3', '.wav',
]);

export class AssetsService {
  private storage: StorageProvider;

  constructor() {
    this.storage = createStorageProvider();
  }

  private storagePathFromUrl(url?: string | null): string | null {
    if (!url) return null;
    let pathname = url;
    try {
      pathname = new URL(url).pathname;
    } catch {
      // Relative URLs are expected for local storage.
    }

    const marker = '/uploads/assets/';
    const index = pathname.indexOf(marker);
    if (index === -1) return null;
    return pathname.slice(index + marker.length);
  }

  private getStoragePath(asset: { filename: string; url: string }): string {
    const urlPath = this.storagePathFromUrl(asset.url);
    if (urlPath && !asset.filename.includes('/')) return urlPath;
    return asset.filename || urlPath || asset.url;
  }

  private async createAssetRecord(data: CreateAssetData, userId?: string): Promise<any> {
    return prisma.asset.create({
      data: {
        filename: data.filename || `asset-${Date.now()}`,
        originalName: data.originalName || data.filename || 'unknown',
        mimeType: data.mimeType || 'application/octet-stream',
        size: data.size || 0,
        url: data.url || '',
        thumbnailUrl: data.thumbnailUrl,
        alt: data.altText,
        description: data.description,
        width: data.width,
        height: data.height,
        duration: data.duration,
        entityType: data.entityType,
        entityId: data.entityId,
        groupId: data.groupId,
        userId,
        metadata: '{}',
        isActive: true,
      },
    });
  }

  async uploadFile(file: Express.Multer.File, data: CreateAssetData, user: AuthPayload): Promise<any> {
    if (!file) throw new BadRequestError('No file provided');

    const mimeType = file.mimetype || data.mimeType || 'application/octet-stream';
    const fileExt = path.extname(file.originalname || file.filename || 'file').toLowerCase();

    if (file.size > MAX_FILE_SIZE) throw new BadRequestError(`File too large. Max size: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    if (!ALLOWED_ASSET_MIME_TYPES.has(mimeType) || !ALLOWED_ASSET_EXTENSIONS.has(fileExt)) {
      throw new BadRequestError('File type is not allowed. SVG and executable uploads are not accepted.');
    }

    const safeFilename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${fileExt}`;
    const uploadResult = await this.storage.upload(file.buffer, safeFilename, mimeType);

    return this.createAssetRecord({
      ...data,
      filename: uploadResult.path,
      originalName: file.originalname,
      mimeType,
      size: uploadResult.size || file.size,
      url: uploadResult.url,
      thumbnailUrl: uploadResult.thumbnailUrl,
      width: uploadResult.width,
      height: uploadResult.height,
    }, user.userId);
  }

  async uploadFromBuffer(buffer: Buffer, data: CreateAssetData, user: AuthPayload): Promise<any> {
    const safeFilename = data.filename || `asset-${Date.now()}`;
    const uploadResult = await this.storage.upload(buffer, safeFilename, data.mimeType || 'application/octet-stream');

    return this.createAssetRecord({
      ...data,
      filename: uploadResult.path,
      size: uploadResult.size,
      url: uploadResult.url,
      thumbnailUrl: uploadResult.thumbnailUrl,
      width: uploadResult.width,
      height: uploadResult.height,
    }, user.userId);
  }

  async getAssets(query: { 
    familyId?: string; 
    groupId?: string; 
    entityType?: string; 
    entityId?: string;
    mimeType?: string;
    search?: string;
    page?: number; 
    limit?: number 
  }) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;
    const where: any = { isActive: true };

    if (query.familyId) where.familyId = query.familyId;
    if (query.groupId) where.groupId = query.groupId;
    if (query.entityType) where.entityType = query.entityType;
    if (query.entityId) where.entityId = query.entityId;
    if (query.mimeType) where.mimeType = { contains: query.mimeType };

    if (query.search) {
      where.OR = [
        { originalName: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { alt: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [assets, total] = await Promise.all([
      prisma.asset.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.asset.count({ where }),
    ]);

    return { data: assets, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getAssetById(id: string) {
    const asset = await prisma.asset.findUnique({
      where: { id },
      include: { family: true, group: true },
    });
    if (!asset) throw new NotFoundError('Asset not found');
    return asset;
  }

  async updateAsset(id: string, data: { 
    alt?: string; 
    description?: string; 
    isActive?: boolean;
    groupId?: string | null;
    entityType?: string;
    entityId?: string;
    metadata?: string;
  }) {
    const asset = await prisma.asset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundError('Asset not found');

    return prisma.asset.update({
      where: { id },
      data: {
        ...(data.alt !== undefined && { alt: data.alt }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.groupId !== undefined && { groupId: data.groupId }),
        ...(data.entityType !== undefined && { entityType: data.entityType }),
        ...(data.entityId !== undefined && { entityId: data.entityId }),
        ...(data.metadata !== undefined && { metadata: data.metadata }),
      },
    });
  }

  async deleteAsset(id: string) {
    const asset = await prisma.asset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundError('Asset not found');
    await this.storage.delete(this.getStoragePath(asset)).catch((error: any) => {
      if (error?.code !== 'ENOENT') throw error;
    });
    return prisma.asset.delete({ where: { id } });
  }

  async bulkDelete(ids: string[]) {
    const assets = await prisma.asset.findMany({ where: { id: { in: ids } } });
    for (const asset of assets) {
      await this.storage.delete(this.getStoragePath(asset)).catch(() => {});
    }
    await prisma.asset.deleteMany({ where: { id: { in: ids } } });
    return { deleted: assets.length };
  }

  async getFamilies() { return prisma.assetFamily.findMany({ orderBy: { sortOrder: 'asc' } }); }
  async getGroups(familyId?: string) {
    const where: any = {};
    if (familyId) where.familyId = familyId;
    return prisma.assetGroup.findMany({ where, orderBy: { sortOrder: 'asc' } });
  }

  async incrementUsage(id: string) {
    return prisma.asset.update({
      where: { id },
      data: { /* usage tracking via updatedAt */ },
    });
  }
}

export const assetsService = new AssetsService();
