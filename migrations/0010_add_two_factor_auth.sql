-- Add 2FA fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_backup_codes TEXT[];
ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_secret_key TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_two_factor_enabled ON users(two_factor_enabled);
