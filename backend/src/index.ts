import express from 'express';
import cors from 'cors';
import http from 'http';
import helmet from 'helmet';
import morgan from 'morgan';
import fs from 'fs/promises';
import { config } from './common/config';
import { errorHandler } from './common/middleware';
import { logger } from './common/logger';
import { prisma } from './common/prisma';
import { initSocketServer } from './common/socket';
import { csrfProtection, csrfTokenHandler, sanitizeRequestInput } from './common/security';
import { aiApiLimiter, authApiLimiter, generalApiLimiter, writeApiLimiter, orderCreateLimiter, reviewCreateLimiter } from './common/rate-limiter';
import { auditLogFromRequest } from './common/audit-logger';

// Import routes
import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/user/user.routes';
import categoryRoutes from './modules/category/category.routes';
import productRoutes from './modules/product/product.routes';
import cartRoutes from './modules/cart/cart.routes';
import orderRoutes from './modules/order/order.routes';
import sellerRoutes from './modules/seller/seller.routes';
import brandRoutes from './modules/brand/brand.routes';
import reviewRoutes from './modules/review/review.routes';
import paymentRoutes from './modules/payment/payment.routes';
import shippingRoutes from './modules/shipping/shipping.routes';
import promotionRoutes from './modules/promotion/promotion.routes';
import notificationRoutes from './modules/notification/notification.routes';
import returnRoutes from './modules/return/return.routes';
import adminRoutes from './modules/admin/admin.routes';
import configRoutes from './modules/dynamic-config/dynamic-config.routes';
import wishlistRoutes from './modules/wishlist/wishlist.routes';
import uploadRoutes from './modules/upload/upload.routes';
import rfqRoutes from './modules/rfq/rfq.routes';
import automationRoutes from './modules/automation/automation.routes';
import messagingRoutes from './modules/messaging/messaging.routes';
import ticketRoutes from './modules/ticket/ticket.routes';
import blogRoutes from './modules/blog/blog.routes';
import giftcardRoutes from './modules/giftcard/giftcard.routes';
import announcementRoutes from './modules/announcement/announcement.routes';
import apiKeyRoutes from './modules/api-key/api-key.routes';
import openapiRoutes from './modules/openapi/openapi.routes';
import pluginRoutes from './modules/plugin/plugin.routes';
import webhookRoutes from './modules/webhook/webhook.routes';
import aiRoutes from './modules/ai/ai.routes';
import chatRoutes from './modules/chat/chat.routes';
import workflowRoutes from './modules/workflow/workflow.routes';
import voiceRoutes from './modules/voice/voice.routes';
import aiToolRegistryRoutes from './modules/ai/ai-tool-registry.routes';
import aiExecutorRoutes from './modules/ai/ai-executor.routes';
import pageBuilderRoutes from './modules/page-builder/page-builder.routes';
import pagesRoutes from './modules/pages/pages.routes';
import { assetsRoutes } from './modules/assets/assets.routes';
import { automationWorker } from './modules/automation/automation.worker';
import { aiToolRegistry } from './modules/ai/ai-tool-registry.service';
import { registerAiToolHandlers } from './common/ai-tool-registration';

// New module imports
import currenciesRoutes from './modules/currencies/currencies.routes';
import deliveryRoutes from './modules/delivery/delivery.routes';
import searchRoutes from './modules/search/search.routes';
import cacheRoutes from './modules/cache/cache.routes';
import dropshipRoutes from './modules/dropship/dropship.routes';
import subscriptionsRoutes from './modules/subscriptions/subscriptions.routes';
import loyaltyRoutes from './modules/loyalty/loyalty.routes';
import b2bRoutes from './modules/b2b/b2b.routes';
import analyticsRoutes from './modules/analytics/analytics.routes';
import providersRoutes from './modules/providers/providers.routes';
import syncRoutes from './modules/sync/sync.routes';
import badgeRoutes from './modules/badges/badges.routes';
import translationsRoutes from './modules/translations/translations.routes';
import campaignRoutes from './modules/promotion/campaign.routes';
import referralsRoutes from './modules/referrals/referrals.routes';
import cjDropshippingRoutes from './modules/cj-dropshipping/cj-dropshipping.routes';
import siteSettingsRoutes from './modules/site-settings/site-settings.routes';
import supplierPortalRoutes from './modules/supplier-portal/supplier-portal.routes';

