-- Add role column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user' NOT NULL;

-- Create index on role for faster queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Create refunds table
CREATE TABLE IF NOT EXISTS refunds (
  id SERIAL PRIMARY KEY,
  payment_id INTEGER NOT NULL REFERENCES payments(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  amount INTEGER NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  reason TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  provider VARCHAR(50) NOT NULL,
  provider_refund_id TEXT UNIQUE,
  processed_by_admin_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Create indexes for refunds table
CREATE INDEX IF NOT EXISTS idx_refunds_payment_id ON refunds(payment_id);
CREATE INDEX IF NOT EXISTS idx_refunds_user_id ON refunds(user_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON refunds(status);
CREATE INDEX IF NOT EXISTS idx_refunds_created_at ON refunds(created_at);

-- Add refunded_at column to payments table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMP;

-- Create index on refunded_at for faster queries
CREATE INDEX IF NOT EXISTS idx_payments_refunded_at ON payments(refunded_at);

-- Add admin notes column to users for admin use
ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_notes TEXT;
