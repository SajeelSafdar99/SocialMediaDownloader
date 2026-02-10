/**
 * Activity Logger Middleware
 * Automatically logs all API requests, including bot traffic
 */

import type { Request, Response, NextFunction } from 'express';
import { logActivity } from '../services/activityLogService';

interface ExtendedRequest extends Request {
  user?: any;
  admin?: any;
  telegramUser?: any;
  whatsappUser?: any;
}

// Skip logging for these endpoints (too verbose or not needed)
const SKIP_ENDPOINTS = [
  '/api/health',
  '/api/ping',
  '/@vite',
  '/node_modules',
  '/src/',
  '/@fs/',
  '/.vite/',
];

// Track request timing
const requestTimings = new Map<string, number>();

/**
 * Activity Logger Middleware
 * Logs all API requests with timing, user info, and response status
 */
export function activityLoggerMiddleware(req: ExtendedRequest, res: Response, next: NextFunction) {
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();

  // Store start time
  requestTimings.set(requestId, startTime);

  // Skip non-API requests or specific endpoints
  const path = req.path || req.url || '';
  const shouldSkip =
    !path.startsWith('/api') ||
    SKIP_ENDPOINTS.some(skip => path.startsWith(skip));

  if (shouldSkip) {
    return next();
  }

  // Capture response
  let capturedJsonResponse: any = undefined;
  let responseLogged = false;

  const originalResJson = res.json.bind(res);
  res.json = function (body: any) {
    capturedJsonResponse = body;
    return originalResJson(body);
  };

  // Log when response is finished
  const logRequest = async () => {
    if (responseLogged) return;
    responseLogged = true;

    const duration = Date.now() - startTime;
    requestTimings.delete(requestId);

    try {
      // Determine user info
      const user = req.user || req.admin || req.telegramUser || req.whatsappUser;

      // Determine resource and action from endpoint
      const endpoint = req.originalUrl || req.url;
      const method = req.method;
      const resource = extractResource(endpoint);
      const action = extractAction(method, endpoint);

      // Check for bot traffic
      const isTelegramBot = endpoint.includes('/telegram') ||
                           req.get('user-agent')?.includes('Telegram') ||
                           req.telegramUser;
      const isWhatsAppBot = endpoint.includes('/whatsapp') ||
                           req.whatsappUser;

      // Determine success based on status code
      const statusCode = res.statusCode;
      const success = statusCode >= 200 && statusCode < 400;

      // Extract error message if failed
      let errorMessage: string | undefined;
      if (!success && capturedJsonResponse) {
        errorMessage = capturedJsonResponse.error ||
                      capturedJsonResponse.message ||
                      capturedJsonResponse.reason ||
                      `HTTP ${statusCode}`;
      }

      // Build description
      let description = `${method} ${endpoint}`;
      if (isTelegramBot) {
        description = `[Telegram Bot] ${description}`;
      } else if (isWhatsAppBot) {
        description = `[WhatsApp Bot] ${description}`;
      }

      // Get request body (sanitized)
      let requestBody: any = undefined;
      if (req.body && Object.keys(req.body).length > 0) {
        requestBody = sanitizeRequestBody(req.body);
      }

      // Log the activity
      await logActivity({
        userId: user?.id || user?.userId,
        username: user?.username || user?.telegramId || user?.whatsappId,
        userEmail: user?.email,
        userRole: user?.role || (isTelegramBot ? 'telegram_user' : isWhatsAppBot ? 'whatsapp_user' : undefined),
        action,
        resource,
        description,
        method,
        endpoint,
        ipAddress: req.ip || req.socket?.remoteAddress || req.headers['x-forwarded-for'] as string,
        userAgent: req.get('user-agent'),
        requestBody,
        responseStatus: statusCode,
        success,
        errorMessage,
        durationMs: duration,
      });

      // Console log for debugging
      if (!success || duration > 5000) {
        console.log(
          `[ActivityLog] ${success ? '✓' : '✗'} ${method} ${endpoint} ${statusCode} ${duration}ms ${errorMessage || ''}`
        );
      }
    } catch (error) {
      // Don't let logging errors break the application
      console.error('Failed to log activity:', error);
    }
  };

  // Log on finish (successful response)
  res.on('finish', logRequest);

  // Log on close (connection closed before response)
  res.on('close', logRequest);

  next();
}

/**
 * Extract resource name from endpoint
 */
function extractResource(endpoint: string): string {
  // Remove query params
  const path = endpoint.split('?')[0];

  // Common patterns
  if (path.includes('/download')) return 'download';
  if (path.includes('/user')) return 'user';
  if (path.includes('/admin')) return 'admin';
  if (path.includes('/auth')) return 'auth';
  if (path.includes('/payment')) return 'payment';
  if (path.includes('/subscription')) return 'subscription';
  if (path.includes('/telegram')) return 'telegram';
  if (path.includes('/whatsapp')) return 'whatsapp';
  if (path.includes('/blog')) return 'blog';
  if (path.includes('/email')) return 'email';
  if (path.includes('/refund')) return 'refund';
  if (path.includes('/activity-logs')) return 'activity_logs';
  if (path.includes('/query')) return 'query';
  if (path.includes('/probe')) return 'probe';
  if (path.includes('/sitemap')) return 'sitemap';

  // Extract from path
  const parts = path.split('/').filter(Boolean);
  if (parts.length >= 2) {
    return parts[1]; // /api/resource/...
  }

  return 'api';
}

/**
 * Extract action from method and endpoint
 */
function extractAction(method: string, endpoint: string): string {
  const path = endpoint.split('?')[0].toLowerCase();

  // Specific actions
  if (path.includes('/login')) return 'login';
  if (path.includes('/logout')) return 'logout';
  if (path.includes('/register')) return 'register';
  if (path.includes('/reset')) return 'reset_password';
  if (path.includes('/probe')) return 'probe_url';
  if (path.includes('/cleanup')) return 'cleanup';
  if (path.includes('/pair')) return 'pair_account';
  if (path.includes('/redeem')) return 'redeem_code';
  if (path.includes('/webhook')) return 'webhook';
  if (path.includes('/stats')) return 'view_stats';

  // Generic CRUD actions based on method
  switch (method) {
    case 'GET':
      return path.includes('/list') || path.endsWith('s') ? 'list' : 'view';
    case 'POST':
      return 'create';
    case 'PUT':
    case 'PATCH':
      return 'update';
    case 'DELETE':
      return 'delete';
    default:
      return method.toLowerCase();
  }
}

/**
 * Sanitize request body to remove sensitive data
 */
function sanitizeRequestBody(body: any): any {
  if (!body || typeof body !== 'object') return body;

  const sanitized = { ...body };
  const sensitiveFields = [
    'password',
    'token',
    'secret',
    'api_key',
    'apiKey',
    'accessToken',
    'refreshToken',
    'creditCard',
    'cvv',
    'ssn',
  ];

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}

/**
 * Cleanup old request timings (prevent memory leak)
 * Run periodically
 */
setInterval(() => {
  const now = Date.now();
  const entries = Array.from(requestTimings.entries());
  for (const [id, time] of entries) {
    if (now - time > 60000) { // 1 minute old
      requestTimings.delete(id);
    }
  }
}, 60000); // Run every minute
