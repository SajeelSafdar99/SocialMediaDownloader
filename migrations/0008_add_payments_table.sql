CREATE TABLE IF NOT EXISTS "payments" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users"("id"),
  "provider" varchar NOT NULL,
  "amount" integer NOT NULL,
  "currency" varchar NOT NULL DEFAULT 'USD',
  "status" varchar NOT NULL DEFAULT 'pending',
  "transaction_id" text NOT NULL UNIQUE,
  "provider_transaction_id" text,
  "metadata" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  "completed_at" timestamp
);

CREATE INDEX IF NOT EXISTS "IDX_payments_user_id" ON "payments" ("user_id");
CREATE INDEX IF NOT EXISTS "IDX_payments_transaction_id" ON "payments" ("transaction_id");
CREATE INDEX IF NOT EXISTS "IDX_payments_provider_transaction_id" ON "payments" ("provider_transaction_id");
CREATE INDEX IF NOT EXISTS "IDX_payments_status" ON "payments" ("status");
CREATE INDEX IF NOT EXISTS "IDX_payments_created_at" ON "payments" ("created_at");
