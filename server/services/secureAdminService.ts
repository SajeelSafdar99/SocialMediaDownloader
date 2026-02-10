/**
 * Secure Admin Creation Service
 * Creates admin users with secret key verification
 */

import crypto from 'crypto';
import { db } from '../db';
import { users, roles } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

// Generate a secure admin creation key (store this in env)
export function generateAdminSecretKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Verify admin secret key
export function verifyAdminSecretKey(providedKey: string): boolean {
  const validKey = process.env.ADMIN_CREATION_SECRET;

  if (!validKey) {
    console.error('❌ ADMIN_CREATION_SECRET not set in environment variables!');
    return false;
  }

  // Use timing-safe comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(providedKey),
    Buffer.from(validKey)
  );
}

// Create admin user with secret key verification
export async function createSecureAdmin(opts: {
  username: string;
  email: string;
  password: string;
  secretKey: string;
}) {
  const { username, email, password, secretKey } = opts;

  // Verify secret key
  if (!verifyAdminSecretKey(secretKey)) {
    throw new Error('Invalid admin creation secret key');
  }

  // Get super_admin role ID
  const [superAdminRole] = await db
    .select()
    .from(roles)
    .where(eq(roles.name, 'super_admin'))
    .limit(1);

  if (!superAdminRole) {
    throw new Error('super_admin role not found in database. Run migrations first.');
  }

  // Check if user already exists
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (existingUser) {
    // Update existing user to super admin
    await db
      .update(users)
      .set({
        role: 'admin',
        roleId: superAdminRole.id,
        isPremium: true,
        adminSecretKey: crypto.createHash('sha256').update(secretKey).digest('hex'),
        updatedAt: new Date(),
      })
      .where(eq(users.id, existingUser.id));

    return { user: existingUser, created: false };
  }

  // Create new admin user with super_admin role
  const hashedPassword = await bcrypt.hash(password, 10);
  const secretKeyHash = crypto.createHash('sha256').update(secretKey).digest('hex');

  const [newUser] = await db
    .insert(users)
    .values({
      username,
      email,
      password: hashedPassword,
      role: 'admin',
      roleId: superAdminRole.id,
      isPremium: true,
      adminSecretKey: secretKeyHash,
    })
    .returning();

  return { user: newUser, created: true };
}

// Generate backup codes for admin
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
  }
  return codes;
}

// Hash backup codes for storage
export function hashBackupCodes(codes: string[]): string[] {
  return codes.map(code =>
    crypto.createHash('sha256').update(code).digest('hex')
  );
}

// Verify backup code
export function verifyBackupCode(providedCode: string, hashedCodes: string[]): boolean {
  const hashedProvided = crypto.createHash('sha256').update(providedCode).digest('hex');
  return hashedCodes.includes(hashedProvided);
}

// Remove used backup code
export function removeBackupCode(usedCode: string, hashedCodes: string[]): string[] {
  const hashedUsed = crypto.createHash('sha256').update(usedCode).digest('hex');
  return hashedCodes.filter(code => code !== hashedUsed);
}
