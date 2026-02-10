-- Add premium subscription expiration tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS premium_expires_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_provider VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_plan_id VARCHAR(255);

-- Add index for efficient queries on premium expiration
CREATE INDEX IF NOT EXISTS idx_users_premium_expires_at ON users(premium_expires_at);
