import crypto from 'crypto';
import { RequestHandler } from 'express';
import { config } from './config';
import { logger } from './logger';

// ── CSRF Protection ──
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function validateCsrfToken(token: string, storedToken: string): boolean {
  if (!token || !storedToken) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(storedToken));
  } catch {
    return false;
  }
}

// ── Input Sanitization / XSS Protection ──
// Build entity map using hex codes to prevent auto-formatter from collapsing entities
const AMP = '\x26amp;';
const LT = '\x26lt;';
const GT = '\x26gt;';
const QUOT = '\x26quot;';
const HX27 = '\x26#x27;';
const HX2F = '\x26#x2F;';
const HX5C = '\x26#x5C;';
const HX60 = '\x26#96;';

const HTML_ENTITIES: Record<string, string> = {
  '&': AMP,
  '<': LT,
  '>': GT,
  '"': QUOT,
  "'": HX27,
  '/': HX2F,
  '\\': HX5C,
  '`': HX60,
};

export function sanitizeHtml(input: string): string {
  if (!input) return input;
  let result = input;
  for (const [char, entity] of Object.entries(HTML_ENTITIES)) {
    const escaped = char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(escaped, 'g'), entity);
  }
  return result;
}

const SENSITIVE_SANITIZE_KEYS = new Set([
  'password',
  'passwordhash',
  'currentpassword',
  'newpassword',
  'confirmpassword',
  'token',
  'accesstoken',
  'refreshtoken',
  'apikey',
  'api_key',
  'secret',
  'clientsecret',
  'authorization',
  'baseurl',
  'baseUrl',
  'url',
  'callbackurl',
  'callbackUrl',
  'webhookurl',
  'webhookUrl',
]);

function isPlainObject(value: unknown): value is Record<string, any> {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function sanitizeValue(value: any, key = ''): any {
  // For sensitive keys like passwords, tokens - still sanitize HTML/XSS but don't expose
  // NOTE: We DON'T skip sanitization. We sanitize ALL string values for XSS protection.
  // Sensitive keys get sanitized too - this prevents XSS payloads being stored in password fields etc.
  if (typeof value === 'string') return sanitizeHtml(value);
  if (Array.isArray(value)) return value.map((item) => sanitizeValue(item));
  if (isPlainObject(value)) return sanitizeObject(value);
  return value;
}

export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    sanitized[key] = sanitizeValue(value, key);
  }
  return sanitized as T;
}

export const sanitizeRequestInput: RequestHandler = (req, _res, next) => {
  try {
    if (req.is('multipart/form-data')) return next();
    if (isPlainObject(req.body)) req.body = sanitizeObject(req.body);
    if (isPlainObject(req.query)) req.query = sanitizeObject(req.query as Record<string, any>);
  } catch (error) {
    logger.warn('Request sanitization failed', { error: (error as Error).message, path: req.path });
  }
  next();
};

const CSRF_COOKIE_NAME = 'marketplace_csrf';
const CSRF_HEADER_NAME = 'x-csrf-token';

function parseCookieHeader(cookieHeader = ''): Record<string, string> {
  return cookieHeader.split(';').reduce<Record<string, string>>((cookies, part) => {
    const [rawName, ...rawValue] = part.trim().split('=');
    if (!rawName) return cookies;
    cookies[rawName] = decodeURIComponent(rawValue.join('=') || '');
    return cookies;
  }, {});
}

function csrfCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: config.nodeEnv === 'production',
    path: '/',
    maxAge: 24 * 60 * 60 * 1000,
  };
}

export const csrfTokenHandler: RequestHandler = (req, res) => {
  const token = generateCsrfToken();
  res.cookie(CSRF_COOKIE_NAME, token, csrfCookieOptions());
  res.setHeader('X-CSRF-Token', token);
  res.json({ success: true, data: { token } });
};

