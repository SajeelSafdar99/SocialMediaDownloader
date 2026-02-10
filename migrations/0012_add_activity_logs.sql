-- Create activity logs table for comprehensive logging
CREATE TABLE IF NOT EXISTS activity_logs (
  id SERIAL PRIMARY KEY,

  -- Who did it
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  username VARCHAR(200),
  user_email VARCHAR(200),
  user_role VARCHAR(50),

  -- What happened
  action VARCHAR(100) NOT NULL,
  resource VARCHAR(100) NOT NULL,
  resource_id INTEGER,
  description TEXT,

  -- Context
  method VARCHAR(10),
  endpoint VARCHAR(500),
  ip_address VARCHAR(50),
  user_agent TEXT,

  -- Request/Response data
  request_body JSONB,
  response_status INTEGER,

  -- Metadata
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  duration_ms INTEGER,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource ON activity_logs(resource);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_success ON activity_logs(success);
CREATE INDEX IF NOT EXISTS idx_activity_logs_username ON activity_logs(username);
