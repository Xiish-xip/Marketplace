import dotenv from 'dotenv';
import path from 'path';

// Try multiple .env locations to support both development and Docker/production
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(__dirname, '../../', '.env') });
dotenv.config({ path: path.resolve('/app', '.env') }); // Docker default working directory
dotenv.config({ path: path.resolve('/app/backend', '.env') }); // Docker with backend subdirectory

function requireEnv(name: string, defaultValue?: string): string {
  const value = process.env[name] || defaultValue;
  if (!value) {
    throw new Error(`CRITICAL: Environment variable ${name} is not set. Application cannot start.`);
  }
  return value;
}

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  frontendUrls: process.env.FRONTEND_URLS ? process.env.FRONTEND_URLS.split(',').map(u => u.trim()) : [],
  backendUrl: process.env.BACKEND_URL || `http://localhost:${process.env.PORT || '3000'}`,

  // Database
  databaseUrl: requireEnv('DATABASE_URL'),

  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  // Meilisearch
  meilisearchUrl: process.env.MEILISEARCH_URL || 'http://localhost:7700',
  meilisearchKey: process.env.MEILISEARCH_KEY || '',

  // JWT — MUST be explicitly set in production
  jwtSecret: requireEnv('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  jwtRefreshSecret: requireEnv('JWT_REFRESH_SECRET'),
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',

  // OTP
  otpProvider: process.env.OTP_PROVIDER || 'mock',
  smtpHost: process.env.SMTP_HOST || '',
  smtpFrom: process.env.SMTP_FROM || 'no-reply@marketplace.local',
  smsProviderUrl: process.env.SMS_PROVIDER_URL || '',
  smsProviderKey: process.env.SMS_PROVIDER_KEY || '',

  // SendGrid (Email)
  sendgridApiKey: process.env.SENDGRID_API_KEY || '',

  // Twilio (SMS)
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || '',
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || '',
  twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER || '',

  // Cloudinary (Image CDN)
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || '',
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || '',

  // Storage
  storageProvider: process.env.STORAGE_PROVIDER || 'local',
  r2Endpoint: process.env.R2_ENDPOINT || '',

  // Payments
  paymentWebhookSecret: process.env.PAYMENT_WEBHOOK_SECRET || '',

  // Upload
  uploadDir: path.resolve(__dirname, '../../', process.env.UPLOAD_DIR || 'uploads'),
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '15728640', 10),

  // Default Admin (seed must receive these explicitly)
  adminEmail: process.env.ADMIN_EMAIL || '',
  adminPassword: process.env.ADMIN_PASSWORD || '',

  // Browser mutation protection
  csrfEnabled: process.env.CSRF_ENABLED !== 'false',

  // Sentry (Error Tracking)
  sentryDsn: process.env.SENTRY_DSN || '',

  // Google Analytics
  gaTrackingId: process.env.GA_TRACKING_ID || '',
};
