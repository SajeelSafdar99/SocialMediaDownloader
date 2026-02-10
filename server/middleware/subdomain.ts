import { Request, Response, NextFunction } from "express";

/**
 * Subdomain detection middleware
 * Extracts subdomain from the host header
 */
export function subdomainMiddleware(req: Request, res: Response, next: NextFunction) {
  const host = req.get('host') || '';
  const subdomain = host.split('.')[0];

  // Store subdomain in request for later use
  (req as any).subdomain = subdomain;

  next();
}

/**
 * Admin subdomain check middleware
 * Redirects admin routes to admin subdomain or checks if on admin subdomain
 */
export function enforceAdminSubdomain(req: Request, res: Response, next: NextFunction) {
  const host = req.get('host') || '';
  const isAdminSubdomain = host.startsWith('admin.');
  const isAdminRoute = req.path.startsWith('/admin') || req.path.startsWith('/api/admin');

  // If accessing admin route but not on admin subdomain
  if (isAdminRoute && !isAdminSubdomain && !host.includes('localhost')) {
    // Redirect to admin subdomain
    const protocol = req.protocol;
    const mainDomain = host.replace(/^[^.]+\./, ''); // Remove any subdomain
    const adminUrl = `${protocol}://admin.${mainDomain}${req.originalUrl}`;
    return res.redirect(301, adminUrl);
  }

  // If on admin subdomain, rewrite path to /admin for proper routing
  // but don't redirect - let it serve the admin panel at root
  if (isAdminSubdomain && req.path === '/') {
    req.url = '/admin';
  }

  next();
}

/**
 * Admin subdomain only middleware
 * Blocks non-admin routes when on admin subdomain
 */
export function adminSubdomainOnly(req: Request, res: Response, next: NextFunction) {
  const host = req.get('host') || '';
  const isAdminSubdomain = host.startsWith('admin.');

  if (isAdminSubdomain) {
    // Allow admin routes, API routes, and static assets on admin subdomain
    const isAllowedPath =
      req.path.startsWith('/admin') ||
      req.path.startsWith('/api/admin') ||
      req.path.startsWith('/api/auth') ||
      req.path.startsWith('/src/') ||
      req.path.startsWith('/@') ||
      req.path.startsWith('/node_modules/') ||
      req.path.startsWith('/assets/') ||
      req.path === '/favicon.svg' ||
      req.path === '/favicon.ico';

    if (!isAllowedPath) {
      return res.status(403).json({
        error: 'This endpoint is not available on the admin subdomain',
        message: 'Please use the main domain'
      });
    }
  }

  next();
}
