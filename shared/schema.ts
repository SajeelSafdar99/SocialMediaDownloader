import { relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
  serial,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table
// NOTE: keep this name in sync with the express-session store (connect-pg-simple).
// Some environments/defaults expect a singular table name.
export const sessions = pgTable(
    "session",
    {
      sid: varchar("sid").primaryKey(),
      sess: jsonb("sess").notNull(),
      expire: timestamp("expire").notNull(),
    },
    (table) => [index("IDX_sessions_expire").on(table.expire)], // Fixed Index Name
);

// User storage table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").unique(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  isPremium: boolean("is_premium").default(false),
  role: varchar("role", { length: 20 }).default("user").notNull(),
  googleId: text("google_id"),
  facebookId: text("facebook_id"),
  githubId: text("github_id"),

  // Password reset
  passwordResetTokenHash: text("password_reset_token_hash"),
  passwordResetTokenExpiresAt: timestamp("password_reset_token_expires_at"),


  // Admin fields
  adminNotes: text("admin_notes"),

  // Two-Factor Authentication
  twoFactorSecret: text("two_factor_secret"),
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  twoFactorBackupCodes: text("two_factor_backup_codes").array(),
  adminSecretKey: text("admin_secret_key"),

  // Role-based access control
  roleId: integer("role_id"),

  // SafePay Tracker API (Subscription payments with saved instruments)
  safepayCustomerId: varchar("safepay_customer_id", { length: 255 }),
  safepayMerchantKey: text("safepay_merchant_key"), // Store merchant_api_key from customer response
  safepayInstrumentToken: varchar("safepay_instrument_token", { length: 255 }),
  safepayInstrumentSavedAt: timestamp("safepay_instrument_saved_at"),

  // Premium subscription tracking
  premiumExpiresAt: timestamp("premium_expires_at"),
  subscriptionProvider: varchar("subscription_provider", { length: 50 }),
  subscriptionPlanId: varchar("subscription_plan_id", { length: 255 }),
  subscriptionCancelledAt: timestamp("subscription_cancelled_at"),
  subscriptionCancelAtPeriodEnd: boolean("subscription_cancel_at_period_end").default(false),
  safepaySubscriptionToken: varchar("safepay_subscription_token", { length: 255 }),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
});

