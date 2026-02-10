-- Add SafePay customer ID to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS safepay_customer_id TEXT;
CREATE INDEX IF NOT EXISTS idx_users_safepay_customer_id ON users(safepay_customer_id);
