import crypto from 'crypto';
import { AppError } from './errors';
import { logger } from './logger';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

// In production, ENCRYPTION_KEY is REQUIRED. Crash immediately if missing.
if (process.env.NODE_ENV === 'production' && !ENCRYPTION_KEY) {
  logger.error('CRITICAL: ENCRYPTION_KEY environment variable is not set. Refusing to start.');
  process.exit(1);
}

if (!ENCRYPTION_KEY) {
  logger.warn('WARNING: ENCRYPTION_KEY not set. Using development fallback (NOT suitable for production).');
}

// Use a 32-byte key (AES-256). Always hash the key to get exactly 32 bytes.
function getKey(): Buffer {
  const keyMaterial = ENCRYPTION_KEY || 'development-fallback-key-change-in-production';
  return crypto.createHash('sha256').update(keyMaterial).digest();
}

const GCM_IV_LENGTH = 12;
const GCM_AUTH_TAG_LENGTH = 16;
const LEGACY_CBC_IV_LENGTH = 16;
const GCM_PREFIX = 'v2';

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a versioned string containing IV, auth tag, and ciphertext.
 */
export function encrypt(text: string): string {
  if (!text) return '';

  const key = getKey();
  const iv = crypto.randomBytes(GCM_IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv, { authTagLength: GCM_AUTH_TAG_LENGTH });

  const ciphertext = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    GCM_PREFIX,
    iv.toString('base64'),
    authTag.toString('base64'),
    ciphertext.toString('base64'),
  ].join(':');
}

/**
 * Decrypt an encrypted string back to plaintext.
 * Supports the current AES-256-GCM format and the legacy AES-256-CBC format.
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return '';

  try {
    const key = getKey();
    if (encryptedText.startsWith(`${GCM_PREFIX}:`)) {
      const [, ivPart, authTagPart, ciphertextPart] = encryptedText.split(':');
      if (!ivPart || !authTagPart || !ciphertextPart) {
        throw new Error('Invalid encrypted data');
      }

      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        key,
        Buffer.from(ivPart, 'base64'),
        { authTagLength: GCM_AUTH_TAG_LENGTH },
      );
      decipher.setAuthTag(Buffer.from(authTagPart, 'base64'));

      const decrypted = Buffer.concat([
        decipher.update(Buffer.from(ciphertextPart, 'base64')),
        decipher.final(),
      ]);
      return decrypted.toString('utf8');
    }

    const combined = Buffer.from(encryptedText, 'base64');

    if (combined.length < LEGACY_CBC_IV_LENGTH + 1) {
      throw new Error('Invalid encrypted data');
    }

    const iv = combined.slice(0, LEGACY_CBC_IV_LENGTH);
    const ciphertext = combined.slice(LEGACY_CBC_IV_LENGTH);

    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

    let decrypted = decipher.update(ciphertext, undefined, 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error: any) {
    throw new AppError(500, `Decryption failed: ${error.message}`);
  }
}

/**
 * Hash a value using SHA-256 (useful for fingerprinting keys without storing them).
 */
export function hash(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/**
 * Generate a secure random token.
 */
export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}
