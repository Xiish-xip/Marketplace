-- Dropship operations engines: fulfillment, inventory, pricing, logistics, returns, finance, and automation.

CREATE TABLE IF NOT EXISTS "dropship_fulfillments" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "orderId" TEXT,
  "supplierOrderId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "items" TEXT NOT NULL,
  "trackingNumber" TEXT,
  "carrierCode" TEXT,
  "estimatedDays" INTEGER,
  "shippedAt" TIMESTAMPTZ,
  "deliveredAt" TIMESTAMPTZ,
  "errorLog" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "dropship_fulfillments_orderId_status_idx"
  ON "dropship_fulfillments"("orderId", "status");

CREATE TABLE IF NOT EXISTS "dropship_sync_jobs" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "connectionId" TEXT,
  "supplierId" TEXT,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "totalItems" INTEGER NOT NULL DEFAULT 0,
  "syncedItems" INTEGER NOT NULL DEFAULT 0,
  "failedItems" INTEGER NOT NULL DEFAULT 0,
  "errors" TEXT,
  "startedAt" TIMESTAMPTZ,
  "completedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "dropship_sync_jobs_connectionId_type_status_idx"
  ON "dropship_sync_jobs"("connectionId", "type", "status");

CREATE TABLE IF NOT EXISTS "dropship_inventory_alerts" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "mappingId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "threshold" INTEGER,
  "notifiedAt" TIMESTAMPTZ,
  "resolvedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "dropship_inventory_alerts_mappingId_type_idx"
  ON "dropship_inventory_alerts"("mappingId", "type");

CREATE TABLE IF NOT EXISTS "dropship_back_in_stock" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "mappingId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "notified" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "dropship_back_in_stock_mappingId_userId_idx"
  ON "dropship_back_in_stock"("mappingId", "userId");

CREATE TABLE IF NOT EXISTS "dropship_pricing_rules" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "ruleType" TEXT NOT NULL,
  "value" DOUBLE PRECISION NOT NULL,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "appliesTo" TEXT NOT NULL,
  "appliesToId" TEXT,
  "scheduleStart" TIMESTAMPTZ,
  "scheduleEnd" TIMESTAMPTZ,
  "minStock" INTEGER,
  "maxStock" INTEGER,
  "customerGroups" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "dropship_pricing_rules_isActive_priority_idx"
  ON "dropship_pricing_rules"("isActive", "priority");

CREATE TABLE IF NOT EXISTS "dropship_price_changes" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "mappingId" TEXT NOT NULL,
  "oldPrice" DOUBLE PRECISION NOT NULL,
  "newPrice" DOUBLE PRECISION NOT NULL,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "dropship_price_changes_mappingId_createdAt_idx"
  ON "dropship_price_changes"("mappingId", "createdAt");

CREATE TABLE IF NOT EXISTS "dropship_shipping_zones" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "countries" TEXT NOT NULL,
  "baseRate" DOUBLE PRECISION NOT NULL,
  "perKgRate" DOUBLE PRECISION NOT NULL,
  "freeShippingThreshold" DOUBLE PRECISION,
  "estimatedMinDays" INTEGER NOT NULL,
  "estimatedMaxDays" INTEGER NOT NULL,
  "carriers" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "dropship_trackings" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "orderId" TEXT,
  "dropshipOrderId" TEXT,
  "carrierCode" TEXT NOT NULL,
  "trackingNumber" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "estimatedDelivery" TIMESTAMPTZ,
  "events" TEXT NOT NULL,
  "lastCheckedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "dropship_trackings_trackingNumber_carrierCode_idx"
  ON "dropship_trackings"("trackingNumber", "carrierCode");