const app = express();

function escapeSvgText(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char] || char));
}

// ── Middleware ──
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  hsts: config.nodeEnv === 'production'
    ? { maxAge: 31536000, includeSubDomains: true, preload: true }
    : false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      scriptSrc: ["'self'"],
      scriptSrcAttr: ["'none'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      connectSrc: ["'self'", 'ws:', 'wss:', 'https://*.cloudinary.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      objectSrc: ["'none'"],
      frameSrc: ["'self'"],
      ...(config.nodeEnv === 'production' ? { upgradeInsecureRequests: [] } : {}),
    },
  },
}));
app.use((_req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self), payment=(self)');
  next();
});
const allowedOrigins = config.nodeEnv === 'production'
  ? [...config.frontendUrls, config.frontendUrl].filter(Boolean)
  : [/^https?:\/\/(localhost|127\.0\.0\.1):\d+$/, /^https?:\/\/192\.168\.\d+\.\d+:\d+$/];

app.use(cors({
  origin: (origin, callback) => {
    if (config.nodeEnv === 'production') {
      if (!origin || !allowedOrigins.some((o: any) => (typeof o === 'string' ? o === origin : o.test(origin)))) {
        return callback(null, false);
      }
      return callback(null, true);
    } else {
      if (!origin || allowedOrigins.some((o: any) => o.test(origin))) {
        return callback(null, true);
      }
      return callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-XSRF-Token'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
}));
app.use(express.json({
  limit: '10mb',
  verify: (req, _res, buf) => {
    (req as any).rawBody = buf.toString('utf8');
  },
}));
app.use(express.urlencoded({ extended: true }));
app.use(sanitizeRequestInput);
app.use(morgan('dev', {
  stream: { write: (message: string) => logger.info(message.trim()) },
}));

// Rate limiting — apply write-specific rate limits to mutation endpoints
app.use('/api/auth', authApiLimiter);
app.use(['/api/ai', '/api/ai-executor', '/api/chat'], aiApiLimiter);
app.use('/api', generalApiLimiter);

// CSRF token generation endpoint (no CSRF protection needed, but rate limited)
app.get('/api/csrf-token', csrfTokenHandler);

// CSRF protection — applied BEFORE write rate limiter to avoid wasting budget on invalid requests
app.use('/api', csrfProtection);

// Write-specific rate limits — applied after CSRF check
app.use('/api', (req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return writeApiLimiter(req, res, next);
  }
  next();
});

// Apply orderCreateLimiter to order creation endpoint
app.use('/api/orders', (req, _res, next) => {
  if (req.method === 'POST') return orderCreateLimiter(req, _res, next);
  next();
});

// Apply reviewCreateLimiter to review creation endpoint
app.use('/api/reviews', (req, _res, next) => {
  if (req.method === 'POST') return reviewCreateLimiter(req, _res, next);
  next();
});

// Static files (uploads)
app.get(['/uploads', '/uploads/'], async (_req, res, next) => {
  try {
    const entries = await fs.readdir(config.uploadDir, { withFileTypes: true }).catch(() => []);
    res.json({
      success: true,
      message: 'Upload storage is available',
      basePath: '/uploads',
      uploadEndpoint: '/api/upload/images',
      files: entries
        .filter((entry) => entry.isFile())
        .map((entry) => ({ name: entry.name, url: `/uploads/${entry.name}` })),
      folders: entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => ({ name: entry.name, url: `/uploads/${entry.name}/` })),
    });
  } catch (error) {
    next(error);
  }
});
app.use('/uploads', express.static(config.uploadDir, {
  maxAge: '30d',
  etag: true,
  fallthrough: true,
  setHeaders: (res, filePath) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (filePath.includes(`${config.uploadDir}/assets/`) || filePath.includes(`${config.uploadDir}\\assets\\`)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  },
}));
app.get('/uploads/products/:filename', (req, res) => {
  const label = escapeSvgText(req.params.filename
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/[^\w .]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
    .replace(/\b\w/g, (char) => char.toUpperCase()) || 'Product');

  res
    .setHeader('Content-Security-Policy', "default-src 'none'; img-src data:; style-src 'unsafe-inline'")
    .type('image/svg+xml')
    .send(`
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#fff7ed"/>
          <stop offset="100%" stop-color="#fed7aa"/>
        </linearGradient>
      </defs>
      <rect width="800" height="800" fill="url(#bg)"/>
      <rect x="120" y="120" width="560" height="560" rx="36" fill="#ffffff" opacity="0.86"/>
      <circle cx="400" cy="330" r="96" fill="#ea580c" opacity="0.16"/>
      <path d="M310 450h180l-28-92h-124l-28 92zm42-126h96l-18-44h-60l-18 44z" fill="#ea580c"/>
      <text x="400" y="550" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#7c2d12">${label}</text>
      <text x="400" y="595" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" fill="#9a3412">Product image unavailable</text>
    </svg>
  `);
});

