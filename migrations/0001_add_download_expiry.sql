-- Adds file lifecycle columns so we can keep download history but purge files.

ALTER TABLE "downloads"
  ADD COLUMN IF NOT EXISTS "expires_at" timestamp,
  ADD COLUMN IF NOT EXISTS "file_deleted_at" timestamp;

