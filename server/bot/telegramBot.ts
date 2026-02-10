import { probeUrl } from "../services/probeService";
import { downloadService } from "../services/downloadService";
import { downloadProgressStore } from "../services/downloadProgressStore";
import { storage } from "../storage";
import {
  assertTelegramCanDownload,
  consumeTelegramFreeDownload,
  getTelegramFreeLimit,
} from "../services/telegramEntitlementService";
import { redeemTelegramPremiumCode } from "../services/telegramPremiumCodeService";
import { createTelegramPairLink } from "../services/telegramPairingService";
import { findDownloadedFilePath } from "../services/fileCleanupService";
import fs from "fs";
import { HttpsProxyAgent } from "https-proxy-agent";

type TelegramUpdate = any;

const TELEGRAM_API = "https://api.telegram.org";

function getBaseUrl(req?: any): string {
  // Check if we have a proper host from request headers (tunnel/proxy)
  if (req) {
    const host = (req.headers?.host as string);
    // If host is not localhost, use it (means we're behind tunnel/proxy)
    if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
      const proto = (req.headers?.["x-forwarded-proto"] as string) || "https";
      return `${proto}://${host}`;
    }
  }

  // Use explicit public URL from env (but only if not localhost)
  const explicit = process.env.PUBLIC_BASE_URL;
  if (explicit && !explicit.includes('localhost') && !explicit.includes('127.0.0.1')) {
    return explicit.replace(/\/$/, "");
  }

  // Fallback: derive from request
  if (req) {
    const proto = (req.headers?.["x-forwarded-proto"] as string) || req.protocol || "https";
    const host = (req.headers?.host as string) || "localhost";
    return `${proto}://${host}`;
  }

  // Last resort: return empty (will show text instead of buttons)
  return "";
}

function envToken(): string {
  const t = process.env.TELEGRAM_BOT_TOKEN;
  if (!t) throw new Error("TELEGRAM_BOT_TOKEN is not set");
  return t;
}

async function tgCall(method: string, payload: any): Promise<any> {
  const token = envToken();
  const proxyUrl = process.env.TELEGRAM_PROXY; // e.g., "http://proxy.example.com:8080"
  
  const fetchOptions: any = {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  };
  
  // Add proxy agent if proxy is configured
  if (proxyUrl) {
    const agent = new HttpsProxyAgent(proxyUrl);
    fetchOptions.agent = agent;
  }
  
  const res = await fetch(`${TELEGRAM_API}/bot${token}/${method}`, fetchOptions);
  const json = await res.json();
  if (!json.ok) {
    throw new Error(`Telegram API error (${method}): ${json.description || res.statusText}`);
  }
  return json.result;
}