// Reusable health check handler
async function healthHandler(_req: express.Request, res: express.Response) {
  let dbStatus = 'unknown';
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch {
    dbStatus = 'disconnected';
  }
  res.json({
    success: dbStatus === 'connected',
    message: dbStatus === 'connected' ? 'MarketPlace API is running' : 'Database connection failed',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    database: dbStatus,
    apiVersion: 'v1',
  });
}

// Health check with database connectivity verification - both /api/health and /api/v1/health
app.get('/api/health', healthHandler);
app.get('/api/v1/health', healthHandler);

// ── Audit Logging Middleware (event-based, avoids fragile res.json monkey-patch) ──
// Capture safe request details up-front and emit audit logs on response finish
app.use((req, res, next) => {
  // Only audit API routes
  if (!req.path.startsWith('/api/')) return next();

  // Capture a sanitized subset of the request body for audit details
  try {
    const detailsObj: any = {};
    if (req.body && typeof req.body === 'object') {
      const safeKeys = Object.keys(req.body).filter(
        (k) => !['password', 'passwordHash', 'apiKey', 'token', 'secret', 'authorization'].includes(k.toLowerCase()),
      );
      safeKeys.forEach((k) => { detailsObj[k] = (req.body as any)[k]; });
    }
    (res as any).locals.__audit_safe_body = Object.keys(detailsObj).length > 0 ? detailsObj : null;
  } catch (err) {
    (res as any).locals.__audit_safe_body = null;
  }

  // On response finish, evaluate whether to write an audit entry
  res.on('finish', () => {
    try {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const method = req.method;
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
          const action = method === 'POST' ? 'CREATE' : (method === 'DELETE' ? 'DELETE' : 'UPDATE');

          const pathParts = req.path.split('/').filter(Boolean);
          let entity = 'SYSTEM';
          if (pathParts.length >= 2) {
            const rawEntity = pathParts[1].toUpperCase().replace(/-/g, '_').replace(/s$/, '');
            const validEntities = ['USER', 'PRODUCT', 'ORDER', 'PAYMENT', 'SETTINGS', 'ROLE', 'AI', 'CACHE', 'TRANSLATION', 'SELLER', 'CATEGORY', 'PROMOTION', 'REVIEW', 'CART', 'BRAND', 'BLOG', 'ANNOUNCEMENT', 'TICKET', 'PLUGIN', 'API_KEY', 'GIFTCARD', 'WORKFLOW', 'AUDIT', 'SYSTEM', 'CURRENC', 'DELIVERY', 'SEARCH', 'B2B', 'DROPSHIP', 'SUBSCRIPTION', 'LOYALTY', 'ANALYTIC', 'PROVIDER', 'SYNC', 'BADGE', 'CAMPAIGN', 'REFERRAL', 'SITE_SETTING', 'SUPPLIER_PORTAL', 'ASSET', 'PAGE_BUILDER', 'PAGE', 'VOICE', 'MESSAGE', 'RFQ', 'RETURN', 'SHIPPING', 'NOTIFICATION', 'CONFIG', 'WISHLIST', 'EXPORT'];
            entity = validEntities.includes(rawEntity) ? rawEntity : 'SETTINGS';
          }

          const entityId = pathParts.length >= 3 ? pathParts[pathParts.length - 1] : null;
          const detailsObj = (res as any).locals.__audit_safe_body || null;
          const details = detailsObj ? JSON.stringify(detailsObj).slice(0, 2000) : null;

          auditLogFromRequest(req, action as any, entity as any, entityId, details).catch(() => {});
        }
      }
    } catch (err) {
      // swallow errors to not affect response lifecycle
    }
  });

  next();
});

