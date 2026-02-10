-- Ensure the session table exists with the name expected by the runtime.
-- Some environments/defaults (and older configs) expect a singular "session" table.

DO $$
BEGIN
  -- If "sessions" exists but "session" doesn't, rename it.
  IF to_regclass('public.sessions') IS NOT NULL AND to_regclass('public.session') IS NULL THEN
    ALTER TABLE "sessions" RENAME TO "session";
  END IF;

  -- If neither exists, create "session".
  IF to_regclass('public.session') IS NULL THEN
    CREATE TABLE "session" (
      "sid" varchar PRIMARY KEY,
      "sess" jsonb NOT NULL,
      "expire" timestamp NOT NULL
    );
    CREATE INDEX "IDX_sessions_expire" ON "session" ("expire");
  END IF;
END $$;

