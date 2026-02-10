import dotenv from "dotenv";
import path from "path";

let loaded = false;

/**
 * Loads env vars from the repo root `.env` (and optional `.env.local`).
 * Safe to call multiple times.
 */
export function loadEnv() {
  if (loaded) return;
  loaded = true;

  dotenv.config({ path: path.resolve(process.cwd(), ".env") });
  dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true });
}

