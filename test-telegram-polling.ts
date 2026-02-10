import dotenv from 'dotenv';
dotenv.config();
import { startPolling } from './server/bot/telegramPolling';
console.log("\n🚀 Starting Telegram Bot Test (Polling Mode)\n");
startPolling().catch((error) => {
  console.error("❌ Failed to start polling:", error);
  process.exit(1);
});