// Download history table
export const downloads = pgTable("downloads", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: 'cascade' }),
  platform: varchar("platform").notNull(),
  originalUrl: text("original_url").notNull(),
  title: text("title"),
  thumbnail: text("thumbnail"),
  format: varchar("format").notNull(),
  quality: varchar("quality").notNull(),
  fileSize: integer("file_size"),
  downloadUrl: text("download_url"),
  status: varchar("status").default("pending"),
  expiresAt: timestamp("expires_at"),
  fileDeletedAt: timestamp("file_deleted_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Telegram bot users (freemium gating)
export const telegramUsers = pgTable("telegram_users", {
  id: serial("id").primaryKey(),
  telegramId: text("telegram_id").notNull().unique(),
  username: text("username"),
  isPremium: boolean("is_premium").default(false),
  freeUsedCount: integer("free_used_count").default(0),
  freeResetAt: timestamp("free_reset_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTelegramUserSchema = createInsertSchema(telegramUsers).pick({
  telegramId: true,
  username: true,
  isPremium: true,
  freeUsedCount: true,
  freeResetAt: true,
});

// Telegram pairing: one-time link tokens
export const telegramLinkTokens = pgTable("telegram_link_tokens", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  telegramId: text("telegram_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  consumedAt: timestamp("consumed_at"),
});

// Telegram↔web user links
export const telegramUserLinks = pgTable("telegram_user_links", {
  id: serial("id").primaryKey(),
  telegramId: text("telegram_id").notNull().unique(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
});

// WhatsApp bot users (freemium gating)
export const whatsappUsers = pgTable("whatsapp_users", {
  id: serial("id").primaryKey(),
  whatsappId: text("whatsapp_id").notNull().unique(),
  username: text("username"),
  isPremium: boolean("is_premium").default(false),
  freeUsedCount: integer("free_used_count").default(0),
  freeResetAt: timestamp("free_reset_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertWhatsAppUserSchema = createInsertSchema(whatsappUsers).pick({
  whatsappId: true,
  username: true,
  isPremium: true,
  freeUsedCount: true,
  freeResetAt: true,
});

// WhatsApp pairing: one-time link tokens
export const whatsappLinkTokens = pgTable("whatsapp_link_tokens", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  whatsappId: text("whatsapp_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  consumedAt: timestamp("consumed_at"),
});

// WhatsApp↔web user links
export const whatsappUserLinks = pgTable("whatsapp_user_links", {
  id: serial("id").primaryKey(),
  whatsappId: text("whatsapp_id").notNull().unique(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Payment records
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: varchar("provider").notNull(), // "safepay"
  amount: integer("amount").notNull(), // Amount in cents/smallest unit
  currency: varchar("currency").notNull().default("USD"),
  status: varchar("status").notNull().default("pending"), // "pending", "completed", "failed", "cancelled"
  transactionId: text("transaction_id").notNull().unique(),
  providerTransactionId: text("provider_transaction_id"),
  metadata: text("metadata"), // JSON string for additional data
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  refundedAt: timestamp("refunded_at"),
});

export const insertPaymentSchema = createInsertSchema(payments).pick({
  userId: true,
  provider: true,
  amount: true,
  currency: true,
  status: true,
  transactionId: true,
  providerTransactionId: true,
  metadata: true,
  createdAt: true,
});

// Refunds table
export const refunds = pgTable("refunds", {
  id: serial("id").primaryKey(),
  paymentId: integer("payment_id").notNull().references(() => payments.id, { onDelete: 'cascade' }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  amount: integer("amount").notNull(), // Amount in cents/smallest unit
  currency: varchar("currency").notNull().default("USD"),
  reason: text("reason"),
  status: varchar("status").notNull().default("pending"), // "pending", "completed", "failed", "cancelled"
  provider: varchar("provider").notNull(), // "safepay"
  providerRefundId: text("provider_refund_id").unique(),
  processedByAdminId: integer("processed_by_admin_id").references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertRefundSchema = createInsertSchema(refunds).pick({
  paymentId: true,
  userId: true,
  amount: true,
  currency: true,
  reason: true,
  status: true,
  provider: true,
  providerRefundId: true,
  processedByAdminId: true,
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  downloads: many(downloads),
}));

export const downloadsRelations = relations(downloads, ({ one }) => ({
  user: one(users, {
    fields: [downloads.userId],
    references: [users.id],
  }),
}));

// Schemas
export const upsertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Fixed: include the fields we actually set when creating a download record
export const insertDownloadSchema = createInsertSchema(downloads).pick({
  userId: true,
  platform: true,
  originalUrl: true,
  title: true,
  thumbnail: true,
  format: true,
  quality: true,
  fileSize: true,
  downloadUrl: true,
  status: true,
  expiresAt: true,
  fileDeletedAt: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type InsertDownload = z.infer<typeof insertDownloadSchema>;
export type Download = typeof downloads.$inferSelect;
export type TelegramUser = typeof telegramUsers.$inferSelect;
export type InsertTelegramUser = z.infer<typeof insertTelegramUserSchema>;
export type TelegramLinkToken = typeof telegramLinkTokens.$inferSelect;
export type TelegramUserLink = typeof telegramUserLinks.$inferSelect;
export type WhatsAppUser = typeof whatsappUsers.$inferSelect;
export type InsertWhatsAppUser = z.infer<typeof insertWhatsAppUserSchema>;
export type WhatsAppLinkToken = typeof whatsappLinkTokens.$inferSelect;
export type WhatsAppUserLink = typeof whatsappUserLinks.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Refund = typeof refunds.$inferSelect;
export type InsertRefund = z.infer<typeof insertRefundSchema>;

// Blog categories table
export const blogCategories = pgTable("blog_categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull().unique(),
  slug: varchar("slug", { length: 200 }).notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Blog posts table
export const blogPosts = pgTable("blog_posts", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 500 }).notNull(),
  slug: varchar("slug", { length: 500 }).notNull().unique(),
  excerpt: text("excerpt"),
  content: text("content").notNull(),
  featuredImage: text("featured_image"),
  authorId: integer("author_id").references(() => users.id, { onDelete: 'set null' }),
  status: varchar("status", { length: 20 }).default("draft").notNull(),

  // SEO fields
  metaTitle: varchar("meta_title", { length: 500 }),
  metaDescription: text("meta_description"),
  metaKeywords: text("meta_keywords"),
  canonicalUrl: text("canonical_url"),

  // Organization
  categoryId: integer("category_id").references(() => blogCategories.id),
  tags: text("tags").array(),

  // Analytics
  viewCount: integer("view_count").default(0),

  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Contact queries table
export const contactQueries = pgTable("contact_queries", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  email: varchar("email", { length: 200 }).notNull(),
  subject: varchar("subject", { length: 500 }),
  message: text("message").notNull(),
  status: varchar("status", { length: 20 }).default("new").notNull(),
  adminNotes: text("admin_notes"),
  assignedTo: integer("assigned_to").references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Roles table
export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Permissions table
export const permissions = pgTable("permissions", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  resource: varchar("resource", { length: 100 }).notNull(),
  action: varchar("action", { length: 50 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Role permissions junction table
export const rolePermissions = pgTable("role_permissions", {
  roleId: integer("role_id").references(() => roles.id, { onDelete: 'cascade' }).notNull(),
  permissionId: integer("permission_id").references(() => permissions.id, { onDelete: 'cascade' }).notNull(),
}, (table) => ({
  pk: { columns: [table.roleId, table.permissionId] },
}));

// Activity logs table for comprehensive logging
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),

  // Who did it
  userId: integer("user_id").references(() => users.id, { onDelete: 'set null' }),
  username: varchar("username", { length: 200 }),
  userEmail: varchar("user_email", { length: 200 }),
  userRole: varchar("user_role", { length: 50 }),

  // What happened
  action: varchar("action", { length: 100 }).notNull(),
  resource: varchar("resource", { length: 100 }).notNull(),
  resourceId: integer("resource_id"),
  description: text("description"),

  // Context
  method: varchar("method", { length: 10 }),
  endpoint: varchar("endpoint", { length: 500 }),
  ipAddress: varchar("ip_address", { length: 50 }),
  userAgent: text("user_agent"),

  // Request/Response data
  requestBody: text("request_body"), // JSON string
  responseStatus: integer("response_status"),

  // Metadata
  success: boolean("success").default(true),
  errorMessage: text("error_message"),
  durationMs: integer("duration_ms"),

  createdAt: timestamp("created_at").defaultNow(),
});

// Email Templates
export const emailTemplates = pgTable("email_templates", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  subject: varchar("subject", { length: 255 }).notNull(),
  htmlContent: text("html_content").notNull(),
  textContent: text("text_content"),
  variables: jsonb("variables"), // JSON object describing available variables
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// SMTP Configuration
export const smtpConfig = pgTable("smtp_config", {
  id: serial("id").primaryKey(),
  host: varchar("host", { length: 255 }).notNull(),
  port: integer("port").notNull(),
  secure: boolean("secure").default(true),
  username: varchar("username", { length: 255 }).notNull(),
  password: varchar("password", { length: 255 }).notNull(),
  fromEmail: varchar("from_email", { length: 255 }).notNull(),
  fromName: varchar("from_name", { length: 255 }).notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Zod schemas for validation
export const insertBlogCategorySchema = createInsertSchema(blogCategories);
export const insertBlogPostSchema = createInsertSchema(blogPosts);
export const insertContactQuerySchema = createInsertSchema(contactQueries);
export const insertActivityLogSchema = createInsertSchema(activityLogs);
export const insertEmailTemplateSchema = createInsertSchema(emailTemplates);
export const insertSmtpConfigSchema = createInsertSchema(smtpConfig);

// Types
export type BlogCategory = typeof blogCategories.$inferSelect;
export type InsertBlogCategory = z.infer<typeof insertBlogCategorySchema>;
export type BlogPost = typeof blogPosts.$inferSelect;
export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;
export type ContactQuery = typeof contactQueries.$inferSelect;
export type InsertContactQuery = z.infer<typeof insertContactQuerySchema>;
export type Role = typeof roles.$inferSelect;
export type Permission = typeof permissions.$inferSelect;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;
export type SmtpConfig = typeof smtpConfig.$inferSelect;
export type InsertSmtpConfig = z.infer<typeof insertSmtpConfigSchema>;

