import crypto from "crypto";
import { storage } from "../storage";

function envSecret(): string {
  const s = process.env.TELEGRAM_PREMIUM_CODE_SECRET;
  if (!s) throw new Error("TELEGRAM_PREMIUM_CODE_SECRET is not set");
  return s;
}

export function generateTelegramPremiumCode(opts?: { days?: number }): string {
  const days = opts?.days ?? 30;
  const exp = Date.now() + days * 24 * 60 * 60 * 1000;
  const nonce = crypto.randomBytes(6).toString("hex");
  const payload = `${exp}.${nonce}`;
  const sig = crypto
    .createHmac("sha256", envSecret())
    .update(payload)
    .digest("base64url");
  return `TGPREM_${payload}.${sig}`;
}

export function verifyTelegramPremiumCode(code: string): { ok: boolean; expiresAt?: Date; reason?: string } {
  if (!code) return { ok: false, reason: "Missing code" };
  if (typeof code !== "string") return { ok: false, reason: "Invalid code" };
  if (!code.startsWith("TGPREM_")) return { ok: false, reason: "Invalid code" };

  const body = code.slice("TGPREM_".length);
  const parts = body.split(".");
  if (parts.length !== 3) return { ok: false, reason: "Invalid code" };

  const [expStr, nonce, sig] = parts;
  const exp = Number(expStr);
  if (!Number.isFinite(exp)) return { ok: false, reason: "Invalid expiry" };

  const payload = `${exp}.${nonce}`;
  const expected = crypto
    .createHmac("sha256", envSecret())
    .update(payload)
    .digest("base64url");

  if (expected !== sig) return { ok: false, reason: "Bad signature" };
  if (Date.now() > exp) return { ok: false, reason: "Code expired" };

  return { ok: true, expiresAt: new Date(exp) };
}

export async function redeemTelegramPremiumCode(opts: { telegramId: string; code: string }): Promise<{ ok: boolean; reason?: string }> {
  const v = verifyTelegramPremiumCode(opts.code);
  if (!v.ok) return { ok: false, reason: v.reason };

  await storage.setTelegramPremium(opts.telegramId, true);
  return { ok: true };
}
