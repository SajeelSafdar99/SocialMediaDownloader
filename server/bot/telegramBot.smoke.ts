import { handleTelegramWebhook } from "./telegramBot";

// Minimal smoke test: just ensures handler can parse a /start update without throwing.
// Run manually with TELEGRAM_BOT_TOKEN set.

async function main() {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.error("Set TELEGRAM_BOT_TOKEN to run this smoke test.");
    process.exit(1);
  }

  const fakeReq: any = {
    headers: { host: "localhost:5001", "x-forwarded-proto": "http" },
    protocol: "http",
  };

  const update = {
    update_id: 1,
    message: {
      message_id: 1,
      from: { id: 123, is_bot: false, first_name: "Test", username: "testuser" },
      chat: { id: 123, type: "private" },
      date: Math.floor(Date.now() / 1000),
      text: "/start",
    },
  };

  await handleTelegramWebhook(fakeReq, update);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

