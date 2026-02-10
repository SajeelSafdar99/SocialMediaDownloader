import { db } from "../db";
import { users, sessions, payments, refunds, downloads } from "../../shared/schema";
import { sql, count, sum, eq, gte, and, desc } from "drizzle-orm";

export interface DashboardStats {
  activeUsers: number;
  totalUsers: number;
  totalSubscriptions: number;
  totalRevenue: number;
  totalTransactions: number;
  totalRefunds: number;
  totalRefundAmount: number;
}

export interface MonthlyTrend {
  month: string;
  count: number;
  label: string;
}

/**
 * Get dashboard statistics
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  // Active users (users with active sessions in last 24 hours)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const activeUsersResult = await db
    .select({ count: count() })
    .from(sessions)
    .where(gte(sessions.expire, oneDayAgo));

  const activeUsers = activeUsersResult[0]?.count || 0;

  // Total users
  const totalUsersResult = await db
    .select({ count: count() })
    .from(users);

  const totalUsers = totalUsersResult[0]?.count || 0;

  // Total subscriptions (premium users)
  const totalSubscriptionsResult = await db
    .select({ count: count() })
    .from(users)
    .where(eq(users.isPremium, true));

  const totalSubscriptions = totalSubscriptionsResult[0]?.count || 0;

  // Total revenue from completed payments
  const totalRevenueResult = await db
    .select({ total: sum(payments.amount) })
    .from(payments)
    .where(eq(payments.status, "completed"));

  const totalRevenue = Number(totalRevenueResult[0]?.total || 0);

  // Total transactions
  const totalTransactionsResult = await db
    .select({ count: count() })
    .from(payments)
    .where(eq(payments.status, "completed"));

  const totalTransactions = totalTransactionsResult[0]?.count || 0;

  // Total refunds
  const totalRefundsResult = await db
    .select({
      count: count(),
      total: sum(refunds.amount)
    })
    .from(refunds)
    .where(eq(refunds.status, "completed"));

  const totalRefunds = totalRefundsResult[0]?.count || 0;
  const totalRefundAmount = Number(totalRefundsResult[0]?.total || 0);

  return {
    activeUsers,
    totalUsers,
    totalSubscriptions,
    totalRevenue,
    totalTransactions,
    totalRefunds,
    totalRefundAmount,
  };
}

/**
 * Get monthly user registration trends for the past 6 months
 */
export async function getMonthlyUserRegistrations(): Promise<MonthlyTrend[]> {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const results = await db
    .select({
      month: sql<string>`TO_CHAR(${users.createdAt}, 'YYYY-MM')`,
      count: count(),
    })
    .from(users)
    .where(gte(users.createdAt, sixMonthsAgo))
    .groupBy(sql`TO_CHAR(${users.createdAt}, 'YYYY-MM')`)
    .orderBy(sql`TO_CHAR(${users.createdAt}, 'YYYY-MM')`);

  return results.map((row) => ({
    month: row.month,
    count: row.count,
    label: formatMonthLabel(row.month),
  }));
}

/**
 * Get monthly subscription purchase trends for the past 6 months
 */
export async function getMonthlySubscriptionPurchases(): Promise<MonthlyTrend[]> {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const results = await db
    .select({
      month: sql<string>`TO_CHAR(${payments.completedAt}, 'YYYY-MM')`,
      count: count(),
    })
    .from(payments)
    .where(
      and(
        gte(payments.completedAt, sixMonthsAgo),
        eq(payments.status, "completed")
      )
    )
    .groupBy(sql`TO_CHAR(${payments.completedAt}, 'YYYY-MM')`)
    .orderBy(sql`TO_CHAR(${payments.completedAt}, 'YYYY-MM')`);

  return results.map((row) => ({
    month: row.month,
    count: row.count,
    label: formatMonthLabel(row.month),
  }));
}

/**
 * Get recent users with pagination
 */
export async function getRecentUsers(limit: number = 10, offset: number = 0) {
  const usersData = await db
    .select({
      id: users.id,
      username: users.username,
      email: users.email,
      isPremium: users.isPremium,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset(offset);

  const totalResult = await db.select({ count: count() }).from(users);
  const total = totalResult[0]?.count || 0;

  return {
    users: usersData,
    total,
    hasMore: offset + limit < total,
  };
}

/**
 * Get recent transactions with pagination
 */
export async function getRecentTransactions(limit: number = 10, offset: number = 0) {
  const transactions = await db
    .select({
      id: payments.id,
      userId: payments.userId,
      provider: payments.provider,
      amount: payments.amount,
      currency: payments.currency,
      status: payments.status,
      transactionId: payments.transactionId,
      createdAt: payments.createdAt,
      completedAt: payments.completedAt,
      refundedAt: payments.refundedAt,
      username: users.username,
      email: users.email,
    })
    .from(payments)
    .leftJoin(users, eq(payments.userId, users.id))
    .orderBy(desc(payments.createdAt))
    .limit(limit)
    .offset(offset);

  const totalResult = await db.select({ count: count() }).from(payments);
  const total = totalResult[0]?.count || 0;

  return {
    transactions,
    total,
    hasMore: offset + limit < total,
  };
}

/**
 * Format month label from YYYY-MM format
 */
function formatMonthLabel(monthStr: string): string {
  const [year, month] = monthStr.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}
