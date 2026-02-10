// qrcode-terminal will be imported dynamically
import { probeUrl } from "../services/probeService";
import { downloadService } from "../services/downloadService";
import { downloadProgressStore } from "../services/downloadProgressStore";
import { storage } from "../storage";
import {
  assertWhatsAppCanDownload,
  consumeWhatsAppFreeDownload,
  getWhatsAppFreeLimit,
} from "../services/whatsappEntitlementService";
import { redeemWhatsAppPremiumCode } from "../services/whatsappPremiumCodeService";
import { createWhatsAppPairLink } from "../services/whatsappPairingService";
import { findDownloadedFilePath, deleteFileIfExists } from "../services/fileCleanupService";
import { isPremiumEnforced } from "../config";
import fs from "fs";
import path from "path";

let whatsappClient: any = null;
let isInitialized = false;
let currentQRCode: string | null = null;
let qrCodeListeners: Array<(qr: string) => void> = [];
let botWhatsAppNumber: string | null = null; // Store the bot's own WhatsApp number

function getBaseUrl(): string {
  const explicit = process.env.PUBLIC_BASE_URL;
  if (explicit && !explicit.includes('yourdomain.com')) {
    return explicit.replace(/\/$/, "");
  }
  
  // For local dev, use backend server URL
  // Default port is 5001 (from server/index.ts)
  const port = process.env.PORT || "5001";
  const host = process.env.HOST || "localhost";
  const protocol = "http";
  
  // Use localhost URL for local development
  return `${protocol}://${host}:${port}`;
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

function buildOptionsForWhatsApp(result: Awaited<ReturnType<typeof probeUrl>>): PendingUrlState["options"] {
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
      opts.push({
        key: `v:${o.formatId}`,
        label: `Video (${q})`,
        format: "mp4",
        quality: q,
        formatId: o.formatId,
      });
    }
  }

  const seen = new Set<string>();
  return opts.filter((o) => {
    if (seen.has(o.label)) return false;
    seen.add(o.label);
    return true;
  }).slice(0, 8);
}

async function sendSubscribePrompt(chatId: string, resetAtIso?: string) {
  const limit = getWhatsAppFreeLimit();
  const web = getBaseUrl();
  const subscribeUrl = process.env.WHATSAPP_SUBSCRIBE_URL || (web ? `${web}/subscribe` : undefined);
  const windowDays = Number(process.env.WHATSAPP_FREE_WINDOW_DAYS || 1);

  const resetDate = resetAtIso ? new Date(resetAtIso) : null;
  const resetDateStr = resetDate ? resetDate.toLocaleDateString() : "soon";

  const lines = [
    "❌ *Download Limit Reached*",
    "",
    `You've used all *${limit} free downloads* for this ${windowDays}-day period.`,
    resetDate ? `Your limit resets on: *${resetDateStr}*` : "",
    "",
    "⭐ *Get Premium for Unlimited Downloads!*",
    "",
    "✨ *Premium Benefits:*",
    "• Unlimited downloads",
    "• 4K quality",
    "• Faster speeds",
    "• No ads",
    "",
    "💳 *Subscribe Now:*",
    subscribeUrl ? `👉 ${subscribeUrl}` : "Contact support",
    "",
    "Or use /redeem <code> if you have a premium code.",
  ].filter(Boolean);

  if (!whatsappClient) return;
  await whatsappClient.sendMessage(chatId, lines.join("\n"));
}

async function maybeSendAd(chatId: string) {
  const enabled = String(process.env.WHATSAPP_ADS_ENABLED ?? "true").toLowerCase() === "true";
  if (!enabled) return;

  const text = process.env.WHATSAPP_AD_TEXT || "Sponsored: Try our Premium plan for faster downloads and no limits.";
  if (!whatsappClient) return;
  await whatsappClient.sendMessage(chatId, text);
}

