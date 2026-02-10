/**
 * Admin Password Recovery Service
 * Handles password reset, 2FA disable, and admin management
 */

import crypto from 'crypto';
import { db } from '../db';
import { users } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

/**
 * Verify admin secret key (timing-safe)
 */
function verifyAdminSecretKey(secretKey: string): boolean {
  const validKey = process.env.ADMIN_CREATION_SECRET;
  if (!validKey) {
    throw new Error('ADMIN_CREATION_SECRET not set in environment');
  }

  try {
    return crypto.timingSafeEqual(
      Buffer.from(secretKey),
      Buffer.from(validKey)
    );
  } catch {
    return false;
  }
}

/**
 * Reset admin password via CLI with secret key verification
 */
export async function resetAdminPassword(opts: {
  username: string;
  newPassword: string;
  secretKey: string;
}) {
  const { username, newPassword, secretKey } = opts;

  // Verify secret key
  if (!verifyAdminSecretKey(secretKey)) {
    throw new Error('Invalid admin secret key');
  }

  // Get user
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (!user) {
    throw new Error('User not found');
  }

  // Verify user is admin
  if (user.role !== 'admin') {
    throw new Error('User is not an admin');
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Update password
  await db
    .update(users)
    .set({
      password: hashedPassword,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  return { success: true, user };
}

/**
 * List all admin users (requires secret key)
 */
export async function listAdminUsers(secretKey: string) {
  // Verify secret key
  if (!verifyAdminSecretKey(secretKey)) {
    throw new Error('Invalid admin secret key');
  }

  // Get all admin users
  const admins = await db
    .select({
      id: users.id,
      username: users.username,
      email: users.email,
      role: users.role,
      twoFactorEnabled: users.twoFactorEnabled,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.role, 'admin'));

  return admins;
}

/**
 * Delete admin user (requires secret key)
 */
export async function deleteAdminUser(opts: {
  username: string;
  secretKey: string;
}) {
  const { username, secretKey } = opts;

  // Verify secret key
  if (!verifyAdminSecretKey(secretKey)) {
    throw new Error('Invalid admin secret key');
  }

  // Get user
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (!user) {
    throw new Error('User not found');
  }

  // Verify user is admin
  if (user.role !== 'admin') {
    throw new Error('User is not an admin');
  }

  // Check if this is the last admin
  const allAdmins = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, 'admin'));

  if (allAdmins.length === 1) {
    throw new Error('Cannot delete the last admin user. Create another admin first.');
  }

  // Delete the admin
  await db
    .delete(users)
    .where(eq(users.id, user.id));

  return { success: true, deletedUser: { id: user.id, username: user.username } };
}

/**
 * Disable 2FA for admin (emergency access)
 */
export async function disableAdmin2FA(opts: {
  username: string;
  secretKey: string;
}) {
  const { username, secretKey } = opts;

  // Verify secret key
  if (!verifyAdminSecretKey(secretKey)) {
    throw new Error('Invalid admin secret key');
  }

  // Get user
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (!user) {
    throw new Error('User not found');
  }

  if (user.role !== 'admin') {
    throw new Error('User is not an admin');
  }

  if (!user.twoFactorEnabled) {
    throw new Error('2FA is not enabled for this user');
  }

  // Disable 2FA
  await db
    .update(users)
    .set({
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorBackupCodes: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  return { success: true };
}