/**
 * Mount routes at both /api and /api/v1 for backwards compatibility.
 * This allows clients to use either prefix, with /api/v1 being the canonical path.
 */
function mountApiRoutes(basePath: string) {
  // Core routes
  app.use(`${basePath}/auth`, authRoutes);
  app.use(`${basePath}/users`, userRoutes);
  app.use(`${basePath}/categories`, categoryRoutes);
  app.use(`${basePath}/products`, productRoutes);
  app.use(`${basePath}/cart`, cartRoutes);
  app.use(`${basePath}/orders`, orderRoutes);
  app.use(`${basePath}/sellers`, sellerRoutes);
  app.use(`${basePath}/brands`, brandRoutes);
  app.use(`${basePath}/reviews`, reviewRoutes);
  app.use(`${basePath}/payments`, paymentRoutes);
  app.use(`${basePath}/shipping`, shippingRoutes);
  app.use(`${basePath}/promotions`, promotionRoutes);
  app.use(`${basePath}/notifications`, notificationRoutes);
  app.use(`${basePath}/returns`, returnRoutes);
  app.use(`${basePath}/admin`, adminRoutes);
  app.use(`${basePath}/config`, configRoutes);
  app.use(`${basePath}/wishlist`, wishlistRoutes);
  app.use(`${basePath}/upload`, uploadRoutes);
  app.use(`${basePath}/rfq`, rfqRoutes);
  app.use(`${basePath}/automation`, automationRoutes);
  app.use(`${basePath}/messaging`, messagingRoutes);
  app.use(`${basePath}/tickets`, ticketRoutes);
  app.use(`${basePath}/blog`, blogRoutes);
  app.use(`${basePath}/giftcards`, giftcardRoutes);
  app.use(`${basePath}/announcements`, announcementRoutes);
  app.use(`${basePath}/api-keys`, apiKeyRoutes);
  app.use(`${basePath}/openapi`, openapiRoutes);
  app.use(`${basePath}/plugins`, pluginRoutes);
  app.use(`${basePath}/webhook-events`, webhookRoutes);
  app.use(`${basePath}/ai`, aiRoutes);
  app.use(`${basePath}/chat`, chatRoutes);
  app.use(`${basePath}/workflow`, workflowRoutes);
  app.use(`${basePath}/voice`, voiceRoutes);
  app.use(`${basePath}/ai-tools`, aiToolRegistryRoutes);
  app.use(`${basePath}/ai-executor`, aiExecutorRoutes);
  app.use(`${basePath}/page-builder`, pageBuilderRoutes);
  app.use(`${basePath}/pages`, pagesRoutes);
  app.use(`${basePath}/assets`, assetsRoutes);

  // New module routes
  app.use(`${basePath}/currencies`, currenciesRoutes);
  app.use(`${basePath}/delivery`, deliveryRoutes);
  app.use(`${basePath}/search`, searchRoutes);
  app.use(`${basePath}/cache`, cacheRoutes);
  app.use(`${basePath}/dropship`, dropshipRoutes);
  app.use(`${basePath}/subscriptions`, subscriptionsRoutes);
  app.use(`${basePath}/loyalty`, loyaltyRoutes);
  app.use(`${basePath}/b2b`, b2bRoutes);
  app.use(`${basePath}/analytics`, analyticsRoutes);
  app.use(`${basePath}/providers`, providersRoutes);
  app.use(`${basePath}/sync`, syncRoutes);
  app.use(`${basePath}/badges`, badgeRoutes);
  app.use(`${basePath}/translations`, translationsRoutes);
  app.use(`${basePath}/campaigns`, campaignRoutes);
  app.use(`${basePath}/referrals`, referralsRoutes);
  app.use(`${basePath}/site-settings`, siteSettingsRoutes);
  app.use(`${basePath}/cj-dropshipping`, cjDropshippingRoutes);
  app.use(`${basePath}/supplier-portal`, supplierPortalRoutes);
}

