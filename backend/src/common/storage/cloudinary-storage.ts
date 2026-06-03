import { StorageProvider, UploadOptions, UploadResult } from './storage.interface';
import { config } from '../config';
import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';

cloudinary.config({
  cloud_name: config.cloudinaryCloudName,
  api_key: config.cloudinaryApiKey,
  api_secret: config.cloudinaryApiSecret,
});

export class CloudinaryStorageProvider implements StorageProvider {
  async upload(
    buffer: Buffer,
    filename: string,
    mimeType: string,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'marketplace/assets',
          public_id: `${Date.now()}-${Math.round(Math.random() * 1e9)}-${filename
            .split('.')
            .slice(0, -1)
            .join('.')}`,
          resource_type: mimeType.startsWith('video/') ? 'video' : 'image',
          format: options.optimize !== false ? 'webp' : undefined,
          transformation: [
            { width: options.width, height: options.height, crop: 'limit' },
            { quality: options.quality ?? 80 },
          ],
        },
        (error, result) => {
          if (error) {
            reject(error);
            return;
          }

          // Handle case where result might be undefined
          if (!result) {
            reject(new Error('Cloudinary upload returned undefined result'));
            return;
          }

          const uploadResult: UploadResult = {
            url: result.secure_url || '',
            path: result.public_id || '',
            size: result.bytes || 0,
            width: result.width,
            height: result.height,
          };

          // Add thumbnail URL for images
          if (mimeType.startsWith('image/') && options.generateThumbnail !== false) {
            uploadResult.thumbnailUrl = cloudinary.url(result.public_id, {
              width: 200,
              crop: 'limit',
              format: 'webp',
            });
          }

          // Add optimized URL
          if (options.optimize !== false) {
            uploadResult.optimizedUrl = cloudinary.url(result.public_id, {
              fetch_format: 'auto',
              quality: 'auto',
            });
          }

          resolve(uploadResult);
        }
      );

      streamifier.createReadStream(buffer).pipe(uploadStream);
    });
  }

  getUrl(path: string): string {
    // If it's already a Cloudinary URL, return as-is
    if (path.includes('res.cloudinary.com')) {
      return path;
    }
    // Otherwise, construct URL from public ID
    return cloudinary.url(path);
  }

  async delete(path: string): Promise<void> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(path, (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }

  async getSignedUrl(path: string, expiresIn = 3600): Promise<string> {
    // Cloudinary doesn't need signed URLs for public assets
    // Return the regular URL
    return this.getUrl(path);
  }
}