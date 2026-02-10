-- Migration: Add subscription cancellation tracking fields
-- Created: 2026-02-10
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS subscription_cancelled_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS subscription_cancel_at_period_end BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS safepay_subscription_token VARCHAR(255);
-- Update existing users with active subscriptions
COMMENT ON COLUMN users.subscription_cancelled_at IS 'When the subscription was cancelled (null if active)';
COMMENT ON COLUMN users.subscription_cancel_at_period_end IS 'Whether subscription will cancel at period end';
COMMENT ON COLUMN users.safepay_subscription_token IS 'SafePay subscription token (sub_xxx) for cancellation/management';
