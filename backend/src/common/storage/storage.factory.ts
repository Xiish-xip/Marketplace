import { StorageProvider } from './storage.interface';
import { LocalStorageProvider } from './local-storage';
import { CloudinaryStorageProvider } from './cloudinary-storage';
import { S3StorageProvider } from './s3-storage';
import { config } from '../config';

export function createStorageProvider(): StorageProvider {
  const provider = config.storageProvider || 'local';
  switch (provider) {
    case 'cloudinary': 
      return new CloudinaryStorageProvider();
    case 's3': 
      return new S3StorageProvider();
    case 'r2': 
      // R2 is S3-compatible, so we use S3StorageProvider with R2 endpoint
      return new S3StorageProvider({ endpoint: config.r2Endpoint });
    default: 
      return new LocalStorageProvider();
  }
}