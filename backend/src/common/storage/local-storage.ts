import { StorageProvider, UploadOptions, UploadResult } from './storage.interface';
import { config } from '../config';
import * as path from 'path';
import * as fs from 'fs';
import { promisify } from 'util';
import sharp from 'sharp';

const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);
const stat = promisify(fs.stat);

export class LocalStorageProvider implements StorageProvider {
  private basePath: string;
  private baseUrl: string;

  constructor() {
    this.basePath = path.resolve(config.uploadDir, 'assets');
    this.baseUrl = '/uploads/assets';
  }

  private getDatePath(): string {
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    return path.join(year, month, day);
  }

  private async ensureDir(dirPath: string): Promise<void> {
    try {
      await stat(dirPath);
    } catch (e) {
      await mkdir(dirPath, { recursive: true });
    }
  }

  private sanitizeFilename(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const basename = path.basename(filename, ext)
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 120);
    return `${basename || 'asset'}${ext}`;
  }

  private toUrlPath(filePath: string): string {
    return filePath.split(path.sep).join('/');
  }

  private resolveStoragePath(filePath: string): string {
    if (!filePath) throw new Error('Storage path is required');

    let candidate = filePath.trim().split(/[?#]/)[0];
    try {
      candidate = decodeURIComponent(candidate);
    } catch {
      // Keep the original value if it is not URI encoded.
    }

    const baseUrlPrefix = `${this.baseUrl}/`;
    if (candidate.startsWith(baseUrlPrefix)) {
      candidate = candidate.slice(baseUrlPrefix.length);
    }
    if (candidate.startsWith('/uploads/assets/')) {
      candidate = candidate.slice('/uploads/assets/'.length);
    }

    candidate = candidate.replace(/\\/g, '/').replace(/^\/+/, '');
    const normalized = path.posix.normalize(candidate);
    if (
      normalized === '.' ||
      normalized === '..' ||
      normalized.startsWith('../') ||
      normalized.includes('\0')
    ) {
      throw new Error('Invalid storage path');
    }

    const fullPath = path.resolve(this.basePath, normalized);
    const basePathWithSeparator = this.basePath.endsWith(path.sep)
      ? this.basePath
      : `${this.basePath}${path.sep}`;
    if (fullPath !== this.basePath && !fullPath.startsWith(basePathWithSeparator)) {
      throw new Error('Invalid storage path');
    }

    return fullPath;
  }

  async upload(
    buffer: Buffer,
    filename: string,
    mimeType: string,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    const datePath = this.getDatePath();
    const uploadDir = path.join(this.basePath, datePath);
    await this.ensureDir(uploadDir);

    const safeFilename = this.sanitizeFilename(filename);
    const filePath = path.join(uploadDir, safeFilename);
    const relativePath = path.join(datePath, safeFilename);
    const urlPath = this.toUrlPath(relativePath);

    // Write the file
    await writeFile(filePath, buffer);

    // Initialize result
    const result: UploadResult = {
      url: `${this.baseUrl}/${urlPath}`,
      path: urlPath,
      size: buffer.length,
    };

    // If it's an image, process for thumbnail and optimization
    if (mimeType.startsWith('image/')) {
      try {
        // Extract image metadata
        const metadata = await sharp(buffer).metadata();
        result.width = metadata.width;
        result.height = metadata.height;

        // Generate thumbnail (200px width)
        if (options.generateThumbnail !== false) {
          const thumbnailBuffer = await sharp(buffer)
            .resize({ width: 200 })
            .toFormat('webp', { quality: options.quality ?? 80 })
            .toBuffer();

          const thumbnailFilename = `thumb-${path.parse(safeFilename).name}.webp`;
          const thumbnailPath = path.join(uploadDir, thumbnailFilename);
          await writeFile(thumbnailPath, thumbnailBuffer);
          result.thumbnailUrl = `${this.baseUrl}/${this.toUrlPath(path.join(datePath, thumbnailFilename))}`;
        }

        // Generate optimized version (WebP)
        if (options.optimize !== false) {
          const optimizedBuffer = await sharp(buffer)
            .toFormat('webp', { quality: options.quality ?? 80 })
            .toBuffer();

          const optimizedFilename = `opt-${path.parse(safeFilename).name}.webp`;
          const optimizedPath = path.join(uploadDir, optimizedFilename);
          await writeFile(optimizedPath, optimizedBuffer);
          result.optimizedUrl = `${this.baseUrl}/${this.toUrlPath(path.join(datePath, optimizedFilename))}`;
        }
      } catch (error) {
        console.error('Error processing image:', error);
        // If processing fails, we still have the original file
      }
    }

    return result;
  }

  getUrl(path: string): string {
    // If the path is already a full URL, return it
    if (path.startsWith('http')) {
      return path;
    }
    // Otherwise, prepend the base URL
    return `${this.baseUrl}/${path.replace(/^\/+/, '')}`;
  }

  async delete(filePath: string): Promise<void> {
    try {
      const fullPath = this.resolveStoragePath(filePath);
      await unlink(fullPath);

      // Also delete thumbnail and optimized versions if they exist. Keep legacy
      // variant names so older uploads created before the filename fix clean up.
      const dir = path.dirname(fullPath);
      const filename = path.basename(fullPath);
      const nameWithoutExt = path.parse(filename).name;
      const variantPaths = new Set([
        path.join(dir, `thumb-${nameWithoutExt}.webp`),
        path.join(dir, `opt-${nameWithoutExt}.webp`),
        path.join(dir, `thumb-${filename}.webp`),
        path.join(dir, `opt-${filename}.webp`),
      ]);

      for (const variantPath of variantPaths) {
        try {
          await unlink(variantPath);
        } catch {
          // Ignore if generated variants do not exist.
        }
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }
}
