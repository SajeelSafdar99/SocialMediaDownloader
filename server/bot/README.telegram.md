# Telegram Bot (Webhook)

This project includes a lightweight Telegram bot that reuses the existing backend pipeline:

**probe → user chooses format → download starts → progress updates → file delivery (upload or link)**

## Features

- Free tier gating: **7 downloads per rolling window** (configurable)
- Ad/promo message (configurable) before starting a download
- Inline buttons for format selection (based on `/api/probe`)
- **Exact format downloads** using yt-dlp `format_id` (bot passes `formatId` to the download pipeline)
- Periodic message edits to show a progress bar
- Final delivery:
  - **Upload to Telegram** when file is under a size limit (configurable)
  - fallback to a **download link** to `/api/download/:id/file` for larger files
- “Open bot / Start” buttons (deep links)

## Environment Variables

Required:

- `TELEGRAM_BOT_TOKEN` – Bot token from BotFather

Recommended:

- `PUBLIC_BASE_URL` – Public URL of your server (used to build the final file link)
- `TELEGRAM_FREE_LIMIT` – Default `7`
- `TELEGRAM_FREE_WINDOW_DAYS` – Default `30` (rolling window)
- `TELEGRAM_ADS_ENABLED` – `true|false` (default `true`)
- `TELEGRAM_AD_TEXT` – Custom ad/promo copy
- `TELEGRAM_SUBSCRIBE_URL` – Optional explicit subscribe URL (otherwise uses `${PUBLIC_BASE_URL}/subscribe`)

Upload mode:

- `TELEGRAM_UPLOAD_MAX_BYTES` – Default `45MB` (safe-ish default; set lower/higher as you prefer)

Buttons / deep links:

- `TELEGRAM_BOT_USERNAME` – Enables “Open bot” + “Start/Install” buttons (example: `SaveMediaBot`)

## Webhook Endpoint

The backend exposes:

- `POST /api/telegram/webhook`

Point Telegram’s webhook to:

- `${PUBLIC_BASE_URL}/api/telegram/webhook`

(How you set it depends on your deployment. Telegram provides `setWebhook`.)

## Database

A new table stores Telegram user state:

- `telegram_users` (migration: `migrations/0004_add_telegram_users.sql`)

It tracks:

- `is_premium`
- `free_used_count`
- `free_reset_at` (rolling window reset time)

## Premium: Telegram-only code flow

This repo includes a simple premium code system that marks a Telegram user premium:

- Set `TELEGRAM_PREMIUM_CODE_SECRET`
- Redeem in Telegram:
  - `/redeem <code>`

(Generating/admin distribution of codes is intentionally kept server-side.)

## Notes / Limits

- File upload uses a URL so Telegram fetches the file from your server.
- Your existing `/api/download/:id/file` endpoint **deletes the file after a successful download**.
  - That works fine for Telegram upload (Telegram fetches it once).
  - If you want both Telegram upload AND a persistent link for users, we should change that deletion behavior.
