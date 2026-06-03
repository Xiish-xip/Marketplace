-- Migration: Add missing models referenced by service code
-- Adds models: analyticsEvent, dashboardWidget, reportTemplate, Asset, AssetGroup, AssetFamily,
-- businessAccount, bulkPricingTier, purchaseOrder, quoteRequest, badgeType, userBadge,
-- cacheConfig, queueMonitor, rateLimitRule, deliveryPerson, abandonedCart, exportJob,
-- payoutBatch, commissionRule, productBundle

BEGIN;

-- ── Analytics Models ──
CREATE TABLE IF NOT EXISTS "analytics_events" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'general',
  "label" TEXT,
  "value" DOUBLE PRECISION,
  "userId" TEXT,
  "sessionId" TEXT,
  "metadata" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_analytics_events_name" ON "analytics_events"("name", "createdAt");
CREATE INDEX IF NOT EXISTS "idx_analytics_events_category" ON "analytics_events"("category", "createdAt");

CREATE TABLE IF NOT EXISTS "dashboard_widgets" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "config" TEXT NOT NULL DEFAULT '{}',
  "size" TEXT NOT NULL DEFAULT 'medium',
  "position" INTEGER NOT NULL DEFAULT 0,
  "role" TEXT NOT NULL DEFAULT 'ADMIN',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_dashboard_widgets_role" ON "dashboard_widgets"("role", "isActive");

CREATE TABLE IF NOT EXISTS "report_templates" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "description" TEXT,
  "type" TEXT NOT NULL,
  "config" TEXT NOT NULL DEFAULT '{}',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_report_templates_type" ON "report_templates"("type", "isActive");

-- ── Asset Management Models ──
CREATE TABLE IF NOT EXISTS "asset_families" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "description" TEXT,
  "allowedTypes" TEXT DEFAULT '["image","video","document","audio","other"]',
  "maxFileSize" INTEGER DEFAULT 10485760,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_asset_families_slug" ON "asset_families"("slug", "isActive");

CREATE TABLE IF NOT EXISTS "asset_groups" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "familyId" TEXT NOT NULL REFERENCES "asset_families"("id") ON DELETE CASCADE,
  "description" TEXT,
  "coverImage" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "metadata" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_asset_groups_family" ON "asset_groups"("familyId", "isActive");

CREATE TABLE IF NOT EXISTS "assets" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "filename" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "url" TEXT NOT NULL,
  "thumbnailUrl" TEXT,
  "alt" TEXT,
  "description" TEXT,
  "width" INTEGER,
  "height" INTEGER,
  "duration" DOUBLE PRECISION,
  "familyId" TEXT REFERENCES "asset_families"("id") ON DELETE SET NULL,
  "groupId" TEXT REFERENCES "asset_groups"("id") ON DELETE SET NULL,
  "userId" TEXT,
  "metadata" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_assets_family" ON "assets"("familyId");
CREATE INDEX IF NOT EXISTS "idx_assets_group" ON "assets"("groupId");
CREATE INDEX IF NOT EXISTS "idx_assets_user" ON "assets"("userId");
CREATE INDEX IF NOT EXISTS "idx_assets_mime" ON "assets"("mimeType");

-- ── B2B Models ──
CREATE TABLE IF NOT EXISTS "business_accounts" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL UNIQUE,
  "companyName" TEXT NOT NULL,
  "companyRegNumber" TEXT,
  "taxId" TEXT,
  "industry" TEXT,
  "website" TEXT,
  "phone" TEXT,
  "address" TEXT,
  "creditLimit" DOUBLE PRECISION DEFAULT 0,
  "paymentTerms" TEXT DEFAULT 'NET30',
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "approvedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_business_accounts_user" ON "business_accounts"("userId");
CREATE INDEX IF NOT EXISTS "idx_business_accounts_status" ON "business_accounts"("status");

CREATE TABLE IF NOT EXISTS "bulk_pricing_tiers" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "productId" TEXT NOT NULL,
  "minQuantity" INTEGER NOT NULL,
  "maxQuantity" INTEGER,
  "price" DOUBLE PRECISION NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_bulk_pricing_tiers_product" ON "bulk_pricing_tiers"("productId", "isActive");

CREATE TABLE IF NOT EXISTS "purchase_orders" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "poNumber" TEXT NOT NULL UNIQUE,
  "businessAccountId" TEXT NOT NULL,
  "sellerId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "notes" TEXT,
  "approvedBy" TEXT,
  "approvedAt" TIMESTAMPTZ,
  "expectedDelivery" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_purchase_orders_business" ON "purchase_orders"("businessAccountId");
CREATE INDEX IF NOT EXISTS "idx_purchase_orders_status" ON "purchase_orders"("status");

CREATE TABLE IF NOT EXISTS "quote_requests" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "businessAccountId" TEXT NOT NULL,
  "sellerId" TEXT NOT NULL,
  "productId" TEXT,
  "quantity" INTEGER,
  "notes" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "respondedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_quote_requests_business" ON "quote_requests"("businessAccountId");
CREATE INDEX IF NOT EXISTS "idx_quote_requests_seller" ON "quote_requests"("sellerId", "status");

-- ── Badge Models ──
CREATE TABLE IF NOT EXISTS "badge_types" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL UNIQUE,
  "slug" TEXT NOT NULL UNIQUE,
  "description" TEXT,
  "icon" TEXT,
  "color" TEXT DEFAULT '#6B7280',
  "category" TEXT NOT NULL DEFAULT 'general',
  "criteria" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_badge_types_slug" ON "badge_types"("slug", "isActive");

