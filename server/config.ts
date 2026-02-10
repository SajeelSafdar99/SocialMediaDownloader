export type AppEnv = "development" | "production";

export function getEnv(): AppEnv {
  const raw = String(process.env.APP_ENV || process.env.NODE_ENV || "development").toLowerCase();
  return raw === "production" ? "production" : "development";
}

export function isDevMode(): boolean {
  return getEnv() === "development";
}

export function getAppName(): string {
  return process.env.APP_NAME || "SaveMedia";
}

export function getSupportEmail(): string {
  return process.env.SUPPORT_EMAIL || "support@example.com";
}

export function getAnonDailyLimit(): number {
  const v = Number(process.env.ANON_DAILY_DOWNLOAD_LIMIT || 5);
  return Number.isFinite(v) && v > 0 ? v : 5;
}

export function isPremiumEnforced(): boolean {
  // In development we bypass premium restrictions (as requested)
  // unless explicitly forced.
  if (isDevMode()) {
    return String(process.env.DEV_BYPASS_PREMIUM || "true").toLowerCase() !== "true";
  }
  return true;
}

export function getAdminConfig() {
  return {
    jwtSecret: process.env.ADMIN_JWT_SECRET || "change-this-secret-in-production",
    sessionExpiry: Number(process.env.ADMIN_SESSION_EXPIRY || 86400), // 24 hours default
    subdomain: process.env.ADMIN_SUBDOMAIN || "admin",
  };
}

