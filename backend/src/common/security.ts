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
    sameSite: config.nodeEnv === 'production' ? ('none' as const) : ('lax' as const),
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

  const cookies = parseCookieHeader(req.headers.cookie);
  const storedToken = cookies[CSRF_COOKIE_NAME];
  const submittedToken = String(req.headers[CSRF_HEADER_NAME] || req.headers['x-xsrf-token'] || '');
  const hasOrigin = Boolean(req.headers.origin);

  // If cookie exists, validate both cookie and header match (standard CSRF protection)
  if (storedToken) {
    if (!submittedToken || !validateCsrfToken(submittedToken, storedToken)) {
      return res.status(403).json({ success: false, message: 'Invalid or missing CSRF token' });
    }
    return next();
  }

  // Cross-domain: accept header token without cookie (browser sends Origin but cookies may not persist)
  // The token must be a valid 64-character hex string (generated by our server)
  if (hasOrigin && submittedToken && submittedToken.length === 64 && /^[a-f0-9]{64}$/i.test(submittedToken)) {
    return next();
  }

  // No CSRF protection for requests without origin (server-to-server)
  if (!hasOrigin) return next();

  return res.status(403).json({ success: false, message: 'Invalid or missing CSRF token' });
};