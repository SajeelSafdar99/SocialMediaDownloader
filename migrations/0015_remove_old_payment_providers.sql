-- Remove old payment provider fields from users table
ALTER TABLE users DROP COLUMN IF EXISTS stripe_customer_id;
ALTER TABLE users DROP COLUMN IF EXISTS stripe_subscription_id;
ALTER TABLE users DROP COLUMN IF EXISTS stripe_subscription_status;
ALTER TABLE users DROP COLUMN IF EXISTS stripe_current_period_end;

-- Note: payments and refunds tables already use generic 'provider' field
-- No changes needed there - just update provider values from old systems to 'safepay' manually if needed
