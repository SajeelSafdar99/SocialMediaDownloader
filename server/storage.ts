import {
  users,
  downloads,
  telegramUsers,
  telegramLinkTokens,
  telegramUserLinks,
  whatsappUsers,
  whatsappLinkTokens,
  whatsappUserLinks,
  payments,
  type User,
  type UpsertUser,
  type Download,
  type InsertDownload, InsertUser,
  type TelegramUser,
  type TelegramLinkToken,
  type TelegramUserLink,
  type WhatsAppUser,
  type WhatsAppLinkToken,
  type WhatsAppUserLink,
  type Payment,
  type InsertPayment,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: number): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<User>): Promise<User | undefined>;
  // Download operations
  createDownload(download: InsertDownload): Promise<Download>;
  getUserDownloads(userId: number, limit?: number): Promise<Download[]>;
  getDownload(id: number): Promise<Download | undefined>;
  updateDownloadStatus(id: number, status: string, downloadUrl?: string): Promise<Download>;
  updateDownloadInfo(
    id: number,
    info: { title?: string; thumbnail?: string; fileSize?: number; expiresAt?: Date | null; fileDeletedAt?: Date | null }
  ): Promise<Download>;
  markDownloadExpired(id: number, fileDeletedAt?: Date): Promise<Download>;
  deleteDownload(id: number): Promise<void>;

  // Password reset operations
  getUserByEmail(email: string): Promise<User | undefined>;
  setPasswordResetToken(userId: number, tokenHash: string, expiresAt: Date): Promise<void>;
  verifyPasswordResetToken(tokenHash: string): Promise<User | undefined>;
  updateUserPassword(userId: number, passwordHash: string): Promise<User>;
  clearPasswordResetToken(userId: number): Promise<void>;

  // Payment operations
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPaymentByTransactionId(transactionId: string): Promise<Payment | undefined>;
  getPaymentByProviderTransactionId(providerTransactionId: string): Promise<Payment | undefined>;
  updatePaymentStatus(paymentId: number, status: string): Promise<Payment>;
  updatePayment(paymentId: number, updates: Partial<Payment>): Promise<Payment>;
  updateUserSubscription(opts: {
    userId: number;
    isPremium: boolean;
    provider: string;
    providerTransactionId: string;
    premiumExpiresAt?: Date;
    planId?: string;
  }): Promise<User>;

  // Telegram bot users
  getOrCreateTelegramUser(input: { telegramId: string; username?: string | null }): Promise<TelegramUser>;
  incrementTelegramFreeUsage(telegramId: string, resetAt: Date): Promise<TelegramUser>;
  resetTelegramFreeUsage(telegramId: string, resetAt: Date): Promise<TelegramUser>;
  setTelegramPremium(telegramId: string, isPremium: boolean): Promise<TelegramUser>;

  // Telegram pairing
  createTelegramLinkToken(input: { telegramId: string; token: string; expiresAt: Date }): Promise<TelegramLinkToken>;
  consumeTelegramLinkToken(input: { token: string }): Promise<TelegramLinkToken | null>;
  upsertTelegramUserLink(input: { telegramId: string; userId: number }): Promise<TelegramUserLink>;
  getTelegramLinkedUserId(telegramId: string): Promise<number | null>;

  // WhatsApp bot users
  getOrCreateWhatsAppUser(input: { whatsappId: string; username?: string | null }): Promise<WhatsAppUser>;
  getWhatsAppUserUsage(whatsappId: string): Promise<{ count: number; remaining: number; limit: number } | null>;
  incrementWhatsAppFreeUsage(whatsappId: string, resetAt: Date): Promise<WhatsAppUser>;
  resetWhatsAppFreeUsage(whatsappId: string, resetAt: Date): Promise<WhatsAppUser>;
  setWhatsAppPremium(whatsappId: string, isPremium: boolean): Promise<WhatsAppUser>;

  // WhatsApp pairing
  createWhatsAppLinkToken(input: { whatsappId: string; token: string; expiresAt: Date }): Promise<WhatsAppLinkToken>;
  consumeWhatsAppLinkToken(input: { token: string }): Promise<WhatsAppLinkToken | null>;
  upsertWhatsAppUserLink(input: { whatsappId: string; userId: number }): Promise<WhatsAppUserLink>;
  getWhatsAppLinkedUserId(whatsappId: string): Promise<number | null>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const [updated] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return updated;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Payment operations
  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [created] = await db.insert(payments).values({
      ...payment,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any).returning();
    return created;
  }

  async getPaymentByTransactionId(transactionId: string): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.transactionId, transactionId));
    return payment;
  }

  async getPaymentByProviderTransactionId(providerTransactionId: string): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.providerTransactionId as any, providerTransactionId));
    return payment;
  }

  async updatePaymentStatus(paymentId: number, status: string): Promise<Payment> {
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };
    if (status === "completed") {
      updateData.completedAt = new Date();
    }
    const [updated] = await db.update(payments).set(updateData).where(eq(payments.id, paymentId)).returning();
    return updated;
  }

  async updatePayment(paymentId: number, updates: Partial<Payment>): Promise<Payment> {
    const updateData: any = {
      ...updates,
      updatedAt: new Date(),
    };
    const [updated] = await db.update(payments).set(updateData).where(eq(payments.id, paymentId)).returning();
    return updated;
  }

  async updateUserSubscription(opts: {
    userId: number;
    isPremium: boolean;
    provider: string;
    providerTransactionId: string;
    premiumExpiresAt?: Date;
    planId?: string;
  }): Promise<User> {
    const [u] = await db.update(users).set({
      isPremium: opts.isPremium,
      premiumExpiresAt: opts.premiumExpiresAt || null,
      subscriptionProvider: opts.provider,
      subscriptionPlanId: opts.planId || null,
      updatedAt: new Date(),
    } as any).where(eq(users.id, opts.userId)).returning();
    return u;
  }

  // Download operations
  async createDownload(downloadData: InsertDownload): Promise<Download> {
    const [download] = await db
      .insert(downloads)
      .values(downloadData)
      .returning();
    return download;
  }

  async getUserDownloads(userId: number, limit: number = 50): Promise<Download[]> {
    return await db
      .select()
      .from(downloads)
      .where(eq(downloads.userId, userId))
      .orderBy(desc(downloads.createdAt))
      .limit(limit);
  }

  async getDownload(id: number): Promise<Download | undefined> {
    const [download] = await db.select().from(downloads).where(eq(downloads.id, id));
    return download;
  }

  async updateDownloadStatus(id: number, status: string, downloadUrl?: string): Promise<Download> {
    const updateData: any = { status };
    if (downloadUrl) {
      updateData.downloadUrl = downloadUrl;
    }
    
    const [download] = await db
      .update(downloads)
      .set(updateData)
      .where(eq(downloads.id, id))
      .returning();
    return download;
  }

  async updateDownloadInfo(
    id: number,
    info: { title?: string; thumbnail?: string; fileSize?: number; expiresAt?: Date | null; fileDeletedAt?: Date | null }
  ): Promise<Download> {
    const [download] = await db
      .update(downloads)
      .set(info)
      .where(eq(downloads.id, id))
      .returning();
    return download;
  }

  async markDownloadExpired(id: number, fileDeletedAt: Date = new Date()): Promise<Download> {
    const [download] = await db
      .update(downloads)
      .set({
        status: 'expired',
        downloadUrl: null,
        fileDeletedAt,
      } as any)
      .where(eq(downloads.id, id))
      .returning();
    return download;
  }

  async deleteDownload(id: number): Promise<void> {
    await db.delete(downloads).where(eq(downloads.id, id));
  }

  // Password reset operations
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [u] = await db.select().from(users).where(eq(users.email, email));
    return u;
  }

  async setPasswordResetToken(userId: number, tokenHash: string, expiresAt: Date): Promise<void> {
    await db.update(users).set({
      passwordResetTokenHash: tokenHash,
      passwordResetTokenExpiresAt: expiresAt,
      updatedAt: new Date(),
    } as any).where(eq(users.id, userId));
  }

  async verifyPasswordResetToken(tokenHash: string): Promise<User | undefined> {
    const now = new Date();
    const [u] = await db.select().from(users).where(eq(users.passwordResetTokenHash, tokenHash as any));
    if (!u) return undefined;
    const exp = (u as any).passwordResetTokenExpiresAt as Date | null | undefined;
    if (!exp || exp.getTime() < now.getTime()) return undefined;
    return u;
  }

  async updateUserPassword(userId: number, passwordHash: string): Promise<User> {
    const [u] = await db.update(users).set({
      password: passwordHash,
      updatedAt: new Date(),
    }).where(eq(users.id, userId)).returning();
    return u;
  }

  async clearPasswordResetToken(userId: number): Promise<void> {
    await db.update(users).set({
      passwordResetTokenHash: null,
      passwordResetTokenExpiresAt: null,
      updatedAt: new Date(),
    } as any).where(eq(users.id, userId));
  }


  // Telegram bot users
  async getOrCreateTelegramUser(input: { telegramId: string; username?: string | null }): Promise<TelegramUser> {
    const telegramId = String(input.telegramId);
    const [existing] = await db.select().from(telegramUsers).where(eq(telegramUsers.telegramId, telegramId));
    if (existing) {
      // Update username opportunistically
      if (input.username && input.username !== existing.username) {
        const [updated] = await db.update(telegramUsers).set({
          username: input.username,
          updatedAt: new Date(),
        } as any).where(eq(telegramUsers.telegramId, telegramId)).returning();
        return updated;
      }
      return existing;
    }

    const [created] = await db.insert(telegramUsers).values({
      telegramId,
      username: input.username ?? null,
      isPremium: false,
      freeUsedCount: 0,
      freeResetAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any).returning();

    return created;
  }

  async incrementTelegramFreeUsage(telegramId: string, resetAt: Date): Promise<TelegramUser> {
    const u = await this.getOrCreateTelegramUser({ telegramId });
    const nextReset = u.freeResetAt ?? resetAt;

    const [updated] = await db.update(telegramUsers).set({
      freeUsedCount: (u.freeUsedCount ?? 0) + 1,
      freeResetAt: nextReset,
      updatedAt: new Date(),
    } as any).where(eq(telegramUsers.telegramId, telegramId)).returning();
    return updated;
  }

  async resetTelegramFreeUsage(telegramId: string, resetAt: Date): Promise<TelegramUser> {
    await this.getOrCreateTelegramUser({ telegramId });
    const [updated] = await db.update(telegramUsers).set({
      freeUsedCount: 0,
      freeResetAt: resetAt,
      updatedAt: new Date(),
    } as any).where(eq(telegramUsers.telegramId, telegramId)).returning();
    return updated;
  }

  async setTelegramPremium(telegramId: string, isPremium: boolean): Promise<TelegramUser> {
    await this.getOrCreateTelegramUser({ telegramId });
    const [updated] = await db.update(telegramUsers).set({
      isPremium,
      updatedAt: new Date(),
    } as any).where(eq(telegramUsers.telegramId, telegramId)).returning();
    return updated;
  }

  // Telegram pairing
  async createTelegramLinkToken(input: { telegramId: string; token: string; expiresAt: Date }): Promise<TelegramLinkToken> {
    const [row] = await db.insert(telegramLinkTokens).values({
      token: input.token,
      telegramId: input.telegramId,
      expiresAt: input.expiresAt,
      createdAt: new Date(),
      consumedAt: null,
    } as any).returning();
    return row;
  }

  async consumeTelegramLinkToken(input: { token: string }): Promise<TelegramLinkToken | null> {
    const token = String(input.token);
    const now = new Date();

    const [found] = await db.select().from(telegramLinkTokens).where(eq(telegramLinkTokens.token, token));
    if (!found) return null;

    if (found.consumedAt) return null;
    if (found.expiresAt && (found.expiresAt as any as Date).getTime() < now.getTime()) return null;

    const [updated] = await db.update(telegramLinkTokens).set({
      consumedAt: now,
    } as any).where(eq(telegramLinkTokens.id, (found as any).id)).returning();

    return updated || null;
  }

  async upsertTelegramUserLink(input: { telegramId: string; userId: number }): Promise<TelegramUserLink> {
    // Upsert by telegramId: one Telegram account maps to one web user.
    const [existing] = await db.select().from(telegramUserLinks).where(eq(telegramUserLinks.telegramId, input.telegramId));
    if (existing) {
      const [updated] = await db.update(telegramUserLinks).set({
        userId: input.userId,
      } as any).where(eq(telegramUserLinks.telegramId, input.telegramId)).returning();
      return updated;
    }

    const [created] = await db.insert(telegramUserLinks).values({
      telegramId: input.telegramId,
      userId: input.userId,
      createdAt: new Date(),
    } as any).returning();
    return created;
  }

  async getTelegramLinkedUserId(telegramId: string): Promise<number | null> {
    const [link] = await db.select().from(telegramUserLinks).where(eq(telegramUserLinks.telegramId, telegramId));
    if (!link) return null;
    const id = Number((link as any).userId);
    return Number.isFinite(id) ? id : null;
  }

  // WhatsApp bot users
  async getOrCreateWhatsAppUser(input: { whatsappId: string; username?: string | null }): Promise<WhatsAppUser> {
    // Normalize whatsappId - remove @c.us, @s.whatsapp.net, etc. for consistency
    let whatsappId = String(input.whatsappId);
    // Extract just the number part (before @)
    const normalizedId = whatsappId.split('@')[0];
    whatsappId = normalizedId;
    
    const [existing] = await db.select().from(whatsappUsers).where(eq(whatsappUsers.whatsappId, whatsappId));
    if (existing) {
      // Update username opportunistically
      if (input.username && input.username !== existing.username) {
        const [updated] = await db.update(whatsappUsers).set({
          username: input.username,
          updatedAt: new Date(),
        } as any).where(eq(whatsappUsers.whatsappId, whatsappId)).returning();
        return updated;
      }
      return existing;
    }

    try {
      const [created] = await db.insert(whatsappUsers).values({
        whatsappId,
        username: input.username ?? null,
        isPremium: false,
        freeUsedCount: 0,
        freeResetAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any).returning();

      return created;
    } catch (error: any) {
      // Handle duplicate key error - try to get existing user
      if (error.code === '23505') {
        const [existing] = await db.select().from(whatsappUsers).where(eq(whatsappUsers.whatsappId, whatsappId));
        if (existing) {
          return existing;
        }
      }
      throw error;
    }
  }

  async getWhatsAppUserUsage(whatsappId: string): Promise<{ count: number; remaining: number; limit: number } | null> {
    const u = await this.getOrCreateWhatsAppUser({ whatsappId });
    if (u.isPremium) {
      return { count: 0, remaining: Infinity, limit: Infinity };
    }
    const limit = Number(process.env.WHATSAPP_FREE_LIMIT ?? 7);
    const count = u.freeUsedCount ?? 0;
    const remaining = Math.max(0, limit - count);
    return { count, remaining, limit };
  }

  async incrementWhatsAppFreeUsage(whatsappId: string, resetAt: Date): Promise<WhatsAppUser> {
    const u = await this.getOrCreateWhatsAppUser({ whatsappId });
    const nextReset = u.freeResetAt ?? resetAt;

    const [updated] = await db.update(whatsappUsers).set({
      freeUsedCount: (u.freeUsedCount ?? 0) + 1,
      freeResetAt: nextReset,
      updatedAt: new Date(),
    } as any).where(eq(whatsappUsers.whatsappId, whatsappId)).returning();
    return updated;
  }

  async resetWhatsAppFreeUsage(whatsappId: string, resetAt: Date): Promise<WhatsAppUser> {
    await this.getOrCreateWhatsAppUser({ whatsappId });
    const [updated] = await db.update(whatsappUsers).set({
      freeUsedCount: 0,
      freeResetAt: resetAt,
      updatedAt: new Date(),
    } as any).where(eq(whatsappUsers.whatsappId, whatsappId)).returning();
    return updated;
  }

  async setWhatsAppPremium(whatsappId: string, isPremium: boolean): Promise<WhatsAppUser> {
    await this.getOrCreateWhatsAppUser({ whatsappId });
    const [updated] = await db.update(whatsappUsers).set({
      isPremium,
      updatedAt: new Date(),
    } as any).where(eq(whatsappUsers.whatsappId, whatsappId)).returning();
    return updated;
  }

  // WhatsApp pairing
  async createWhatsAppLinkToken(input: { whatsappId: string; token: string; expiresAt: Date }): Promise<WhatsAppLinkToken> {
    const [row] = await db.insert(whatsappLinkTokens).values({
      token: input.token,
      whatsappId: input.whatsappId,
      expiresAt: input.expiresAt,
      createdAt: new Date(),
      consumedAt: null,
    } as any).returning();
    return row;
  }

  async consumeWhatsAppLinkToken(input: { token: string }): Promise<WhatsAppLinkToken | null> {
    const token = String(input.token);
    const now = new Date();

    const [found] = await db.select().from(whatsappLinkTokens).where(eq(whatsappLinkTokens.token, token));
    if (!found) return null;

    if (found.consumedAt) return null;
    if (found.expiresAt && (found.expiresAt as any as Date).getTime() < now.getTime()) return null;

    const [updated] = await db.update(whatsappLinkTokens).set({
      consumedAt: now,
    } as any).where(eq(whatsappLinkTokens.id, (found as any).id)).returning();

    return updated || null;
  }

  async upsertWhatsAppUserLink(input: { whatsappId: string; userId: number }): Promise<WhatsAppUserLink> {
    // Upsert by whatsappId: one WhatsApp account maps to one web user.
    const [existing] = await db.select().from(whatsappUserLinks).where(eq(whatsappUserLinks.whatsappId, input.whatsappId));
    if (existing) {
      const [updated] = await db.update(whatsappUserLinks).set({
        userId: input.userId,
      } as any).where(eq(whatsappUserLinks.whatsappId, input.whatsappId)).returning();
      return updated;
    }

    const [created] = await db.insert(whatsappUserLinks).values({
      whatsappId: input.whatsappId,
      userId: input.userId,
      createdAt: new Date(),
    } as any).returning();
    return created;
  }

  async getWhatsAppLinkedUserId(whatsappId: string): Promise<number | null> {
    const [link] = await db.select().from(whatsappUserLinks).where(eq(whatsappUserLinks.whatsappId, whatsappId));
    if (!link) return null;
    const id = Number((link as any).userId);
    return Number.isFinite(id) ? id : null;
  }
}

export const storage: IStorage = new DatabaseStorage();