CREATE TABLE IF NOT EXISTS "user_badges" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL,
  "badgeTypeId" TEXT NOT NULL REFERENCES "badge_types"("id") ON DELETE CASCADE,
  "awardedBy" TEXT,
  "reason" TEXT,
  "isVisible" BOOLEAN NOT NULL DEFAULT true,
  "awardedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE("userId", "badgeTypeId")
);
CREATE INDEX IF NOT EXISTS "idx_user_badges_user" ON "user_badges"("userId");
CREATE INDEX IF NOT EXISTS "idx_user_badges_badge" ON "user_badges"("badgeTypeId");

-- ── Cache & Queue Management ──
CREATE TABLE IF NOT EXISTS "cache_configs" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "key" TEXT NOT NULL UNIQUE,
  "value" TEXT NOT NULL DEFAULT '',
  "type" TEXT NOT NULL DEFAULT 'string',
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "queue_monitors" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'default',
  "status" TEXT NOT NULL DEFAULT 'IDLE',
  "pendingCount" INTEGER NOT NULL DEFAULT 0,
  "processingCount" INTEGER NOT NULL DEFAULT 0,
  "failedCount" INTEGER NOT NULL DEFAULT 0,
  "completedCount" INTEGER NOT NULL DEFAULT 0,
  "lastRunAt" TIMESTAMPTZ,
  "lastError" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "config" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "rate_limit_rules" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL UNIQUE,
  "route" TEXT NOT NULL,
  "method" TEXT DEFAULT 'ALL',
  "maxRequests" INTEGER NOT NULL DEFAULT 100,
  "windowMs" INTEGER NOT NULL DEFAULT 60000,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Delivery Person Model ──
CREATE TABLE IF NOT EXISTS "delivery_persons" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL UNIQUE,
  "phone" TEXT,
  "vehicleType" TEXT DEFAULT 'motorcycle',
  "vehicleReg" TEXT,
  "serviceZone" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isAvailable" BOOLEAN NOT NULL DEFAULT true,
  "rating" DOUBLE PRECISION DEFAULT 5.0,
  "totalDeliveries" INTEGER NOT NULL DEFAULT 0,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "lastLocationUpdate" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_delivery_persons_user" ON "delivery_persons"("userId");
CREATE INDEX IF NOT EXISTS "idx_delivery_persons_available" ON "delivery_persons"("isActive", "isAvailable");

-- ── Abandoned Cart Recovery ──
CREATE TABLE IF NOT EXISTS "abandoned_carts" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL,
  "cartData" TEXT NOT NULL DEFAULT '{}',
  "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "emailSent" BOOLEAN NOT NULL DEFAULT false,
  "emailSentAt" TIMESTAMPTZ,
  "recovered" BOOLEAN NOT NULL DEFAULT false,
  "recoveredAt" TIMESTAMPTZ,
  "recoveryOrderId" TEXT,
  "reminderCount" INTEGER NOT NULL DEFAULT 0,
  "lastReminderSentAt" TIMESTAMPTZ,
  "abandonedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_abandoned_carts_user" ON "abandoned_carts"("userId");
CREATE INDEX IF NOT EXISTS "idx_abandoned_carts_recovered" ON "abandoned_carts"("recovered", "emailSent");

-- ── Data Export Jobs ──
CREATE TABLE IF NOT EXISTS "export_jobs" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT,
  "type" TEXT NOT NULL,
  "format" TEXT NOT NULL DEFAULT 'csv',
  "filters" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "progress" INTEGER NOT NULL DEFAULT 0,
  "fileUrl" TEXT,
  "fileSize" INTEGER,
  "error" TEXT,
  "startedAt" TIMESTAMPTZ,
  "completedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_export_jobs_user" ON "export_jobs"("userId");
CREATE INDEX IF NOT EXISTS "idx_export_jobs_status" ON "export_jobs"("status");

-- ── Payout & Commission Models ──
CREATE TABLE IF NOT EXISTS "payout_batches" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalSellers" INTEGER NOT NULL DEFAULT 0,
  "processedCount" INTEGER NOT NULL DEFAULT 0,
  "failedCount" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT,
  "processedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_payout_batches_status" ON "payout_batches"("status");

CREATE TABLE IF NOT EXISTS "commission_rules" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'PERCENTAGE',
  "value" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "minAmount" DOUBLE PRECISION DEFAULT 0,
  "maxAmount" DOUBLE PRECISION,
  "categoryId" TEXT,
  "sellerId" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "startsAt" TIMESTAMPTZ,
  "expiresAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_commission_rules_active" ON "commission_rules"("isActive");

-- ── Product Bundle Model ──
CREATE TABLE IF NOT EXISTS "product_bundles" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "description" TEXT,
  "image" TEXT,
  "discountType" TEXT NOT NULL DEFAULT 'PERCENTAGE',
  "discountValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalPrice" DOUBLE PRECISION,
  "discountedPrice" DOUBLE PRECISION,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "startsAt" TIMESTAMPTZ,
  "expiresAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_product_bundles_slug" ON "product_bundles"("slug", "isActive");

CREATE TABLE IF NOT EXISTS "product_bundle_items" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "bundleId" TEXT NOT NULL REFERENCES "product_bundles"("id") ON DELETE CASCADE,
  "productId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  UNIQUE("bundleId", "productId")
);
CREATE INDEX IF NOT EXISTS "idx_product_bundle_items_bundle" ON "product_bundle_items"("bundleId");

COMMIT;