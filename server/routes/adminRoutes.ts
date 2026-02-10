import type { Express } from "express";
import { requireAdmin, type AdminRequest } from "../middleware/adminAuth";
import { storage } from "../storage";
import { db } from "../db";
import { users } from "../../shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import {
  generateAdminToken,
  isAdmin,
} from "../services/adminAuthService";
import {
  getDashboardStats,
  getMonthlyUserRegistrations,
  getMonthlySubscriptionPurchases,
  getRecentUsers,
  getRecentTransactions,
} from "../services/adminAnalyticsService";
import {
  createRefund,
  processRefund,
  getRefund,
  getAllRefunds,
  getRefundsByUserId,
} from "../services/refundService";
import {
  generateTwoFactorSecret,
  enableTwoFactorWithSecret,
  disableTwoFactor,
  verifyTwoFactorCode,
  isTwoFactorEnabled,
  regenerateBackupCodes,
  getBackupCodesCount,
  verifyTOTP,
} from "../services/twoFactorService";
import { adminLimiter, authLimiter } from "../middleware/security";

export function registerAdminRoutes(app: Express) {
  // Apply admin rate limiting to admin routes (100 req/min)
  app.use("/api/admin", adminLimiter);

  /**
   * Admin Login
   * POST /api/admin/login
   */
  app.post("/api/admin/login", authLimiter, async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          ok: false,
          error: "Username and password are required",
        });
      }

      // Get user by username
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (!user) {
        return res.status(401).json({
          ok: false,
          error: "Invalid credentials",
        });
      }

      // Debug logging
      console.log("Admin login attempt:", {
        username: user.username,
        role: user.role,
        roleId: user.roleId,
        hasRoleId: !!user.roleId,
        isAdmin: user.role === "admin",
        willAllow: user.role === "admin" || !!user.roleId
      });

      // Check if user has admin panel access
      // Users with role='admin' OR users with any roleId (assigned roles) can access admin panel
      if (user.role !== "admin" && !user.roleId) {
        console.log("Access DENIED - No admin role or roleId");
        return res.status(403).json({
          ok: false,
          error: "Access denied: Admin panel access required",
        });
      }

      console.log("Access GRANTED - User has admin access");

      // Verify password
      const passwordValid = await bcrypt.compare(password, user.password);
      if (!passwordValid) {
        return res.status(401).json({
          ok: false,
          error: "Invalid credentials",
        });
      }

      // Get user permissions
      const { getUserPermissions } = await import("../services/permissionService");
      const permissions = await getUserPermissions(user.id);

      console.log("User permissions loaded:", permissions);

      // Generate JWT token
      const token = generateAdminToken(user);

      res.json({
        ok: true,
        token,
        admin: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          permissions,
        },
      });
    } catch (error) {
      console.error("Admin login error:", error);
      res.status(500).json({
        ok: false,
        error: "Internal server error",
      });
    }
  });

  /**
   * Get Current Admin User
   * GET /api/admin/me
   */
  app.get("/api/admin/me", requireAdmin, async (req: AdminRequest, res) => {
    try {
      if (!req.admin) {
        return res.status(401).json({ ok: false, error: "Unauthorized" });
      }

      const user = await storage.getUser(req.admin.userId);
      if (!user) {
        return res.status(404).json({ ok: false, error: "User not found" });
      }

      res.json({
        ok: true,
        admin: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          permissions: req.admin.permissions || [],
        },
      });
    } catch (error) {
      console.error("Get admin user error:", error);
      res.status(500).json({ ok: false, error: "Internal server error" });
    }
  });

  /**
   * Get Dashboard Statistics
   * GET /api/admin/analytics/dashboard
   */
  app.get("/api/admin/analytics/dashboard", requireAdmin, async (_req, res) => {
    try {
      const stats = await getDashboardStats();
      res.json({ ok: true, stats });
    } catch (error) {
      console.error("Get dashboard stats error:", error);
      res.status(500).json({ ok: false, error: "Internal server error" });
    }
  });

  /**
   * Get Monthly User Registration Trends
   * GET /api/admin/analytics/trends/registrations
   */
  app.get("/api/admin/analytics/trends/registrations", requireAdmin, async (_req, res) => {
    try {
      const trends = await getMonthlyUserRegistrations();
      res.json({ ok: true, trends });
    } catch (error) {
      console.error("Get registration trends error:", error);
      res.status(500).json({ ok: false, error: "Internal server error" });
    }
  });

  /**
   * Get Monthly Subscription Purchase Trends
   * GET /api/admin/analytics/trends/subscriptions
   */
  app.get("/api/admin/analytics/trends/subscriptions", requireAdmin, async (_req, res) => {
    try {
      const trends = await getMonthlySubscriptionPurchases();
      res.json({ ok: true, trends });
    } catch (error) {
      console.error("Get subscription trends error:", error);
      res.status(500).json({ ok: false, error: "Internal server error" });
    }
  });

  /**
   * Get Recent Users
   * GET /api/admin/users?limit=10&offset=0
   */
  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await getRecentUsers(limit, offset);
      res.json({ ok: true, ...result });
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ ok: false, error: "Internal server error" });
    }
  });

  /**
   * Get User Details
   * GET /api/admin/users/:id
   */
  app.get("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ ok: false, error: "Invalid user ID" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ ok: false, error: "User not found" });
      }

      res.json({ ok: true, user });
    } catch (error) {
      console.error("Get user details error:", error);
      res.status(500).json({ ok: false, error: "Internal server error" });
    }
  });

  /**
   * Update User
   * PUT /api/admin/users/:id
   */
  app.put("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ ok: false, error: "Invalid user ID" });
      }

      const { isPremium, role, adminNotes } = req.body;

      const updates: any = { updatedAt: new Date() };
      if (typeof isPremium === "boolean") updates.isPremium = isPremium;
      if (role && ["user", "admin"].includes(role)) updates.role = role;
      if (typeof adminNotes === "string") updates.adminNotes = adminNotes;

      await db.update(users).set(updates).where(eq(users.id, userId));

      const updatedUser = await storage.getUser(userId);
      res.json({ ok: true, user: updatedUser });
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({ ok: false, error: "Internal server error" });
    }
  });

  /**
   * Get Recent Transactions
   * GET /api/admin/transactions?limit=10&offset=0
   */
  app.get("/api/admin/transactions", requireAdmin, async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await getRecentTransactions(limit, offset);
      res.json({ ok: true, ...result });
    } catch (error) {
      console.error("Get transactions error:", error);
      res.status(500).json({ ok: false, error: "Internal server error" });
    }
  });

  /**
   * Get All Refunds
   * GET /api/admin/refunds?limit=20&offset=0
   */
  app.get("/api/admin/refunds", requireAdmin, async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const offset = parseInt(req.query.offset as string) || 0;

      const refunds = await getAllRefunds(limit, offset);
      res.json({ ok: true, refunds });
    } catch (error) {
      console.error("Get refunds error:", error);
      res.status(500).json({ ok: false, error: "Internal server error" });
    }
  });

  /**
   * Get Refund by ID
   * GET /api/admin/refunds/:id
   */
  app.get("/api/admin/refunds/:id", requireAdmin, async (req, res) => {
    try {
      const refundId = parseInt(req.params.id);
      if (isNaN(refundId)) {
        return res.status(400).json({ ok: false, error: "Invalid refund ID" });
      }

      const refund = await getRefund(refundId);
      if (!refund) {
        return res.status(404).json({ ok: false, error: "Refund not found" });
      }

      res.json({ ok: true, refund });
    } catch (error) {
      console.error("Get refund error:", error);
      res.status(500).json({ ok: false, error: "Internal server error" });
    }
  });

  /**
   * Process Refund
   * POST /api/admin/refunds/:id/process
   */
  app.post("/api/admin/refunds/:id/process", requireAdmin, async (req: AdminRequest, res) => {
    try {
      const refundId = parseInt(req.params.id);
      if (isNaN(refundId)) {
        return res.status(400).json({ ok: false, error: "Invalid refund ID" });
      }

      if (!req.admin) {
        return res.status(401).json({ ok: false, error: "Unauthorized" });
      }

      const result = await processRefund(refundId, req.admin.userId);

      if (!result.ok) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error) {
      console.error("Process refund error:", error);
      res.status(500).json({ ok: false, error: "Internal server error" });
    }
  });

  /**
   * Get User's Refunds
   * GET /api/admin/users/:id/refunds
   */
  app.get("/api/admin/users/:id/refunds", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ ok: false, error: "Invalid user ID" });
      }

      const refunds = await getRefundsByUserId(userId);
      res.json({ ok: true, refunds });
    } catch (error) {
      console.error("Get user refunds error:", error);
      res.status(500).json({ ok: false, error: "Internal server error" });
    }
  });

  /**
   * Generate Two-Factor Authentication Secret
   * POST /api/admin/two-factor/generate
   */
  app.post(
    "/api/admin/two-factor/generate",
    requireAdmin,
    async (req: AdminRequest, res) => {
      try {
        const secret = await generateTwoFactorSecret(req.admin.userId);
        res.json({ ok: true, secret });
      } catch (error) {
        console.error("Generate 2FA secret error:", error);
        res.status(500).json({ ok: false, error: "Internal server error" });
      }
    }
  );

  /**
   * Enable Two-Factor Authentication
   * POST /api/admin/two-factor/enable
   */
  app.post(
    "/api/admin/two-factor/enable",
    requireAdmin,
    async (req: AdminRequest, res) => {
      try {
        const { secret, code, backupCodes } = req.body;

        if (!secret || !code || !backupCodes) {
          return res.status(400).json({
            ok: false,
            error: "Secret, code, and backup codes are required"
          });
        }

        const result = await enableTwoFactorWithSecret(
          req.admin.userId,
          secret,
          code,
          backupCodes
        );

        if (!result.ok) {
          return res.status(400).json(result);
        }

        res.json(result);
      } catch (error) {
        console.error("Enable 2FA error:", error);
        res.status(500).json({ ok: false, error: "Internal server error" });
      }
    }
  );

  /**
   * Disable Two-Factor Authentication
   * POST /api/admin/two-factor/disable
   */
  app.post(
    "/api/admin/two-factor/disable",
    requireAdmin,
    async (req: AdminRequest, res) => {
      try {
        const result = await disableTwoFactor(req.admin.userId);

        if (!result.ok) {
          return res.status(400).json(result);
        }

        res.json(result);
      } catch (error) {
        console.error("Disable 2FA error:", error);
        res.status(500).json({ ok: false, error: "Internal server error" });
      }
    }
  );

  /**
   * Verify Two-Factor Authentication Code
   * POST /api/admin/two-factor/verify
   */
  app.post(
    "/api/admin/two-factor/verify",
    requireAdmin,
    async (req: AdminRequest, res) => {
      try {
        const { code } = req.body;

        if (!code) {
          return res.status(400).json({ ok: false, error: "Code is required" });
        }

        const result = await verifyTwoFactorCode(req.admin.userId, code);

        if (!result.ok) {
          return res.status(400).json(result);
        }

        res.json(result);
      } catch (error) {
        console.error("Verify 2FA code error:", error);
        res.status(500).json({ ok: false, error: "Internal server error" });
      }
    }
  );

  /**
   * Check if Two-Factor Authentication is Enabled
   * GET /api/admin/two-factor/status
   */
  app.get(
    "/api/admin/two-factor/status",
    requireAdmin,
    async (req: AdminRequest, res) => {
      try {
        const enabled = await isTwoFactorEnabled(req.admin.userId);
        res.json({ ok: true, enabled });
      } catch (error) {
        console.error("Check 2FA status error:", error);
        res.status(500).json({ ok: false, error: "Internal server error" });
      }
    }
  );

  /**
   * Regenerate Two-Factor Authentication Backup Codes
   * POST /api/admin/two-factor/regenerate-codes
   */
  app.post(
    "/api/admin/two-factor/regenerate-codes",
    requireAdmin,
    async (req: AdminRequest, res) => {
      try {
        const result = await regenerateBackupCodes(req.admin.userId);

        if (!result.ok) {
          return res.status(400).json(result);
        }

        res.json(result);
      } catch (error) {
        console.error("Regenerate 2FA codes error:", error);
        res.status(500).json({ ok: false, error: "Internal server error" });
      }
    }
  );

  /**
   * Get Two-Factor Authentication Backup Codes Count
   * GET /api/admin/two-factor/backup-codes-count
   */
  app.get(
    "/api/admin/two-factor/backup-codes-count",
    requireAdmin,
    async (req: AdminRequest, res) => {
      try {
        const count = await getBackupCodesCount(req.admin.userId);
        res.json({ ok: true, count });
      } catch (error) {
        console.error("Get 2FA backup codes count error:", error);
        res.status(500).json({ ok: false, error: "Internal server error" });
      }
    }
  );

  /**
   * Verify TOTP for Two-Factor Authentication
   * POST /api/admin/two-factor/verify-totp
   */
  app.post(
    "/api/admin/two-factor/verify-totp",
    requireAdmin,
    async (req: AdminRequest, res) => {
      try {
        const { token } = req.body;

        if (!token) {
          return res.status(400).json({ ok: false, error: "Token is required" });
        }

        const result = await verifyTOTP(req.admin.userId, token);

        if (!result.ok) {
          return res.status(400).json(result);
        }

        res.json(result);
      } catch (error) {
        console.error("Verify TOTP error:", error);
        res.status(500).json({ ok: false, error: "Internal server error" });
      }
    }
  );
}
