-- Add geolocation and third-party provider support to currency_settings
ALTER TABLE currency_settings 
  ADD COLUMN IF NOT EXISTS provider VARCHAR(100) DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS api_key VARCHAR(500),
  ADD COLUMN IF NOT EXISTS geo_detection_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS geolocation_provider VARCHAR(100) DEFAULT 'ipapi';