-- Product sourcing / third-party provider integrations

CREATE TABLE IF NOT EXISTS "provider_adapters" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "baseUrl" TEXT,
  "methods" TEXT NOT NULL DEFAULT '[]',
  "configSchema" TEXT,
  "isEnabled" BOOLEAN NOT NULL DEFAULT true,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "provider_adapters_provider_isEnabled_idx"
  ON "provider_adapters"("provider", "isEnabled");

CREATE TABLE IF NOT EXISTS "provider_connections" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "adapterId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "credentials" TEXT,
  "config" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isVerified" BOOLEAN NOT NULL DEFAULT false,
  "lastSyncAt" TIMESTAMPTZ,
  "lastError" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "provider_connections_adapterId_fkey"
    FOREIGN KEY ("adapterId") REFERENCES "provider_adapters"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "provider_connections_adapterId_isActive_idx"
  ON "provider_connections"("adapterId", "isActive");

CREATE TABLE IF NOT EXISTS "dropship_suppliers" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "storeUrl" TEXT,
  "apiEndpoint" TEXT,
  "apiKey" TEXT,
  "apiSecret" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "isVerified" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "metadata" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "dropship_suppliers_provider_isActive_idx"
  ON "dropship_suppliers"("provider", "isActive");

CREATE TABLE IF NOT EXISTS "dropship_product_mappings" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "supplierId" TEXT NOT NULL,
  "localProductId" TEXT,
  "supplierSku" TEXT NOT NULL,
  "supplierProductId" TEXT,
  "supplierTitle" TEXT NOT NULL,
  "supplierPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "supplierCurrency" TEXT NOT NULL DEFAULT 'USD',
  "costPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "sellingPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "quantity" INTEGER NOT NULL DEFAULT 0,
  "supplierUrl" TEXT,
  "imageUrl" TEXT,
  "category" TEXT,
  "specifications" TEXT,
  "autoSync" BOOLEAN NOT NULL DEFAULT true,
  "lastSyncedAt" TIMESTAMPTZ,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "dropship_product_mappings_supplierId_fkey"
    FOREIGN KEY ("supplierId") REFERENCES "dropship_suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "dropship_product_mappings_supplierSku_key"
  ON "dropship_product_mappings"("supplierSku");
CREATE INDEX IF NOT EXISTS "dropship_product_mappings_supplierId_isActive_idx"
  ON "dropship_product_mappings"("supplierId", "isActive");

CREATE TABLE IF NOT EXISTS "dropship_orders" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "supplierId" TEXT NOT NULL,
  "localOrderId" TEXT,
  "supplierOrderId" TEXT NOT NULL,
  "items" TEXT NOT NULL,
  "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "shippingCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "estimatedDays" INTEGER,
  "trackingUrl" TEXT,
  "errorLog" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "dropship_orders_supplierId_fkey"
    FOREIGN KEY ("supplierId") REFERENCES "dropship_suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "dropship_orders_supplierId_status_idx"
  ON "dropship_orders"("supplierId", "status");

CREATE TABLE IF NOT EXISTS "dropship_import_jobs" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "supplierId" TEXT,
  "connectionId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "totalItems" INTEGER NOT NULL DEFAULT 0,
  "imported" INTEGER NOT NULL DEFAULT 0,
  "failed" INTEGER NOT NULL DEFAULT 0,
  "errors" TEXT,
  "mappingTemplate" TEXT,
  "startedAt" TIMESTAMPTZ,
  "completedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "dropship_import_jobs_supplierId_fkey"
    FOREIGN KEY ("supplierId") REFERENCES "dropship_suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "dropship_import_jobs_connectionId_fkey"
    FOREIGN KEY ("connectionId") REFERENCES "provider_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "dropship_import_jobs_supplierId_status_idx"
  ON "dropship_import_jobs"("supplierId", "status");
