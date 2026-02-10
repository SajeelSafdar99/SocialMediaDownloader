#!/usr/bin/env tsx
/**
 * Test script for Telegram bot
 * This script helps you test the Telegram bot connection through your VPN
 */

import dotenv from 'dotenv';
dotenv.config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_PROXY = process.env.TELEGRAM_PROXY;

if (!TELEGRAM_BOT_TOKEN) {
  console.error("❌ TELEGRAM_BOT_TOKEN is not set in .env file");
  process.exit(1);
}

console.log("\n🤖 Telegram Bot Test\n");
console.log("━".repeat(50));
console.log(`Bot Token: ${TELEGRAM_BOT_TOKEN.substring(0, 15)}...`);
console.log(`Using Proxy: ${TELEGRAM_PROXY || 'No (using system network/VPN)'}`);
console.log("━".repeat(50));

async function testBotConnection() {
  const { HttpsProxyAgent } = await import('https-proxy-agent');

  const fetchOptions: any = {
    method: "GET",
  };

  if (TELEGRAM_PROXY) {
    const agent = new HttpsProxyAgent(TELEGRAM_PROXY);
    fetchOptions.agent = agent;
  }

  try {
    console.log("\n1️⃣  Testing connection to Telegram API...");
    const res = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`,
      fetchOptions
    );
    const data = await res.json();

    if (!data.ok) {
      console.error("❌ Failed to connect:", data.description);
      return false;
    }

    console.log("✅ Connected successfully!");
    console.log(`   Bot Name: @${data.result.username}`);
    console.log(`   Bot ID: ${data.result.id}`);
    console.log(`   Full Name: ${data.result.first_name}`);

    // Test getting webhook info
    console.log("\n2️⃣  Checking webhook status...");
    const webhookRes = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`,
      fetchOptions
    );
    const webhookData = await webhookRes.json();

    if (webhookData.ok) {
      const info = webhookData.result;
      console.log("✅ Webhook info retrieved:");
      console.log(`   URL: ${info.url || '(not set)'}`);
      console.log(`   Pending updates: ${info.pending_update_count}`);
      if (info.last_error_message) {
        console.log(`   ⚠️  Last error: ${info.last_error_message}`);
        console.log(`   Last error date: ${new Date(info.last_error_date * 1000).toLocaleString()}`);
      }
    }

    // Test getting updates (if no webhook is set)
    console.log("\n3️⃣  Testing getUpdates...");
    const updatesRes = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?limit=1`,
      fetchOptions
    );
    const updatesData = await updatesRes.json();

    if (updatesData.ok) {
      console.log("✅ getUpdates works!");
      if (updatesData.result.length > 0) {
        console.log(`   Found ${updatesData.result.length} recent update(s)`);
      } else {
        console.log("   No recent updates");
      }
    }

    console.log("\n━".repeat(50));
    console.log("✅ All tests passed! Your bot is accessible through the VPN.");
    console.log("\nNext steps:");
    console.log("1. Start your bot: npm run dev");
    console.log("2. Open Telegram and search for: @" + data.result.username);
    console.log("3. Send /start to your bot");
    console.log("4. To use webhook, set PUBLIC_BASE_URL and deploy");
    console.log("━".repeat(50) + "\n");

    return true;
  } catch (error: any) {
    console.error("\n❌ Connection failed!");
    console.error(`   Error: ${error.message}`);

    if (error.cause) {
      console.error(`   Cause: ${error.cause.message}`);
    }

    if (!TELEGRAM_PROXY) {
      console.log("\n💡 Tip: If you're using a VPN that doesn't work system-wide,");
      console.log("   you may need to set TELEGRAM_PROXY in your .env file.");
      console.log("   Example: TELEGRAM_PROXY=http://localhost:8080");
    }

    return false;
  }
}

testBotConnection().then((success) => {
  process.exit(success ? 0 : 1);
});
