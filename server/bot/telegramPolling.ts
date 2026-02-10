/**
 * Telegram Bot Polling Service
 * Use this for local development when you don't have a public webhook URL
 */

import { handleTelegramWebhook } from "./telegramBot";
import { HttpsProxyAgent } from "https-proxy-agent";

const TELEGRAM_API = "https://api.telegram.org";
let isPolling = false;
let lastUpdateId = 0;

function envToken(): string {
  const t = process.env.TELEGRAM_BOT_TOKEN;
  if (!t) throw new Error("TELEGRAM_BOT_TOKEN is not set");
  return t;
}

async function tgCall(method: string, payload: any): Promise<any> {
  const token = envToken();
  const proxyUrl = process.env.TELEGRAM_PROXY;

  const fetchOptions: any = {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  };

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

async function getUpdates(offset: number = 0): Promise<any[]> {
  try {
    const updates = await tgCall("getUpdates", {
      offset,
      timeout: 30, // Long polling timeout
      allowed_updates: ["message", "callback_query"],
    });
    return updates || [];
  } catch (error: any) {
    console.error("❌ Failed to get updates:", error.message);
    return [];
  }
}

async function processUpdate(update: any, fakeReq: any) {
  try {
    await handleTelegramWebhook(fakeReq, update);
  } catch (error: any) {
    console.error("❌ Error processing update:", error.message);
  }
}

export async function startPolling() {
  if (isPolling) {
    console.log("⚠️  Polling is already running");
    return;
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error("❌ TELEGRAM_BOT_TOKEN is not set");
    return;
  }

  console.log("\n🤖 Starting Telegram Bot in Polling Mode");
  console.log("━".repeat(50));

  // Create fake request object for handleTelegramWebhook
  const fakeReq: any = {
    headers: {
      host: process.env.PUBLIC_BASE_URL?.replace(/^https?:\/\//, "") || "localhost:5006",
      "x-forwarded-proto": process.env.PUBLIC_BASE_URL?.startsWith("https") ? "https" : "http"
    },
    protocol: process.env.PUBLIC_BASE_URL?.startsWith("https") ? "https" : "http",
  };

  // Delete webhook to ensure we can use polling
  try {
    await tgCall("deleteWebhook", { drop_pending_updates: false });
    console.log("✅ Webhook deleted (polling mode enabled)");
  } catch (error: any) {
    console.log("⚠️  Could not delete webhook:", error.message);
  }

  // Get bot info
  try {
    const botInfo = await tgCall("getMe", {});
    console.log(`✅ Bot connected: @${botInfo.username}`);
    console.log(`   Bot ID: ${botInfo.id}`);
    console.log(`   Name: ${botInfo.first_name}`);
  } catch (error: any) {
    console.error("❌ Failed to get bot info:", error.message);
    return;
  }

  console.log("━".repeat(50));
  console.log("🔄 Polling for updates...");
  console.log("   Send /start to your bot on Telegram to test!");
  console.log("━".repeat(50) + "\n");

  isPolling = true;

  // Start polling loop
  while (isPolling) {
    try {
      const updates = await getUpdates(lastUpdateId + 1);

      if (updates.length > 0) {
        console.log(`📨 Received ${updates.length} update(s)`);

        for (const update of updates) {
          lastUpdateId = Math.max(lastUpdateId, update.update_id);

          // Log update details
          if (update.message) {
            const from = update.message.from?.username || update.message.from?.id;
            const text = update.message.text || "(media)";
            console.log(`   👤 @${from}: ${text}`);
          } else if (update.callback_query) {
            const from = update.callback_query.from?.username || update.callback_query.from?.id;
            const data = update.callback_query.data;
            console.log(`   🔘 @${from}: ${data}`);
          }

          await processUpdate(update, fakeReq);
        }
      }

      // Small delay to avoid hammering the API on errors
      if (updates.length === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error: any) {
      console.error("❌ Polling error:", error.message);
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait before retry
    }
  }
}

export function stopPolling() {
  if (isPolling) {
    console.log("\n🛑 Stopping Telegram Bot polling...");
    isPolling = false;
  }
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  stopPolling();
  process.exit(0);
});

process.on("SIGTERM", () => {
  stopPolling();
  process.exit(0);
});
