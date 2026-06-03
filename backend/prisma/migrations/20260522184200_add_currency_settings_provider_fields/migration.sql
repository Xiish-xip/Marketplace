ALTER TABLE currency_settings
  ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS api_key TEXT,
  ADD COLUMN IF NOT EXISTS geo_detection_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS geolocation_provider TEXT DEFAULT 'ipapi';
