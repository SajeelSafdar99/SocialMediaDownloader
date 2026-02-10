import type { Request, Response, NextFunction } from "express";
import { verifyAdminToken } from "../services/adminAuthService";
import { getUserPermissions } from "../services/permissionService";
import { db } from "../db";
import { users } from "../../shared/schema";
import { eq } from "drizzle-orm";

export interface AdminRequest extends Request {
  admin?: {
    userId: number;
    username: string;
    role: string;
    permissions?: string[];
  };
}

/**
 * Middleware to verify admin authentication
 */
export async function requireAdmin(
  req: AdminRequest,
  res: Response,
  next: NextFunction
) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        ok: false,
        error: "Unauthorized: No token provided",
      });
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    // Verify token
    const payload = verifyAdminToken(token);

    if (!payload) {
      return res.status(401).json({
        ok: false,
        error: "Unauthorized: Invalid or expired token",
      });
    }

    // Verify user still exists and has admin access
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);

    // Check if user exists and has admin panel access
    // Users with roleId (assigned roles like admin, super_admin, editor, viewer) can access admin panel
    // Users with role='admin' OR users with any roleId can access
    if (!user || (user.role !== "admin" && !user.roleId)) {
      return res.status(403).json({
        ok: false,
        error: "Forbidden: Admin access required",
      });
    }

    // Get user permissions
    const permissions = await getUserPermissions(user.id);

    // Attach admin info to request
    req.admin = {
      userId: user.id,
      username: user.username,
      role: user.role,
      permissions,
    };

    next();
  } catch (error) {
    console.error("Admin auth middleware error:", error);
    return res.status(500).json({
      ok: false,
      error: "Internal server error",
    });
  }
}

/**
 * Optional admin middleware - doesn't fail if not admin
 */
export async function optionalAdmin(
  req: AdminRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const payload = verifyAdminToken(token);

      if (payload) {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, payload.userId))
          .limit(1);

        if (user && user.role === "admin") {
          req.admin = {
            userId: user.id,
            username: user.username,
            role: user.role,
          };
        }
      }
    }

    next();
  } catch (error) {
    console.error("Optional admin middleware error:", error);
    next();
  }
}
