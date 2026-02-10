/**
 * Main App Activity Logs Routes
 * For regular users to view their own activity
 */

import type { Express } from "express";
import { getActivityLogs } from "../services/activityLogService";

export function registerMainAppLogsRoutes(app: Express) {

  /**
   * Get user's own activity logs
   * GET /api/user/activity-logs
   */
  app.get("/api/user/activity-logs", async (req: any, res) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({ ok: false, error: "Unauthorized" });
      }

      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const action = req.query.action as string;
      const resource = req.query.resource as string;

      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      // Only show logs for the current user
      const result = await getActivityLogs({
        limit,
        offset,
        userId: req.user.id, // Filter by current user
        action,
        resource,
        startDate,
        endDate,
      });

      res.json({ ok: true, ...result });
    } catch (error) {
      console.error("Get user activity logs error:", error);
      res.status(500).json({ ok: false, error: "Internal server error" });
    }
  });
}
