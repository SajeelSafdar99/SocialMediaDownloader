import { storage } from "../storage";

export type TelegramEntitlement = {
  allowed: boolean;
  remainingFree: number;
  limit: number;
  resetAt: Date;
  reason?: string;
};

function rollingResetAt(now = new Date()): Date {
  const days = Number(process.env.TELEGRAM_FREE_WINDOW_DAYS ?? 30);
  const windowDays = Number.isFinite(days) && days > 0 ? days : 30;
  return new Date(now.getTime() + windowDays * 24 * 60 * 60 * 1000);
}

export function getTelegramFreeLimit(): number {
  const v = Number(process.env.TELEGRAM_FREE_LIMIT ?? 7);
  return Number.isFinite(v) && v > 0 ? v : 7;
}

export async function assertTelegramCanDownload(telegramId: string): Promise<TelegramEntitlement> {
  const limit = getTelegramFreeLimit();
  const resetAt = rollingResetAt();

  const u = await storage.getOrCreateTelegramUser({ telegramId });
  if (u.isPremium) {
    return { allowed: true, remainingFree: limit, limit, resetAt };
  }

  // Rolling window reset
  const now = new Date();
  if (!u.freeResetAt || u.freeResetAt.getTime() < now.getTime()) {
    await storage.resetTelegramFreeUsage(telegramId, resetAt);
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
      reason: `Free limit reached (${limit}/${process.env.TELEGRAM_FREE_WINDOW_DAYS ?? 30}d).`,
    };
  }

  return { allowed: true, remainingFree: remaining, limit, resetAt: u.freeResetAt };
}

export async function consumeTelegramFreeDownload(telegramId: string): Promise<void> {
  const resetAt = rollingResetAt();
  await storage.incrementTelegramFreeUsage(telegramId, resetAt);
}
