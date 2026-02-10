CREATE TABLE IF NOT EXISTS "whatsapp_users" (
  "id" serial PRIMARY KEY,
  "whatsapp_id" text NOT NULL UNIQUE,
  "username" text,
  "is_premium" boolean DEFAULT false,
  "free_used_count" integer DEFAULT 0,
  "free_reset_at" timestamp,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "IDX_whatsapp_users_whatsapp_id" ON "whatsapp_users" ("whatsapp_id");

CREATE TABLE IF NOT EXISTS "whatsapp_link_tokens" (
  "id" serial PRIMARY KEY,
  "token" text NOT NULL UNIQUE,
  "whatsapp_id" text NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "expires_at" timestamp NOT NULL,
  "consumed_at" timestamp
);

CREATE INDEX IF NOT EXISTS "IDX_whatsapp_link_tokens_token" ON "whatsapp_link_tokens" ("token");
CREATE INDEX IF NOT EXISTS "IDX_whatsapp_link_tokens_whatsapp_id" ON "whatsapp_link_tokens" ("whatsapp_id");

CREATE TABLE IF NOT EXISTS "whatsapp_user_links" (
  "id" serial PRIMARY KEY,
  "whatsapp_id" text NOT NULL UNIQUE,
  "user_id" integer NOT NULL REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "IDX_whatsapp_user_links_user_id" ON "whatsapp_user_links" ("user_id");
