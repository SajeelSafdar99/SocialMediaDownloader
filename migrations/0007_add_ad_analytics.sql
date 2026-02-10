-- Ad analytics tracking table
CREATE TABLE IF NOT EXISTS "ad_events" (
  "id" serial PRIMARY KEY,
  "type" varchar(20) NOT NULL, -- 'impression', 'click', 'view'
  "ad_slot" text NOT NULL,
  "ad_id" text,
  "revenue" numeric(10, 4) DEFAULT 0,
  "currency" varchar(3) DEFAULT 'USD',
  "user_id" integer REFERENCES "users"("id"),
  "ip_address" text,
  "user_agent" text,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "IDX_ad_events_type" ON "ad_events" ("type");
CREATE INDEX IF NOT EXISTS "IDX_ad_events_ad_slot" ON "ad_events" ("ad_slot");
CREATE INDEX IF NOT EXISTS "IDX_ad_events_created_at" ON "ad_events" ("created_at");
CREATE INDEX IF NOT EXISTS "IDX_ad_events_user_id" ON "ad_events" ("user_id");
