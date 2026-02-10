import { storage } from "../storage";

export type WhatsAppEntitlement = {
  allowed: boolean;
  remainingFree: number;
  limit: number;
  resetAt: Date;
  reason?: string;
};

function rollingResetAt(now = new Date()): Date {
  // Default to 1 day for reset window (was 30 days)
  const days = Number(process.env.WHATSAPP_FREE_WINDOW_DAYS ?? 1);
  const windowDays = Number.isFinite(days) && days > 0 ? days : 1;
  return new Date(now.getTime() + windowDays * 24 * 60 * 60 * 1000);
}

export function getWhatsAppFreeLimit(): number {
  const v = Number(process.env.WHATSAPP_FREE_LIMIT ?? 7);
  return Number.isFinite(v) && v > 0 ? v : 7;
}

export async function assertWhatsAppCanDownload(whatsappId: string): Promise<WhatsAppEntitlement> {
  const limit = getWhatsAppFreeLimit();
  const resetAt = rollingResetAt();

  const u = await storage.getOrCreateWhatsAppUser({ whatsappId });
  if (u.isPremium) {
    return { allowed: true, remainingFree: limit, limit, resetAt };
  }

  // In dev mode with DEV_BYPASS_PREMIUM=true, bypass download limits for testing
  const { isPremiumEnforced } = await import("../config");
  if (!isPremiumEnforced()) {
    // Bypass limits in dev mode - allow unlimited downloads for testing
    return { allowed: true, remainingFree: limit, limit, resetAt };
  }

  // Rolling window reset
  const now = new Date();
  if (!u.freeResetAt || u.freeResetAt.getTime() < now.getTime()) {
    await storage.resetWhatsAppFreeUsage(whatsappId, resetAt);
    return { allowed: true, remainingFree: limit, limit, resetAt };
  }

  const used = u.freeUsedCount ?? 0;
  const remaining = Math.max(0, limit - used);

  if (remaining <= 0) {
    return {
      allowed: false,
      remainingFree: 0,
      limit,
      resetAt: u.freeResetAt,
      reason: `Free limit reached (${limit}/${process.env.WHATSAPP_FREE_WINDOW_DAYS ?? 1}d).`,
    };
  }

  return { allowed: true, remainingFree: remaining, limit, resetAt: u.freeResetAt };
}

export async function consumeWhatsAppFreeDownload(whatsappId: string): Promise<void> {
  const resetAt = rollingResetAt();
  await storage.incrementWhatsAppFreeUsage(whatsappId, resetAt);
}