// Mount all API routes at both /api (backwards compatibility) and /api/v1 (canonical)
mountApiRoutes('/api/v1');
mountApiRoutes('/api');

// ── 404 Handler ──
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── Error Handler ──
app.use(errorHandler);

// ── Start Server ──
let server: http.Server;

async function start() {
  try {
    logger.info('=== SERVER STARTUP ===');

    await prisma.$connect();
    logger.info('Connected to database');

    // Register AI tool built-in handlers (extracted to separate file for maintainability)
    await registerAiToolHandlers();

    // Initialize currency auto-refresh scheduler
    try {
      const { currenciesService } = await import('./modules/currencies/currencies.service');
      await currenciesService.initAutoRefresh();
    } catch (error) {
      logger.error('Failed to init currency auto-refresh', { error: (error as Error).message });
    }

    // Seed confirmation flags on all built-in AI tools
    try {
      const { TOOL_DEFINITIONS } = await import('./modules/chat/ai-chat.service');
      await aiToolRegistry.seedBuiltinTools(TOOL_DEFINITIONS);
      logger.info('AI tool registry seeded');
    } catch (err) {
      logger.warn('AI tool registry seed skipped', { error: (err instanceof Error) ? err.message : 'Unknown error' });
    }

    // Create HTTP server and attach Express
    server = http.createServer(app);

    // Initialize WebSocket server
    initSocketServer(server);

    // Start listening
    server.listen(config.port, () => {
      logger.info(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
      logger.info(`Health check: http://localhost:${config.port}/api/health`);
      logger.info(`API Docs: http://localhost:${config.port}/api/openapi/docs`);
    });

    // Start automation worker
    automationWorker.start(60000);
    logger.info('Automation worker started with 60s interval');
  } catch (error) {
    logger.error('Failed to start server', { error: (error as Error).message });
    process.exit(1);
  }
}

// Only start the server when this file is executed directly (not when imported by tests)
if (require.main === module) {
  start();
}

// Export app for testing
export { app, start };

// Handle graceful shutdown
let shuttingDown = false;

async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`${signal} received. Shutting down gracefully...`);

  try {
    // Stop automation worker
    automationWorker.stop();

    // Close the HTTP server first to stop accepting new requests
    if (server) {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          logger.warn('Forced shutdown after timeout');
          resolve();
        }, 10000);
        server.close((err) => {
          clearTimeout(timeout);
          if (err) reject(err);
          else resolve();
        });
      });
    }
  } catch (err) {
    logger.error('Error closing HTTP server', { error: (err as Error).message });
  }

  await prisma.$disconnect();
  logger.info('Shutdown complete');
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
