-- Migration: Update email templates and add CASCADE deletes
-- Date: 2026-02-10

-- ============================================
-- PART 1: Update SaveMedia to VidGrabber in email templates
-- ============================================

UPDATE email_templates
SET
  subject = 'Welcome to VidGrabber!',
  html_content = REPLACE(REPLACE(html_content, 'SaveMedia', 'VidGrabber'), 'savemedia.app', 'vidgrabber.online'),
  text_content = REPLACE(REPLACE(text_content, 'SaveMedia', 'VidGrabber'), 'savemedia.app', 'vidgrabber.online'),
  updated_at = CURRENT_TIMESTAMP
WHERE name = 'welcome';

UPDATE email_templates
SET
  html_content = REPLACE(REPLACE(html_content, 'SaveMedia', 'VidGrabber'), 'savemedia.app', 'vidgrabber.online'),
  text_content = REPLACE(REPLACE(text_content, 'SaveMedia', 'VidGrabber'), 'savemedia.app', 'vidgrabber.online'),
  updated_at = CURRENT_TIMESTAMP
WHERE name = 'forgot_password';

UPDATE email_templates
SET
  html_content = REPLACE(REPLACE(html_content, 'SaveMedia', 'VidGrabber'), 'savemedia.app', 'vidgrabber.online'),
  text_content = REPLACE(REPLACE(text_content, 'SaveMedia', 'VidGrabber'), 'savemedia.app', 'vidgrabber.online'),
  updated_at = CURRENT_TIMESTAMP
WHERE name = 'subscription';

-- ============================================
-- PART 2: Add CASCADE DELETE constraints
-- ============================================

-- Drop existing foreign keys that don't have CASCADE
-- Then recreate them with CASCADE DELETE

-- downloads.user_id → users.id
ALTER TABLE downloads DROP CONSTRAINT IF EXISTS downloads_user_id_users_id_fk;
ALTER TABLE downloads ADD CONSTRAINT downloads_user_id_users_id_fk
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- telegram_user_links.user_id → users.id
ALTER TABLE telegram_user_links DROP CONSTRAINT IF EXISTS telegram_user_links_user_id_users_id_fk;
ALTER TABLE telegram_user_links ADD CONSTRAINT telegram_user_links_user_id_users_id_fk
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- whatsapp_user_links.user_id → users.id
ALTER TABLE whatsapp_user_links DROP CONSTRAINT IF EXISTS whatsapp_user_links_user_id_users_id_fk;
ALTER TABLE whatsapp_user_links ADD CONSTRAINT whatsapp_user_links_user_id_users_id_fk
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- payments.user_id → users.id
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_user_id_users_id_fk;
ALTER TABLE payments ADD CONSTRAINT payments_user_id_users_id_fk
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- refunds.user_id → users.id
ALTER TABLE refunds DROP CONSTRAINT IF EXISTS refunds_user_id_users_id_fk;
ALTER TABLE refunds ADD CONSTRAINT refunds_user_id_users_id_fk
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- refunds.payment_id → payments.id
ALTER TABLE refunds DROP CONSTRAINT IF EXISTS refunds_payment_id_payments_id_fk;
ALTER TABLE refunds ADD CONSTRAINT refunds_payment_id_payments_id_fk
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE;

-- refunds.processed_by_admin_id → users.id (SET NULL instead of CASCADE)
ALTER TABLE refunds DROP CONSTRAINT IF EXISTS refunds_processed_by_admin_id_users_id_fk;
ALTER TABLE refunds ADD CONSTRAINT refunds_processed_by_admin_id_users_id_fk
  FOREIGN KEY (processed_by_admin_id) REFERENCES users(id) ON DELETE SET NULL;

-- contact_queries.assigned_to → users.id (SET NULL instead of CASCADE)
ALTER TABLE contact_queries DROP CONSTRAINT IF EXISTS contact_queries_assigned_to_users_id_fk;
ALTER TABLE contact_queries ADD CONSTRAINT contact_queries_assigned_to_users_id_fk
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL;

-- activity_logs.user_id → users.id (SET NULL instead of CASCADE - we want to keep logs)
ALTER TABLE activity_logs DROP CONSTRAINT IF EXISTS activity_logs_user_id_users_id_fk;
ALTER TABLE activity_logs ADD CONSTRAINT activity_logs_user_id_users_id_fk
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- blog_posts.author_id → users.id (SET NULL instead of CASCADE - keep posts even if author deleted)
ALTER TABLE blog_posts DROP CONSTRAINT IF EXISTS blog_posts_author_id_users_id_fk;
ALTER TABLE blog_posts ADD CONSTRAINT blog_posts_author_id_users_id_fk
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================
-- PART 3: Summary
-- ============================================

-- Cascade deleted when user is deleted:
-- ✅ downloads
-- ✅ telegram_user_links
-- ✅ whatsapp_user_links
-- ✅ payments
-- ✅ refunds (when user is deleted)
-- ✅ refunds (when payment is deleted)

-- Set to NULL when user is deleted (preserve records):
-- ✅ refunds.processed_by_admin_id
-- ✅ contact_queries.assigned_to
-- ✅ activity_logs.user_id (audit trail)
-- ✅ blog_posts.author_id (keep posts)

-- Already has CASCADE:
-- ✅ role_permissions (already configured)

-- Summary message
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE '✅ Email templates updated to VidGrabber branding';
  RAISE NOTICE '✅ CASCADE DELETE constraints added';
  RAISE NOTICE '✅ When user is deleted, their downloads, payments, and links are also deleted';
  RAISE NOTICE '✅ Activity logs and blog posts are preserved (author set to NULL)';
END $$;