async function sendFileToWhatsAppOrLink(opts: {
  chatId: string;
  downloadId: number;
  baseUrl: string;
  title?: string | null;
}) {
  const maxBytes = (() => {
    const raw = Number(process.env.WHATSAPP_UPLOAD_MAX_BYTES ?? 45 * 1024 * 1024);
    return Number.isFinite(raw) && raw > 0 ? raw : 45 * 1024 * 1024;
  })();

  const found = findDownloadedFilePath(opts.downloadId);
  const link = opts.baseUrl
    ? `${opts.baseUrl}/api/download/${opts.downloadId}/file`
    : `/api/download/${opts.downloadId}/file`;

  if (!whatsappClient) return;

  // Always try to send file directly first, only use link as fallback
  if (!found) {
    // File not found - this shouldn't happen, but provide link as fallback
    console.warn(`File not found for download ${opts.downloadId}, sending link instead`);
    await whatsappClient.sendMessage(opts.chatId, `✅ Ready! Download here:\n${link}`);
    return;
  }

  const stat = fs.statSync(found.filePath);
  const name = (opts.title || "media").toString().slice(0, 60);
  const isAudio = found.ext === "mp3" || found.ext === "m4a" || found.ext === "ogg" || found.ext === "opus";
  
  // WhatsApp's official limits:
  // - Videos/Audio: 16MB (official limit, but can be larger)
  // - Documents: 100MB
  // However, we'll use MessageMedia.fromUrl() which avoids base64/Puppeteer issues
  // This method lets WhatsApp fetch the file from our server URL, similar to Telegram
  const extremelyLarge = stat.size > 500 * 1024 * 1024; // 500MB absolute limit
  
  if (extremelyLarge) {
    console.log(`📤 File size (${(stat.size / 1024 / 1024).toFixed(2)} MB) exceeds 500MB limit, using download link`);
    await whatsappClient.sendMessage(opts.chatId, `✅ Ready! (File exceeds 500MB limit)\nDownload: ${link}`);
    return;
  }

  try {
    // Dynamic import for MessageMedia (CommonJS compatibility)
    const whatsappWeb = await import("whatsapp-web.js");
    const moduleExports = (whatsappWeb as any).default || whatsappWeb;
    const MessageMedia = moduleExports.MessageMedia;
    
    if (!MessageMedia) {
      throw new Error("MessageMedia not found");
    }
    
    // Use fromUrl() method - this is the most convenient way!
    // It fetches the file from our server URL and sends it directly
    // This avoids base64 encoding and Puppeteer evaluation issues entirely
    // Similar to how Telegram bot works - much more reliable for large files
    console.log(`📤 Creating MessageMedia from URL: ${link} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
    
    // Determine MIME type based on extension
    let mimeType: string;
    if (isAudio) {
      mimeType = found.ext === "mp3" ? "audio/mpeg" : 
                 found.ext === "m4a" ? "audio/mp4" :
                 found.ext === "ogg" ? "audio/ogg" :
                 found.ext === "opus" ? "audio/opus" : "audio/mpeg";
    } else {
      mimeType = found.ext === "mp4" ? "video/mp4" :
                 found.ext === "webm" ? "video/webm" :
                 found.ext === "mkv" ? "video/x-matroska" : "video/mp4";
    }
    
    let media;
    let usedFromUrl = false; // Track if we used fromUrl (file will be consumed/deleted)
    
    // Check if we have a valid base URL
    // For local dev with localhost, we'll try fromUrl (it should work if server is accessible)
    // Only skip fromUrl if the URL is clearly invalid (like "yourdomain.com" placeholder)
    const isValidUrl = opts.baseUrl && 
                       !opts.baseUrl.includes('yourdomain.com') && 
                       (opts.baseUrl.startsWith('http://') || opts.baseUrl.startsWith('https://'));
    
    // For localhost, fromUrl should work if the server is running
    // WhatsApp Web.js running in Puppeteer can access localhost URLs
    
    // Try fromUrl only if we have a valid public URL
    // For local dev, always use base64 to avoid network issues
    if (isValidUrl && MessageMedia.fromUrl && typeof MessageMedia.fromUrl === 'function') {
      try {
        // Add ?bot=true query param to prevent immediate file deletion
        // The download endpoint will keep the file for bot fetches
        const botLink = link.includes('?') ? `${link}&bot=true` : `${link}?bot=true`;
        console.log(`📤 Attempting to fetch file from URL: ${botLink}`);
        media = await MessageMedia.fromUrl(botLink, { unsafeMime: true });
        // Override MIME type if needed (fromUrl might detect it incorrectly)
        if (media.mimetype !== mimeType) {
          media.mimetype = mimeType;
        }
        usedFromUrl = true; // Mark that we used fromUrl (file will NOT be deleted by endpoint)
        console.log(`✅ Successfully created MessageMedia from URL (MIME: ${mimeType})`);
      } catch (urlError: any) {
        // If fromUrl fails (network issues, redirects, etc.), fall back to base64 immediately
        console.warn(`⚠️ fromUrl failed (${urlError?.message}), using base64 method instead`);
        // Don't throw - continue to base64 fallback below
        const fileBuffer = fs.readFileSync(found.filePath);
        const base64Data = fileBuffer.toString("base64");
        media = new MessageMedia(mimeType, base64Data, name);
        console.log(`✅ Created MessageMedia from base64 (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
      }
    } else {
      // Use base64 for local dev or when URL is invalid
      if (!isValidUrl) {
        console.log(`📤 Using base64 method (local dev or invalid baseUrl: ${opts.baseUrl || 'none'})`);
      } else {
        console.log(`📤 Using base64 method (fromUrl not available)`);
      }
      const fileBuffer = fs.readFileSync(found.filePath);
      const base64Data = fileBuffer.toString("base64");
      media = new MessageMedia(mimeType, base64Data, name);
      console.log(`✅ Created MessageMedia from base64 (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
    }
    
    // Send the media with caption
    console.log(`📤 Sending ${isAudio ? 'audio' : 'video'} file to WhatsApp: ${name}`);
    let fileSentSuccessfully = false;
    try {
      await whatsappClient.sendMessage(opts.chatId, media, { caption: `✅ ${name}` });
      console.log(`✅ Successfully sent ${isAudio ? 'audio' : 'video'} file directly to WhatsApp: ${name} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
      fileSentSuccessfully = true;
      
      // Delete file after successful send (with delay to ensure delivery)
      setTimeout(() => {
        try {
          if (fs.existsSync(found.filePath)) {
            const deleted = deleteFileIfExists(found.filePath);
            if (deleted) {
              console.log(`🗑️ Deleted file after successful WhatsApp send: ${found.filePath}`);
              storage.markDownloadExpired(opts.downloadId).catch(() => {});
            }
          }
        } catch (error) {
          console.error("Error deleting file after successful send:", error);
        }
      }, 5000); // Wait 5 seconds to ensure file was sent successfully
      
      return; // Successfully sent, don't send link
    } catch (sendError: any) {
      // If sendMessage fails (especially with "t: t" Puppeteer error for large files),
      // try falling back to base64 method ONLY if file still exists (not consumed by fromUrl)
      if (sendError?.message === 't' || sendError?.name === 't' || 
          (sendError?.stack && sendError.stack.includes('ExecutionContext'))) {
        console.warn(`⚠️ sendMessage failed with Puppeteer error`);
        
        // Try base64 fallback if file still exists
        // Note: Even if fromUrl was used, the file should still exist (bot fetches don't delete immediately)
        if (fs.existsSync(found.filePath)) {
          try {
            // Fall back to base64 - read file and create new MessageMedia
            console.log(`📤 Retrying with base64 method (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
            const fileBuffer = fs.readFileSync(found.filePath);
            const base64Data = fileBuffer.toString("base64");
            const base64Media = new MessageMedia(mimeType, base64Data, name);
            
            await whatsappClient.sendMessage(opts.chatId, base64Media, { caption: `✅ ${name}` });
            console.log(`✅ Successfully sent ${isAudio ? 'audio' : 'video'} file using base64: ${name}`);
            fileSentSuccessfully = true;
            
            // Delete file after successful base64 send
            setTimeout(() => {
              try {
                if (fs.existsSync(found.filePath)) {
                  const deleted = deleteFileIfExists(found.filePath);
                  if (deleted) {
                    console.log(`🗑️ Deleted file after successful WhatsApp send (base64): ${found.filePath}`);
                    storage.markDownloadExpired(opts.downloadId).catch(() => {});
                  }
                }
              } catch (error) {
                console.error("Error deleting file after successful base64 send:", error);
              }
            }, 5000);
            
            return; // Successfully sent with base64
          } catch (base64Error: any) {
            console.error("❌ Base64 method also failed:", base64Error?.message);
            // Re-throw to trigger the outer catch block that sends the link
            throw new Error(`All sending methods failed. Original: ${sendError?.message}, Base64: ${base64Error?.message}`);
          }
        } else {
          console.warn(`⚠️ Cannot retry with base64 - file was consumed by fromUrl or doesn't exist`);
          // Re-throw to trigger the outer catch block that sends the link
          throw new Error(`File not available for base64 fallback. Original error: ${sendError?.message}`);
        }
      } else {
        // Re-throw if it's not a Puppeteer error
        throw sendError;
      }
    }
  } catch (error: any) {
    console.error("❌ Error sending file to WhatsApp:", error);
    console.error("Error details:", {
      message: error?.message,
      stack: error?.stack,
      code: error?.code,
      name: error?.name
    });
    
    // Final fallback: send download link
    // Don't delete file here - let user download it, then delete after download
    // Or let expiry system handle it if user doesn't download
    console.log(`📤 Falling back to sending download link instead`);
    await whatsappClient.sendMessage(opts.chatId, `✅ Ready! Download here:\n${link}\n\n📥 The file will be available for download. It will be automatically removed after you download it or after it expires.`);
    
    // File will be deleted by:
    // 1. Download endpoint when user actually downloads via browser (res.on('finish') with !isBotFetch)
    // 2. File cleanup service after expiry if user doesn't download
  }
}

async function startDownloadFlow(opts: {
  chatId: string;
  whatsappId: string;
  username?: string | null;
  url: string;
  format: string;
  quality: string;
  formatId?: string;
}) {
  const { chatId, whatsappId, username, url, format, quality, formatId } = opts;
  
  // Normalize whatsappId before storing
  const normalizedWhatsappId = normalizeWhatsAppId(whatsappId);

  await storage.getOrCreateWhatsAppUser({ whatsappId: normalizedWhatsappId, username });

  const entitlement = await assertWhatsAppCanDownload(normalizedWhatsappId);
  if (!entitlement.allowed) {
    await sendSubscribePrompt(chatId, entitlement.resetAt.toISOString());
    return;
  }

  const u = await storage.getOrCreateWhatsAppUser({ whatsappId: normalizedWhatsappId, username });
  if (!u.isPremium) {
    await consumeWhatsAppFreeDownload(normalizedWhatsappId);
  }

  await maybeSendAd(chatId);

  const platform = downloadService.detectPlatform(url);
  if (!platform) {
    if (!whatsappClient) return;
    await whatsappClient.sendMessage(chatId, "Unsupported or invalid URL.");
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

  if (!whatsappClient) return;
  let statusMsg = await whatsappClient.sendMessage(chatId, `Starting…\n${progressBar(0)}`);

  downloadService.processDownload(downloadId, url, format, quality, formatId).catch(async () => {
    try {
      if (whatsappClient && statusMsg) {
        await statusMsg.edit(`Failed.\n${progressBar(100)}`);
      }
    } catch {
      // ignore
    }
  });

  let lastText = "";
  const startedAt = Date.now();

  for (;;) {
    const snap = downloadProgressStore.get(downloadId);
    const stage = snap?.stage || "processing";
    const pct = typeof snap?.percent === "number" ? snap.percent : 0;

    const nextText = `${stage.replace(/_/g, " ")}:\n${progressBar(pct)}${snap?.message ? `\n${snap.message}` : ""}`;

    if (nextText !== lastText && whatsappClient && statusMsg) {
      lastText = nextText;
      try {
        await statusMsg.edit(nextText);
      } catch {
        // editing can fail if message is too old or unchanged; ignore
      }
    }

    if (stage === "completed") {
      const baseUrl = getBaseUrl();
      const d = await storage.getDownload(downloadId);
      await sendFileToWhatsAppOrLink({
        chatId,
        downloadId,
        baseUrl,
        title: (d as any)?.title ?? null,
      });
      
      // File deletion is now handled inside sendFileToWhatsAppOrLink:
      // - If sent successfully (fromUrl or base64) → delete after 5 seconds
      // - If link is sent → delete after user downloads or expiry
      // No need to delete here anymore
      
      return;
    }

    if (stage === "failed") {
      if (!whatsappClient) return;
      await whatsappClient.sendMessage(chatId, "❌ Download failed. Try another link or format.");
      return;
    }

    if (Date.now() - startedAt > 15 * 60 * 1000) {
      if (!whatsappClient) return;
      await whatsappClient.sendMessage(chatId, "Timed out. Please try again.");
      return;
    }

    await new Promise((r) => setTimeout(r, 1100));
  }
}

// Normalize WhatsApp ID (remove @c.us, @s.whatsapp.net, etc.)
function normalizeWhatsAppId(id: string): string {
  return id.split('@')[0];
}

async function handleWhatsAppMessage(message: any) {
  try {
    const chatId = message.from;
    const whatsappId = normalizeWhatsAppId(message.from); // Normalize ID
    
    // Get message body - try multiple ways to get it
    let body = message.body?.trim() || "";
    
    // If body is empty, try to fetch it from the message
    if (!body && message.hasMedia === false) {
      try {
        // Try to get the body from the message object
        body = (await message.getBody?.())?.trim() || message.bodyText?.trim() || "";
      } catch (e) {
        // Ignore errors
      }
    }
    
    const contact = await message.getContact();
    const username = contact.pushname || contact.number || null;

    console.log(`📨 Processing WhatsApp message from ${whatsappId}: "${body.substring(0, 50)}"`);
    console.log(`📨 Bot initialized: ${isInitialized}, Client exists: ${!!whatsappClient}`);
    console.log(`📨 Message type: ${message.type}, Has body: ${!!body}, Body length: ${body.length}`);

    // Check if this is a format selection reply FIRST (before processing commands)
    const formatKey = pendingKey(chatId, whatsappId);
    const st = pending.get(formatKey);
    if (st && Date.now() - st.createdAt < 10 * 60 * 1000) {
      const bodyLower = body.toLowerCase();
      if (bodyLower === "cancel") {
        pending.delete(formatKey);
        if (!whatsappClient) return;
        await whatsappClient.sendMessage(chatId, "Cancelled.");
        return;
      }
      const num = parseInt(body);
      if (!isNaN(num) && num >= 1 && num <= st.options.length) {
        const chosen = st.options[num - 1];
        
        // Check if free user is trying to download 4K or >1080p
        // Respect DEV_BYPASS_PREMIUM setting for testing
        const normalizedWhatsappId = normalizeWhatsAppId(whatsappId);
        const user = await storage.getOrCreateWhatsAppUser({ whatsappId: normalizedWhatsappId, username });
        
        // Only enforce premium restrictions if premium is enforced (DEV_BYPASS_PREMIUM=false)
        if (isPremiumEnforced() && !user.isPremium) {
          const quality = chosen.quality.toLowerCase();
          const is4K = quality.includes('2160') || quality.includes('4k');
          const isAbove1080p = /(\d+)p/.test(quality) && parseInt(quality.match(/(\d+)p/)?.[1] || '0') > 1080;
          
          if (is4K || isAbove1080p) {
            pending.delete(formatKey);
            if (!whatsappClient) return;
            await whatsappClient.sendMessage(
              chatId,
              `❌ *Premium Required*\n\n${is4K ? '4K (2160p)' : 'High quality (>1080p)'} downloads are available for Premium users only.\n\n✨ *Upgrade to Premium to access:*\n• 4K quality videos\n• Unlimited downloads\n• Faster processing\n• No ads\n\nUse /premium to learn more or visit our website to subscribe.`
            );
            return;
          }
        }
        
        pending.delete(formatKey);
        console.log(`✅ Format selected: ${chosen.label} for ${st.url}`);
        await startDownloadFlow({
          chatId,
          whatsappId,
          username,
          url: st.url,
          format: chosen.format,
          quality: chosen.quality,
          formatId: chosen.formatId,
        });
        return;
      }
    }

    if (body.startsWith("/start")) {
      if (!whatsappClient) {
        console.error("❌ WhatsApp client not initialized!");
        return;
      }
      
      if (!isInitialized) {
        console.error("❌ WhatsApp bot not ready yet! Please wait for authentication.");
        try {
          await whatsappClient.sendMessage(chatId, "⏳ Bot is still connecting. Please wait a moment and try again.");
        } catch (e) {
          // Ignore send errors
        }
        return;
      }
      
      console.log(`✅ Processing /start command from ${whatsappId}`);
      
      try {
        const normalizedWhatsappId = normalizeWhatsAppId(whatsappId);
        const user = await storage.getOrCreateWhatsAppUser({ whatsappId: normalizedWhatsappId, username });
        const limit = getWhatsAppFreeLimit();
        const web = getBaseUrl();
        const subscribeUrl = process.env.WHATSAPP_SUBSCRIBE_URL || (web ? `${web}/subscribe` : undefined);
        
        // Get user's current usage
        const userUsage = await storage.getWhatsAppUserUsage(normalizedWhatsappId);
        const remaining = Math.max(0, limit - (userUsage?.count || 0));
        const windowDays = Number(process.env.WHATSAPP_FREE_WINDOW_DAYS || 1);
        
        const welcomeMessage = [
          "👋 *Welcome to SaveMedia Bot!*",
          "",
          "📥 *What I Can Do:*",
          "• Download videos from TikTok, Instagram, YouTube, Facebook, Twitter/X",
          "• Extract audio (MP3) from videos",
          "• Support multiple quality options (SD, HD, Full HD, 4K)",
          "• No watermarks on downloaded videos",
          "",
          "📊 *Your Usage:*",
          `• Remaining downloads: *${remaining}* out of *${limit}*`,
          `• Resets every *${windowDays} days*`,
          user?.isPremium ? "• ⭐ *Premium Active* - Unlimited downloads!" : "",
          "",
          "🆓 *Free Plan Limits:*",
          `• *${limit} downloads* per ${windowDays} days`,
          "• Standard quality (up to 1080p)",
          "• Basic download speed",
          "• Ad messages between downloads",
          "",
          "⭐ *Premium Plan - $9.99/month:*",
          "• ✨ *Unlimited downloads*",
          "• 🎬 4K quality available",
          "• ⚡ Faster download speed",
          "• 🚫 No ads",
          "• 📦 Batch downloads",
          "",
          "💳 *Subscribe to Premium:*",
          subscribeUrl ? `👉 ${subscribeUrl}` : "Contact support for premium access",
          "",
          "📋 *Commands:*",
          "• /start - Show this message",
          "• /premium - Premium details",
          "• /redeem <code> - Redeem premium code",
          "",
          "🚀 *How to Use:*",
          "Just send me any video link and I'll download it for you!",
          "",
          "Example: Send a TikTok, Instagram, or YouTube link.",
        ].filter(Boolean).join("\n");
        
        console.log(`📤 Sending welcome message to ${chatId}...`);
        await whatsappClient.sendMessage(chatId, welcomeMessage);
        console.log(`✅ Welcome message sent successfully to ${chatId}`);
        return;
      } catch (error) {
        console.error(`❌ Error handling /start command for ${chatId}:`, error);
        // Try to send an error message to the user
        try {
          if (whatsappClient) {
            await whatsappClient.sendMessage(chatId, "Sorry, there was an error processing your request. Please try again.");
          }
        } catch (sendError) {
          console.error(`❌ Failed to send error message to ${chatId}:`, sendError);
        }
        return;
      }
    }

    if (body.startsWith("/redeem")) {
      const parts = body.trim().split(/\s+/);
      const code = parts[1];
      if (!code) {
        if (!whatsappClient) return;
        await whatsappClient.sendMessage(chatId, "Usage: /redeem <code>");
        return;
      }
      const r = await redeemWhatsAppPremiumCode({ whatsappId, code });
      if (!r.ok) {
        if (!whatsappClient) return;
        await whatsappClient.sendMessage(chatId, `Redeem failed: ${r.reason || "invalid code"}`);
        return;
      }
      if (!whatsappClient) return;
      await whatsappClient.sendMessage(chatId, "✅ Premium activated for this WhatsApp account!");
      return;
    }

    if (body.startsWith("/premium")) {
      const web = getBaseUrl();
      const subscribeUrl = process.env.WHATSAPP_SUBSCRIBE_URL || (web ? `${web}/subscribe` : undefined);
      if (!whatsappClient) return;
      
      const premiumMessage = [
        "⭐ *Premium Plan Features:*",
        "",
        "✨ *Unlimited Downloads*",
        "Download as many videos as you want, no limits!",
        "",
        "🎬 *4K Quality*",
        "Get the highest quality videos available (up to 2160p)",
        "",
        "⚡ *Faster Downloads*",
        "Priority processing for faster download speeds",
        "",
        "🚫 *Ad-Free Experience*",
        "No promotional messages between downloads",
        "",
        "📦 *Batch Downloads*",
        "Download multiple videos at once",
        "",
        "💳 *Pricing:*",
        "• Monthly: $9.99/month",
        "• Cancel anytime",
        "",
        "🔗 *Upgrade Now:*",
        subscribeUrl ? subscribeUrl : "Contact support for premium access",
        "",
        "💡 *Premium codes available from admin*",
        "Use /redeem <code> to activate premium with a code",
      ].join("\n");
      
      await whatsappClient.sendMessage(chatId, premiumMessage);
      return;
    }

    if (body.startsWith("/link")) {
      const base = getBaseUrl();
      if (!base) {
        if (!whatsappClient) return;
        await whatsappClient.sendMessage(chatId, "Linking is not available (PUBLIC_BASE_URL is not configured).");
        return;
      }

      const normalizedWhatsappId = normalizeWhatsAppId(whatsappId);
      await storage.getOrCreateWhatsAppUser({ whatsappId: normalizedWhatsappId, username });

      const { url, expiresAt } = await createWhatsAppPairLink({ whatsappId: normalizedWhatsappId, baseUrl: base });
      if (!whatsappClient) return;
      await whatsappClient.sendMessage(
        chatId,
        `To link your WhatsApp to your SaveMedia account, open this link and sign in.\n\n${url}\n\nLink expires at: ${expiresAt.toISOString()}`
      );
      return;
    }

    // URL flow
    const url = extractUrl(body);
    if (!url) {
      if (!whatsappClient) return;
      await whatsappClient.sendMessage(chatId, "Send a valid URL (starting with http/https).");
      return;
    }

    const normalizedWhatsappId = normalizeWhatsAppId(whatsappId);
    const entitlement = await assertWhatsAppCanDownload(normalizedWhatsappId);
    if (!entitlement.allowed) {
      await sendSubscribePrompt(chatId, entitlement.resetAt.toISOString());
      return;
    }

    let probe;
    try {
      probe = await probeUrl(url);
    } catch (error) {
      console.error("Error probing URL:", error);
      if (!whatsappClient) return;
      
      let errorMessage = "❌ Error processing URL.";
      
      if (error instanceof Error) {
        const errorMsg = error.message;
        
        // yt-dlp installation error
        if (errorMsg.includes('yt-dlp is not installed')) {
          errorMessage = "❌ Error: yt-dlp is not installed on the server.\n\nPlease contact the administrator to install yt-dlp.\n\nInstallation: https://github.com/yt-dlp/yt-dlp";
        }
        // TikTok authentication required
        else if (errorMsg.includes('TIKTOK_AUTH_REQUIRED')) {
          errorMessage = "❌ *TikTok Authentication Required*\n\nThis TikTok video requires login credentials to download. Some videos are:\n• Age-restricted\n• Private\n• Require authentication\n\nUnfortunately, we cannot download videos that require login. Please try a different video or contact support if this persists.";
        }
        // Age-restricted content
        else if (errorMsg.includes('AGE_RESTRICTED')) {
          errorMessage = "❌ *Age-Restricted Content*\n\nThis video is age-restricted and requires authentication to download. We cannot download age-restricted content without login credentials.";
        }
        // Content unavailable
        else if (errorMsg.includes('CONTENT_UNAVAILABLE')) {
          errorMessage = "❌ *Content Unavailable*\n\nThis video is:\n• Private\n• Removed\n• Unavailable\n• Not accessible\n\nPlease check the URL and try again with a different video.";
        }
        // Generic authentication required
        else if (errorMsg.includes('AUTH_REQUIRED')) {
          errorMessage = "❌ *Authentication Required*\n\nThis content requires login credentials to download. We cannot download content that requires authentication.";
        }
        // Generic download error
        else if (errorMsg.includes('DOWNLOAD_ERROR:')) {
          const cleanError = errorMsg.replace('DOWNLOAD_ERROR:', '').trim();
          errorMessage = `❌ *Download Error*\n\n${cleanError}\n\nPlease try again or contact support if the issue persists.`;
        }
        // Other errors
        else {
          errorMessage = `❌ *Error Processing URL*\n\n${errorMsg}\n\nPlease try again or contact support if the issue persists.`;
        }
      }
      
      await whatsappClient.sendMessage(chatId, errorMessage);
      return;
    }
    
    if (probe.platform === "unknown" || probe.options.length === 0) {
      if (!whatsappClient) return;
      await whatsappClient.sendMessage(chatId, "Couldn't find formats for that link.");
      return;
    }

    const options = buildOptionsForWhatsApp(probe);
    const key = pendingKey(chatId, whatsappId);
    pending.set(key, { url, options, createdAt: Date.now() });

    // WhatsApp doesn't support inline buttons like Telegram, so we'll send options as numbered list
    const optionsText = options.map((o, i) => `${i + 1}. ${o.label}`).join("\n");
    if (!whatsappClient) return;
    await whatsappClient.sendMessage(
      chatId,
      `Choose a format for: ${probe.title || "this media"}\n\n${optionsText}\n\nReply with the number (1-${options.length}) or "cancel" to cancel.`
    );
  } catch (error) {
    console.error("WhatsApp message handling error:", error);
    // Try to send an error message to the user
    try {
      if (whatsappClient && message?.from) {
        await whatsappClient.sendMessage(message.from, "Sorry, there was an error processing your message. Please try again.");
      }
    } catch (sendError) {
      // Silently fail if we can't send error message
    }
  }
}

export async function initializeWhatsAppBot(): Promise<void> {
  // If already initialized and client exists, don't re-initialize
  if (isInitialized && whatsappClient) {
    console.log("WhatsApp bot already initialized");
    return;
  }
  
  // If client exists but not initialized, destroy it first
  if (whatsappClient && !isInitialized) {
    console.log("Cleaning up existing client before re-initialization...");
    try {
      await whatsappClient.destroy().catch(() => {});
    } catch (error) {
      // Ignore errors during cleanup
    }
    whatsappClient = null;
  }

  console.log("Initializing WhatsApp bot...");
  console.log("WHATSAPP_ENABLED:", process.env.WHATSAPP_ENABLED);
  console.log("WHATSAPP_PROXY:", process.env.WHATSAPP_PROXY || "none");

  // Dynamic import for ESM compatibility (whatsapp-web.js is CommonJS)
  const whatsappWeb = await import("whatsapp-web.js");
  // Handle both default and named exports
  const moduleExports = (whatsappWeb as any).default || whatsappWeb;
  const { Client, LocalAuth } = moduleExports;

  if (!Client || !LocalAuth) {
    throw new Error("Client or LocalAuth not found in whatsapp-web.js. Make sure the package is installed correctly.");
  }

  const dataPath = process.env.WHATSAPP_DATA_PATH || path.join(process.cwd(), ".wwebjs_auth");
  console.log("WhatsApp data path:", dataPath);
  
  whatsappClient = new Client({
    authStrategy: new LocalAuth({
      dataPath,
    }),
    puppeteer: {
      headless: true,
      args: process.env.WHATSAPP_PROXY ? [`--proxy-server=${process.env.WHATSAPP_PROXY}`] : [],
    },
  });

  whatsappClient.on("qr", async (qr: string) => {
    console.log("\n" + "=".repeat(60));
    console.log("=== WhatsApp QR Code (Scan with your phone) ===");
    console.log("=".repeat(60));
    currentQRCode = qr;
    
    // Generate QR code for terminal
    try {
      const qrcodeModule = await import("qrcode-terminal");
      const qrcode = qrcodeModule.default || qrcodeModule;
      if (qrcode && typeof qrcode.generate === 'function') {
        qrcode.generate(qr, { small: true });
      } else {
        throw new Error("qrcode.generate is not a function");
      }
    } catch (error) {
      console.error("Failed to generate QR code in terminal:", error);
      console.log("\nQR Code Data (first 50 chars):", qr.substring(0, 50) + "...");
      console.log("Visit http://localhost:5173/whatsapp-setup to see the QR code in the browser");
    }
    
    console.log("\n" + "=".repeat(60));
    console.log("Scan the QR code above with WhatsApp");
    console.log("Or visit: http://localhost:5173/whatsapp-setup (or your frontend URL)");
    console.log("=".repeat(60) + "\n");
    
    // Notify all listeners
    qrCodeListeners.forEach(listener => {
      try {
        listener(qr);
      } catch (error) {
        console.error("Error notifying QR code listener:", error);
      }
    });
  });

  whatsappClient.on("ready", async () => {
    console.log("✅ WhatsApp bot is ready and authenticated!");
    isInitialized = true;
    currentQRCode = null; // Clear QR code once authenticated
    
    // Get the bot's own WhatsApp number
    try {
      const botInfo = await whatsappClient.info;
      botWhatsAppNumber = botInfo?.wid?.user || null;
      const botFullId = botInfo?.wid?._serialized || null;
      console.log(`📱 Bot WhatsApp number: ${botWhatsAppNumber || 'unknown'}`);
      console.log(`📱 Bot full ID: ${botFullId || 'unknown'}`);
    } catch (error) {
      console.error("Failed to get bot WhatsApp number:", error);
    }
    
    // Notify listeners that QR code is no longer needed
    qrCodeListeners.forEach(listener => {
      try {
        listener(""); // Empty string means authenticated
      } catch (error) {
        console.error("Error notifying QR code listener:", error);
      }
    });
  });

  whatsappClient.on("authenticated", () => {
    console.log("✅ WhatsApp bot authenticated successfully");
  });

  whatsappClient.on("auth_failure", (msg: string) => {
    console.error("❌ WhatsApp authentication failure:", msg);
    isInitialized = false;
  });

  whatsappClient.on("disconnected", (reason: string) => {
    console.log("⚠️ WhatsApp bot disconnected:", reason);
    isInitialized = false;
  });

  whatsappClient.on("message", async (message: any) => {
    // Log ALL incoming messages for debugging
    console.log(`\n🔔 WhatsApp message event triggered`);
    console.log(`   From: ${message.from}`);
    console.log(`   Body: ${message.body?.substring(0, 100) || '(no body)'}`);
    console.log(`   Type: ${message.type}`);
    console.log(`   FromMe: ${message.fromMe}`);
    console.log(`   IsGroup: ${message.isGroup || 'unknown'}`);
    console.log(`   Bot Ready: ${isInitialized}`);
    
    // Only handle messages from non-group chats
    if (message.from === "status@broadcast") {
      console.log(`⚠️ Ignoring status broadcast message`);
      return;
    }
    
    try {
      const chat = await message.getChat();
      const isGroup = chat.isGroup || false;
      
      if (isGroup) {
        console.log(`⚠️ Ignoring group message from ${message.from}`);
        return;
      }

      console.log(`📨 Processing message from ${message.from}: "${message.body?.substring(0, 50)}"`);
      console.log(`📨 Message type: ${message.type}, Is from me: ${message.fromMe}, Bot ready: ${isInitialized}`);
      console.log(`📨 Bot's number: ${botWhatsAppNumber}, Message from: ${message.from}`);
      
      // Check if this is a message sent BY the bot itself (ignore bot's own sent messages)
      // When you message yourself, WhatsApp marks it as fromMe, but we still want to process it
      const messageFrom = message.from.split('@')[0]; // Remove @s.whatsapp.net or @c.us
      const botNumber = botWhatsAppNumber;
      
      if (message.fromMe) {
        // Check if this is actually a self-message (user messaging their own bot)
        if (botNumber && messageFrom === botNumber) {
          console.log(`ℹ️ Self-message detected (you messaging your own bot account)`);
          // Allow self-messages to be processed
        } else {
          // This is a message sent BY the bot (bot's own sent messages), ignore it completely
          console.log(`⚠️ Ignoring message sent by bot itself (not a self-message)`);
          console.log(`   Message from: ${messageFrom}, Bot number: ${botNumber}`);
          return;
        }
      }
      
      // Also check if message is from bot's own number (even if not marked as fromMe)
      // This handles cases where bot messages itself
      if (botNumber && messageFrom === botNumber && message.fromMe) {
        // This is the bot messaging itself - ignore it
        console.log(`⚠️ Ignoring bot's own message to itself`);
        return;
      }
      
      // Check if bot is ready
      if (!isInitialized) {
        console.log(`⚠️ Bot not ready yet, ignoring message`);
        try {
          if (whatsappClient) {
            await whatsappClient.sendMessage(message.from, "⏳ Bot is still connecting. Please wait a moment and try again.");
          }
        } catch (e) {
          console.error("Failed to send 'not ready' message:", e);
        }
        return;
      }
      
      // Check if message has a body before processing
      const messageBody = message.body?.trim() || "";
      if (!messageBody && message.type !== 'image' && message.type !== 'video' && message.type !== 'audio' && message.type !== 'document') {
        console.log(`⚠️ Message has no body, skipping...`);
        return;
      }
      
      console.log(`✅ Bot is ready, processing message...`);
      await handleWhatsAppMessage(message);
      console.log(`✅ Message processing completed`);
    } catch (error) {
      console.error("❌ WhatsApp message event error:", error);
      console.error("Error stack:", error instanceof Error ? error.stack : String(error));
    }
  });

  whatsappClient.on("message_create", async (message: any) => {
    // ONLY handle format selection replies (when user replies with a number)
    // Commands and URLs are handled by the "message" event to avoid duplicates
    if (message.from === "status@broadcast") return;
    
    // Ignore messages sent by the bot itself (except self-messages for format selection)
    if (message.fromMe) {
      const messageFrom = message.from.split('@')[0];
      // Only process if it's a self-message AND it's a format selection reply
      if (!botWhatsAppNumber || messageFrom !== botWhatsAppNumber) {
        return; // Ignore bot's own sent messages
      }
    }
    
    const chat = await message.getChat();
    if (chat.isGroup) return;

    const body = message.body?.trim() || "";
    const bodyLower = body.toLowerCase();
    const whatsappId = normalizeWhatsAppId(message.from); // Normalize ID
    const chatId = message.from; // Keep original for sending messages

    // ONLY check for format selection replies - don't process commands/URLs here
    const key = pendingKey(chatId, whatsappId);
    const st = pending.get(key);
    
    if (st && Date.now() - st.createdAt < 10 * 60 * 1000) {
      if (bodyLower === "cancel") {
        pending.delete(key);
        if (!whatsappClient) return;
        await whatsappClient.sendMessage(chatId, "Cancelled.");
        return;
      }

      const num = parseInt(body);
      if (!isNaN(num) && num >= 1 && num <= st.options.length) {
        const chosen = st.options[num - 1];
        pending.delete(key);

        const contact = await message.getContact();
        const username = contact.pushname || contact.number || null;

        // Check if free user is trying to download 4K or >1080p
        // Respect DEV_BYPASS_PREMIUM setting for testing
        const normalizedWhatsappId = normalizeWhatsAppId(whatsappId);
        const user = await storage.getOrCreateWhatsAppUser({ whatsappId: normalizedWhatsappId, username });
        
        // Only enforce premium restrictions if premium is enforced (DEV_BYPASS_PREMIUM=false)
        if (isPremiumEnforced() && !user.isPremium) {
          const quality = chosen.quality.toLowerCase();
          const is4K = quality.includes('2160') || quality.includes('4k');
          const isAbove1080p = /(\d+)p/.test(quality) && parseInt(quality.match(/(\d+)p/)?.[1] || '0') > 1080;
          
          if (is4K || isAbove1080p) {
            pending.delete(key);
            if (!whatsappClient) return;
            await whatsappClient.sendMessage(
              chatId,
              `❌ *Premium Required*\n\n${is4K ? '4K (2160p)' : 'High quality (>1080p)'} downloads are available for Premium users only.\n\n✨ *Upgrade to Premium to access:*\n• 4K quality videos\n• Unlimited downloads\n• Faster processing\n• No ads\n\nUse /premium to learn more or visit our website to subscribe.`
            );
            return;
          }
        }

        console.log(`✅ Format selected in message_create: ${chosen.label} for ${st.url}`);
        await startDownloadFlow({
          chatId,
          whatsappId,
          username,
          url: st.url,
          format: chosen.format,
          quality: chosen.quality,
          formatId: chosen.formatId,
        });
        return;
      }
    }
    
    // Don't process commands/URLs here - let the "message" event handle them
    // This prevents duplicate processing
  });

  await whatsappClient.initialize();
}

export function getWhatsAppClient(): any {
  return whatsappClient;
}

export function getCurrentQRCode(): string | null {
  return currentQRCode;
}

export function isWhatsAppReady(): boolean {
  return isInitialized && !!whatsappClient;
}

export function addQRCodeListener(listener: (qr: string) => void): () => void {
  qrCodeListeners.push(listener);
  // Return unsubscribe function
  return () => {
    const index = qrCodeListeners.indexOf(listener);
    if (index > -1) {
      qrCodeListeners.splice(index, 1);
    }
  };
}

export async function logoutWhatsAppBot(): Promise<{ success: boolean; message: string }> {
  try {
    if (!whatsappClient) {
      return { success: false, message: "WhatsApp bot is not initialized" };
    }

    console.log("🔌 Logging out WhatsApp bot...");

    // Logout from WhatsApp Web
    try {
      await whatsappClient.logout();
      console.log("✅ Logged out from WhatsApp Web");
    } catch (error) {
      console.error("Error during logout:", error);
      // Continue with cleanup even if logout fails
    }

    // Destroy the client
    try {
      await whatsappClient.destroy();
      console.log("✅ WhatsApp client destroyed");
    } catch (error) {
      console.error("Error destroying client:", error);
    }

    // Clear the client reference
    whatsappClient = null;
    isInitialized = false;
    botWhatsAppNumber = null;
    currentQRCode = null;

    // Clear all listeners
    qrCodeListeners = [];

    // Delete the auth folder to clear session data
    const dataPath = process.env.WHATSAPP_DATA_PATH || path.join(process.cwd(), ".wwebjs_auth");
    try {
      if (fs.existsSync(dataPath)) {
        fs.rmSync(dataPath, { recursive: true, force: true });
        console.log(`✅ Deleted auth folder: ${dataPath}`);
      }
    } catch (error) {
      console.error("Error deleting auth folder:", error);
      // Don't fail if we can't delete the folder
    }

    console.log("✅ WhatsApp bot logged out successfully");
    
    // Re-initialize the bot to generate a new QR code
    console.log("🔄 Re-initializing WhatsApp bot to generate new QR code...");
    try {
      await initializeWhatsAppBot();
      console.log("✅ WhatsApp bot re-initialized, new QR code should be available soon");
    } catch (error) {
      console.error("⚠️ Failed to re-initialize bot after logout:", error);
      // Don't fail the logout if re-initialization fails
    }
    
    return { success: true, message: "WhatsApp bot logged out successfully. A new QR code will be available shortly." };
  } catch (error) {
    console.error("❌ Error logging out WhatsApp bot:", error);
    return { success: false, message: `Failed to logout: ${error instanceof Error ? error.message : String(error)}` };
  }
}
