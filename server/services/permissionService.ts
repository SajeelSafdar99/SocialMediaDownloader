/**
 * Permission and Role Management Service
 */

import { db } from '../db';
import { users, roles, permissions, rolePermissions } from '../../shared/schema';
import { eq, inArray } from 'drizzle-orm';

/**
 * Check if user has a specific permission
 */
export async function hasPermission(userId: number, permissionName: string): Promise<boolean> {
  const result = await db
    .select({ permission: permissions.name })
    .from(users)
    .leftJoin(roles, eq(users.roleId, roles.id))
    .leftJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
    .leftJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(users.id, userId));

  return result.some(row => row.permission === permissionName);
}

/**
 * Check if user has any of the specified permissions
 */
export async function hasAnyPermission(userId: number, permissionNames: string[]): Promise<boolean> {
  const result = await db
    .select({ permission: permissions.name })
    .from(users)
    .leftJoin(roles, eq(users.roleId, roles.id))
    .leftJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
    .leftJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(users.id, userId));

  const userPermissions = result.map(row => row.permission).filter(Boolean);
  return permissionNames.some(p => userPermissions.includes(p));
}

/**
 * Get all permissions for a user
 */
export async function getUserPermissions(userId: number): Promise<string[]> {
  const result = await db
    .select({ permission: permissions.name })
    .from(users)
    .leftJoin(roles, eq(users.roleId, roles.id))
    .leftJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
    .leftJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(users.id, userId));

  return result.map(row => row.permission).filter(Boolean) as string[];
}

/**
 * Get user role
 */
export async function getUserRole(userId: number) {
  const [result] = await db
    .select({ role: roles })
    .from(users)
    .leftJoin(roles, eq(users.roleId, roles.id))
    .where(eq(users.id, userId))
    .limit(1);

  return result?.role || null;
}

/**
 * Assign role to user
 */
export async function assignRole(userId: number, roleId: number) {
  await db
    .update(users)
    .set({ roleId, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

/**
 * Get all roles
 */
export async function getAllRoles() {
  return await db.select().from(roles);
}

/**
 * Get all permissions
 */
export async function getAllPermissions() {
  return await db.select().from(permissions);
}

/**
 * Get permissions for a role
 */
export async function getRolePermissions(roleId: number) {
  const result = await db
    .select({ permission: permissions })
    .from(rolePermissions)
    .leftJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(rolePermissions.roleId, roleId));

  return result.map(row => row.permission).filter(Boolean);
}

/**
 * Update role permissions
 */
export async function updateRolePermissions(roleId: number, permissionIds: number[]) {
  // Delete existing permissions
  await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));

  // Add new permissions
  if (permissionIds.length > 0) {
    await db.insert(rolePermissions).values(
      permissionIds.map(permissionId => ({ roleId, permissionId }))
    );
  }
}

/**
 * Create a new role
 */
export async function createRole(name: string, description?: string) {
  const [role] = await db
    .insert(roles)
    .values({ name, description })
    .returning();

  return role;
}

/**
 * Check if user is super admin
 */
export async function isSuperAdmin(userId: number): Promise<boolean> {
  const [result] = await db
    .select({ roleName: roles.name })
    .from(users)
    .leftJoin(roles, eq(users.roleId, roles.id))
    .where(eq(users.id, userId))
    .limit(1);

  return result?.roleName === 'super_admin' || result?.roleName === 'admin';
}
