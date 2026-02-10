CREATE TABLE IF NOT EXISTS "telegram_users" (
  "id" serial PRIMARY KEY,
  "telegram_id" text NOT NULL UNIQUE,
  "username" text,
  "is_premium" boolean DEFAULT false,
  "free_used_count" integer DEFAULT 0,
  "free_reset_at" timestamp,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "IDX_telegram_users_telegram_id" ON "telegram_users" ("telegram_id");

