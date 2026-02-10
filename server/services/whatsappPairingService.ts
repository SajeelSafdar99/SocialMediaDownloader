import crypto from "crypto";
import { storage } from "../storage";

export function generatePairToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}

function tokenTtlMs(): number {
  const raw = Number(process.env.WHATSAPP_LINK_TOKEN_TTL_MINUTES ?? 15);
  const minutes = Number.isFinite(raw) && raw > 0 ? raw : 15;
  return minutes * 60 * 1000;
}

export async function createWhatsAppPairLink(opts: {
  whatsappId: string;
  baseUrl: string;
}): Promise<{ url: string; token: string; expiresAt: Date }> {
  const token = generatePairToken();
  const expiresAt = new Date(Date.now() + tokenTtlMs());

  await storage.createWhatsAppLinkToken({ whatsappId: opts.whatsappId, token, expiresAt });

  const base = opts.baseUrl.replace(/\/$/, "");
  const url = `${base}/api/whatsapp/link/complete?token=${encodeURIComponent(token)}`;
  return { url, token, expiresAt };
}

export async function completeWhatsAppPairing(opts: {
  token: string;
  userId: number;
}): Promise<{ ok: boolean; whatsappId?: string; reason?: string }> {
  const consumed = await storage.consumeWhatsAppLinkToken({ token: opts.token });
  if (!consumed) return { ok: false, reason: "Invalid or expired token" };

  const whatsappId = String((consumed as any).whatsappId);
  await storage.upsertWhatsAppUserLink({ whatsappId, userId: opts.userId });

  // Mirror premium state from web user to WhatsApp user immediately.
  const user = await storage.getUser(opts.userId);
  const isPremium = !!user?.isPremium;
  await storage.setWhatsAppPremium(whatsappId, isPremium);

  return { ok: true, whatsappId };
}

export async function syncWhatsAppPremiumFromUser(whatsappId: string): Promise<void> {
  const userId = await storage.getWhatsAppLinkedUserId(whatsappId);
  if (!userId) return;
  const user = await storage.getUser(userId);
  await storage.setWhatsAppPremium(whatsappId, !!user?.isPremium);
}
