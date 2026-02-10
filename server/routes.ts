import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { users, payments } from "../shared/schema";
import { eq, desc } from "drizzle-orm";
import { downloadService } from "./services/downloadService";
import { generateSitemap } from "./services/sitemapService";
import { probeUrl } from "./services/probeService";
import fs from "fs";
import path from "path";
import { setupAuth } from "./auth";
import { downloadProgressStore } from "./services/downloadProgressStore";
import { progressWebSocketHub } from "./services/progressWebSocket";
import { findDownloadedFilePath, deleteFileIfExists } from "./services/fileCleanupService";
import { createMailer } from "./mailer";
import { generateResetToken, hashResetToken } from "./passwordReset";
import { hashPassword } from "./auth";
import express from "express";
import { checkAndIncrementAnonIpLimit } from "./services/rateLimitService";
import { getAnonDailyLimit, isPremiumEnforced } from "./config";
import passport from "passport";
import { handleTelegramWebhook } from "./bot/telegramBot";
import { generateTelegramPremiumCode } from "./services/telegramPremiumCodeService";
import { completeTelegramPairing } from "./services/telegramPairingService";
import { initializeWhatsAppBot, getCurrentQRCode, isWhatsAppReady, logoutWhatsAppBot } from "./bot/whatsappBot";
import { generateWhatsAppPremiumCode } from "./services/whatsappPremiumCodeService";
import { completeWhatsAppPairing } from "./services/whatsappPairingService";
import { createSafePayPayment} from "./services/safepayPaymentService";
import { getPlan } from "./services/safepayPlansService";
import { requireAdmin } from "./middleware/adminAuth";
import {
  apiLimiter,
  strictLimiter,
  downloadLimiter,
  authLimiter,
} from "./middleware/security";
import { registerAdminRoutes } from "./routes/adminRoutes";
import { registerBlogRoutes } from "./routes/blogRoutes";
import { registerQueryRoutes } from "./routes/queryRoutes";
import { registerUserManagementRoutes } from "./routes/userManagementRoutes";
import { registerActivityLogsRoutes } from "./routes/activityLogsRoutes";
import { registerMainAppLogsRoutes } from "./routes/mainAppLogsRoutes";
import { registerPublicBlogRoutes } from "./routes/publicBlogRoutes";
import { registerRefundRequestRoutes } from "./routes/refundRequestRoutes";
import { registerEmailTemplateRoutes } from "./routes/emailTemplateRoutes";
import { setupVite } from "./vite";

