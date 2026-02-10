-- Create blog posts table
CREATE TABLE IF NOT EXISTS blog_posts (
  id SERIAL PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  slug VARCHAR(500) NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT NOT NULL,
  featured_image TEXT,
  author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),

  -- SEO fields
  meta_title VARCHAR(500),
  meta_description TEXT,
  meta_keywords TEXT,
  canonical_url TEXT,

  -- Organization
  category_id INTEGER REFERENCES blog_categories(id) ON DELETE SET NULL,
  tags TEXT[],

  -- Analytics
  view_count INTEGER DEFAULT 0,

  -- Timestamps
  published_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create blog categories table
CREATE TABLE IF NOT EXISTS blog_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL UNIQUE,
  slug VARCHAR(200) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create contact queries table
CREATE TABLE IF NOT EXISTS contact_queries (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  email VARCHAR(200) NOT NULL,
  subject VARCHAR(500),
  message TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'spam')),
  admin_notes TEXT,
  assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  resource VARCHAR(100) NOT NULL, -- e.g., 'blog', 'users', 'analytics'
  action VARCHAR(50) NOT NULL, -- e.g., 'create', 'read', 'update', 'delete'
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create role_permissions junction table
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- Add role_id to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id INTEGER REFERENCES roles(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_author ON blog_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON blog_posts(category_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts(published_at);
CREATE INDEX IF NOT EXISTS idx_contact_queries_status ON contact_queries(status);
CREATE INDEX IF NOT EXISTS idx_contact_queries_email ON contact_queries(email);

-- Insert default roles
INSERT INTO roles (name, description) VALUES
  ('super_admin', 'Full access to all features'),
  ('admin', 'Access to most features except system settings'),
  ('editor', 'Can manage content (blogs, queries)'),
  ('viewer', 'Read-only access to analytics and reports')
ON CONFLICT (name) DO NOTHING;

-- Insert default permissions
INSERT INTO permissions (name, description, resource, action) VALUES
  -- Blog permissions
  ('blog.create', 'Create blog posts', 'blog', 'create'),
  ('blog.read', 'View blog posts', 'blog', 'read'),
  ('blog.update', 'Edit blog posts', 'blog', 'update'),
  ('blog.delete', 'Delete blog posts', 'blog', 'delete'),
  ('blog.publish', 'Publish blog posts', 'blog', 'publish'),

  -- User management permissions
  ('users.create', 'Create users', 'users', 'create'),
  ('users.read', 'View users', 'users', 'read'),
  ('users.update', 'Edit users', 'users', 'update'),
  ('users.delete', 'Delete users', 'users', 'delete'),
  ('users.assign_roles', 'Assign roles to users', 'users', 'assign_roles'),

  -- Analytics permissions
  ('analytics.read', 'View analytics', 'analytics', 'read'),

  -- Query permissions
  ('queries.read', 'View contact queries', 'queries', 'read'),
  ('queries.update', 'Update query status', 'queries', 'update'),
  ('queries.delete', 'Delete queries', 'queries', 'delete'),

  -- Transaction permissions
  ('transactions.read', 'View transactions', 'transactions', 'read'),

  -- Refund permissions
  ('refunds.read', 'View refunds', 'refunds', 'read'),
  ('refunds.create', 'Create refunds', 'refunds', 'create'),
  ('refunds.process', 'Process refunds', 'refunds', 'process')
ON CONFLICT (name) DO NOTHING;

-- Grant all permissions to super_admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'super_admin'
ON CONFLICT DO NOTHING;

-- Grant most permissions to admin (except user deletion)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin'
  AND p.name NOT IN ('users.delete', 'users.assign_roles')
ON CONFLICT DO NOTHING;

-- Grant content permissions to editor
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'editor'
  AND p.resource IN ('blog', 'queries')
ON CONFLICT DO NOTHING;

-- Grant read permissions to viewer
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'viewer'
  AND p.action = 'read'
ON CONFLICT DO NOTHING;