export const csrfProtection: RequestHandler = (req, res, next) => {
  if (!config.csrfEnabled) return next();
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (
    req.path.startsWith('/payments/webhook') ||
    req.path.startsWith('/webhook-events')
  ) {
    return next();
  }

  // Only skip CSRF if we can confirm this is a valid API/backend call (not browser)
  // We require BOTH: no browser-like signals AND a valid JWT Bearer token
  const hasValidBearerAuth = (() => {
    const authHeader = req.headers.authorization;
    if (typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) return false;
    const token = authHeader.split(' ')[1];
    if (!token || token.length < 20) return false; // Minimum length check for non-malformed tokens
    try {
      const jwt = require('jsonwebtoken');
      jwt.verify(token, config.jwtSecret);
      return true;
    } catch {
      return false;
    }
  })();

  const cookies = parseCookieHeader(req.headers.cookie);
  const storedToken = cookies[CSRF_COOKIE_NAME];
  const submittedToken = String(req.headers[CSRF_HEADER_NAME] || req.headers['x-xsrf-token'] || '');
  const looksLikeBrowserRequest = Boolean(req.headers.origin || req.headers.referer || storedToken);

  // Skip CSRF only for non-browser API calls with a valid JWT
  if (!looksLikeBrowserRequest && hasValidBearerAuth) return next();

  if (!storedToken || !submittedToken || !validateCsrfToken(submittedToken, storedToken)) {
    return res.status(403).json({ success: false, message: 'Invalid or missing CSRF token' });
  }

  next();
};

// ── Password Strength Validation ──
export interface PasswordStrengthResult {
  valid: boolean;
  score: number; // 0-100
  errors: string[];
  suggestions: string[];
}

export function validatePasswordStrength(password: string): PasswordStrengthResult {
  const errors: string[] = [];
  const suggestions: string[] = [];
  let score = 0;

  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters');
  } else if (password.length >= 12) {
    score += 25;
  } else {
    score += 15;
  }

  if (password.length > 128) {
    errors.push('Password must be at most 128 characters');
  }

  if (/[A-Z]/.test(password)) score += 15;
  else suggestions.push('Add an uppercase letter');

  if (/[a-z]/.test(password)) score += 15;
  else suggestions.push('Add a lowercase letter');

  if (/\d/.test(password)) score += 15;
  else suggestions.push('Add a digit');

  if (/[^A-Za-z0-9]/.test(password)) score += 15;
  else suggestions.push('Add a special character');

  if (/(.)\1{2,}/.test(password)) {
    score -= 10;
    suggestions.push('Avoid repeated characters (e.g., "aaa")');
  }

  // Check against common patterns
  const commonPatterns = [
    'password', '123456', 'qwerty', 'admin', 'letmein', 'welcome',
    'monkey', 'dragon', 'master', 'abc123', 'passwrd',
  ];
  if (commonPatterns.some(p => password.toLowerCase().includes(p))) {
    score -= 15;
    errors.push('Password contains a common pattern');
  }

  // Check keyboard sequences
  const keyboardSequences = ['qwerty', 'asdfgh', 'zxcvbn', 'qwertz', 'azerty'];
  if (keyboardSequences.some(s => password.toLowerCase().includes(s))) {
    score -= 10;
    errors.push('Password contains a keyboard sequence');
  }

  score = Math.max(0, Math.min(100, score));

  return {
    valid: errors.length === 0 && score >= 60,
    score,
    errors,
    suggestions,
  };
}

// ── 2FA / TOTP ──
import { authenticator } from 'otplib';

export function generateTwoFactorSecret(email?: string): { secret: string; otpauthUrl: string } {
  const secret = authenticator.generateSecret();
  const userEmail = email || process.env.ADMIN_EMAIL || 'user@marketplace.com';
  const otpauthUrl = authenticator.keyuri(userEmail, 'MarketPlace', secret);
  return { secret, otpauthUrl };
}

export function verifyTwoFactorToken(secret: string, token: string): boolean {
  try {
    return authenticator.verify({ token, secret });
  } catch {
    return false;
  }
}

export function generateBackupCodes(count: number = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
  }
  return codes;
}

// ── Fraud Detection (IP tracking, velocity checks) ──
interface RequestRecord {
  count: number;
  firstRequest: Date;
  lastRequest: Date;
  endpoints: Map<string, number>;
  userAgents: Set<string>;
}

const MAX_TRACKED_IPS = 50000; // Hard upper limit to prevent memory exhaustion

