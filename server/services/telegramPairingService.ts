import crypto from "crypto";
import { storage } from "../storage";

export function generatePairToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}

function tokenTtlMs(): number {
  const raw = Number(process.env.TELEGRAM_LINK_TOKEN_TTL_MINUTES ?? 15);
  const minutes = Number.isFinite(raw) && raw > 0 ? raw : 15;
  return minutes * 60 * 1000;
}

export async function createTelegramPairLink(opts: {
  telegramId: string;
  baseUrl: string;
}): Promise<{ url: string; token: string; expiresAt: Date }> {
  const token = generatePairToken();
  const expiresAt = new Date(Date.now() + tokenTtlMs());

  await storage.createTelegramLinkToken({ telegramId: opts.telegramId, token, expiresAt });

  const base = opts.baseUrl.replace(/\/$/, "");
  const url = `${base}/api/telegram/link/complete?token=${encodeURIComponent(token)}`;
  return { url, token, expiresAt };
}

export async function completeTelegramPairing(opts: {
  token: string;
  userId: number;
}): Promise<{ ok: boolean; telegramId?: string; reason?: string }> {
  const consumed = await storage.consumeTelegramLinkToken({ token: opts.token });
  if (!consumed) return { ok: false, reason: "Invalid or expired token" };

  const telegramId = String((consumed as any).telegramId);
  await storage.upsertTelegramUserLink({ telegramId, userId: opts.userId });

  // Mirror premium state from web user to Telegram user immediately.
  const user = await storage.getUser(opts.userId);
  const isPremium = !!user?.isPremium;
  await storage.setTelegramPremium(telegramId, isPremium);

  return { ok: true, telegramId };
}

export async function syncTelegramPremiumFromUser(telegramId: string): Promise<void> {
  const userId = await storage.getTelegramLinkedUserId(telegramId);
  if (!userId) return;
  const user = await storage.getUser(userId);
  await storage.setTelegramPremium(telegramId, !!user?.isPremium);
}

