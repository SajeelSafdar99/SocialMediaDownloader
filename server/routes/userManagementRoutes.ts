/**
 * User Management Routes
 * Admin can manage users, assign roles, and view permissions
 */

import type { Express } from "express";
import { requireAdmin, type AdminRequest } from "../middleware/adminAuth";
import { requirePermission } from "../middleware/permissionMiddleware";
import { db } from "../db";
import { users, roles, permissions, rolePermissions } from "../../shared/schema";
import { eq, like, or, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import {
  getAllRoles,
  getAllPermissions,
  getRolePermissions,
  assignRole,
  updateRolePermissions,
  getUserPermissions,
  createRole,
} from "../services/permissionService";
import { logActivityFromRequest } from "../services/activityLogService";

export function registerUserManagementRoutes(app: Express) {

  /**
   * Get all users with pagination
   * GET /api/admin/user-management/users
   */
  app.get(
    "/api/admin/user-management/users",
    requireAdmin,
    requirePermission("users.read"),
    async (req: AdminRequest, res) => {
      try {
        const limit = parseInt(req.query.limit as string) || 20;
        const offset = parseInt(req.query.offset as string) || 0;
        const search = req.query.search as string;
        const roleFilter = req.query.role as string;

        let conditions = [];

        if (search) {
          conditions.push(
            or(
              like(users.username, `%${search}%`),
              like(users.email, `%${search}%`)
            )
          );
        }

        if (roleFilter) {
          conditions.push(eq(users.role, roleFilter));
        }

        const usersList = await db
          .select({
            user: users,
            roleName: roles.name,
            roleDescription: roles.description,
          })
          .from(users)
          .leftJoin(roles, eq(users.roleId, roles.id))
          .where(conditions.length > 0 ? conditions[0] : undefined)
          .limit(limit)
          .offset(offset);

        const [countResult] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(users)
          .where(conditions.length > 0 ? conditions[0] : undefined);

        await logActivityFromRequest(req, 'view', 'users', {
          description: `Viewed user list`,
          responseStatus: 200,
        });

        res.json({
          ok: true,
          users: usersList,
          total: countResult.count,
          hasMore: offset + limit < countResult.count,
        });
      } catch (error) {
        console.error("Get users error:", error);
        res.status(500).json({ ok: false, error: "Internal server error" });
      }
    }
  );

  /**
   * Get single user with permissions
   * GET /api/admin/user-management/users/:id
   */
  app.get(
    "/api/admin/user-management/users/:id",
    requireAdmin,
    requirePermission("users.read"),
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);

        const [userResult] = await db
          .select({
            user: users,
            roleName: roles.name,
            roleDescription: roles.description,
          })
          .from(users)
          .leftJoin(roles, eq(users.roleId, roles.id))
          .where(eq(users.id, id))
          .limit(1);

        if (!userResult) {
          return res.status(404).json({ ok: false, error: "User not found" });
        }

        const userPermissions = await getUserPermissions(id);

        res.json({
          ok: true,
          user: userResult,
          permissions: userPermissions,
        });
      } catch (error) {
        console.error("Get user error:", error);
        res.status(500).json({ ok: false, error: "Internal server error" });
      }
    }
  );

  /**
   * Create new user
   * POST /api/admin/user-management/users
   */
  app.post(
    "/api/admin/user-management/users",
    requireAdmin,
    requirePermission("users.create"),
    async (req: AdminRequest, res) => {
      try {
        const { username, email, password, role, roleId } = req.body;

        if (!username || !email || !password) {
          return res.status(400).json({
            ok: false,
            error: "Username, email, and password are required",
          });
        }

        // Check if user exists
        const [existing] = await db
          .select()
          .from(users)
          .where(eq(users.username, username))
          .limit(1);

        if (existing) {
          return res.status(400).json({
            ok: false,
            error: "Username already exists",
          });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Important: Don't set base 'role' field from UI
        // The 'role' field should only be 'user' or 'admin' (for legacy compatibility)
        // Admin roles are assigned via roleId
        const [newUser] = await db
          .insert(users)
          .values({
            username,
            email,
            password: hashedPassword,
            role: 'user', // Always 'user' for new users created in UI
            roleId: roleId || undefined, // Set the assigned admin role
          })
          .returning();

        await logActivityFromRequest(req, 'create', 'user', {
          resourceId: newUser.id,
          description: `Created user: ${username}`,
          responseStatus: 200,
        });

        res.json({ ok: true, user: newUser });
      } catch (error: any) {
        console.error("Create user error:", error);
        await logActivityFromRequest(req, 'create', 'user', {
          success: false,
          errorMessage: error.message,
          responseStatus: 500,
        });
        res.status(500).json({ ok: false, error: "Internal server error" });
      }
    }
  );

  /**
   * Update user
   * PUT /api/admin/user-management/users/:id
   */
  app.put(
    "/api/admin/user-management/users/:id",
    requireAdmin,
    requirePermission("users.update"),
    async (req: AdminRequest, res) => {
      try {
        const id = parseInt(req.params.id);
        const { email, roleId, isPremium, adminNotes } = req.body;

        // Note: We don't update 'role' field here - it should only be 'user' or 'admin'
        // Admin roles are managed via roleId
        const [user] = await db
          .update(users)
          .set({
            email: email || undefined,
            roleId: roleId !== undefined ? roleId : undefined,
            isPremium: isPremium !== undefined ? isPremium : undefined,
            adminNotes: adminNotes !== undefined ? adminNotes : undefined,
            updatedAt: new Date(),
          })
          .where(eq(users.id, id))
          .returning();

        if (!user) {
          return res.status(404).json({ ok: false, error: "User not found" });
        }

        await logActivityFromRequest(req, 'update', 'user', {
          resourceId: id,
          description: `Updated user: ${user.username}`,
          responseStatus: 200,
        });

        res.json({ ok: true, user });
      } catch (error) {
        console.error("Update user error:", error);
        res.status(500).json({ ok: false, error: "Internal server error" });
      }
    }
  );

  /**
   * Assign role to user
   * POST /api/admin/user-management/users/:id/assign-role
   */
  app.post(
    "/api/admin/user-management/users/:id/assign-role",
    requireAdmin,
    requirePermission("users.assign_roles"),
    async (req: AdminRequest, res) => {
      try {
        const userId = parseInt(req.params.id);
        const { roleId } = req.body;

        if (!roleId) {
          return res.status(400).json({
            ok: false,
            error: "Role ID is required",
          });
        }

        await assignRole(userId, roleId);

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);

        await logActivityFromRequest(req, 'assign_role', 'user', {
          resourceId: userId,
          description: `Assigned role to user: ${user?.username}`,
          responseStatus: 200,
        });

        res.json({ ok: true, user });
      } catch (error) {
        console.error("Assign role error:", error);
        res.status(500).json({ ok: false, error: "Internal server error" });
      }
    }
  );

  /**
   * Delete user
   * DELETE /api/admin/user-management/users/:id
   */
  app.delete(
    "/api/admin/user-management/users/:id",
    requireAdmin,
    requirePermission("users.delete"),
    async (req: AdminRequest, res) => {
      try {
        const id = parseInt(req.params.id);

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, id))
          .limit(1);

        if (!user) {
          return res.status(404).json({ ok: false, error: "User not found" });
        }

        await db.delete(users).where(eq(users.id, id));

        await logActivityFromRequest(req, 'delete', 'user', {
          resourceId: id,
          description: `Deleted user: ${user.username}`,
          responseStatus: 200,
        });

        res.json({ ok: true });
      } catch (error) {
        console.error("Delete user error:", error);
        res.status(500).json({ ok: false, error: "Internal server error" });
      }
    }
  );

  /**
   * Get all roles
   * GET /api/admin/user-management/roles
   */
  app.get(
    "/api/admin/user-management/roles",
    requireAdmin,
    requirePermission("users.read"),
    async (req, res) => {
      try {
        const rolesList = await getAllRoles();
        res.json({ ok: true, roles: rolesList });
      } catch (error) {
        console.error("Get roles error:", error);
        res.status(500).json({ ok: false, error: "Internal server error" });
      }
    }
  );

  /**
   * Get all permissions
   * GET /api/admin/user-management/permissions
   */
  app.get(
    "/api/admin/user-management/permissions",
    requireAdmin,
    requirePermission("users.read"),
    async (req, res) => {
      try {
        const permissionsList = await getAllPermissions();
        res.json({ ok: true, permissions: permissionsList });
      } catch (error) {
        console.error("Get permissions error:", error);
        res.status(500).json({ ok: false, error: "Internal server error" });
      }
    }
  );

  /**
   * Get role permissions
   * GET /api/admin/user-management/roles/:id/permissions
   */
  app.get(
    "/api/admin/user-management/roles/:id/permissions",
    requireAdmin,
    requirePermission("users.read"),
    async (req, res) => {
      try {
        const roleId = parseInt(req.params.id);
        const permissionsList = await getRolePermissions(roleId);
        res.json({ ok: true, permissions: permissionsList });
      } catch (error) {
        console.error("Get role permissions error:", error);
        res.status(500).json({ ok: false, error: "Internal server error" });
      }
    }
  );

  /**
   * Update role permissions
   * PUT /api/admin/user-management/roles/:id/permissions
   */
  app.put(
    "/api/admin/user-management/roles/:id/permissions",
    requireAdmin,
    requirePermission("users.assign_roles"),
    async (req: AdminRequest, res) => {
      try {
        const roleId = parseInt(req.params.id);
        const { permissionIds } = req.body;

        if (!Array.isArray(permissionIds)) {
          return res.status(400).json({
            ok: false,
            error: "Permission IDs must be an array",
          });
        }

        await updateRolePermissions(roleId, permissionIds);

        await logActivityFromRequest(req, 'update_permissions', 'role', {
          resourceId: roleId,
          description: `Updated permissions for role ID: ${roleId}`,
          responseStatus: 200,
        });

        res.json({ ok: true });
      } catch (error) {
        console.error("Update role permissions error:", error);
        res.status(500).json({ ok: false, error: "Internal server error" });
      }
    }
  );

  /**
   * Create new role
   * POST /api/admin/user-management/roles
   */
  app.post(
    "/api/admin/user-management/roles",
    requireAdmin,
    requirePermission("users.assign_roles"),
    async (req: AdminRequest, res) => {
      try {
        const { name, description } = req.body;

        if (!name) {
          return res.status(400).json({
            ok: false,
            error: "Role name is required",
          });
        }

        const role = await createRole(name, description);

        await logActivityFromRequest(req, 'create', 'role', {
          resourceId: role.id,
          description: `Created role: ${name}`,
          responseStatus: 200,
        });

        res.json({ ok: true, role });
      } catch (error: any) {
        console.error("Create role error:", error);
        if (error.message?.includes('unique')) {
          return res.status(400).json({ ok: false, error: "Role name already exists" });
        }
        res.status(500).json({ ok: false, error: "Internal server error" });
      }
    }
  );
}
