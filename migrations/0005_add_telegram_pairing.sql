CREATE TABLE IF NOT EXISTS "telegram_link_tokens" (
  "id" serial PRIMARY KEY,
  "token" text NOT NULL UNIQUE,
  "telegram_id" text NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "expires_at" timestamp NOT NULL,
  "consumed_at" timestamp
);

CREATE INDEX IF NOT EXISTS "IDX_telegram_link_tokens_token" ON "telegram_link_tokens" ("token");
CREATE INDEX IF NOT EXISTS "IDX_telegram_link_tokens_telegram_id" ON "telegram_link_tokens" ("telegram_id");

CREATE TABLE IF NOT EXISTS "telegram_user_links" (
  "id" serial PRIMARY KEY,
  "telegram_id" text NOT NULL UNIQUE,
  "user_id" integer NOT NULL REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "IDX_telegram_user_links_user_id" ON "telegram_user_links" ("user_id");