function extractUrl(text: string): string | null {
  const m = text.match(/https?:\/\/[^\s]+/i);
  return m?.[0] ?? null;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function progressBar(percent: number): string {
  const p = clamp(Math.round(percent), 0, 100);
  const filled = Math.round((p / 100) * 10);
  const empty = 10 - filled;
  return `[${"█".repeat(filled)}${"░".repeat(empty)}] ${p}%`;
}

type PendingUrlState = {
  url: string;
  options: { key: string; label: string; format: string; quality: string; formatId?: string }[];
  createdAt: number;
};

const pending = new Map<string, PendingUrlState>();

function pendingKey(chatId: string, userId: string): string {
  return `${chatId}:${userId}`;
}

function shouldRestrictQuality(isPremium: boolean, quality: string, width?: number, height?: number): boolean {
  if (isPremium) return false;

  // Check if portrait (height > width) or landscape
  const isPortrait = height && width && height > width;

  // Extract resolution number from quality string (e.g., "1080p" -> 1080)
  const resMatch = quality.match(/(\d+)p/);
  if (!resMatch) return false;

  const resolution = parseInt(resMatch[1]);

  // For free users: max 1080p landscape, 1280p portrait
  if (isPortrait) {
    return resolution > 1280;
  } else {
    return resolution > 1080;
  }
}

function buildSideMenuMarkup() {
  return {
    keyboard: [
      [{ text: "📊 Downloads Left" }, { text: "❓ Help" }],
      [{ text: "⭐ Premium Plans" }, { text: "🔗 Link Account" }],
      [{ text: "🏠 Start" }],
    ],
    resize_keyboard: true,
    persistent: true,
  };
}

function buildOptionsForTelegram(
  result: Awaited<ReturnType<typeof probeUrl>>,
  isPremium: boolean = false
): PendingUrlState["options"] {
  // Map probe options and preserve the true yt-dlp format_id for exact selection.
  const opts: PendingUrlState["options"] = [];

  for (const o of result.options.slice(0, 12)) {
    if (o.type === "audio") {
      opts.push({
        key: `a:${o.formatId}`,
        label: `Audio (${o.qualityLabel})`,
        format: "mp3",
        quality: "audio",
        formatId: o.formatId,
      });
    } else {
      const q = o.qualityLabel || "720p";

      // Check if this quality should be restricted for free users
      const restricted = shouldRestrictQuality(isPremium, q, o.width, o.height);

      if (restricted) {
        // Add 🔒 to indicate premium-only quality
        opts.push({
          key: `v:${o.formatId}`,
          label: `🔒 Video (${q}) - Premium`,
          format: "mp4",
          quality: q,
          formatId: o.formatId,
        });
      } else {
        opts.push({
          key: `v:${o.formatId}`,
          label: `Video (${q})`,
          format: "mp4",
          quality: q,
          formatId: o.formatId,
        });
      }
    }
  }

  // De-dupe by label
  const seen = new Set<string>();
  const filtered = opts.filter((o) => {
    if (seen.has(o.label)) return false;
    seen.add(o.label);
    return true;
  });

  // If free user, move premium options to end and limit total
  if (!isPremium) {
    const free = filtered.filter(o => !o.label.includes('🔒'));
    const premium = filtered.filter(o => o.label.includes('🔒')).slice(0, 2); // Show 2 locked options as teaser
    return [...free.slice(0, 6), ...premium];
  }

  return filtered.slice(0, 8);
}

function getBotDeepLinks(): { openChatUrl?: string; startUrl?: string } {
  const username = process.env.TELEGRAM_BOT_USERNAME;
  if (!username) return {};
  const base = `https://t.me/${username}`;
  return {
    openChatUrl: base,
    startUrl: `${base}?start=1`,
  };
}

function installButtonMarkup(): any | undefined {
  const links = getBotDeepLinks();
  if (!links.openChatUrl) return undefined;

  const rows: any[] = [];
  rows.push([{ text: "Open bot", url: links.openChatUrl }]);
  // “Install” isn't a true Telegram concept for bots, but deep-linking to start is the closest.
  if (links.startUrl) rows.push([{ text: "Start / Install", url: links.startUrl }]);
  return { inline_keyboard: rows };
}

function appButtonMarkup(): any | undefined {
  const base = process.env.PUBLIC_BASE_URL;
  if (!base) return undefined;
  return { inline_keyboard: [[{ text: "Open website", url: base.replace(/\/$/, "") }]] };
}

async function sendSubscribePrompt(chatId: string, resetAtIso?: string) {
  const limit = getTelegramFreeLimit();
  const web = (process.env.PUBLIC_BASE_URL || "").replace(/\/$/, "");
  const subscribeUrl = process.env.TELEGRAM_SUBSCRIBE_URL || (web ? `${web}/subscribe` : undefined);

  const lines = [
    `You’ve used your ${limit} free downloads for today.`,
    resetAtIso ? `Free downloads reset at: ${resetAtIso}` : undefined,
    "\nGet Premium to remove limits and ads.",
  ].filter(Boolean);

  const payload: any = {
    chat_id: chatId,
    text: lines.join("\n"),
    disable_web_page_preview: true,
  };

  const buttons: any[] = [];
  const install = installButtonMarkup();
  if (install?.inline_keyboard?.length) {
    // We'll merge later
  }

  if (subscribeUrl) {
    buttons.push([{ text: "Upgrade to Premium", url: subscribeUrl }]);
  }

  if (install?.inline_keyboard?.length) {
    buttons.push(...install.inline_keyboard);
  }

  if (buttons.length) {
    payload.reply_markup = { inline_keyboard: buttons };
  }

  await tgCall("sendMessage", payload);
}

async function maybeSendAd(chatId: string, isPremium: boolean = false) {
  // Only show ads to free users
  if (isPremium) return;

  // Lightweight "ad" placeholder. Controlled via env.
  const enabled = String(process.env.TELEGRAM_ADS_ENABLED ?? "true").toLowerCase() === "true";
  if (!enabled) return;

  const text = process.env.TELEGRAM_AD_TEXT || "Sponsored: Try our Premium plan for faster downloads and no limits.";
  await tgCall("sendMessage", { chat_id: chatId, text, disable_web_page_preview: true });
}

async function sendFileToTelegramOrLink(opts: {
  chatId: string;
  downloadId: number;
  baseUrl: string;
  title?: string | null;
}) {
  const maxBytes = (() => {
    const raw = Number(process.env.TELEGRAM_UPLOAD_MAX_BYTES ?? 45 * 1024 * 1024);
    return Number.isFinite(raw) && raw > 0 ? raw : 45 * 1024 * 1024;
  })();

  const found = findDownloadedFilePath(opts.downloadId);
  const link = opts.baseUrl
    ? `${opts.baseUrl}/api/download/${opts.downloadId}/file`
    : `/api/download/${opts.downloadId}/file`;

  if (!found) {
    await tgCall("sendMessage", {
      chat_id: opts.chatId,
      text: `✅ Ready! Download here:\n${link}`,
      disable_web_page_preview: true,
      reply_markup: installButtonMarkup(),
    });
    return;
  }

  const stat = fs.statSync(found.filePath);
  if (stat.size > maxBytes) {
    await tgCall("sendMessage", {
      chat_id: opts.chatId,
      text: `✅ Ready! (File is too large to upload here)\nDownload: ${link}`,
      disable_web_page_preview: true,
      reply_markup: installButtonMarkup(),
    });
    return;
  }

  // Upload via Telegram by URL so Telegram fetches it from our server.
  // This avoids multipart implementation here.
  // NOTE: your /api/download/:id/file endpoint deletes the file after first successful download.
  // Telegram will fetch it once; that's fine.
  const name = (opts.title || "media").toString().slice(0, 60);
  const isAudio = found.ext === "mp3" || found.ext === "m4a" || found.ext === "ogg" || found.ext === "opus";

  if (isAudio) {
    await tgCall("sendAudio", {
      chat_id: opts.chatId,
      audio: link,
      caption: `✅ ${name}`,
      reply_markup: installButtonMarkup(),
    });
  } else {
    await tgCall("sendVideo", {
      chat_id: opts.chatId,
      video: link,
      caption: `✅ ${name}`,
      supports_streaming: true,
      reply_markup: installButtonMarkup(),
    });
  }
}

async function startDownloadFlow(opts: {
  chatId: string;
  telegramId: string;
  username?: string | null;
  url: string;
  format: string;
  quality: string;
  formatId?: string;
  req?: any;
}) {
  const { chatId, telegramId, username, url, format, quality, formatId, req } = opts;

  await storage.getOrCreateTelegramUser({ telegramId, username });

  const entitlement = await assertTelegramCanDownload(telegramId);
  if (!entitlement.allowed) {
    await sendSubscribePrompt(chatId, entitlement.resetAt.toISOString());
    return;
  }

  // Consume free usage for non-premium users
  const u = await storage.getOrCreateTelegramUser({ telegramId, username });
  if (!u.isPremium) {
    await consumeTelegramFreeDownload(telegramId);
  }

  await maybeSendAd(chatId, u.isPremium || false);

  const platform = downloadService.detectPlatform(url);
  if (!platform) {
    await tgCall("sendMessage", { chat_id: chatId, text: "Unsupported or invalid URL." });
    return;
  }

  const downloadRecord = await storage.createDownload({
    userId: null,
    platform,
    originalUrl: url,
    format,
    quality,
    status: "pending",
    title: "Pending Download",
    thumbnail: "",
    createdAt: new Date(),
  });

  const downloadId = Number(downloadRecord.id);

  const statusMsg = await tgCall("sendMessage", {
    chat_id: chatId,
    text: `Starting…\n${progressBar(0)}`,
    reply_markup: installButtonMarkup(),
  });

  // Kick off download asynchronously
  downloadService.processDownload(downloadId, url, format, quality, formatId).catch(async () => {
    try {
      await tgCall("editMessageText", {
        chat_id: chatId,
        message_id: statusMsg.message_id,
        text: `Failed.\n${progressBar(100)}`,
      });
    } catch {
      // ignore
    }
  });

  // Poll progress store and edit message (throttled)
  let lastText = "";
  const startedAt = Date.now();

  for (;;) {
    const snap = downloadProgressStore.get(downloadId);
    const stage = snap?.stage || "processing";
    const pct = typeof snap?.percent === "number" ? snap.percent : 0;

    const nextText = `${stage.replace(/_/g, " ")}:\n${progressBar(pct)}${snap?.message ? `\n${snap.message}` : ""}`;

    if (nextText !== lastText) {
      lastText = nextText;
      try {
        await tgCall("editMessageText", {
          chat_id: chatId,
          message_id: statusMsg.message_id,
          text: nextText,
        });
      } catch {
        // editing can fail if message is too old or unchanged; ignore
      }
    }

    if (stage === "completed") {
      const baseUrl = getBaseUrl(req);
      const d = await storage.getDownload(downloadId);
      await sendFileToTelegramOrLink({
        chatId,
        downloadId,
        baseUrl,
        title: (d as any)?.title ?? null,
      });

      // Show remaining downloads for free users
      const { telegramId } = opts;
      const user = await storage.getOrCreateTelegramUser({ telegramId });
      if (!user.isPremium) {
        const entitlement = await assertTelegramCanDownload(telegramId);
        await tgCall("sendMessage", {
          chat_id: chatId,
          text: `📊 Downloads remaining: *${entitlement.remainingFree}/${entitlement.limit}*`,
          parse_mode: "Markdown",
        });
      }

      return;
    }

    if (stage === "failed") {
      await tgCall("sendMessage", { chat_id: chatId, text: "❌ Download failed. Try another link or format." });
      return;
    }

    // Safety timeout
    if (Date.now() - startedAt > 15 * 60 * 1000) {
      await tgCall("sendMessage", { chat_id: chatId, text: "Timed out. Please try again." });
      return;
    }

    await new Promise((r) => setTimeout(r, 1100));
  }
}

export async function handleTelegramWebhook(req: any, update: TelegramUpdate): Promise<void> {
  // Basic update parsing
  const message = update?.message;
  const callback = update?.callback_query;

  if (message?.text) {
    const chatId = String(message.chat.id);
    const telegramId = String(message.from?.id);
    const username = message.from?.username ? String(message.from.username) : null;

    // Commands
    if (message.text.startsWith("/start") || message.text === "🏠 Start") {
      const user = await storage.getOrCreateTelegramUser({ telegramId, username });

      const statusEmoji = user.isPremium ? "⭐" : "🆓";
      const statusText = user.isPremium ? "Premium User" : "Free User";

      // Calculate remaining downloads WITHOUT resetting
      let limitText: string;
      if (user.isPremium) {
        limitText = "Unlimited downloads";
      } else {
        const limit = getTelegramFreeLimit();
        const used = user.freeUsedCount ?? 0;
        const remaining = Math.max(0, limit - used);
        limitText = `${remaining}/${limit} downloads left`;
      }

      await tgCall("sendMessage", {
        chat_id: chatId,
        text:
          `${statusEmoji} *Welcome to SaveMedia Bot!*\n\n` +
          `Status: ${statusText}\n` +
          `Downloads: ${limitText}\n\n` +
          `Send me a video link from:\n` +
          `• TikTok\n• Instagram\n• YouTube\n• Facebook\n• Twitter\n\n` +
          `I'll fetch download options for you!`,
        parse_mode: "Markdown",
        reply_markup: buildSideMenuMarkup(),
      });
      return;
    }

    if (message.text === "📊 Downloads Left") {
      const user = await storage.getOrCreateTelegramUser({ telegramId, username });

      if (user.isPremium) {
        await tgCall("sendMessage", {
          chat_id: chatId,
          text:
            "⭐ *Premium Status*\n\n" +
            "✅ Unlimited downloads\n" +
            "✅ All quality options (up to 4K)\n" +
            "✅ Priority processing\n" +
            "✅ No ads",
          parse_mode: "Markdown",
          reply_markup: buildSideMenuMarkup(),
        });
      } else {
        const limit = getTelegramFreeLimit();
        const used = user.freeUsedCount ?? 0;
        const remaining = Math.max(0, limit - used);
        const resetDate = user.freeResetAt?.toLocaleDateString() || "N/A";

        await tgCall("sendMessage", {
          chat_id: chatId,
          text:
            "🆓 *Free User Status*\n\n" +
            `📥 Downloads remaining: *${remaining}/${limit}*\n` +
            `📅 Resets on: ${resetDate}\n\n` +
            `⚠️ Quality limited to:\n` +
            `• Landscape: max 1080p\n` +
            `• Portrait: max 1280p\n\n` +
            `Want unlimited downloads and 4K quality?\n` +
            `Upgrade to Premium! Use /premium`,
          parse_mode: "Markdown",
          reply_markup: buildSideMenuMarkup(),
        });
      }
      return;
    }

    if (message.text === "❓ Help" || message.text.startsWith("/help")) {
      const web = (process.env.PUBLIC_BASE_URL || "").replace(/\/$/, "");
      await tgCall("sendMessage", {
        chat_id: chatId,
        text:
          "❓ *SaveMedia Bot Help*\n\n" +
          "*How to use:*\n" +
          "1️⃣ Send a video link\n" +
          "2️⃣ Choose quality/format\n" +
          "3️⃣ Get your download!\n\n" +
          "*Supported platforms:*\n" +
          "✅ TikTok\n" +
          "✅ Instagram (posts, reels, stories)\n" +
          "✅ YouTube\n" +
          "✅ Facebook\n" +
          "✅ Twitter\n\n" +
          "*Commands:*\n" +
          "`/start` - Start the bot\n" +
          "`/help` - Show this help\n" +
          "`/premium` - View premium plans\n" +
          "`/pair` - Link web account\n\n" +
          "*Free vs Premium:*\n" +
          "🆓 Free: 7 downloads/30 days, max 1080p\n" +
          "⭐ Premium: Unlimited, up to 4K quality\n\n" +
          `*Website:* ${web || 'N/A'}\n` +
          "*Support:* " + (process.env.SUPPORT_EMAIL || 'N/A'),
        parse_mode: "Markdown",
        reply_markup: buildSideMenuMarkup(),
      });
      return;
    }

    if (message.text.startsWith("/redeem")) {
      const parts = message.text.trim().split(/\s+/);
      const code = parts[1];
      if (!code) {
        await tgCall("sendMessage", { chat_id: chatId, text: "Usage: /redeem <code>", reply_markup: installButtonMarkup() });
        return;
      }
      const r = await redeemTelegramPremiumCode({ telegramId, code });
      if (!r.ok) {
        await tgCall("sendMessage", { chat_id: chatId, text: `Redeem failed: ${r.reason || 'invalid code'}`, reply_markup: installButtonMarkup() });
        return;
      }
      await tgCall("sendMessage", { chat_id: chatId, text: "✅ Premium activated for this Telegram account!", reply_markup: installButtonMarkup() });
      return;
    }

    if (message.text.startsWith("/premium")) {
      try {
        // Fetch available plans from API
        const baseUrl = getBaseUrl(req);
        if (!baseUrl) {
          await tgCall("sendMessage", {
            chat_id: chatId,
            text: "⚠️ Bot is running in development mode. Please use the web app to subscribe.\n\nVisit: https://vidgrabber.online/subscribe",
            reply_markup: installButtonMarkup()
          });
          return;
        }
        const plansResponse = await fetch(`${baseUrl}/api/payment/safepay/available-plans`);
        const plansData = await plansResponse.json();

        if (!plansData.ok || !plansData.plans || plansData.plans.length === 0) {
          await tgCall("sendMessage", {
            chat_id: chatId,
            text: "⚠️ No premium plans available at the moment. Please try again later.",
            reply_markup: buildSideMenuMarkup(),
          });
          return;
        }

        const plans = plansData.plans;
        const web = (process.env.PUBLIC_BASE_URL || "").replace(/\/$/, "");
        const subscribeUrl = web ? `${web}/subscribe` : undefined;

        // Format plans message
        let plansText = "⭐ *Premium Subscription Plans*\n\n";
        plansText += "*Choose your plan and upgrade:*\n\n";

        plans.forEach((plan: any, index: number) => {
          const amount = (parseInt(plan.amount) / 100).toFixed(2);
          const interval = plan.interval_count > 1
            ? `${plan.interval_count} ${plan.interval}S`
            : plan.interval;

          plansText += `${index + 1}. *${plan.name || 'Premium Plan'}*\n`;
          plansText += `   💰 ${amount} ${plan.currency} / ${interval}\n`;
          if (plan.description) {
            plansText += `   📝 ${plan.description}\n`;
          }
          if (plan.trial_period_days > 0) {
            plansText += `   🎁 ${plan.trial_period_days} days free trial\n`;
          }
          plansText += `\n`;
        });

        plansText += "*Premium Benefits:*\n";
        plansText += "✅ Unlimited downloads\n";
        plansText += "✅ All quality options (up to 4K)\n";
        plansText += "✅ Priority processing\n";
        plansText += "✅ No ads\n\n";
        plansText += "*How to subscribe:*\n";

        const buttons: any[] = [];

        // Only add subscribe button if URL is valid (not localhost)
        const isValidUrl = subscribeUrl && !subscribeUrl.includes('localhost') && subscribeUrl.startsWith('https://');

        if (isValidUrl) {
          plansText += "1. Click 'Subscribe Now' button\n";
          plansText += "2. Choose your plan\n";
          plansText += "3. Complete payment\n";
          plansText += "4. Use /pair to link your account\n";
          buttons.push([{ text: "💳 Subscribe Now", url: subscribeUrl }]);
        } else {
          plansText += `1. Visit: ${web}/subscribe\n`;
          plansText += "2. Choose your plan\n";
          plansText += "3. Complete payment\n";
          plansText += "4. Use 🔗 Link Account button below\n";
        }

        buttons.push([{ text: "🔗 Link Account", callback_data: "pair_account" }]);

        await tgCall("sendMessage", {
          chat_id: chatId,
          text: plansText,
          parse_mode: "Markdown",
          reply_markup: { inline_keyboard: buttons },
        });
      } catch (error: any) {
        console.error("Error fetching plans:", error);
        await tgCall("sendMessage", {
          chat_id: chatId,
          text: "❌ Failed to fetch premium plans. Please try again later.",
          reply_markup: buildSideMenuMarkup(),
        });
      }
      return;
    }

    if (message.text === "⭐ Premium Plans") {
      // Reuse the /premium command logic
      try {
        const baseUrl = getBaseUrl(req);
        if (!baseUrl) {
          await tgCall("sendMessage", {
            chat_id: chatId,
            text: "⚠️ Bot is running in development mode. Please use the web app to subscribe.\n\nVisit: https://vidgrabber.online/subscribe",
            reply_markup: buildSideMenuMarkup()
          });
          return;
        }
        const plansResponse = await fetch(`${baseUrl}/api/payment/safepay/available-plans`);
        const plansData = await plansResponse.json();

        if (!plansData.ok || !plansData.plans || plansData.plans.length === 0) {
          await tgCall("sendMessage", {
            chat_id: chatId,
            text: "⚠️ No premium plans available at the moment. Please try again later.",
            reply_markup: buildSideMenuMarkup(),
          });
          return;
        }

        const plans = plansData.plans;
        const web = (process.env.PUBLIC_BASE_URL || "").replace(/\/$/, "");
        const subscribeUrl = web ? `${web}/subscribe` : undefined;

        let plansText = "⭐ *Premium Subscription Plans*\n\n";
        plansText += "*Choose your plan and upgrade:*\n\n";

        plans.forEach((plan: any, index: number) => {
          const amount = (parseInt(plan.amount) / 100).toFixed(2);
          const interval = plan.interval_count > 1
            ? `${plan.interval_count} ${plan.interval}S`
            : plan.interval;

          plansText += `${index + 1}. *${plan.name || 'Premium Plan'}*\n`;
          plansText += `   💰 ${amount} ${plan.currency} / ${interval}\n`;
          if (plan.description) {
            plansText += `   📝 ${plan.description}\n`;
          }
          if (plan.trial_period_days > 0) {
            plansText += `   🎁 ${plan.trial_period_days} days free trial\n`;
          }
          plansText += `\n`;
        });

        plansText += "*Premium Benefits:*\n";
        plansText += "✅ Unlimited downloads\n";
        plansText += "✅ All quality options (up to 4K)\n";
        plansText += "✅ Priority processing\n";
        plansText += "✅ No ads\n\n";
        plansText += "*How to subscribe:*\n";

        const buttons: any[] = [];

        // Only add subscribe button if URL is valid (not localhost)
        const isValidUrl = subscribeUrl && !subscribeUrl.includes('localhost') && subscribeUrl.startsWith('https://');

        if (isValidUrl) {
          plansText += "1. Click 'Subscribe Now' button\n";
          plansText += "2. Choose your plan\n";
          plansText += "3. Complete payment\n";
          plansText += "4. Use 🔗 Link Account button\n";
          buttons.push([{ text: "💳 Subscribe Now", url: subscribeUrl }]);
        } else {
          plansText += `1. Visit: ${web}/subscribe\n`;
          plansText += "2. Choose your plan\n";
          plansText += "3. Complete payment\n";
          plansText += "4. Use 🔗 Link Account button below\n";
        }

        buttons.push([{ text: "🔗 Link Account", callback_data: "pair_account" }]);

        await tgCall("sendMessage", {
          chat_id: chatId,
          text: plansText,
          parse_mode: "Markdown",
          reply_markup: { inline_keyboard: buttons },
        });
      } catch (error: any) {
        console.error("Error fetching plans:", error);
        await tgCall("sendMessage", {
          chat_id: chatId,
          text: "❌ Failed to fetch premium plans. Please try again later.",
          reply_markup: buildSideMenuMarkup(),
        });
      }
      return;
    }

    if (message.text.startsWith("/pair") || message.text.startsWith("/link") || message.text === "🔗 Link Account") {
      const base = getBaseUrl(req);
      if (!base) {
        await tgCall("sendMessage", {
          chat_id: chatId,
          text: "⚠️ Linking is only available when bot is running in production mode.\n\nPlease visit: https://vidgrabber.online to manage your account.",
          reply_markup: buildSideMenuMarkup(),
        });
        return;
      }

      await storage.getOrCreateTelegramUser({ telegramId, username });

      const { url, expiresAt } = await createTelegramPairLink({ telegramId, baseUrl: base });

      // Check if URL is valid for Telegram (not localhost, must be HTTPS)
      const isValidUrl = !url.includes('localhost') && !url.includes('127.0.0.1') && url.startsWith('https://');

      if (isValidUrl) {
        // Production: Show button
        await tgCall("sendMessage", {
          chat_id: chatId,
          text: `🔗 *Link Your Account*\n\n` +
                `To sync your premium status between website and Telegram:\n\n` +
                `1. Click the button below\n` +
                `2. Sign in to your account\n` +
                `3. Your accounts will be linked!\n\n` +
                `⏰ Link expires: ${new Date(expiresAt).toLocaleString()}\n\n` +
                `After linking, your premium subscription will work on both web and Telegram!`,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [{ text: "🔗 Link My Account", url }],
            ],
          },
          disable_web_page_preview: true,
        });
      } else {
        // Localhost: Show URL as text
        await tgCall("sendMessage", {
          chat_id: chatId,
          text: `🔗 *Link Your Account*\n\n` +
                `To sync your premium status:\n\n` +
                `1. Copy the link below\n` +
                `2. Open it in your browser\n` +
                `3. Sign in to your account\n` +
                `4. Your accounts will be linked!\n\n` +
                `🔗 *Link:*\n\`${url}\`\n\n` +
                `⏰ Expires: ${new Date(expiresAt).toLocaleString()}\n\n` +
                `_Tip: Tap the link to copy it_`,
          parse_mode: "Markdown",
          reply_markup: buildSideMenuMarkup(),
        });
      }
      return;
    }

    // URL flow
    const url = extractUrl(message.text);
    if (!url) {
      await tgCall("sendMessage", { chat_id: chatId, text: "Send a valid URL (starting with http/https)." });
      return;
    }

    const entitlement = await assertTelegramCanDownload(telegramId);
    if (!entitlement.allowed) {
      await sendSubscribePrompt(chatId, entitlement.resetAt.toISOString());
      return;
    }

    let probe;
    try {
      probe = await probeUrl(url);
    } catch (error: any) {
      const errorMsg = error.message || String(error);

      // Handle specific authentication errors
      if (errorMsg.includes('AUTH_REQUIRED')) {
        await tgCall("sendMessage", {
          chat_id: chatId,
          text: "⚠️ This content requires authentication.\n\n" +
                "This Instagram post or TikTok video is private or age-restricted.\n\n" +
                "✨ Solution: Add cookies to download private content!\n" +
                "Ask the admin to set up cookies (takes 5 minutes).\n\n" +
                "Meanwhile, try:\n• A public post instead\n• YouTube (always works!)",
          reply_markup: buildSideMenuMarkup(),
        });
        return;
      }

      if (errorMsg.includes('TIKTOK_AUTH_REQUIRED')) {
        await tgCall("sendMessage", {
          chat_id: chatId,
          text: "⚠️ This TikTok video requires login.\n\n" +
                "This video is:\n• Age-restricted\n• Private/followers-only\n• Region-locked\n\n" +
                "✨ Solution: Ask admin to add TikTok cookies!\n" +
                "Then all TikTok videos will work.\n\n" +
                "Try a different public TikTok video for now!",
          reply_markup: buildSideMenuMarkup(),
        });
        return;
      }

      if (errorMsg.includes('AGE_RESTRICTED')) {
        await tgCall("sendMessage", {
          chat_id: chatId,
          text: "⚠️ This video is age-restricted and requires authentication to download.",
          reply_markup: buildSideMenuMarkup(),
        });
        return;
      }

      if (errorMsg.includes('CONTENT_UNAVAILABLE')) {
        await tgCall("sendMessage", {
          chat_id: chatId,
          text: "❌ This video is private, removed, or unavailable.",
          reply_markup: buildSideMenuMarkup(),
        });
        return;
      }

      // Generic error
      await tgCall("sendMessage", {
        chat_id: chatId,
        text: "❌ Failed to fetch video info. The link might be invalid or the platform is temporarily blocking downloads.\n\nTry:\n• A different video\n• YouTube (most reliable)\n• Wait a few minutes and try again",
        reply_markup: buildSideMenuMarkup(),
      });
      return;
    }

    if (probe.platform === "unknown" || probe.options.length === 0) {
      await tgCall("sendMessage", {
        chat_id: chatId,
        text: "Couldn't find formats for that link.",
        reply_markup: buildSideMenuMarkup(),
      });
      return;
    }

    // Get user premium status to filter quality options
    const user = await storage.getOrCreateTelegramUser({ telegramId, username });
    const options = buildOptionsForTelegram(probe, user.isPremium || false);
    const key = pendingKey(chatId, telegramId);
    pending.set(key, { url, options, createdAt: Date.now() });

    await tgCall("sendMessage", {
      chat_id: chatId,
      text: `Choose a format for: ${probe.title || "this media"}`,
      reply_markup: {
        inline_keyboard: [
          ...options.map((o) => [{ text: o.label, callback_data: `dl:${o.key}` }]),
          [{ text: "Cancel", callback_data: "cancel" }],
        ],
      },
    });

    return;
  }

  if (callback) {
    const chatId = String(callback.message?.chat?.id);
    const telegramId = String(callback.from?.id);
    const username = callback.from?.username ? String(callback.from.username) : null;

    const data = String(callback.data || "");
    await tgCall("answerCallbackQuery", { callback_query_id: callback.id });

    if (data === "cancel") {
      pending.delete(pendingKey(chatId, telegramId));
      await tgCall("sendMessage", { chat_id: chatId, text: "Cancelled.", reply_markup: buildSideMenuMarkup() });
      return;
    }

    if (data === "pair_account") {
      const base = getBaseUrl(req);
      if (!base) {
        await tgCall("sendMessage", {
          chat_id: chatId,
          text: "⚠️ Linking is only available when bot is running in production mode.\n\nPlease visit: https://vidgrabber.online to manage your account.",
          reply_markup: buildSideMenuMarkup(),
        });
        return;
      }

      await storage.getOrCreateTelegramUser({ telegramId, username });

      const { url, expiresAt } = await createTelegramPairLink({ telegramId, baseUrl: base });

      // Check if URL is valid for Telegram (not localhost, must be HTTPS)
      const isValidUrl = !url.includes('localhost') && !url.includes('127.0.0.1') && url.startsWith('https://');

      if (isValidUrl) {
        // Production: Show button
        await tgCall("sendMessage", {
          chat_id: chatId,
          text: `🔗 *Link Your Account*\n\n` +
                `To sync your premium status:\n\n` +
                `1. Click the button below\n` +
                `2. Sign in to your account\n` +
                `3. Your accounts will be linked!\n\n` +
                `⏰ Link expires: ${new Date(expiresAt).toLocaleString()}`,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [{ text: "🔗 Link My Account", url }],
            ],
          },
          disable_web_page_preview: true,
        });
      } else {
        // Localhost: Show URL as text
        await tgCall("sendMessage", {
          chat_id: chatId,
          text: `🔗 *Link Your Account*\n\n` +
                `To sync your premium status:\n\n` +
                `1. Copy the link below\n` +
                `2. Open it in your browser\n` +
                `3. Sign in to your account\n` +
                `4. Your accounts will be linked!\n\n` +
                `🔗 *Link:*\n\`${url}\`\n\n` +
                `⏰ Expires: ${new Date(expiresAt).toLocaleString()}\n\n` +
                `_Tip: Tap the link to copy it_`,
          parse_mode: "Markdown",
          reply_markup: buildSideMenuMarkup(),
        });
      }
      return;
    }

    if (data.startsWith("dl:")) {
      const key = pendingKey(chatId, telegramId);
      const st = pending.get(key);
      if (!st || Date.now() - st.createdAt > 10 * 60 * 1000) {
        pending.delete(key);
        await tgCall("sendMessage", { chat_id: chatId, text: "That selection expired. Send the link again." });
        return;
      }

      const optKey = data.slice("dl:".length);
      const chosen = st.options.find((o) => o.key === optKey);
      if (!chosen) {
        await tgCall("sendMessage", { chat_id: chatId, text: "Unknown option. Send the link again." });
        return;
      }

      // Check if user is trying to download premium-only quality
      const user = await storage.getOrCreateTelegramUser({ telegramId, username });
      if (!user.isPremium && chosen.label.includes('🔒')) {
        const web = (process.env.PUBLIC_BASE_URL || "").replace(/\/$/, "");
        await tgCall("sendMessage", {
          chat_id: chatId,
          text:
            "🔒 *Premium Quality Locked*\n\n" +
            "This quality option is available for Premium users only.\n\n" +
            "*Upgrade to Premium for:*\n" +
            "⭐ Unlimited downloads\n" +
            "⭐ Up to 4K quality\n" +
            "⭐ Priority processing\n\n" +
            "Use /premium to upgrade!",
          parse_mode: "Markdown",
        });
        return;
      }

      pending.delete(key);

      await startDownloadFlow({
        chatId,
        telegramId,
        username,
        url: st.url,
        format: chosen.format,
        quality: chosen.quality,
        formatId: chosen.formatId,
        req,
      });

      return;
    }
  }
}
