import { Router } from 'express';
import { authenticate, authorize } from '../../common/middleware';
import { upload } from '../../common/upload';
import { DynamicConfigService } from '../dynamic-config/dynamic-config.service';
import { AppError } from '../../common/errors';
import { logger } from '../../common/logger';
import { AssetsService } from '../assets/assets.service';
import multer from 'multer';
import path from 'path';

const router = Router();
const configService = new DynamicConfigService();
const assetsService = new AssetsService();
const DEFAULT_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/x-icon', 'image/vnd.microsoft.icon', 'image/avif', 'image/bmp', 'image/tiff', 'image/heic', 'image/heif'];
const DEFAULT_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.ico', '.avif', '.bmp', '.tif', '.tiff', '.heic', '.heif'];

const uploadMiddleware = upload.array('images');

function handleUpload(req: any, res: any, next: any) {
  logger.debug('Upload request received', {
    contentType: req.headers['content-type'],
    contentLength: req.headers['content-length'],
  });
  uploadMiddleware(req, res, (err: any, result?: any) => {
    logger.debug('Upload middleware completed', {
      error: err?.message,
      result,
      fileCount: (req as any).files?.length || 0,
    });
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') return next(new AppError(400, 'File too large. Maximum size is 15MB per image.'));
        if (err.code === 'LIMIT_UNEXPECTED_FILE') return next(new AppError(400, 'Too many files or unexpected field name. Use field "images".'));
        return next(new AppError(400, `Upload error: ${err.message}`));
      }
      if (err.message?.includes('Only image')) return next(new AppError(400, err.message));
      return next(err);
    }
    next();
  });
}

function parseUploadMetadata(req: any): Record<string, any> {
  const metadata: Record<string, any> = {};
  const textFields = ['title', 'altText', 'description', 'caption', 'credit', 'copyright', 'category', 'subtype'];
  for (const field of textFields) { if (req.body?.[field]) metadata[field] = req.body[field]; }
  if (req.body?.tags) {
    try { metadata.tags = JSON.parse(req.body.tags); } catch { metadata.tags = req.body.tags; }
  }
  return metadata;
}

// POST /api/upload/images — Upload images AND create database Asset records
router.post('/images', authenticate, handleUpload, async (req, res, next) => {
  try {
    const files = (req.files as Express.Multer.File[] | undefined) || [];
    if (!files.length) throw new AppError(400, 'No image files were received');

    const metadata = parseUploadMetadata(req);
    const origin = `${req.protocol}://${req.get('host')}`;

    // Create Asset records in the database for each uploaded file
    const createdAssets = [];
    for (const file of files) {
      try {
        const asset = await assetsService.uploadFile(
          file,
          {
            description: metadata?.description,
            altText: metadata?.altText,
            entityType: metadata?.category || 'image',
            entityId: metadata?.subtype || 'upload',
          },
          req.user as any,
        );
        createdAssets.push(asset);
      } catch (assetError: any) {
        logger.error('Failed to create asset record for uploaded file', { file: file.filename, error: assetError.message });
        // Still return the file info even if asset record creation fails
        createdAssets.push({
          filename: file.filename,
          url: `/uploads/${file.filename}`,
          mimeType: file.mimetype,
          size: file.size,
        });
      }
    }

    res.status(201).json({
      success: true,
      message: `${files.length} file${files.length === 1 ? '' : 's'} uploaded successfully`,
      data: createdAssets,
    });
  } catch (error) { next(error); }
});

export default router;
