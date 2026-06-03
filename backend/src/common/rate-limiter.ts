import rateLimit from 'express-rate-limit';
import { config } from './config';

const rateLimitMessage = {
  success: false,
  message: 'Too many requests, please try again later',
};

function requestPath(req: any): string {
  return String(req.originalUrl || req.url || '').split('?')[0];
}

function hasDedicatedLimiter(req: any): boolean {
  const path = requestPath(req);
  if (path.startsWith('/api/auth')) return true;
  if (path === '/api/ai' || path.startsWith('/api/ai/')) return true;
  if (path === '/api/ai-executor' || path.startsWith('/api/ai-executor/')) return true;
  if (path === '/api/chat' || path.startsWith('/api/chat/')) return true;
  if (req.method === 'POST' && (path === '/api/orders' || path === '/api/reviews')) return true;
  return false;
}

export const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.nodeEnv === 'development' ? 2000 : 100,
  skip: (req) => (config.nodeEnv === 'development' && req.method === 'GET') || hasDedicatedLimiter(req),
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage,
});

export const authApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.nodeEnv === 'development' ? 200 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage,
});

export const authLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.nodeEnv === 'development' ? 20 : 5,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many failed login attempts, please try again later' },
});

export const writeApiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: config.nodeEnv === 'development' ? 100 : 30,
  skip: hasDedicatedLimiter,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage,
});

export const aiApiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: config.nodeEnv === 'development' ? 60 : 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many AI requests, please slow down' },
});

export const orderCreateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: config.nodeEnv === 'development' ? 20 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many orders placed, please slow down' },
});

export const reviewCreateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: config.nodeEnv === 'development' ? 20 : 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many reviews, please slow down' },
});
