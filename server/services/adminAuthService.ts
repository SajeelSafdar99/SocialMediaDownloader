import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { getAdminConfig } from "../config";
import type { User } from "../../shared/schema";

export interface AdminTokenPayload {
  userId: number;
  username: string;
  role: string;
  roleId?: number | null; // Added to support assigned roles
  iat: number;
  exp: number;
}

/**
 * Generate JWT token for admin user
 */
export function generateAdminToken(user: User): string {
  const config = getAdminConfig();
  const payload = {
    userId: user.id,
    username: user.username,
    role: user.role,
    roleId: user.roleId, // Include roleId for role-based access
  };

  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.sessionExpiry,
  });
}

/**
 * Verify admin JWT token
 */
export function verifyAdminToken(token: string): AdminTokenPayload | null {
  try {
    const config = getAdminConfig();
    const decoded = jwt.verify(token, config.jwtSecret) as AdminTokenPayload;

    // Check if user has admin access (role='admin' OR has roleId assigned)
    if (decoded.role !== "admin" && !decoded.roleId) {
      return null;
    }

    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Check if user is admin
 */
export function isAdmin(user: User | null | undefined): boolean {
  return user?.role === "admin";
}

/**
 * Hash password for admin user
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Compare password with hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
