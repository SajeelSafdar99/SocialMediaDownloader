-- Add safepay_merchant_key to users table
-- This stores the merchant_api_key returned when creating a SafePay customer
-- So we don't need to recreate the customer every time

ALTER TABLE users ADD COLUMN IF NOT EXISTS safepay_merchant_key TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_safepay_customer_id ON users(safepay_customer_id);
