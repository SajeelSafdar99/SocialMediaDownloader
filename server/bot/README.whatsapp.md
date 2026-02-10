# WhatsApp Bot

This project includes a WhatsApp bot that mirrors the Telegram bot functionality:

**probe → user chooses format → download starts → progress updates → file delivery (upload or link)**

## Features

- Free tier gating: **7 downloads per rolling window** (configurable)
- Ad/promo message (configurable) before starting a download
- Format selection via numbered list (WhatsApp doesn't support inline buttons)
- **Exact format downloads** using yt-dlp `format_id` (bot passes `formatId` to the download pipeline)
- Progress updates via message edits
- Final delivery:
  - **Upload to WhatsApp** when file is under a size limit (configurable)
  - fallback to a **download link** to `/api/download/:id/file` for larger files

## Environment Variables

Required:

- `WHATSAPP_ENABLED` – Set to `"true"` to enable the WhatsApp bot

Optional:

- `PUBLIC_BASE_URL` – Public URL of your server (used to build the final file link)
- `WHATSAPP_FREE_LIMIT` – Default `7`
- `WHATSAPP_FREE_WINDOW_DAYS` – Default `30` (rolling window)
- `WHATSAPP_ADS_ENABLED` – `true|false` (default `true`)
- `WHATSAPP_AD_TEXT` – Custom ad/promo copy
- `WHATSAPP_SUBSCRIBE_URL` – Optional explicit subscribe URL (otherwise uses `${PUBLIC_BASE_URL}/subscribe`)
- `WHATSAPP_UPLOAD_MAX_BYTES` – Default `45MB`
- `WHATSAPP_DATA_PATH` – Path for storing WhatsApp session data (default: `.wwebjs_auth`)
- `WHATSAPP_PROXY` – Proxy URL for WhatsApp Web.js (e.g., `http://proxy.example.com:8080`)
- `WHATSAPP_PREMIUM_CODE_SECRET` – Secret for generating premium codes
- `WHATSAPP_ADMIN_TOKEN` – Admin token for premium code generation (falls back to `TELEGRAM_ADMIN_TOKEN`)
- `WHATSAPP_LINK_TOKEN_TTL_MINUTES` – Default `15` (pairing link expiry)

## Initial Setup

1. Set `WHATSAPP_ENABLED=true` in your `.env` file
2. Start the server - a QR code will be displayed in the console
3. Scan the QR code with WhatsApp on your phone
4. The bot will be ready once authenticated

## Database

WhatsApp user state is stored in:

- `whatsapp_users` (migration: `migrations/0006_add_whatsapp_users.sql`)

It tracks:

- `is_premium`
- `free_used_count`
- `free_reset_at` (rolling window reset time)

## Premium: WhatsApp-only code flow

Similar to Telegram:

- Set `WHATSAPP_PREMIUM_CODE_SECRET`
- Redeem in WhatsApp:
  - `/redeem <code>`

## Commands

- `/start` – Show welcome message
- `/redeem <code>` – Redeem premium code
- `/premium` – Show premium information
- `/link` – Generate pairing link to link WhatsApp account to web account
- Send a URL – Start download flow

## Notes / Limits

- WhatsApp Web.js uses Puppeteer to control a browser session
- File upload uses base64 encoding (WhatsApp Web.js requirement)
- Your existing `/api/download/:id/file` endpoint **deletes the file after a successful download**.
  - That works fine for WhatsApp upload (bot fetches it once).
  - If you want both WhatsApp upload AND a persistent link for users, we should change that deletion behavior.
- Format selection uses numbered list instead of inline buttons (WhatsApp limitation)
