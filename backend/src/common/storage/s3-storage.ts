import { StorageProvider, UploadOptions, UploadResult } from './storage.interface';
import { config } from '../config';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import sharp from 'sharp';

export class S3StorageProvider implements StorageProvider {
  private s3Client: S3Client;
  private bucket: string;
  private region: string;

  constructor(options?: { endpoint?: string }) {
    const endpoint = options?.endpoint || config.r2Endpoint;
    
    this.s3Client = new S3Client({
      endpoint: endpoint || undefined,
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
      forcePathStyle: !!endpoint, // Required for R2 and custom endpoints
    });

    this.bucket = process.env.AWS_S3_BUCKET || 'marketplace-assets';
    this.region = process.env.AWS_REGION || 'us-east-1';
  }

  private getKey(filename: string): string {
    const date = new Date();
    const year = date.getFullYear().toString();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const uniqueId = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    return `assets/${year}/${month}/${day}/${uniqueId}-${filename}`;
  }

  async upload(
    buffer: Buffer,
    filename: string,
    mimeType: string,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    const key = this.getKey(filename);
    
    // Initialize result
    const result: UploadResult = {
      url: '', // Will be set after upload
      path: key,
      size: buffer.length,
    };

    // Process image if needed
    let uploadBuffer = buffer;
    let contentType = mimeType;
    
    if (mimeType.startsWith('image/')) {
      try {
        // Extract metadata
        const metadata = await sharp(buffer).metadata();
        result.width = metadata.width;
        result.height = metadata.height;

        // Generate thumbnail if requested
        if (options.generateThumbnail !== false) {
          const thumbnailBuffer = await sharp(buffer)
            .resize({ width: 200 })
            .toFormat('webp', { quality: options.quality ?? 80 })
            .toBuffer();
            
          const thumbnailKey = `thumbs/${key}`;
          await this.s3Client.send(new PutObjectCommand({
            Bucket: this.bucket,
            Key: thumbnailKey,
            Body: thumbnailBuffer,
            ContentType: 'image/webp',
          }));
          
          result.thumbnailUrl = await this.getSignedUrl(thumbnailKey);
        }

        // Generate optimized version if requested
        if (options.optimize !== false) {
          const optimizedBuffer = await sharp(buffer)
            .toFormat('webp', { quality: options.quality ?? 80 })
            .toBuffer();
            
          uploadBuffer = optimizedBuffer;
          contentType = 'image/webp';
          
          // Update dimensions after optimization
          const optMetadata = await sharp(optimizedBuffer).metadata();
          result.width = optMetadata.width;
          result.height = optMetadata.height;
        }
      } catch (error) {
        console.error('Error processing image for S3:', error);
        // Continue with original buffer if processing fails
      }
    }

    // Upload main file
    await this.s3Client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: uploadBuffer,
      ContentType: contentType,
    }));

    // Construct URL
    if (this.s3Client.config.endpoint) {
      // Custom endpoint (like R2)
      result.url = `${this.s3Client.config.endpoint}/${this.bucket}/${key}`;
    } else {
      // Standard AWS S3
      result.url = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
    }

    return result;
  }

  getUrl(path: string): string {
    // If it's already a full URL, return it
    if (path.startsWith('http')) {
      return path;
    }
    
    // Construct URL from path
    if (this.s3Client.config.endpoint) {
      // Custom endpoint (like R2)
      return `${this.s3Client.config.endpoint}/${this.bucket}/${path}`;
    } else {
      // Standard AWS S3
      return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${path}`;
    }
  }

  async delete(path: string): Promise<void> {
    await this.s3Client.send(new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: path,
    }));
  }

  async getSignedUrl(path: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: path,
    });
    return await getSignedUrl(this.s3Client, command, { expiresIn });
  }
}