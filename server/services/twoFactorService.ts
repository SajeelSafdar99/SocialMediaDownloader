/**
 * Two-Factor Authentication Service
 * Handles TOTP generation, verification, and QR code generation
 */

import { authenticator } from '@otplib/preset-default';
import QRCode from 'qrcode';
import { db } from '../db';
import { users } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { generateBackupCodes, hashBackupCodes, verifyBackupCode, removeBackupCode } from './secureAdminService';

// Configure authenticator
authenticator.options = {
  window: 1, // Allow 1 time step before/after current
  step: 30,  // 30 second time step (standard)
};

// Configure authenticator
authenticator.options = {
  window: 1, // Allow 1 time step before/after current
  step: 30,  // 30 second time step (standard)
};

export interface TwoFactorSetup {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

/**
 * Generate 2FA secret and QR code for user
 */
export async function generateTwoFactorSecret(
  userId: number
): Promise<{ ok: boolean; secret?: string; qrCodeUrl?: string; backupCodes?: string[]; error?: string }> {
  try {
    // Get user info
    const [user] = await db
      .select({ username: users.username })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return { ok: false, error: 'User not found' };
    }

    const issuer = 'SaveMedia Admin';

    // Generate secret
    const secret = authenticator.generateSecret();

    // Generate OTP auth URL for QR code
    const otpauth = authenticator.keyuri(user.username, issuer, secret);

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(otpauth);

    // Generate backup codes
    const backupCodes = generateBackupCodes(10);

    // Store temporarily (will be saved when user confirms with code)
    // For now, we'll just return them
    return {
      ok: true,
      secret,
      qrCodeUrl,
      backupCodes,
    };
  } catch (error) {
    console.error('Generate 2FA secret error:', error);
    return { ok: false, error: 'Failed to generate 2FA secret' };
  }
}

/**
 * Enable 2FA for user (after verifying initial code)
 */
export async function enableTwoFactor(
  userId: number,
  code: string
): Promise<{ ok: boolean; backupCodes?: string[]; error?: string }> {
  try {
    // Get the temporarily stored secret from a previous generate call
    // In practice, you'd want to store this temporarily with a session or similar
    // For now, we'll retrieve it from the request context

    // This should be called after generate, where the secret is temporarily stored
    // The frontend should send both the secret and code
    return { ok: false, error: 'Not implemented - use enableTwoFactorWithSecret' };
  } catch (error) {
    console.error('Enable 2FA error:', error);
    return { ok: false, error: 'Failed to enable 2FA' };
  }
}

/**
 * Enable 2FA with secret and code verification
 */
export async function enableTwoFactorWithSecret(
  userId: number,
  secret: string,
  code: string,
  backupCodes: string[]
): Promise<{ ok: boolean; error?: string }> {
  try {
    // Verify the code first
    const isValid = verifyTOTPCode(code, secret);

    if (!isValid) {
      return { ok: false, error: 'Invalid verification code' };
    }

    // Hash backup codes before storing
    const hashedBackupCodes = hashBackupCodes(backupCodes);

    await db
      .update(users)
      .set({
        twoFactorSecret: secret,
        twoFactorEnabled: true,
        twoFactorBackupCodes: hashedBackupCodes,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return { ok: true };
  } catch (error) {
    console.error('Enable 2FA with secret error:', error);
    return { ok: false, error: 'Failed to enable 2FA' };
  }
}

/**
 * Disable 2FA for user
 */
export async function disableTwoFactor(userId: number): Promise<{ ok: boolean; error?: string }> {
  try {
    await db
      .update(users)
      .set({
        twoFactorSecret: null,
        twoFactorEnabled: false,
        twoFactorBackupCodes: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return { ok: true };
  } catch (error) {
    console.error('Disable 2FA error:', error);
    return { ok: false, error: 'Failed to disable 2FA' };
  }
}

/**
 * Verify 2FA code (TOTP or backup code)
 */
export async function verifyTwoFactorCode(
  userId: number,
  code: string
): Promise<{ ok: boolean; valid?: boolean; usedBackupCode?: boolean; error?: string }> {
  try {
    // Get user's 2FA data
    const [user] = await db
      .select({
        twoFactorSecret: users.twoFactorSecret,
        twoFactorBackupCodes: users.twoFactorBackupCodes,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user || !user.twoFactorSecret) {
      return { ok: false, error: '2FA not enabled' };
    }

    // First, try TOTP verification
    const totpValid = verifyTOTPCode(code, user.twoFactorSecret);
    if (totpValid) {
      return { ok: true, valid: true, usedBackupCode: false };
    }

    // If TOTP fails, try backup codes
    if (user.twoFactorBackupCodes && user.twoFactorBackupCodes.length > 0) {
      const backupCodeValid = verifyBackupCode(code, user.twoFactorBackupCodes);

      if (backupCodeValid) {
        // Remove used backup code
        const updatedCodes = removeBackupCode(code, user.twoFactorBackupCodes);

        await db
          .update(users)
          .set({
            twoFactorBackupCodes: updatedCodes,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId));

        return { ok: true, valid: true, usedBackupCode: true };
      }
    }

    return { ok: true, valid: false, usedBackupCode: false };
  } catch (error) {
    console.error('Verify 2FA code error:', error);
    return { ok: false, error: 'Failed to verify code' };
  }
}

/**
 * Verify TOTP token for a specific user
 */
export async function verifyTOTP(
  userId: number,
  token: string
): Promise<{ ok: boolean; valid?: boolean; error?: string }> {
  try {
    const [user] = await db
      .select({ twoFactorSecret: users.twoFactorSecret })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user || !user.twoFactorSecret) {
      return { ok: false, error: '2FA not enabled' };
    }

    const isValid = verifyTOTPCode(token, user.twoFactorSecret);
    return { ok: true, valid: isValid };
  } catch (error) {
    console.error('Verify TOTP error:', error);
    return { ok: false, error: 'Failed to verify TOTP' };
  }
}

/**
 * Verify TOTP token with secret
 */
function verifyTOTPCode(token: string, secret: string): boolean {
  try {
    return authenticator.verify({ token, secret });
  } catch (error) {
    console.error('TOTP verification error:', error);
    return false;
  }
}

/**
 * Check if user has 2FA enabled
 */
export async function isTwoFactorEnabled(userId: number): Promise<boolean> {
  const [user] = await db
    .select({ twoFactorEnabled: users.twoFactorEnabled })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user?.twoFactorEnabled || false;
}

/**
 * Generate new backup codes
 */
export async function regenerateBackupCodes(userId: number): Promise<{ ok: boolean; backupCodes?: string[]; error?: string }> {
  try {
    const newCodes = generateBackupCodes(10);
    const hashedCodes = hashBackupCodes(newCodes);

    await db
      .update(users)
      .set({
        twoFactorBackupCodes: hashedCodes,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return { ok: true, backupCodes: newCodes };
  } catch (error) {
    console.error('Regenerate backup codes error:', error);
    return { ok: false, error: 'Failed to regenerate backup codes' };
  }
}

/**
 * Get remaining backup codes count
 */
export async function getBackupCodesCount(userId: number): Promise<number> {
  const [user] = await db
    .select({ twoFactorBackupCodes: users.twoFactorBackupCodes })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user?.twoFactorBackupCodes?.length || 0;
}
