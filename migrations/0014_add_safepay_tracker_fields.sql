-- Add SafePay customer reference and saved instruments to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS safepay_customer_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS safepay_instrument_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS safepay_instrument_saved_at TIMESTAMP;

-- Add index for quick lookups
CREATE INDEX IF NOT EXISTS idx_users_safepay_customer ON users(safepay_customer_id);

-- Add SafePay tracker data to payments table metadata
-- (Already using JSON metadata field, no schema changes needed)

COMMENT ON COLUMN users.safepay_customer_id IS 'SafePay customer reference ID (e.g., user_123)';
COMMENT ON COLUMN users.safepay_instrument_token IS 'Saved payment instrument token for MIT';
COMMENT ON COLUMN users.safepay_instrument_saved_at IS 'When the payment instrument was saved';