// Periodic cleanup counter to avoid scanning entire map on every request
let requestTrackingCleanupCounter = 0;
const requestTracking = new Map<string, RequestRecord>();

function cleanupStaleRecords(): void {
  const threshold = new Date(Date.now() - 3600000); // 1 hour - shorter window
  let deletedCount = 0;
  for (const [key, value] of requestTracking.entries()) {
    if (value.lastRequest < threshold || deletedCount > 5000) {
      requestTracking.delete(key);
      deletedCount++;
    }
  }
}

export function trackRequest(ip: string, endpoint: string, userAgent: string): {
  suspicious: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  const now = new Date();

  // Enforce hard limit on total entries
  if (requestTracking.size >= MAX_TRACKED_IPS && !requestTracking.has(ip)) {
    cleanupStaleRecords();
    // If still over limit after cleanup, skip tracking
    if (requestTracking.size >= MAX_TRACKED_IPS) {
      return { suspicious: false, reasons: [] };
    }
  }

  let record = requestTracking.get(ip);
  if (!record) {
    record = {
      count: 0,
      firstRequest: now,
      lastRequest: now,
      endpoints: new Map(),
      userAgents: new Set(),
    };
    requestTracking.set(ip, record);
  }

  record.count++;
  record.lastRequest = now;
  record.endpoints.set(endpoint, (record.endpoints.get(endpoint) || 0) + 1);
  record.userAgents.add(userAgent);

  // Periodic cleanup - run every 100 requests to keep map bounded
  requestTrackingCleanupCounter++;
  if (requestTrackingCleanupCounter >= 100) {
    requestTrackingCleanupCounter = 0;
    cleanupStaleRecords();
  }

  // Velocity check: more than 100 requests in 1 minute
  const timeDiff = (now.getTime() - record.firstRequest.getTime()) / 1000;
  if (timeDiff < 60 && record.count > 100) {
    reasons.push('Rate velocity exceeded');
  }

  // Multiple user agents from same IP
  if (record.userAgents.size > 3) {
    reasons.push('Multiple user agents detected');
  }

  // Rapid fire on auth endpoints
  const authHits = (record.endpoints.get('/api/auth/login') || 0) +
    (record.endpoints.get('/api/auth/register') || 0);
  if (authHits > 20 && timeDiff < 300) {
    reasons.push('Rapid authentication attempts');
  }

  return {
    suspicious: reasons.length > 0,
    reasons,
  };
}

// ── File Upload Validation ──
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
];

const ALLOWED_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.webp', '.gif',
  '.pdf', '.csv', '.xlsx', '.xls',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function validateFileUpload(file: Express.Multer.File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` };
  }

  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return { valid: false, error: `File type "${file.mimetype}" is not allowed` };
  }

  const ext = '.' + file.originalname.split('.').pop()?.toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return { valid: false, error: `File extension "${ext}" is not allowed` };
  }

  return { valid: true };
}

// ── GDPR Compliance ──
export function generateDataExport(userData: Record<string, any>): Buffer {
  const exportData = {
    exportedAt: new Date().toISOString(),
    platform: 'MarketPlace',
    data: userData,
  };
  return Buffer.from(JSON.stringify(exportData, null, 2));
}

export function anonymizeEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const masked = local.charAt(0) + '***' + local.charAt(local.length - 1);
  return `${masked}@${domain}`;
}

export function generateCookieConsentHtml(): string {
  return `
    <div id="cookie-consent" style="position:fixed;bottom:0;left:0;right:0;background:#1f2937;color:#fff;padding:16px 24px;z-index:9999;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
      <p style="margin:0;font-size:14px;">We use cookies to improve your experience. By continuing, you agree to our use of cookies.</p>
      <div style="display:flex;gap:8px;">
        <button type="button" data-cookie-consent="all" style="background:#ea580c;color:white;border:none;padding:8px 20px;border-radius:6px;cursor:pointer;font-weight:600;">Accept All</button>
        <button type="button" data-cookie-consent="necessary" style="background:transparent;color:#d1d5db;border:1px solid #6b7280;padding:8px 20px;border-radius:6px;cursor:pointer;">Necessary Only</button>
      </div>
    </div>
  `;
}
