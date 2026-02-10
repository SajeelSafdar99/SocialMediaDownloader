/**
 * Contact Query Management Routes
 */

import type { Express } from "express";
import { requireAdmin, type AdminRequest } from "../middleware/adminAuth";
import { requirePermission } from "../middleware/permissionMiddleware";
import {
  createContactQuery,
  getAllQueries,
  getQuery,
  updateQueryStatus,
  assignQuery,
  deleteQuery,
  getQueryStats,
} from "../services/queryService";

export function registerQueryRoutes(app: Express) {

  /**
   * Get all queries
   * GET /api/admin/queries
   */
  app.get(
    "/api/admin/queries",
    requireAdmin,
    requirePermission("queries.read"),
    async (req, res) => {
      try {
        const limit = parseInt(req.query.limit as string) || 20;
        const offset = parseInt(req.query.offset as string) || 0;
        const status = req.query.status as string;

        const result = await getAllQueries({ limit, offset, status });

        res.json({ ok: true, ...result });
      } catch (error) {
        console.error("Get queries error:", error);
        res.status(500).json({ ok: false, error: "Internal server error" });
      }
    }
  );

  /**
   * Get query statistics
   * GET /api/admin/queries/stats
   * IMPORTANT: This must come BEFORE /:id route to avoid matching "stats" as an ID
   */
  app.get(
    "/api/admin/queries/stats",
    requireAdmin,
    requirePermission("queries.read"),
    async (req, res) => {
      try {
        const stats = await getQueryStats();
        res.json({ ok: true, stats });
      } catch (error: any) {
        console.error("Get query stats error:", error);
        console.error("Error stack:", error.stack);
        res.status(500).json({
          ok: false,
          error: "Internal server error",
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    }
  );

  /**
   * Get single query
   * GET /api/admin/queries/:id
   */
  app.get(
    "/api/admin/queries/:id",
    requireAdmin,
    requirePermission("queries.read"),
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);

        // Validate that id is a valid number
        if (isNaN(id)) {
          return res.status(400).json({
            ok: false,
            error: "Invalid query ID"
          });
        }

        const query = await getQuery(id);

        if (!query) {
          return res.status(404).json({ ok: false, error: "Query not found" });
        }

        res.json({ ok: true, query });
      } catch (error) {
        console.error("Get query error:", error);
        res.status(500).json({ ok: false, error: "Internal server error" });
      }
    }
  );

  /**
   * Update query status
   * PUT /api/admin/queries/:id
   */
  app.put(
    "/api/admin/queries/:id",
    requireAdmin,
    requirePermission("queries.update"),
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const { status, adminNotes } = req.body;

        if (!status) {
          return res.status(400).json({
            ok: false,
            error: "Status is required",
          });
        }

        const query = await updateQueryStatus(id, status, adminNotes);

        if (!query) {
          return res.status(404).json({ ok: false, error: "Query not found" });
        }

        res.json({ ok: true, query });
      } catch (error) {
        console.error("Update query error:", error);
        res.status(500).json({ ok: false, error: "Internal server error" });
      }
    }
  );

  /**
   * Assign query to admin
   * POST /api/admin/queries/:id/assign
   */
  app.post(
    "/api/admin/queries/:id/assign",
    requireAdmin,
    requirePermission("queries.update"),
    async (req: AdminRequest, res) => {
      try {
        const id = parseInt(req.params.id);
        const { adminId } = req.body;

        const query = await assignQuery(id, adminId || req.admin!.userId);

        if (!query) {
          return res.status(404).json({ ok: false, error: "Query not found" });
        }

        res.json({ ok: true, query });
      } catch (error) {
        console.error("Assign query error:", error);
        res.status(500).json({ ok: false, error: "Internal server error" });
      }
    }
  );

  /**
   * Delete query
   * DELETE /api/admin/queries/:id
   */
  app.delete(
    "/api/admin/queries/:id",
    requireAdmin,
    requirePermission("queries.delete"),
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        await deleteQuery(id);

        res.json({ ok: true });
      } catch (error) {
        console.error("Delete query error:", error);
        res.status(500).json({ ok: false, error: "Internal server error" });
      }
    }
  );


  /**
   * Public endpoint to submit contact query
   * POST /api/contact
   */
  app.post("/api/contact", async (req, res) => {
    try {
      const { name, email, subject, message } = req.body;

      if (!name || !email || !message) {
        return res.status(400).json({
          ok: false,
          error: "Name, email, and message are required",
        });
      }

      const query = await createContactQuery({ name, email, subject, message });

      res.json({ ok: true, query });
    } catch (error) {
      console.error("Create contact query error:", error);
      res.status(500).json({ ok: false, error: "Internal server error" });
    }
  });
}
