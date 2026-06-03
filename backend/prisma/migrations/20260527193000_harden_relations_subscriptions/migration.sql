-- Harden marketplace relations and add subscription persistence.

-- Category children should be removed with the parent instead of orphaned.
ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "categories_parentId_fkey";
ALTER TABLE "categories"
  ADD CONSTRAINT "categories_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "categories"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Shipping profiles can belong to sellers and be assigned to products.
ALTER TABLE "shipping_profiles" ADD COLUMN IF NOT EXISTS "sellerId" TEXT;
ALTER TABLE "shipping_profiles" ADD COLUMN IF NOT EXISTS "rules" TEXT;
CREATE INDEX IF NOT EXISTS "shipping_profiles_sellerId_isActive_idx" ON "shipping_profiles"("sellerId", "isActive");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'shipping_profiles_sellerId_fkey'
  ) THEN
    ALTER TABLE "shipping_profiles"
      ADD CONSTRAINT "shipping_profiles_sellerId_fkey"
      FOREIGN KEY ("sellerId") REFERENCES "sellers"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "shippingProfileId" TEXT;
CREATE INDEX IF NOT EXISTS "products_shippingProfileId_idx" ON "products"("shippingProfileId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_shippingProfileId_fkey'
  ) THEN
    ALTER TABLE "products"
      ADD CONSTRAINT "products_shippingProfileId_fkey"
      FOREIGN KEY ("shippingProfileId") REFERENCES "shipping_profiles"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Product questions now have real user/product relationships.
ALTER TABLE "product_questions" ADD COLUMN IF NOT EXISTS "isApproved" BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS "product_questions_userId_idx" ON "product_questions"("userId");
CREATE INDEX IF NOT EXISTS "product_questions_answeredBy_idx" ON "product_questions"("answeredBy");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'product_questions_productId_fkey'
  ) THEN
    ALTER TABLE "product_questions"
      ADD CONSTRAINT "product_questions_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "products"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'product_questions_userId_fkey'
  ) THEN
    ALTER TABLE "product_questions"
      ADD CONSTRAINT "product_questions_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'product_questions_answeredBy_fkey'
  ) THEN
    ALTER TABLE "product_questions"
      ADD CONSTRAINT "product_questions_answeredBy_fkey"
      FOREIGN KEY ("answeredBy") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- B2B accounts and documents now enforce ownership.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'business_accounts_userId_fkey'
  ) THEN
    ALTER TABLE "business_accounts"
      ADD CONSTRAINT "business_accounts_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'purchase_orders_businessAccountId_fkey'
  ) THEN
    ALTER TABLE "purchase_orders"
      ADD CONSTRAINT "purchase_orders_businessAccountId_fkey"
      FOREIGN KEY ("businessAccountId") REFERENCES "business_accounts"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'quote_requests_businessAccountId_fkey'
  ) THEN
    ALTER TABLE "quote_requests"
      ADD CONSTRAINT "quote_requests_businessAccountId_fkey"
      FOREIGN KEY ("businessAccountId") REFERENCES "business_accounts"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Subscription plans and user subscriptions back the customer/admin UI.
CREATE TABLE IF NOT EXISTS "subscription_plans" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'TZS',
  "interval" TEXT NOT NULL DEFAULT 'MONTHLY',
  "trialDays" INTEGER NOT NULL DEFAULT 0,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "features" TEXT,
  "benefits" TEXT,
  "metadata" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "subscription_plans_slug_key" ON "subscription_plans"("slug");
CREATE INDEX IF NOT EXISTS "subscription_plans_slug_isActive_sortOrder_idx" ON "subscription_plans"("slug", "isActive", "sortOrder");

CREATE TABLE IF NOT EXISTS "subscriptions" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "provider" TEXT,
  "externalId" TEXT,
  "currentPeriodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "currentPeriodEnd" TIMESTAMP(3),
  "trialEndsAt" TIMESTAMP(3),
  "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
  "canceledAt" TIMESTAMP(3),
  "metadata" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_provider_externalId_key" ON "subscriptions"("provider", "externalId");
CREATE INDEX IF NOT EXISTS "subscriptions_userId_status_idx" ON "subscriptions"("userId", "status");
CREATE INDEX IF NOT EXISTS "subscriptions_planId_status_idx" ON "subscriptions"("planId", "status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_userId_fkey'
  ) THEN
    ALTER TABLE "subscriptions"
      ADD CONSTRAINT "subscriptions_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_planId_fkey'
  ) THEN
    ALTER TABLE "subscriptions"
      ADD CONSTRAINT "subscriptions_planId_fkey"
      FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
