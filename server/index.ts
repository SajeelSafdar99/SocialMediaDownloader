import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import cors from "cors";
import helmet from "helmet";
import { startDownloadFileReaper } from "./services/fileCleanupService";
import { startPolling as startTelegramPolling } from "./bot/telegramPolling";
import { loadEnv } from "./env";
import {
  apiLimiter,
  strictLimiter,
  downloadLimiter,
  authLimiter,
  speedLimiter,
  requestSizeLimiter,
  securityHeaders,
  ddosProtection,
} from "./middleware/security";
import { activityLoggerMiddleware } from "./middleware/activityLogger";
import { subdomainMiddleware, enforceAdminSubdomain } from "./middleware/subdomain";

loadEnv();

const app = express();
app.set('trust proxy', 1);

// Subdomain detection middleware (BEFORE everything else)
app.use(subdomainMiddleware);

// Enable CORS BEFORE other middleware to allow frontend requests
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Postman, or same-origin)
    if (!origin) return callback(null, true);
    
    // In development, allow localhost on any port
    const isLocalhost = /^https?:\/\/localhost(:\d+)?$/.test(origin) || 
                        /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin) ||
                        /^https?:\/\/0\.0\.0\.0(:\d+)?$/.test(origin);
    
    // Allow vidgrabber.online domain and subdomains
    const isVidGrabber = /^https?:\/\/(www\.|admin\.)?vidgrabber\.online$/.test(origin);

    // Get custom allowed origins from environment
    const customOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()).filter(Boolean) || [];
    const isCustomAllowed = customOrigins.includes(origin);

    // In development mode, be more permissive
    const isDevelopment = process.env.APP_ENV === 'development' || process.env.NODE_ENV === 'development';

    if (isDevelopment || isLocalhost || isVidGrabber || isCustomAllowed) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(null, true); // Allow anyway in development, log warning
    }
  },
  credentials: true, // Allow cookies/credentials
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Range', 'X-Content-Range', 'Content-Length'],
  maxAge: 86400, // 24 hours
}));

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        "https://www.googletagmanager.com",
        "https://pagead2.googlesyndication.com",
        "https://googleads.g.doubleclick.net",
        "https://www.google.com",
        "https://ep2.adtrafficquality.google",
        "https://adservice.google.com",
        "blob:"
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://fonts.googleapis.com",
        "https://cdnjs.cloudflare.com",
        "https://googleads.g.doubleclick.net"
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com",
        "https://cdnjs.cloudflare.com",
        "data:",
        "https://fonts.googleapis.com"
      ],
      imgSrc: [
        "'self'",
        "data:",
        "blob:",
        "https:",
        "https://www.google-analytics.com",
        "https://googleads.g.doubleclick.net",
        "https://pagead2.googlesyndication.com",
        "https://www.google.com",
        "https://ep2.adtrafficquality.google"
      ],
      connectSrc: [
        "'self'",
        "https://www.google-analytics.com",
        "https://sandbox.api.getsafepay.com",
        "https://api.getsafepay.com",
        "https://sandbox.getsafepay.pk",
        "https://getsafepay.pk",
        "https://googleads.g.doubleclick.net",
        "https://pagead2.googlesyndication.com",
        "https://www.google.com",
        "https://ep2.adtrafficquality.google",
        "ws:",
        "wss:"
      ],
      frameSrc: [
        "'self'",
        "https://www.google.com",
        "https://sandbox.getsafepay.pk",
        "https://getsafepay.pk",
        "https://googleads.g.doubleclick.net",
        "https://pagead2.googlesyndication.com",
        "https://ep2.adtrafficquality.google",
        "https://td.doubleclick.net",
        "https://www.googletagmanager.com"
      ],
      workerSrc: ["'self'", "blob:"],
      childSrc: [
        "'self'",
        "https://googleads.g.doubleclick.net",
        "https://www.google.com"
      ],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

app.use(securityHeaders);
app.use(ddosProtection);
app.use(requestSizeLimiter);
app.use(speedLimiter);

// Development CSP shim:
// Some environments (or upstream proxies) inject `Content-Security-Policy: default-src 'none'`.
// That breaks Vite/React dev (inline module preamble, HMR). We set a safe, dev-only CSP.
app.use((req, res, next) => {
  const env = String(process.env.APP_ENV || process.env.NODE_ENV || 'development').toLowerCase();
  const isDev = env !== 'production';
  if (isDev) {
    // Allow local dev + ngrok preview. Keep it minimal but compatible with Vite.
    const ngrokHost = req.get('host');
    const connectSrc = [
      "'self'",
      'ws:',
      'wss:',
      'https:',
      'http://localhost:5173',
      'ws://localhost:5173',
      // Cybersource Flex API
      'https://testflex.cybersource.com',
      'https://flex.cybersource.com',
      // Cardinal Commerce 3DS
      'https://centinelapistag.cardinalcommerce.com',
      'https://centinelapi.cardinalcommerce.com'
    ];
    const scriptSrc = ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'blob:', 'https:'];
    const styleSrc = ["'self'", "'unsafe-inline'", 'https:'];
    const imgSrc = ["'self'", 'data:', 'blob:', 'https:'];
    const fontSrc = ["'self'", 'data:', 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com', 'https://fonts.googleapis.com'];
    const frameSrc = [
      "'self'",
      'https://googleads.g.doubleclick.net',
      'https://pagead2.googlesyndication.com',
      'https://www.google.com',
      'https://ep2.adtrafficquality.google',
      'https://td.doubleclick.net',
      // Cybersource Flex payment iframes
      'https://testflex.cybersource.com',
      'https://flex.cybersource.com',
      // Cardinal Commerce 3DS iframes
      'https://centinelapistag.cardinalcommerce.com',
      'https://centinelapi.cardinalcommerce.com'
    ];

    // If ngrok host exists, allow it explicitly for websockets as well.
    const csp = [
      `default-src 'self'`,
      `base-uri 'self'`,
      `object-src 'none'`,
      `frame-ancestors 'self'`,
      `script-src ${scriptSrc.join(' ')}`,
      `style-src ${styleSrc.join(' ')}`,
      `img-src ${imgSrc.join(' ')}`,
      `font-src ${fontSrc.join(' ')}`,
      `worker-src 'self' blob:`,
      `frame-src ${frameSrc.join(' ')}`,
      `child-src 'self' https://googleads.g.doubleclick.net`,
      `connect-src ${connectSrc.join(' ')}${ngrokHost ? ` https://${ngrokHost} wss://${ngrokHost}` : ''}`,
    ].join('; ');

    res.setHeader('Content-Security-Policy', csp);
  }
  next();
});

// CORS is already configured above, before security middleware

// Activity Logger Middleware - Automatically logs all API requests
app.use(activityLoggerMiddleware);

// SafePay webhook uses express.raw() in routes.ts
// Regular routes use JSON parsing
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

(async () => {
  const server = await registerRoutes(app);

  // Start background cleanup of old download files
  startDownloadFileReaper();

  // Error handling
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    console.error(err);
  });

  const PORT = Number(process.env.PORT || 5001);
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);

    // Start Telegram bot in polling mode (for local development)
    // Only start if bot token is configured and not using webhook
    if (process.env.TELEGRAM_BOT_TOKEN && !process.env.TELEGRAM_WEBHOOK_URL) {
      startTelegramPolling().catch((error) => {
        console.error("Failed to start Telegram polling:", error);
      });
    }
  });
})();