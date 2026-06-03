export interface UploadOptions {
  generateThumbnail?: boolean;
  optimize?: boolean;
  width?: number;
  height?: number;
  quality?: number;
}

export interface UploadResult {
  url: string;
  thumbnailUrl?: string;
  optimizedUrl?: string;
  width?: number;
  height?: number;
  size: number;
  path: string;
}

export interface StorageProvider {
  upload(
    buffer: Buffer,
    filename: string,
    mimeType: string,
    options?: UploadOptions
  ): Promise<UploadResult>;
  getUrl(path: string): string;
  delete(path: string): Promise<void>;
  getSignedUrl?(path: string, expiresIn?: number): Promise<string>;
}