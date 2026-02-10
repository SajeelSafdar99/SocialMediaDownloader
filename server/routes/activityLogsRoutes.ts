/**
 * Activity Logs Routes
 * View comprehensive logs of all system activities
 */

import type { Express } from "express";
import { requireAdmin, type AdminRequest } from "../middleware/adminAuth";
import { requirePermission } from "../middleware/permissionMiddleware";
import {
  getActivityLogs,
  getActivityLogStats,
  deleteOldLogs,
  getActivityLogTrends,
  getFailedApiCalls,
} from "../services/activityLogService";

export function registerActivityLogsRoutes(app: Express) {

  /**
   * Get ALL activity logs (admin + users)
   * GET /api/admin/activity-logs
   */
  app.get(
    "/api/admin/activity-logs",
    requireAdmin,
    requirePermission("analytics.read"),
    async (req, res) => {
      try {
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;
        const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
        const action = req.query.action as string;
        const resource = req.query.resource as string;
        const success = req.query.success === 'true' ? true : req.query.success === 'false' ? false : undefined;
        const search = req.query.search as string;

        const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
        const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

        const result = await getActivityLogs({
          limit,
          offset,
          userId,
          action,
          resource,
          success,
          startDate,
          endDate,
          search,
        });

        res.json({ ok: true, ...result });
      } catch (error) {
        console.error("Get activity logs error:", error);
        res.status(500).json({ ok: false, error: "Internal server error" });
      }
    }
  );

  /**
   * Get ADMIN activity logs only
   * GET /api/admin/activity-logs/admin
   */
  app.get(
    "/api/admin/activity-logs/admin",
    requireAdmin,
    requirePermission("analytics.read"),
    async (req, res) => {
      try {
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;
        const action = req.query.action as string;
        const resource = req.query.resource as string;
        const success = req.query.success === 'true' ? true : req.query.success === 'false' ? false : undefined;
        const search = req.query.search as string;

        const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
        const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

        // Get logs where userRole = 'admin'
        const result = await getActivityLogs({
          limit,
          offset,
          action,
          resource,
          success,
          startDate,
          endDate,
          search,
        });

        // Filter for admin logs
        const adminLogs = result.logs.filter(log => log.userRole === 'admin');

        res.json({
          ok: true,
          logs: adminLogs,
          total: adminLogs.length,
          hasMore: result.hasMore
        });
      } catch (error) {
        console.error("Get admin logs error:", error);
        res.status(500).json({ ok: false, error: "Internal server error" });
      }
    }
  );

  /**
   * Get USER activity logs only (non-admin)
   * GET /api/admin/activity-logs/users
   */
  app.get(
    "/api/admin/activity-logs/users",
    requireAdmin,
    requirePermission("analytics.read"),
    async (req, res) => {
      try {
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;
        const action = req.query.action as string;
        const resource = req.query.resource as string;
        const success = req.query.success === 'true' ? true : req.query.success === 'false' ? false : undefined;
        const search = req.query.search as string;

        const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
        const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

        const result = await getActivityLogs({
          limit,
          offset,
          action,
          resource,
          success,
          startDate,
          endDate,
          search,
        });

        // Filter for non-admin logs
        const userLogs = result.logs.filter(log => log.userRole !== 'admin');

        res.json({
          ok: true,
          logs: userLogs,
          total: userLogs.length,
          hasMore: result.hasMore
        });
      } catch (error) {
        console.error("Get user logs error:", error);
        res.status(500).json({ ok: false, error: "Internal server error" });
      }
    }
  );

  /**
   * Get activity log statistics
   * GET /api/admin/activity-logs/stats
   */
  app.get(
    "/api/admin/activity-logs/stats",
    requireAdmin,
    requirePermission("analytics.read"),
    async (req, res) => {
      try {
        const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
        const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

        const stats = await getActivityLogStats({ startDate, endDate });

        res.json({ ok: true, stats });
      } catch (error) {
        console.error("Get activity log stats error:", error);
        res.status(500).json({ ok: false, error: "Internal server error" });
      }
    }
  );

  /**
   * Get activity log trends (success vs failure)
   * GET /api/admin/activity-logs/trends
   */
  app.get(
    "/api/admin/activity-logs/trends",
    requireAdmin,
    requirePermission("analytics.read"),
    async (req, res) => {
      try {
        const days = parseInt(req.query.days as string) || 7;
        const filterByUser = req.query.filterByUser === 'true';
        const filterByAdmin = req.query.filterByAdmin === 'true';

        const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
        const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

        const trends = await getActivityLogTrends({
          days,
          startDate,
          endDate,
          filterByUser,
          filterByAdmin,
        });

        res.json({ ok: true, trends });
      } catch (error) {
        console.error("Get activity log trends error:", error);
        res.status(500).json({ ok: true, error: "Internal server error" });
      }
    }
  );

  /**
   * Get failed API calls
   * GET /api/admin/activity-logs/failed
   */
  app.get(
    "/api/admin/activity-logs/failed",
    requireAdmin,
    requirePermission("analytics.read"),
    async (req, res) => {
      try {
        const limit = parseInt(req.query.limit as string) || 50;
        const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
        const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

        const result = await getFailedApiCalls({ limit, startDate, endDate });

        res.json({ ok: true, ...result });
      } catch (error) {
        console.error("Get failed API calls error:", error);
        res.status(500).json({ ok: false, error: "Internal server error" });
      }
    }
  );

  /**
   * Delete old logs (cleanup)
   * DELETE /api/admin/activity-logs/cleanup
   */
  app.delete(
    "/api/admin/activity-logs/cleanup",
    requireAdmin,
    requirePermission("users.delete"),
    async (req: AdminRequest, res) => {
      try {
        const daysOld = parseInt(req.query.daysOld as string) || 90;

        await deleteOldLogs(daysOld);

        res.json({ ok: true, message: `Deleted logs older than ${daysOld} days` });
      } catch (error) {
        console.error("Delete old logs error:", error);
        res.status(500).json({ ok: false, error: "Internal server error" });
      }
    }
  );
}
