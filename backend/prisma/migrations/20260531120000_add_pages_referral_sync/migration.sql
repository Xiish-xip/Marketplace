-- Keep page and referral persistence aligned with the Prisma schema.

CREATE INDEX IF NOT EXISTS "static_pages_slug_status_category_isPublished_idx"
  ON "static_pages"("slug", "status", "category", "isPublished");

CREATE INDEX IF NOT EXISTS "referrals_referrerId_idx"
  ON "referrals"("referrerId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'referrals_referrerId_fkey'
  ) THEN
    ALTER TABLE "referrals"
      ADD CONSTRAINT "referrals_referrerId_fkey"
      FOREIGN KEY ("referrerId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