export async function registerRoutes(app: Express): Promise<Server> {
  // Create the HTTP server. We will attach the WS hub after the server starts listening.
  const server = createServer(app);

  // 1. Initialize Real Authentication
  setupAuth(app);

  // 2. Register Admin Routes
  registerAdminRoutes(app);

  // 3. Register Blog Routes
  registerBlogRoutes(app);

  // 4. Register Query Routes
  registerQueryRoutes(app);

  // 5. Register User Management Routes
  registerUserManagementRoutes(app);

  // 6. Register Activity Logs Routes (Admin)
  registerActivityLogsRoutes(app);

  // 7. Register Main App Logs Routes (Users)
  registerMainAppLogsRoutes(app);

  // 8. Register Public Blog Routes (No auth required)
  registerPublicBlogRoutes(app);

  // 9. Register Refund Request Routes (User-facing)
  registerRefundRequestRoutes(app);

  // 10. Register Email Template Routes (Admin)
  registerEmailTemplateRoutes(app);

  // 11. Protected Route Middleware
  registerAdminRoutes(app);

  // 3. Register Blog Routes
  registerBlogRoutes(app);

  // 4. Register Query Routes
  registerQueryRoutes(app);

  // 5. Protected Route Middleware
  const isAuthenticated = (req: any, res: any, next: any) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Please login to continue" });
  };

  // Apply rate limiting to API routes
  app.use('/api', apiLimiter);
  app.use('/api/download', downloadLimiter);
  app.use('/api/auth', authLimiter);

  // Apply admin subdomain enforcement
  const { enforceAdminSubdomain } = await import("./middleware/subdomain");
  app.use(enforceAdminSubdomain);

  // --- HEALTH CHECK ---
  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'backend', ts: Date.now() });
  });

  // --- AUTH ROUTES ---

  // 1. Get Current User (Used by frontend to check login status)
  app.get("/api/auth/user", isAuthenticated, (req: any, res) => {
    res.json(req.user);
  });

  // 2. Fake Login Route (Just redirects home since we are always logged in)
  app.get("/api/login", (req, res) => {
    res.redirect("/");
  });

  // --- PROBE ROUTE (formats/qualities) ---
  app.post('/api/probe', async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) return res.status(400).json({ message: 'URL is required' });

      const result = await probeUrl(url);
      if (result.platform === 'unknown') {
        return res.status(400).json({ message: 'Unsupported platform' });
      }

      // If premium is enforced, hide 2160p options for non-premium users
      const userId = (req as any).user ? Number((req as any).user.id) : null;
      const isPremium = userId ? (await storage.getUser(userId))?.isPremium : false;
      if (isPremiumEnforced() && !isPremium && Array.isArray((result as any).options)) {
        (result as any).options = (result as any).options.filter((o: any) => {
          const q = String(o?.qualityLabel || o?.quality || '').toLowerCase();
          return !(q.includes('2160') || q.includes('4k'));
        });
      }

      res.json(result);
    } catch (error: any) {
      console.error('Probe error:', error);
      res.status(500).json({ message: error.message || 'Failed to probe URL' });
    }
  });

  // --- DOWNLOAD PROGRESS (SSE) ---
  app.get('/api/download/:id/progress', async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid ID' });

    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const send = (payload: any) => {
      res.write(`event: progress\n`);
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    // send initial snapshot
    send(downloadProgressStore.get(id) || { downloadId: id, stage: 'queued', percent: 0, updatedAt: Date.now() });

    const timer = setInterval(() => {
      const snap = downloadProgressStore.get(id);
      if (snap) send(snap);
    }, 600);

    req.on('close', () => {
      clearInterval(timer);
    });
  });

  app.get('/api/download/:id/progress/status', async (req, res) =>  {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid ID' });
    res.json(downloadProgressStore.get(id) || null);
  });

  // --- DOWNLOAD ROUTES ---

  app.post('/api/download', async (req: any, res) => {
    try {
      const { url, format = 'mp4', quality = '720p', formatId } = req.body;

      if (!url) {
        return res.status(400).json({ message: "URL is required" });
      }

      // Detect platform
      const platform = downloadService.detectPlatform(url);
      if (!platform) {
        return res.status(400).json({ message: "Unsupported platform" });
      }

      // User
      const userId: number | null = req.user ? Number(req.user.id) : null;
      const user = userId ? await storage.getUser(userId) : null;
      const isPremium = !!user?.isPremium;

      // Anonymous IP daily limit (free tier)
      if (!userId) {
        const limit = getAnonDailyLimit();
        const rl = checkAndIncrementAnonIpLimit({
          req,
          maxPerDay: limit,
          bypass: !isPremiumEnforced(),
        });

        res.setHeader('X-RateLimit-Limit', String(limit));
        res.setHeader('X-RateLimit-Remaining', String(rl.remaining));
        res.setHeader('X-RateLimit-Reset', String(Math.floor(rl.resetAt.getTime() / 1000)));

        if (!rl.allowed) {
          return res.status(429).json({
            message: `Free tier limit reached (${limit}/day). Please sign in or upgrade to Premium.`,
            limit,
            remaining: rl.remaining,
            resetAt: rl.resetAt.toISOString(),
          });
        }
      }

      // Premium-only 4K enforcement
      const q = String(quality).toLowerCase();
      const is4k = q.includes('2160') || q.includes('4k');
      if (isPremiumEnforced() && is4k && !isPremium) {
        return res.status(403).json({
          message: '4K downloads are available for Premium users. Please upgrade to access 2160p.',
        });
      }

      // Create download record
      const downloadRecord = await storage.createDownload({
        userId: userId ?? null,
        platform,
        originalUrl: url,
        format,
        quality,
        status: 'pending',
        title: 'Pending Download',
        thumbnail: '',
        createdAt: new Date()
      });

      downloadService.processDownload(Number(downloadRecord.id), url, format, quality, formatId)
        .catch(error => {
          console.error('Download processing error:', error);
          storage.updateDownloadStatus(Number(downloadRecord.id), 'failed');
        });

      res.json({
        id: downloadRecord.id,
        status: 'pending',
        message: 'Download started successfully'
      });

    } catch (error) {
      console.error('Download error:', error);
      res.status(500).json({ message: 'Failed to start download' });
    }
  });

  app.get('/api/download/:id/status', async (req, res) => {
    try {
      // Parse ID as integer since database IDs are usually numbers
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

      const download = await storage.getDownload(id);
      if (!download) {
        return res.status(404).json({ message: 'Download not found' });
      }

      res.json({
        id: download.id,
        status: download.status,
        title: download.title,
        thumbnail: download.thumbnail,
        downloadUrl: download.downloadUrl,
        fileSize: download.fileSize,
        expiresAt: (download as any).expiresAt ?? null,
        fileDeletedAt: (download as any).fileDeletedAt ?? null,
      });
    } catch (error) {
      console.error('Status check error:', error);
      res.status(500).json({ message: 'Failed to get download status' });
    }
  });

  app.get('/api/downloads', isAuthenticated, async (req: any, res) => {
    try {
      const userId = Number(req.user.id);
      const downloads = await storage.getUserDownloads(userId);
      res.json(downloads);
    } catch (error) {
      console.error('Get downloads error:', error);
      res.status(500).json({ message: 'Failed to get downloads' });
    }
  });

  app.get('/api/download/:id/file', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

      const download = await storage.getDownload(id);
      if (!download) {
        return res.status(404).json({ message: 'Download not found' });
      }

      // If already expired, show a clean error.
      if (download.status === 'expired') {
        return res.status(410).json({ message: 'This download has expired. Please re-download.' });
      }

      if (download.status !== 'completed') {
        return res.status(400).json({ message: 'Download not ready yet' });
      }

      const found = findDownloadedFilePath(id);
      if (!found) {
        // file missing, mark expired so history is consistent
        try {
          await storage.markDownloadExpired(id);
        } catch {}
        return res.status(410).json({ message: 'This download has expired. Please re-download.' });
      }

      const { filePath, ext } = found;

      const sanitizedTitle = (download.title || 'video').replace(/[^a-zA-Z0-9\s\-_]/g, '').substring(0, 50);
      res.setHeader('Content-Disposition', `attachment; filename="${sanitizedTitle}.${ext}"`);
      
      // Set proper Content-Type based on file extension for better MIME type detection
      let contentType: string;
      if (ext === 'mp3') {
        contentType = 'audio/mpeg';
      } else if (ext === 'm4a') {
        contentType = 'audio/mp4';
      } else if (ext === 'ogg' || ext === 'opus') {
        contentType = ext === 'ogg' ? 'audio/ogg' : 'audio/opus';
      } else if (ext === 'mp4') {
        contentType = 'video/mp4';
      } else if (ext === 'webm') {
        contentType = 'video/webm';
      } else if (ext === 'mkv') {
        contentType = 'video/x-matroska';
      } else {
        contentType = 'video/mp4'; // default
      }
      res.setHeader('Content-Type', contentType);

      // Check if this is a bot fetch (via query param or User-Agent)
      // Bot fetches should NOT delete the file immediately - let it be deleted after successful send or expiry
      const isBotFetch = req.query.bot === 'true' || 
                         req.get('user-agent')?.includes('whatsapp-web.js') ||
                         req.get('user-agent')?.includes('Puppeteer');

      const fileStream = fs.createReadStream(filePath);
      fileStream.on('error', (err) => {
        console.error('File stream error:', err);
        if (!res.headersSent) res.status(500).json({ message: 'Failed to stream file' });
      });

      // Only delete file after actual browser download (not bot fetches)
      // Bot fetches will be handled by the bot's deletion logic after successful send
      // If bot send fails and link is sent, file will be deleted after user downloads or expires
      res.on('finish', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // Only delete if this is a real browser download (not a bot fetch)
          if (!isBotFetch) {
            const deleted = deleteFileIfExists(filePath);
            if (deleted) {
              console.log(`🗑️ Deleted file after browser download: ${filePath}`);
              // best-effort DB update
              storage.markDownloadExpired(id).catch(() => {});
            }
          } else {
            console.log(`📥 Bot fetch detected - file will be deleted after successful send or expiry: ${filePath}`);
          }
        }
      });

      fileStream.pipe(res);
    } catch (error) {
      console.error('File download error:', error);
      res.status(500).json({ message: 'Failed to download file' });
    }
  });

  // --- PAYMENT ROUTES ---
  
  // Create SafePay payment
  app.post('/api/payment/safepay', isAuthenticated, strictLimiter, async (req: any, res) => {
    try {
      const userId = Number(req.user.id);
      const { amount, currency = "PKR", planId } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ message: 'Invalid amount' });
      }

      console.log('💳 Creating SafePay payment:');
      console.log('   User ID:', userId);
      console.log('   Amount:', amount);
      console.log('   Currency:', currency);
      console.log('   Plan ID:', planId || 'not provided');

      // Determine frontend base URL for redirects
      // In development, use Vite dev server (localhost:5173)
      // In production, use PUBLIC_BASE_URL
      const baseUrl = process.env.SAFEPAY_ENV === "production"
        ? (process.env.PUBLIC_BASE_URL || "https://yourdomain.com")
        : "http://localhost:5173"; // Vite dev server, NOT backend port!

      const result = await createSafePayPayment({
        userId,
        amount: Number(amount), // Amount in smallest unit (cents/paisa)
        currency,
        planId, // Pass the plan ID to the service
        returnUrl: `${baseUrl}/subscribe?status=success&provider=safepay`,
        cancelUrl: `${baseUrl}/subscribe?status=cancelled`,
      });

      if (!result.ok) {
        return res.status(400).json({ message: result.reason || 'Payment creation failed' });
      }

      res.json({
        paymentUrl: result.paymentUrl,
        token: result.token,
      });
    } catch (error: any) {
      console.error('SafePay payment error:', error);
      res.status(500).json({ message: error.message || 'Payment creation failed' });
    }
  });

  // ===== SAFEPAY FLEX MICROFORM API =====

  // Get capture context for Flex Microform
  app.get('/api/payment/safepay/capture-context/:tracker', async (req, res) => {
    try {
      const { tracker } = req.params;

      // Get payment record by tracker token
      const payment = await storage.getPaymentByProviderTransactionId(tracker);
      if (!payment) {
        return res.status(404).json({ ok: false, error: 'Payment session not found' });
      }

      // Extract capture context from metadata
      let metadata;
      try {
        metadata = typeof payment.metadata === 'string' ? JSON.parse(payment.metadata) : payment.metadata;
      } catch {
        return res.status(500).json({ ok: false, error: 'Invalid payment metadata' });
      }

      // Return the full capture response that contains tracker and action objects
      // The frontend will extract the JWT from action.flex.capture_context_jwt
      const captureContext = metadata.full_capture_response || metadata.capture_context;
      if (!captureContext) {
        return res.status(400).json({ ok: false, error: 'Capture context not available' });
      }

      // If it's a string (old format), try to parse it
      let responseData = captureContext;
      if (typeof captureContext === 'string') {
        try {
          responseData = JSON.parse(captureContext);
        } catch {
          // If it's a JWT string, wrap it in the expected format
          responseData = captureContext;
        }
      }

      res.json({ ok: true, captureContext: typeof responseData === 'string' ? responseData : JSON.stringify(responseData) });
    } catch (error: any) {
      console.error('Error fetching capture context:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // Check Flex Microform payment status
  // The Microform SDK submits the transient token directly to SafePay from the browser
  // We just need to poll the payment status
  app.post('/api/payment/safepay/flex/complete', isAuthenticated, async (req: any, res) => {
    try {
      const { tracker, transientToken } = req.body;
      const userId = req.user.id;

      if (!tracker) {
        return res.status(400).json({ ok: false, error: 'Missing tracker or transient token' });
      }

      console.log('🔄 Processing SafePay Flex payment...');
      console.log('   Tracker:', tracker);
      console.log('   User ID:', userId);
      console.log('   Has transient token:', !!transientToken);

      const SAFEPAY_API_URL = process.env.SAFEPAY_ENV === "production"
        ? "https://api.getsafepay.com"
        : "https://sandbox.api.getsafepay.com";
      const webhookSecret = process.env.SAFEPAY_SECRET;

      // STEP 1: If we have a transient token, process it first
      if (transientToken) {
        console.log('🔄 Step 1: Processing transient token...');
        console.log('   Token length:', transientToken.length);

        // Call PROCESS_TRANSIENT_TOKEN action
        // Ref: https://apidocs.getsafepay.com/#process-transient-token
        const processResponse = await fetch(
          `${SAFEPAY_API_URL}/order/payments/v3/${tracker}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-SFPY-MERCHANT-SECRET': webhookSecret!,
            },
            body: JSON.stringify({
              payload: {
                payment_method: {
                  flex: {
                    transient_token_jwt: transientToken
                  }
                }
              }
            }),
          }
        );

        const processResult = await processResponse.json();
        console.log('📥 Process token response:', JSON.stringify(processResult, null, 2));

        if (!processResponse.ok) {
          console.error('❌ Failed to process transient token');
          return res.status(400).json({
            ok: false,
            error: processResult.status?.message || 'Failed to process payment',
            details: processResult.status?.errors
          });
        }

        console.log('✅ Transient token processed successfully');
        console.log('   New tracker state:', processResult.data?.tracker?.state);
        console.log('   Next actions:', processResult.data?.tracker?.next_actions);

        // Check if 3DS is required immediately after processing token
        const nextActionAfterProcess = processResult.data?.tracker?.next_actions?.CYBERSOURCE?.kind;
        if (nextActionAfterProcess === 'PAYER_AUTH_ENROLLMENT') {
          console.log('⚠️  Payment requires 3DS enrollment');

          const payerAuthSetup = processResult.data?.action?.payer_authentication_setup;

          if (payerAuthSetup) {
            console.log('✅ Returning 3DS enrollment data to frontend');
            return res.json({
              ok: true,
              requires3DS: true,
              accessToken: payerAuthSetup.access_token,
              deviceCollectionUrl: payerAuthSetup.device_data_collection_url,
              stepUpUrl: 'https://centinelapistag.cardinalcommerce.com/V2/Cruise/StepUp',
              tracker,
              message: '3DS authentication required'
            });
          }
        }
      }

      // STEP 2: Get the payment status from SafePay Reporter API
      console.log('🔄 Step 2: Checking payment status...');
      const statusResponse = await fetch(
        `${SAFEPAY_API_URL}/reporter/api/v1/payments/${tracker}`,
        {
          headers: {
            'X-SFPY-MERCHANT-SECRET': webhookSecret!,
          },
        }
      );

      const statusResult = await statusResponse.json();
      console.log('📥 Payment status response:', JSON.stringify(statusResult, null, 2));

      const trackerState = statusResult.data?.state;
      const nextAction = statusResult.data?.next_actions?.CYBERSOURCE?.kind;

      console.log('   Tracker state:', trackerState);

      // Check if payment completed
      if (trackerState === 'TRACKER_ENDED') {
        console.log('✅ Payment completed successfully!');
        
        // Get payment record to update
        const payment = await storage.getPaymentByProviderTransactionId(tracker);
        if (payment) {
          await storage.updatePaymentStatus(payment.id, 'completed');

          // Get payment metadata to extract plan info
          let paymentMeta;
          try {
            paymentMeta = typeof payment.metadata === 'string' ? JSON.parse(payment.metadata) : payment.metadata;
          } catch {
            paymentMeta = {};
          }

          // Fetch actual plan details from SafePay to get correct duration
          let durationDays = 30; // Default to monthly
          let planId = paymentMeta.plan_id;

          if (planId) {
            console.log('📦 Fetching plan details for:', planId);
            try {
              const planResult = await getPlan(planId);
              if (planResult.ok && planResult.plan) {
                const plan = planResult.plan;
                console.log('   Plan found:', plan.name);
                console.log('   Interval:', plan.interval);
                console.log('   Interval count:', plan.interval_count);

                // Calculate duration based on plan interval
                if (plan.interval === 'YEAR') {
                  durationDays = 365 * (plan.interval_count || 1);
                } else if (plan.interval === 'MONTH') {
                  durationDays = 30 * (plan.interval_count || 1);
                } else if (plan.interval === 'WEEK') {
                  durationDays = 7 * (plan.interval_count || 1);
                } else if (plan.interval === 'DAY') {
                  durationDays = (plan.interval_count || 1);
                }

                console.log('   Calculated duration:', durationDays, 'days');
              } else {
                console.warn('⚠️  Failed to fetch plan details, using default duration');
              }
            } catch (error) {
              console.error('❌ Error fetching plan details:', error);
              console.log('   Falling back to default duration');
            }
          } else {
            console.warn('⚠️  No plan_id in payment metadata, using default 30 days');
          }

          // Check if user already has premium and extend from current expiry
          const existingUser = await storage.getUser(userId);
          let premiumExpiresAt;

          if (existingUser && existingUser.isPremium && existingUser.premiumExpiresAt) {
            const currentExpiry = new Date(existingUser.premiumExpiresAt);
            const now = new Date();

            // If subscription is still active, extend from current expiry
            if (currentExpiry > now) {
              premiumExpiresAt = new Date(currentExpiry.getTime() + durationDays * 24 * 60 * 60 * 1000);
              console.log('🔄 Extending existing premium subscription');
              console.log('   Current expiry:', currentExpiry.toISOString());
              console.log('   Adding:', durationDays, 'days');
              console.log('   New expiry:', premiumExpiresAt.toISOString());
            } else {
              // Subscription expired, start from now
              premiumExpiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
              console.log('🆕 Starting new premium subscription (previous expired)');
            }
          } else {
            // First time purchase
            premiumExpiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
            console.log('🆕 First time premium purchase');
          }

          console.log('✅ Premium will expire at:', premiumExpiresAt.toISOString());

          await storage.updateUserSubscription({
            userId: userId,
            isPremium: true,
            provider: 'safepay',
            providerTransactionId: tracker,
            premiumExpiresAt: premiumExpiresAt,
            planId: planId || 'unknown'
          });

          console.log('✅ User updated to premium');
          console.log('   Premium until:', premiumExpiresAt.toISOString());

          // Fetch and store SafePay subscription token for future management
          try {
            const subResult = await searchSubscriptions({
              user_ids: [`user_${userId}`],
              statuses: ['ACTIVE', 'TRAILING'],
              limit: 1,
            });

            if (subResult.ok && subResult.subscriptions && subResult.subscriptions.length > 0) {
              const subscription = subResult.subscriptions[0];
              await storage.updateUser(userId, {
                safepaySubscriptionToken: subscription.token,
              });
              console.log(`✅ Stored SafePay subscription token: ${subscription.token}`);
            }
          } catch (subError) {
            console.error('⚠️  Failed to fetch subscription token:', subError);
            // Don't fail payment if subscription token fetch fails
          }

          // Send subscription confirmation email with payment ID
          try {
            const mailer = createMailer();
            const user = await storage.getUser(userId);
            if (user && user.email) {
              const planResult = planId ? await getPlan(planId) : null;
              const planName = planResult?.ok && planResult.plan ? planResult.plan.name : 'Premium';
              const billingCycle = planResult?.ok && planResult.plan ? planResult.plan.interval.toLowerCase() : 'monthly';
              const nextBilling = premiumExpiresAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

              await mailer.sendSubscriptionEmail(
                user.email,
                user.username || 'User',
                planName,
                payment.amount / 100, // Convert from cents to dollars
                billingCycle,
                nextBilling,
                payment.id // Include payment ID for refund reference
              );
              console.log('📧 Subscription confirmation email sent');
            }
          } catch (emailError) {
            console.error('❌ Failed to send subscription email:', emailError);
            // Don't fail the payment if email fails
          }

          return res.json({
            ok: true,
            message: 'Payment completed successfully',
            premiumExpiresAt: premiumExpiresAt.toISOString()
          });
        }
      }


      // Payment is still processing
      console.log('⏳ Payment not yet completed');
      console.log('   Current state:', trackerState);

      return res.json({
        ok: false,
        error: 'Payment not yet completed',
        state: trackerState,
        shouldRetry: true
      });

    } catch (error: any) {
      console.error('❌ Error completing Flex payment:', error);
      return res.status(500).json({ 
        ok: false, 
        error: error.message || 'Failed to complete payment'
      });
    }
  });

  // Enroll payment for 3DS authentication
  app.post('/api/payment/safepay/enroll', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const { tracker, deviceFingerprint, successUrl, failureUrl } = req.body;

      console.log('🔄 Enrolling payment for 3DS authentication...');
      console.log('   Tracker:', tracker);
      console.log('   User ID:', userId);
      console.log('   Device Fingerprint:', deviceFingerprint);

      if (!tracker) {
        return res.status(400).json({ ok: false, error: 'Missing tracker' });
      }

      const SAFEPAY_API_URL = process.env.SAFEPAY_ENV === "production"
        ? "https://api.getsafepay.com"
        : "https://sandbox.api.getsafepay.com";
      const webhookSecret = process.env.SAFEPAY_SECRET;

      // Perform PAYER_AUTH_ENROLLMENT
      console.log('📤 Calling PAYER_AUTH_ENROLLMENT endpoint...');
      const enrollResponse = await fetch(
        `${SAFEPAY_API_URL}/order/payments/v3/${tracker}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-SFPY-MERCHANT-SECRET': webhookSecret!,
          },
          body: JSON.stringify({
            payload: {
              billing: {
                use_synthetic: true // Use synthetic billing data
              },
              authorization: {
                do_capture: true // Capture immediately
              },
              authentication_setup: {
                success_url: successUrl || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/subscribe?status=success&provider=safepay`,
                failure_url: failureUrl || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/subscribe?status=cancelled`,
                device_fingerprint_session_id: deviceFingerprint || `session_${Date.now()}_${Math.random().toString(36).substring(7)}`
              }
            }
          }),
        }
      );

      const enrollData = await enrollResponse.json();
      console.log('📥 Enrollment response status:', enrollResponse.status);
      console.log('📥 Enrollment response:', JSON.stringify(enrollData, null, 2));

      if (!enrollResponse.ok) {
        console.log('❌ Enrollment failed:', enrollData.status?.errors);
        return res.status(400).json({
          ok: false,
          error: enrollData.status?.errors?.[0] || 'Enrollment failed',
          details: enrollData.status?.errors
        });
      }

      console.log('✅ Enrollment successful');

      const payerAuthEnrollment = enrollData.data?.action?.payer_authentication_enrollment;
      const authStatus = payerAuthEnrollment?.authentication_status;

      console.log('   Authentication status:', authStatus);

      if (authStatus === 'FRICTIONLESS' || authStatus === 'ATTEMPTED') {
        // No challenge required, payment should be authorized
        console.log('✅ Frictionless authentication - payment authorized');

        // Now perform authorization (next action after enrollment)
        const trackerState = enrollData.data?.tracker?.state;
        const nextAction = enrollData.data?.tracker?.next_actions?.CYBERSOURCE?.kind;

        console.log('   Current tracker state:', trackerState);
        console.log('   Next action required:', nextAction);
        console.log('   Next action check - is AUTHORIZATION?', nextAction === 'AUTHORIZATION');
        console.log('   Tracker state check - is TRACKER_ENROLLED?', trackerState === 'TRACKER_ENROLLED');
        console.log('   Will proceed with auth?', nextAction === 'AUTHORIZATION' || trackerState === 'TRACKER_ENROLLED');

        if (nextAction === 'AUTHORIZATION' || trackerState === 'TRACKER_ENROLLED') {
          console.log('🔄 Performing AUTHORIZATION...');

          // Call the authorization endpoint with proper payload
          const authPayload = {
            payload: {
              authorization: {
                do_capture: true,  // Capture payment immediately after authorization
              },
            },
          };

          console.log('📤 Authorization payload:', JSON.stringify(authPayload, null, 2));

          const authResponse = await fetch(
            `${SAFEPAY_API_URL}/order/payments/v3/${tracker}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-SFPY-MERCHANT-SECRET': webhookSecret!,
              },
              body: JSON.stringify(authPayload),
            }
          );

          const authData = await authResponse.json();
          console.log('📥 Authorization response status:', authResponse.status);
          console.log('📥 Authorization response data:', JSON.stringify(authData, null, 2));

          if (!authResponse.ok) {
            console.error('❌ Authorization failed:', authData.status?.errors);
            return res.status(400).json({
              ok: false,
              error: authData.status?.errors?.[0] || 'Authorization failed',
              details: authData.status?.errors
            });
          }

          const finalState = authData.data?.tracker?.state;
          console.log('✅ Authorization successful, final state:', finalState);
          console.log('   Is TRACKER_ENDED?', finalState === 'TRACKER_ENDED');
          console.log('   Full tracker object:', JSON.stringify(authData.data?.tracker, null, 2));

          if (finalState === 'TRACKER_ENDED') {
            console.log('💎 Payment completed! Updating user subscription...');

            // Payment completed! Update user subscription
            const payment = await storage.getPaymentByProviderTransactionId(tracker);
            if (payment) {
              console.log('📄 Found payment record, ID:', payment.id);

              await storage.updatePaymentStatus(payment.id, 'completed');

              let paymentMeta;
              try {
                paymentMeta = typeof payment.metadata === 'string' ? JSON.parse(payment.metadata) : payment.metadata;
              } catch {
                paymentMeta = {};
              }

              // Fetch actual plan details from SafePay to get correct duration
              let durationDays = 30; // Default to monthly
              let planId = paymentMeta.plan_id;

              if (planId) {
                console.log('📦 Fetching plan details for:', planId);
                try {
                  const planResult = await getPlan(planId);
                  if (planResult.ok && planResult.plan) {
                    const plan = planResult.plan;
                    console.log('   Plan found:', plan.name);
                    console.log('   Interval:', plan.interval);
                    console.log('   Interval count:', plan.interval_count);

                    // Calculate duration based on plan interval
                    if (plan.interval === 'YEAR') {
                      durationDays = 365 * (plan.interval_count || 1);
                    } else if (plan.interval === 'MONTH') {
                      durationDays = 30 * (plan.interval_count || 1);
                    } else if (plan.interval === 'WEEK') {
                      durationDays = 7 * (plan.interval_count || 1);
                    } else if (plan.interval === 'DAY') {
                      durationDays = (plan.interval_count || 1);
                    }

                    console.log('   Calculated duration:', durationDays, 'days');
                  } else {
                    console.warn('⚠️  Failed to fetch plan details, using default duration');
                  }
                } catch (error) {
                  console.error('❌ Error fetching plan details:', error);
                  console.log('   Falling back to default duration');
                }
              } else {
                console.warn('⚠️  No plan_id in payment metadata, using default 30 days');
              }

              const premiumExpiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
              console.log('💎 Updating user subscription...');
              console.log('   User ID:', userId);
              console.log('   Premium expires at:', premiumExpiresAt);
              console.log('   Duration:', durationDays, 'days');
              console.log('   Plan ID:', planId || 'unknown');
              console.log('   Calling storage.updateUserSubscription...');

              const updateResult = await storage.updateUserSubscription({
                userId: userId,
                isPremium: true,
                provider: 'safepay',
                providerTransactionId: tracker,
                premiumExpiresAt: premiumExpiresAt,
                planId: planId || 'unknown'
              });

              console.log('✅ User subscription updated successfully');
              console.log('   Update result:', JSON.stringify(updateResult, null, 2));

              return res.json({
                ok: true,
                authenticationStatus: 'FRICTIONLESS',
                completed: true,
                subscriptionUpdated: true,
                message: 'Payment completed successfully and subscription activated'
              });
            } else {
              console.error('⚠️  Payment record not found for tracker:', tracker);
              return res.status(404).json({
                ok: false,
                error: 'Payment record not found',
                details: 'Cannot update subscription without payment record'
              });
            }
          } else {
            console.error('⚠️  Authorization completed but finalState was:', finalState, '(expected: TRACKER_ENDED)');
            return res.status(400).json({
              ok: false,
              error: 'Payment authorization incomplete',
              currentState: finalState,
              expectedState: 'TRACKER_ENDED'
            });
          }
        } else {
          console.error('⚠️  Cannot proceed with authorization - nextAction:', nextAction, ', trackerState:', trackerState);
          return res.status(400).json({
            ok: false,
            error: 'Expected AUTHORIZATION action',
            nextAction,
            trackerState
          });
        }
      } else if (authStatus === 'REQUIRED') {
        // Challenge required
        console.log('⚠️  3DS challenge required');

        return res.json({
          ok: true,
          authenticationStatus: 'REQUIRED',
          accessToken: payerAuthEnrollment.access_token,
          stepUpUrl: payerAuthEnrollment.step_up_url || 'https://centinelapistag.cardinalcommerce.com/V2/Cruise/StepUp',
          message: '3DS challenge required'
        });
      } else {
        // Authentication failed or not eligible
        console.error('❌ Authentication status:', authStatus);
        return res.status(400).json({
          ok: false,
          error: `Authentication ${authStatus}`,
          authenticationStatus: authStatus
        });
      }

    } catch (error: any) {
      console.error('❌ Error enrolling payment:', error);
      return res.status(500).json({
        ok: false,
        error: error.message || 'Failed to enroll payment'
      });
    }
  });

  // Verify 3DS authentication result
  app.post('/api/payment/safepay/verify-3ds', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const { tracker } = req.body;

      console.log('🔄 Verifying 3DS authentication...');
      console.log('   Tracker:', tracker);
      console.log('   User ID:', userId);

      if (!tracker) {
        return res.status(400).json({ ok: false, error: 'Missing tracker' });
      }

      const SAFEPAY_API_URL = process.env.SAFEPAY_ENV === "production"
        ? "https://api.getsafepay.com"
        : "https://sandbox.api.getsafepay.com";
      const webhookSecret = process.env.SAFEPAY_SECRET;

      // Check payment status after 3DS
      const statusResponse = await fetch(
        `${SAFEPAY_API_URL}/reporter/api/v1/payments/${tracker}`,
        {
          headers: {
            'X-SFPY-MERCHANT-SECRET': webhookSecret!,
          }
        }
      );

      const statusData = await statusResponse.json();
      console.log('📥 Payment status:', statusData.data?.state);

      if (statusData.data?.state === 'TRACKER_ENDED') {
        console.log('✅ Payment completed successfully after 3DS');

        // Get payment record
        const payment = await storage.getPaymentByProviderTransactionId(tracker);
        if (payment) {
          await storage.updatePaymentStatus(payment.id, 'completed');

          // Update user subscription
          let paymentMeta;
          try {
            paymentMeta = typeof payment.metadata === 'string' ? JSON.parse(payment.metadata) : payment.metadata;
          } catch {
            paymentMeta = {};
          }

          let durationDays = 30;
          if (paymentMeta.plan_id?.toLowerCase().includes('yearly')) {
            durationDays = 365;
          }

          // Check if user already has premium and extend from current expiry
          const existingUser = await storage.getUser(userId);
          let premiumExpiresAt;

          if (existingUser && existingUser.isPremium && existingUser.premiumExpiresAt) {
            const currentExpiry = new Date(existingUser.premiumExpiresAt);
            const now = new Date();

            // If subscription is still active, extend from current expiry
            if (currentExpiry > now) {
              premiumExpiresAt = new Date(currentExpiry.getTime() + durationDays * 24 * 60 * 60 * 1000);
              console.log('🔄 Extending existing premium subscription');
              console.log('   Current expiry:', currentExpiry.toISOString());
              console.log('   Adding:', durationDays, 'days');
              console.log('   New expiry:', premiumExpiresAt.toISOString());
            } else {
              // Subscription expired, start from now
              premiumExpiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
              console.log('🆕 Starting new premium subscription (previous expired)');
            }
          } else {
            // First time purchase
            premiumExpiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
            console.log('🆕 First time premium purchase');
          }

          await storage.updateUserSubscription({
            userId: userId,
            isPremium: true,
            provider: 'safepay',
            providerTransactionId: tracker,
            premiumExpiresAt: premiumExpiresAt,
            planId: paymentMeta.plan_id || 'monthly'
          });

          return res.json({
            ok: true,
            message: 'Payment completed successfully',
            premiumExpiresAt: premiumExpiresAt.toISOString()
          });
        }
      }

      // If still not ended, check if we need to perform validation
      const nextAction = statusData.data?.next_actions?.CYBERSOURCE?.kind;

      if (nextAction === 'PAYER_AUTH_VALIDATION') {
        console.log('🔄 Performing PAYER_AUTH_VALIDATION...');

        const validationResponse = await fetch(
          `${SAFEPAY_API_URL}/order/payments/v3/${tracker}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-SFPY-MERCHANT-SECRET': webhookSecret!,
            },
            body: JSON.stringify({})
          }
        );

        const validationData = await validationResponse.json();
        console.log('📥 Validation response:', validationData);

        if (validationData.data?.tracker?.state === 'TRACKER_ENDED') {
          // Payment completed after validation
          const payment = await storage.getPaymentByProviderTransactionId(tracker);
          if (payment) {
            await storage.updatePaymentStatus(payment.id, 'completed');

            let paymentMeta;
            try {
              paymentMeta = typeof payment.metadata === 'string' ? JSON.parse(payment.metadata) : payment.metadata;
            } catch {
              paymentMeta = {};
            }

            let durationDays = 30;
            if (paymentMeta.plan_id?.toLowerCase().includes('yearly')) {
              durationDays = 365;
            }

            // Check if user already has premium and extend from current expiry
            const existingUser = await storage.getUser(userId);
            let premiumExpiresAt;

            if (existingUser && existingUser.isPremium && existingUser.premiumExpiresAt) {
              const currentExpiry = new Date(existingUser.premiumExpiresAt);
              const now = new Date();

              // If subscription is still active, extend from current expiry
              if (currentExpiry > now) {
                premiumExpiresAt = new Date(currentExpiry.getTime() + durationDays * 24 * 60 * 60 * 1000);
                console.log('🔄 Extending existing premium subscription (after validation)');
                console.log('   Current expiry:', currentExpiry.toISOString());
                console.log('   Adding:', durationDays, 'days');
                console.log('   New expiry:', premiumExpiresAt.toISOString());
              } else {
                // Subscription expired, start from now
                premiumExpiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
                console.log('🆕 Starting new premium subscription (previous expired)');
              }
            } else {
              // First time purchase
              premiumExpiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
              console.log('🆕 First time premium purchase');
            }

            await storage.updateUserSubscription({
              userId: userId,
              isPremium: true,
              provider: 'safepay',
              providerTransactionId: tracker,
              premiumExpiresAt: premiumExpiresAt,
              planId: paymentMeta.plan_id || 'monthly'
            });

            return res.json({
              ok: true,
              message: 'Payment completed successfully',
              premiumExpiresAt: premiumExpiresAt.toISOString()
            });
          }
        }
      }

      return res.json({
        ok: false,
        error: 'Payment verification pending',
        state: statusData.data?.state
      });

    } catch (error: any) {
      console.error('❌ Error verifying 3DS:', error);
      res.status(500).json({
        ok: false,
        error: error.message || 'Failed to verify 3DS'
      });
    }
  });

  // ===== SAFEPAY PLANS MANAGEMENT API (Admin Only) =====
  const { createPlan, getPlan, updatePlan, searchPlans, archivePlan } = await import("./services/safepayPlansService");

  // Create a new subscription plan
  app.post('/api/admin/safepay/plans', requireAdmin, async (req, res) => {
    try {
      const planData = req.body;
      const result = await createPlan(planData);

      if (!result.ok) {
        return res.status(400).json({ ok: false, error: result.error });
      }

      res.json({ ok: true, plan_id: result.plan_id });
    } catch (error: any) {
      console.error('Error creating plan:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // Get all plans / search plans
  app.get('/api/admin/safepay/plans', requireAdmin, async (req, res) => {
    try {
      const options: any = {};

      if (req.query.currencies) options.currencies = (req.query.currencies as string).split(',');
      if (req.query.intervals) options.intervals = (req.query.intervals as string).split(',');
      if (req.query.products) options.products = (req.query.products as string).split(',');
      if (req.query.limit) options.limit = parseInt(req.query.limit as string);
      if (req.query.page) options.page = parseInt(req.query.page as string);
      if (req.query.sort_by) options.sort_by = req.query.sort_by;
      if (req.query.direction) options.direction = req.query.direction;

      const result = await searchPlans(options);

      if (!result.ok) {
        return res.status(400).json({ ok: false, error: result.error });
      }

      res.json({ ok: true, plans: result.plans, count: result.count });
    } catch (error: any) {
      console.error('Error searching plans:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // Get a specific plan by ID
  app.get('/api/admin/safepay/plans/:planId', requireAdmin, async (req, res) => {
    try {
      const { planId } = req.params;
      const result = await getPlan(planId);

      if (!result.ok) {
        return res.status(404).json({ ok: false, error: result.error });
      }

      res.json({ ok: true, plan: result.plan });
    } catch (error: any) {
      console.error('Error getting plan:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // Update a plan
  app.put('/api/admin/safepay/plans/:planId', requireAdmin, async (req, res) => {
    try {
      const { planId } = req.params;
      const updates = req.body;
      const result = await updatePlan(planId, updates);

      if (!result.ok) {
        return res.status(400).json({ ok: false, error: result.error });
      }

      res.json({ ok: true });
    } catch (error: any) {
      console.error('Error updating plan:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // Archive a plan (one-way action)
  app.delete('/api/admin/safepay/plans/:planId', requireAdmin, async (req, res) => {
    try {
      const { planId } = req.params;
      const result = await archivePlan(planId);

      if (!result.ok) {
        return res.status(400).json({ ok: false, error: result.error });
      }

      res.json({ ok: true });
    } catch (error: any) {
      console.error('Error archiving plan:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // ===== SAFEPAY SUBSCRIPTIONS API =====
  const {
    getSubscription,
    searchSubscriptions,
    updateSubscription,
    cancelSubscription
  } = await import("./services/safepaySubscriptionsService");

  // Get available plans (Public endpoint for client-side)
  app.get('/api/payment/safepay/available-plans', async (req, res) => {
    try {
      const { searchPlans } = await import("./services/safepayPlansService");

      const result = await searchPlans(
      //     {
      //   currencies: ['USD', 'PKR'],
      //   limit: 20,
      //   sort_by: 'amount',
      //   direction: 'ASC',
      // }
      );

      if (!result.ok) {
        return res.status(400).json({ ok: false, error: result.error });
      }

      // Filter only active plans
      const activePlans = result.plans?.filter(p => p.active && !p.archived) || [];

      res.json({ ok: true, plans: activePlans });
    } catch (error: any) {
      console.error('Error fetching available plans:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // Get user's active subscription (Client side)
  app.get('/api/payment/safepay/my-subscription', async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ ok: false, error: 'User not authenticated' });
      }

      // Search for user's active subscriptions
      const result = await searchSubscriptions({
        user_ids: [`user_${userId}`],
        statuses: ['ACTIVE', 'TRAILING'],
        limit: 1,
      });

      if (!result.ok) {
        return res.status(400).json({ ok: false, error: result.error });
      }

      const subscription = result.subscriptions?.[0] || null;
      res.json({ ok: true, subscription });
    } catch (error: any) {
      console.error('Error getting user subscription:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // Cancel user's own subscription (Client side)
  app.post('/api/payment/safepay/cancel-subscription', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ ok: false, error: 'User not authenticated' });
      }

      const { subscriptionId } = req.body;
      if (!subscriptionId) {
        return res.status(400).json({ ok: false, error: 'Subscription ID required' });
      }

      // Verify subscription belongs to user
      const subResult = await getSubscription(subscriptionId);
      if (!subResult.ok || subResult.subscription?.user_id !== `user_${userId}`) {
        return res.status(403).json({ ok: false, error: 'Unauthorized' });
      }

      const result = await cancelSubscription(subscriptionId);
      if (!result.ok) {
        return res.status(400).json({ ok: false, error: result.error });
      }

      // Update user's subscription status in database
      // User keeps premium until current period ends (cancel_at_period_end = true)
      await storage.updateUser(userId, {
        subscriptionPlanId: null, // Clear plan ID as subscription is cancelled
        subscriptionCancelledAt: new Date(),
        subscriptionCancelAtPeriodEnd: true,
        updatedAt: new Date(),
      });

      console.log(`✅ Subscription ${subscriptionId} cancelled for user ${userId}`);
      console.log(`   User keeps premium access until: ${(await storage.getUser(userId))?.premiumExpiresAt}`);

      res.json({ ok: true, subscription: result.subscription });
    } catch (error: any) {
      console.error('Error canceling subscription:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // Get user's payment history
  app.get('/api/payment/history', async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ ok: false, error: 'User not authenticated' });
      }

      const userPayments = await db
        .select()
        .from(payments)
        .where(eq(payments.userId, userId))
        .orderBy(desc(payments.createdAt));

      res.json({ ok: true, payments: userPayments });
    } catch (error: any) {
      console.error('Error fetching payment history:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // Get all subscriptions (Admin only)
  app.get('/api/admin/safepay/subscriptions', requireAdmin, async (req, res) => {
    try {
      const filters: any = {};

      if (req.query.plan_ids) filters.plan_ids = (req.query.plan_ids as string).split(',');
      if (req.query.statuses) filters.statuses = (req.query.statuses as string).split(',');
      if (req.query.limit) filters.limit = parseInt(req.query.limit as string);
      if (req.query.page) filters.page = parseInt(req.query.page as string);
      if (req.query.sort_by) filters.sort_by = req.query.sort_by;
      if (req.query.direction) filters.direction = req.query.direction;

      const result = await searchSubscriptions(filters);

      if (!result.ok) {
        return res.status(400).json({ ok: false, error: result.error });
      }

      res.json({ ok: true, subscriptions: result.subscriptions, count: result.count });
    } catch (error: any) {
      console.error('Error searching subscriptions:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // Get specific subscription (Admin only)
  app.get('/api/admin/safepay/subscriptions/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const result = await getSubscription(id);

      if (!result.ok) {
        return res.status(404).json({ ok: false, error: result.error });
      }

      res.json({ ok: true, subscription: result.subscription });
    } catch (error: any) {
      console.error('Error getting subscription:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // Update subscription (Admin only)
  app.put('/api/admin/safepay/subscriptions/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const result = await updateSubscription(id, updates);

      if (!result.ok) {
        return res.status(400).json({ ok: false, error: result.error });
      }

      res.json({ ok: true, subscription: result.subscription });
    } catch (error: any) {
      console.error('Error updating subscription:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // Cancel subscription (Admin only)
  app.post('/api/admin/safepay/subscriptions/:id/cancel', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const result = await cancelSubscription(id);

      if (!result.ok) {
        return res.status(400).json({ ok: false, error: result.error });
      }

      res.json({ ok: true, subscription: result.subscription });
    } catch (error: any) {
      console.error('Error canceling subscription:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // ===== SAFEPAY TRANSACTIONS API =====
  const {
    searchTransactions,
    getTransaction,
    refundTransaction
  } = await import("./services/safepayTransactionsService");

  // Search transactions (Admin only)
  app.get('/api/admin/safepay/transactions', requireAdmin, async (req, res) => {
    try {
      const filters: any = {};

      if (req.query.tokens) filters.tokens = (req.query.tokens as string).split(',');
      if (req.query.states) filters.states = (req.query.states as string).split(',');
      if (req.query.currencies) filters.currencies = (req.query.currencies as string).split(',');
      if (req.query.subscription_ids) filters.subscription_ids = (req.query.subscription_ids as string).split(',');
      if (req.query.user_ids) filters.user_ids = (req.query.user_ids as string).split(',');
      if (req.query.limit) filters.limit = parseInt(req.query.limit as string);
      if (req.query.page) filters.page = parseInt(req.query.page as string);
      if (req.query.sort_by) filters.sort_by = req.query.sort_by;
      if (req.query.direction) filters.direction = req.query.direction;

      const result = await searchTransactions(filters);

      if (!result.ok) {
        return res.status(400).json({ ok: false, error: result.error });
      }

      res.json({ ok: true, transactions: result.transactions, count: result.count });
    } catch (error: any) {
      console.error('Error searching transactions:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // Get specific transaction (Admin only)
  app.get('/api/admin/safepay/transactions/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const result = await getTransaction(id);

      if (!result.ok) {
        return res.status(404).json({ ok: false, error: result.error });
      }

      res.json({ ok: true, transaction: result.transaction });
    } catch (error: any) {
      console.error('Error getting transaction:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // Refund transaction (Admin only)
  app.post('/api/admin/safepay/transactions/:id/refund', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const result = await refundTransaction(id);

      if (!result.ok) {
        return res.status(400).json({ ok: false, error: result.error });
      }

      res.json({ ok: true, transaction: result.transaction });
    } catch (error: any) {
      console.error('Error refunding transaction:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // ===== SAFEPAY TRACKER API (Subscription Payments with Saved Instruments) =====
  const {
    createInstrumentTracker,
    createSubscriptionTracker,
    createUnscheduledCOFTracker,
    getTrackerStatus
  } = await import("./services/safepayTrackerService");

  // Create instrument tracker - save payment method (card vaulting)
  app.post('/api/payment/safepay/tracker/instrument', async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ ok: false, error: 'User not authenticated' });
      }

      const result = await createInstrumentTracker({
        userId,
        userEmail: (req as any).user?.email,
      });

      if (!result.ok) {
        return res.status(400).json({ ok: false, error: result.error });
      }

      res.json({ ok: true, tracker: result.tracker });
    } catch (error: any) {
      console.error('SafePay instrument tracker error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // Create subscription tracker - recurring payment
  app.post('/api/payment/safepay/tracker/subscription', async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ ok: false, error: 'User not authenticated' });
      }

      const { amount, currency } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ ok: false, error: 'Invalid amount' });
      }

      const result = await createSubscriptionTracker({
        userId,
        amount: Math.round(amount * 100), // Convert to smallest unit
        currency: currency || 'PKR',
      });

      if (!result.ok) {
        return res.status(400).json({ ok: false, error: result.error });
      }

      res.json({ ok: true, tracker: result.tracker });
    } catch (error: any) {
      console.error('SafePay subscription tracker error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // Create unscheduled COF tracker - charge saved card on-demand (MIT)
  app.post('/api/payment/safepay/tracker/unscheduled-cof', async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ ok: false, error: 'User not authenticated' });
      }

      const { amount, currency } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ ok: false, error: 'Invalid amount' });
      }

      const result = await createUnscheduledCOFTracker({
        userId,
        amount: Math.round(amount * 100), // Convert to smallest unit
        currency: currency || 'PKR',
      });

      if (!result.ok) {
        return res.status(400).json({ ok: false, error: result.error });
      }

      res.json({ ok: true, tracker: result.tracker });
    } catch (error: any) {
      console.error('SafePay unscheduled COF tracker error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // Get tracker status
  app.get('/api/payment/safepay/tracker/:token', async (req, res) => {
    try {
      const { token } = req.params;

      const result = await getTrackerStatus(token);

      if (!result.ok) {
        return res.status(404).json({ ok: false, error: result.error });
      }

      res.json({ ok: true, tracker: result.tracker });
    } catch (error: any) {
      console.error('SafePay tracker status error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

    // --- OAUTH ROUTES ---
    const postAuthRedirect = (req: any) => {
      // Try to detect the frontend URL from the request
      let frontendUrl: string;

      // 1. Check if request came from a known host (for tunnel/production)
      const host = req.headers?.host;
      const proto = req.headers?.['x-forwarded-proto'] || req.protocol || 'https';

      if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
        // Request is from production domain (via tunnel)
        frontendUrl = `${proto}://${host}`;
      } else {
        // Fallback to env variable or default production URL
        frontendUrl = process.env.PUBLIC_BASE_URL || 'https://vidgrabber.online';

        // If env is set to localhost but we're actually on production, use production
        if (frontendUrl.includes('localhost') && host && !host.includes('localhost')) {
          frontendUrl = `${proto}://${host}`;
        }
      }

      // Get the next parameter from query
      const next = typeof req.query?.next === 'string' ? req.query.next : '/';

      // If it's a relative path, prepend the frontend URL
      if (next.startsWith('/')) {
        return `${frontendUrl}${next}`;
      }

      // If it's already an absolute URL, use it
      if (next.startsWith('http://') || next.startsWith('https://')) {
        return next;
      }

      // Default: redirect to frontend home
      return frontendUrl;
    };

    app.get('/api/auth/google', (req, res, next) => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.status(501).json({ message: 'Google OAuth not configured' });
    }
    passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
    });

    app.get('/api/auth/google/callback', (req, res, next) => {
      const frontendUrl = process.env.PUBLIC_BASE_URL || 'https://vidgrabber.online';
      passport.authenticate('google', {
        failureRedirect: `${frontendUrl}/auth?error=google`,
      })(req, res, () => {
        res.redirect(postAuthRedirect(req));
      });
    });

    app.get('/api/auth/github', (req, res, next) => {
    if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
      return res.status(501).json({ message: 'GitHub OAuth not configured' });
    }
    passport.authenticate('github', { scope: ['user:email'] })(req, res, next);
    });

    app.get('/api/auth/github/callback', (req, res, next) => {
      const frontendUrl = process.env.PUBLIC_BASE_URL || 'https://vidgrabber.online';
      passport.authenticate('github', {
        failureRedirect: `${frontendUrl}/auth?error=github`,
      })(req, res, () => {
        res.redirect(postAuthRedirect(req));
      });
    });

    app.get('/api/auth/facebook', (req, res, next) => {
    if (!process.env.FACEBOOK_APP_ID || !process.env.FACEBOOK_APP_SECRET) {
      return res.status(501).json({ message: 'Facebook OAuth not configured' });
    }
    passport.authenticate('facebook', { scope: ['email'] })(req, res, next);
    });

    app.get('/api/auth/facebook/callback', (req, res, next) => {
      const frontendUrl = process.env.PUBLIC_BASE_URL || 'https://vidgrabber.online';
      passport.authenticate('facebook', {
        failureRedirect: `${frontendUrl}/auth?error=facebook`,
      })(req, res, () => {
        res.redirect(postAuthRedirect(req));
      });
    });

  const mailer = createMailer();

  // --- PASSWORD RESET ROUTES ---
  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const email = String(req.body?.email || '').trim().toLowerCase();
      if (!email) return res.status(400).json({ message: 'Email is required' });

      // Always respond success to avoid account enumeration.
      const user = await storage.getUserByEmail(email);
      if (user) {
        const token = generateResetToken();
        const tokenHash = hashResetToken(token);
        const ttlMinutes = process.env.PASSWORD_RESET_TTL_MINUTES ? Number(process.env.PASSWORD_RESET_TTL_MINUTES) : 30;
        const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

        await storage.setPasswordResetToken(Number(user.id), tokenHash, expiresAt);

        const baseUrl = (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '') || `${req.protocol}://${req.get('host')}`;
        const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
        await mailer.sendPasswordResetEmail(email, resetUrl);
      }

      res.json({ ok: true });
    } catch (e) {
      console.error('forgot-password error:', e);
      res.json({ ok: true });
    }
  });

  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const token = String(req.body?.token || '').trim();
      const newPassword = String(req.body?.newPassword || '');
      if (!token || !newPassword) return res.status(400).json({ message: 'Token and newPassword are required' });
      if (newPassword.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });

      const user = await storage.verifyPasswordResetToken(hashResetToken(token));
      if (!user) return res.status(400).json({ message: 'Invalid or expired reset token' });

      const pwHash = await hashPassword(newPassword);
      await storage.updateUserPassword(Number(user.id), pwHash);
      await storage.clearPasswordResetToken(Number(user.id));

      res.json({ ok: true });
    } catch (e: any) {
      console.error('reset-password error:', e);
      res.status(500).json({ message: e?.message || 'Failed to reset password' });
    }
  });

  // --- SEO ROUTES ---
  app.get('/robots.txt', (req, res) => {
    const baseUrl = (process.env.PUBLIC_BASE_URL || process.env.SITE_URL || process.env.APP_URL || '').replace(/\/$/, '');
    const sitemapUrl = baseUrl ? `${baseUrl}/sitemap.xml` : '/sitemap.xml';

    res.type('text/plain');
    res.send(
      [
        'User-agent: *',
        'Allow: /',
        // block API and auth endpoints from being indexed
        'Disallow: /api/',
        'Disallow: /auth',
        'Disallow: /dashboard',
        `Sitemap: ${sitemapUrl}`,
        '',
      ].join('\n')
    );
  });

  app.get('/sitemap.xml', async (req, res) => {
    try {
      const sitemap = await generateSitemap();
      res.set('Content-Type', 'text/xml');
      res.send(sitemap);
    } catch (error) {
      console.error('Sitemap generation error:', error);
      res.status(500).send('Error generating sitemap');
    }
  });

  // Attach WS hub once the HTTP server is actually listening.
  // (In newer Node versions, ws may see underlying listen errors early and re-emit them.)
  server.on('listening', () => {
    try {
      progressWebSocketHub.start(server);
    } catch (e) {
      console.error('Failed to start WebSocket hub:', e);
    }
  });

  app.delete('/api/download/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: 'Invalid ID' });

      const download = await storage.getDownload(id);
      if (!download) return res.status(404).json({ message: 'Download not found' });

      // Only allow deleting your own items
      const userId = Number(req.user.id);
      if (download.userId !== userId) {
        return res.status(403).json({ message: 'Not allowed' });
      }

      // Best-effort: delete any stray file
      const found = findDownloadedFilePath(id);
      if (found) {
        deleteFileIfExists(found.filePath);
      }

      await storage.deleteDownload(id);
      res.json({ ok: true });
    } catch (e) {
      console.error('Delete download error:', e);
      res.status(500).json({ message: 'Failed to delete download' });
    }
  });

  // --- TELEGRAM BOT WEBHOOK ---
  app.post('/api/telegram/webhook', async (req: any, res) => {
    try {
      if (!process.env.TELEGRAM_BOT_TOKEN) {
        return res.status(503).json({ message: 'Telegram bot is not configured' });
      }

      // Ensure we actually have the update payload
      const update = req.body;
      if (!update || typeof update !== 'object') {
        return res.status(400).json({ message: 'Invalid Telegram update' });
      }

      // Extract Telegram user info for activity logging
      const message = update.message;
      const callbackQuery = update.callback_query;
      const from = message?.from || callbackQuery?.from;

      if (from) {
        // Attach Telegram user context to request for activity logger
        req.telegramUser = {
          telegramId: String(from.id),
          username: from.username || from.first_name || String(from.id),
          firstName: from.first_name,
          lastName: from.last_name,
        };
      }

      await handleTelegramWebhook(req, update);
      return res.json({ ok: true });
    } catch (error: any) {
      console.error('Telegram webhook error:', error);
      const msg = error?.message || 'Telegram webhook failed';
      if (msg.includes('TELEGRAM_BOT_TOKEN')) {
        return res.status(503).json({ message: 'Telegram bot is not configured' });
      }
      return res.status(500).json({ message: msg });
    }
  });

  // --- TELEGRAM PREMIUM CODE (ADMIN) ---
  app.post('/api/telegram/premium-code', async (req, res) => {
    try {
      const adminToken = process.env.TELEGRAM_ADMIN_TOKEN;
      if (!adminToken) {
        return res.status(503).json({ message: 'Admin token is not configured' });
      }
      const provided = String(req.headers['x-admin-token'] || '');
      if (provided !== adminToken) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const days = req.body?.days ? Number(req.body.days) : undefined;
      const code = generateTelegramPremiumCode({ days: Number.isFinite(days as any) ? (days as any) : undefined });
      return res.json({ code });
    } catch (e: any) {
      console.error('premium-code error', e);
      return res.status(500).json({ message: e?.message || 'Failed to generate code' });
    }
  });

  // --- TELEGRAM LINKING (WEB PAIRING) ---
  app.get('/api/telegram/link/complete', isAuthenticated, async (req: any, res) => {
    try {
      const token = String(req.query?.token || '').trim();
      if (!token) {
        return res.status(400).send('Missing token');
      }

      const userId = Number(req.user.id);
      const out = await completeTelegramPairing({ token, userId });
      if (!out.ok) {
        return res.status(400).send(out.reason || 'Link failed');
      }

      // Redirect back to app with a message.
      const base = (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '') || '/';
      return res.redirect(`${base}/?telegramLinked=1`);
    } catch (e: any) {
      console.error('telegram link complete error', e);
      return res.status(500).send(e?.message || 'Failed to link');
    }
  });

  // --- WHATSAPP BOT INITIALIZATION ---
  if (process.env.WHATSAPP_ENABLED === 'true') {
    console.log('WhatsApp bot enabled, initializing...');
    initializeWhatsAppBot().catch((error) => {
      console.error('Failed to initialize WhatsApp bot:', error);
    });
  } else {
    console.log('WhatsApp bot is disabled. Set WHATSAPP_ENABLED=true to enable.');
  }

  // --- WHATSAPP QR CODE ENDPOINT (Admin Only - Removed from public API) ---
  // QR code is admin-only and shown in terminal only
  // Removed public endpoints for security

  // --- WHATSAPP STATUS ENDPOINT (Public - for checking if bot is available) ---
  app.get('/api/whatsapp/status', (req, res) => {
    if (process.env.WHATSAPP_ENABLED !== 'true') {
      return res.status(404).json({ error: 'WhatsApp bot is not enabled' });
    }
    
    const isReady = isWhatsAppReady();
    
    // Only return if bot is ready (public info)
    // Don't expose QR code or admin details
    res.json({ 
      enabled: true,
      isReady,
      // Don't expose QR code status to public
    });
  });

  // --- WHATSAPP LOGOUT ENDPOINT (Admin Only - Removed from public API) ---
  // Logout is admin-only functionality
  // Removed public endpoint for security

  // --- WHATSAPP PREMIUM CODE (ADMIN) ---
  app.post('/api/whatsapp/premium-code', async (req, res) => {
    try {
      const adminToken = process.env.WHATSAPP_ADMIN_TOKEN || process.env.TELEGRAM_ADMIN_TOKEN;
      if (!adminToken) {
        return res.status(503).json({ message: 'Admin token is not configured' });
      }
      const provided = String(req.headers['x-admin-token'] || '');
      if (provided !== adminToken) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const days = req.body?.days ? Number(req.body.days) : undefined;
      const code = generateWhatsAppPremiumCode({ days: Number.isFinite(days as any) ? (days as any) : undefined });
      return res.json({ code });
    } catch (e: any) {
      console.error('whatsapp premium-code error', e);
      return res.status(500).json({ message: e?.message || 'Failed to generate code' });
    }
  });

  // --- WHATSAPP LINKING (WEB PAIRING) ---
  app.get('/api/whatsapp/link/complete', isAuthenticated, async (req: any, res) => {
    try {
      const token = String(req.query?.token || '').trim();
      if (!token) {
        return res.status(400).send('Missing token');
      }

      const userId = Number(req.user.id);
      const out = await completeWhatsAppPairing({ token, userId });
      if (!out.ok) {
        return res.status(400).send(out.reason || 'Link failed');
      }

      // Redirect back to app with a message.
      const base = (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '') || '/';
      return res.redirect(`${base}/?whatsappLinked=1`);
    } catch (e: any) {
      console.error('whatsapp link complete error', e);
      return res.status(500).send(e?.message || 'Failed to link');
    }
  });

  // --- AD ANALYTICS TRACKING ---
  app.post('/api/analytics/ad', async (req, res) => {
    try {
      const { type, adSlot, adId, revenue, timestamp } = req.body;
      const userId = (req as any).user ? Number((req as any).user.id) : null;
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      const userAgent = req.get('user-agent') || 'unknown';
      
      // Ad events are logged to database and Google Analytics

      // Store in database for revenue tracking
      try {
        const { pool } = await import('./db');
        // Use raw SQL with parameterized query for ad events
        // Note: ad_events table is created via migration, not in schema.ts
        await pool.query(
          `INSERT INTO ad_events (type, ad_slot, ad_id, revenue, user_id, ip_address, user_agent, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            type,
            adSlot,
            adId || null,
            revenue || 0,
            userId || null,
            ip,
            userAgent,
            timestamp ? new Date(timestamp) : new Date(),
          ]
        );
      } catch (dbError: any) {
        // Silently ignore if table doesn't exist (migration not run yet)
        // Only log if it's a different error
        if (dbError?.code !== '42P01') {
          console.error('Failed to store ad event in database:', dbError);
        }
      }
      
      res.json({ ok: true });
    } catch (e: any) {
      console.error('ad analytics error', e);
      res.status(500).json({ message: 'Failed to track ad event' });
    }
  });

  // Serve static files and handle client-side routing
  // This must be after all API routes
  const isDev = String(process.env.APP_ENV || process.env.NODE_ENV || "development").toLowerCase() !== "production";
  
  if (isDev) {
    // In development, use Vite middleware for HMR and TypeScript transpilation
    await setupVite(app, server);
    console.log("✅ Vite dev server configured");
  } else {
    // In production, serve from dist/public directory
    const distPath = path.resolve(import.meta.dirname, "..", "dist", "public");
    const indexPath = path.resolve(distPath, "index.html");
    
    if (fs.existsSync(distPath)) {
      // Serve static files (JS, CSS, images, etc.) with proper MIME types
      app.use(express.static(distPath, {
        fallthrough: true, // Allow requests to fall through if file doesn't exist
        index: false, // Don't serve index.html automatically
        setHeaders: (res, filePath) => {
          // Set correct MIME types for module scripts
          if (filePath.endsWith('.js') || filePath.endsWith('.mjs') ||
              filePath.endsWith('.ts') || filePath.endsWith('.tsx') ||
              filePath.endsWith('.jsx')) {
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
          } else if (filePath.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css; charset=utf-8');
          } else if (filePath.endsWith('.json')) {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
          } else if (filePath.endsWith('.wasm')) {
            res.setHeader('Content-Type', 'application/wasm');
          }
        }
      }));
      
      // Catch-all: serve index.html for all non-API routes (client-side routing)
      app.get("*", (req, res, next) => {
        // Skip API routes
        if (req.path.startsWith("/api")) {
          return next();
        }
        
        // Skip if it's a file request (has extension and not ending with /)
        const hasExtension = /\.\w+$/.test(req.path);
        if (hasExtension && !req.path.endsWith("/")) {
          return next();
        }
        
        // Serve index.html for all other routes
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath, (err) => {
            if (err) {
              next(err);
            }
          });
        } else {
          next();
        }
      });
    }
  }

  return server;
}
