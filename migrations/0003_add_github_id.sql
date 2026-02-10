-- Add github_id column for GitHub OAuth.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "github_id" text;