CREATE TABLE IF NOT EXISTS "dropship_labels" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "dropshipOrderId" TEXT NOT NULL,
  "carrierCode" TEXT NOT NULL,
  "trackingNumber" TEXT NOT NULL,
  "labelUrl" TEXT NOT NULL,
  "cost" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "dropship_returns" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "orderId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "supplierId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "reason" TEXT NOT NULL,
  "description" TEXT,
  "evidence" TEXT,
  "refundAmount" DOUBLE PRECISION,
  "refundMethod" TEXT,
  "restockingFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "returnWindowDays" INTEGER,
  "adminNotes" TEXT,
  "disputeStatus" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "dropship_returns_orderId_userId_status_idx"
  ON "dropship_returns"("orderId", "userId", "status");

CREATE TABLE IF NOT EXISTS "dropship_return_items" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "returnId" TEXT NOT NULL,
  "mappingId" TEXT,
  "productTitle" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unitPrice" DOUBLE PRECISION NOT NULL,
  "refundAmount" DOUBLE PRECISION,
  "condition" TEXT,
  CONSTRAINT "dropship_return_items_returnId_fkey"
    FOREIGN KEY ("returnId") REFERENCES "dropship_returns"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "dropship_payouts" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "supplierId" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "fee" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "netAmount" DOUBLE PRECISION NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "method" TEXT NOT NULL,
  "reference" TEXT,
  "periodStart" TIMESTAMPTZ,
  "periodEnd" TIMESTAMPTZ,
  "paidAt" TIMESTAMPTZ,
  "errorLog" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "dropship_payouts_supplierId_status_idx"
  ON "dropship_payouts"("supplierId", "status");

CREATE TABLE IF NOT EXISTS "dropship_invoices" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "invoiceNumber" TEXT NOT NULL,
  "supplierId" TEXT NOT NULL,
  "orderId" TEXT,
  "items" TEXT NOT NULL,
  "subtotal" DOUBLE PRECISION NOT NULL,
  "shippingCost" DOUBLE PRECISION NOT NULL,
  "platformFee" DOUBLE PRECISION NOT NULL,
  "taxAmount" DOUBLE PRECISION NOT NULL,
  "totalAmount" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "dueDate" TIMESTAMPTZ,
  "paidAt" TIMESTAMPTZ,
  "pdfUrl" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "dropship_invoices_invoiceNumber_key"
  ON "dropship_invoices"("invoiceNumber");

CREATE INDEX IF NOT EXISTS "dropship_invoices_supplierId_status_idx"
  ON "dropship_invoices"("supplierId", "status");

CREATE TABLE IF NOT EXISTS "dropship_commissions" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "orderId" TEXT NOT NULL,
  "supplierId" TEXT,
  "amount" DOUBLE PRECISION NOT NULL,
  "percentage" DOUBLE PRECISION NOT NULL,
  "fixedFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "transactionFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalFee" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "dropship_commissions_orderId_idx"
  ON "dropship_commissions"("orderId");

CREATE TABLE IF NOT EXISTS "dropship_escrows" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "orderId" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "status" TEXT NOT NULL DEFAULT 'HELD',
  "heldAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "releasedAt" TIMESTAMPTZ,
  "autoReleaseAt" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS "dropship_tax_rules" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "country" TEXT NOT NULL,
  "region" TEXT,
  "rate" DOUBLE PRECISION NOT NULL,
  "type" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "dropship_tax_rules_country_region_idx"
  ON "dropship_tax_rules"("country", "region");

CREATE TABLE IF NOT EXISTS "dropship_automations" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "trigger" TEXT NOT NULL,
  "triggerConfig" TEXT NOT NULL,
  "actions" TEXT NOT NULL,
  "conditions" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lastRunAt" TIMESTAMPTZ,
  "runCount" INTEGER NOT NULL DEFAULT 0,
  "failCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "dropship_automations_trigger_isActive_idx"
  ON "dropship_automations"("trigger", "isActive");

CREATE TABLE IF NOT EXISTS "dropship_routing_rules" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "strategy" TEXT NOT NULL,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "conditions" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
