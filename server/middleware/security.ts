import { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import slowDown from "express-slow-down";

/**
 * General API rate limiter - prevents DDoS and abuse
 * Increased limits for better user experience
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per 15 minutes (increased from 100)
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  },
});

/**
 * Strict rate limiter for sensitive endpoints
 */
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Admin panel rate limiter - more permissive for authenticated admins
 */
export const adminLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Limit to 100 requests per minute (plenty for dashboard)
  message: "Too many admin requests, please slow down.",
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip for login endpoint (use authLimiter instead)
    return req.path === '/api/admin/login';
  },
});

/**
 * Download endpoint rate limiter
 * More permissive for normal usage while still preventing abuse
 */
export const downloadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // Limit each IP to 100 downloads per hour (increased from 20)
  message: "Too many download requests, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: any) => {
    // Skip rate limiting for premium users
    if (req.user && req.user.isPremium) {
      return true;
    }
    // Skip if DEV_BYPASS_PREMIUM is enabled (development mode)
    if (process.env.DEV_BYPASS_PREMIUM === 'true') {
      return true;
    }
    return false;
  },
});

/**
 * Auth endpoint rate limiter - prevents brute force
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: "Too many login attempts, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

/**
 * Slow down requests after rate limit - graceful degradation
 * Very permissive to allow development with many module requests
 */
export const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 500, // Start delaying after 500 requests (increased from 50)
  delayMs: () => 100, // Add 100ms delay per request after delayAfter (v2 syntax)
  maxDelayMs: 2000, // Max delay of 2 seconds
  validate: { delayMs: false }, // Disable validation warning
  skip: (req) => {
    // Skip rate limiting in development
    const isDev = process.env.NODE_ENV === 'development' || process.env.APP_ENV === 'development';
    if (isDev) return true;

    // Skip for static assets and module requests
    const url = req.url || '';
    if (url.includes('/src/') || url.includes('/@') || url.includes('/node_modules/') ||
        url.includes('/assets/') || url.endsWith('.js') || url.endsWith('.css') ||
        url.endsWith('.tsx') || url.endsWith('.ts')) {
      return true;
    }

    return false;
  },
});

/**
 * Request size limiter middleware
 */
export const requestSizeLimiter = (req: Request, res: Response, next: NextFunction) => {
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (req.headers['content-length'] && parseInt(req.headers['content-length']) > maxSize) {
    return res.status(413).json({ message: 'Request entity too large' });
  }
  next();
};

/**
 * IP whitelist/blacklist middleware (optional)
 */
export const ipFilter = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || req.socket.remoteAddress;
  const blacklist = (process.env.IP_BLACKLIST || '').split(',').filter(Boolean);
  const whitelist = (process.env.IP_WHITELIST || '').split(',').filter(Boolean);

  if (blacklist.length > 0 && ip && blacklist.includes(ip)) {
    return res.status(403).json({ message: 'Access denied' });
  }

  if (whitelist.length > 0 && ip && !whitelist.includes(ip)) {
    return res.status(403).json({ message: 'Access denied' });
  }

  next();
};

/**
 * Security headers middleware
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // XSS Protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions Policy
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  next();
};

/**
 * DDoS protection - detect and block suspicious patterns
 * More permissive for development with Vite module loading
 */
const requestCounts = new Map<string, { count: number; resetAt: number }>();

export const ddosProtection = (req: Request, res: Response, next: NextFunction) => {
  // Skip in development mode
  const isDev = process.env.NODE_ENV === 'development' || process.env.APP_ENV === 'development';
  if (isDev) return next();

  // Skip for static assets and module requests
  const url = req.url || '';
  if (url.includes('/src/') || url.includes('/@') || url.includes('/node_modules/') ||
      url.includes('/assets/') || url.endsWith('.js') || url.endsWith('.css') ||
      url.endsWith('.tsx') || url.endsWith('.ts')) {
    return next();
  }

  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 1000; // Max requests per minute per IP (increased from 200)

  const record = requestCounts.get(ip);
  
  if (!record || now > record.resetAt) {
    requestCounts.set(ip, { count: 1, resetAt: now + windowMs });
    return next();
  }

  if (record.count >= maxRequests) {
    console.warn(`[DDoS Protection] Blocking suspicious activity from IP: ${ip}`);
    return res.status(429).json({ 
      message: 'Too many requests. Please slow down.',
      retryAfter: Math.ceil((record.resetAt - now) / 1000)
    });
  }

  record.count++;
  next();
};

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  Array.from(requestCounts.entries()).forEach(([ip, record]) => {
    if (now > record.resetAt) {
      requestCounts.delete(ip);
    }
  });
}, 5 * 60 * 1000); // Every 5 minutes
