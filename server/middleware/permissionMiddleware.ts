/**
 * Permission Middleware
 * Check if admin user has required permissions
 */

import { Request, Response, NextFunction } from 'express';
import { hasPermission, hasAnyPermission } from '../services/permissionService';

export interface AdminRequest extends Request {
  admin?: {
    userId: number;
    username: string;
    role: string;
  };
}

/**
 * Middleware to check if user has a specific permission
 */
export function requirePermission(permissionName: string) {
  return async (req: AdminRequest, res: Response, next: NextFunction) => {
    if (!req.admin) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    const hasAccess = await hasPermission(req.admin.userId, permissionName);

    if (!hasAccess) {
      return res.status(403).json({
        ok: false,
        error: `Permission denied: ${permissionName} required`
      });
    }

    next();
  };
}

/**
 * Middleware to check if user has any of the specified permissions
 */
export function requireAnyPermission(permissionNames: string[]) {
  return async (req: AdminRequest, res: Response, next: NextFunction) => {
    if (!req.admin) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    const hasAccess = await hasAnyPermission(req.admin.userId, permissionNames);

    if (!hasAccess) {
      return res.status(403).json({
        ok: false,
        error: `Permission denied: One of [${permissionNames.join(', ')}] required`
      });
    }

    next();
  };
}
