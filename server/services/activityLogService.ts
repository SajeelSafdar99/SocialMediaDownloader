/**
 * Activity Logs Service
 * Comprehensive logging system for tracking all activities
 */

import { db } from '../db';
import { activityLogs } from '../../shared/schema';
import { desc, eq, and, gte, lte, like, sql } from 'drizzle-orm';
import type { Request } from 'express';

export interface LogActivityOptions {
  userId?: number;
  username?: string;
  userEmail?: string;
  userRole?: string;
  action: string;
  resource: string;
  resourceId?: number;
  description?: string;
  method?: string;
  endpoint?: string;
  ipAddress?: string;
  userAgent?: string;
  requestBody?: any;
  responseStatus?: number;
  success?: boolean;
  errorMessage?: string;
  durationMs?: number;
}

/**
 * Log an activity
 */
export async function logActivity(options: LogActivityOptions) {
  try {
    const [log] = await db
      .insert(activityLogs)
      .values({
        userId: options.userId,
        username: options.username,
        userEmail: options.userEmail,
        userRole: options.userRole,
        action: options.action,
        resource: options.resource,
        resourceId: options.resourceId,
        description: options.description,
        method: options.method,
        endpoint: options.endpoint,
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
        requestBody: options.requestBody ? JSON.stringify(options.requestBody) : undefined,
        responseStatus: options.responseStatus,
        success: options.success ?? true,
        errorMessage: options.errorMessage,
        durationMs: options.durationMs,
      })
      .returning();

    return log;
  } catch (error) {
    // Don't throw errors from logging - just log to console
    console.error('Failed to log activity:', error);
    return null;
  }
}

/**
 * Log activity from Express request
 */
export async function logActivityFromRequest(
  req: Request & { user?: any; admin?: any },
  action: string,
  resource: string,
  options?: Partial<LogActivityOptions>
) {
  const user = req.user || req.admin;

  return logActivity({
    userId: user?.id || user?.userId,
    username: user?.username,
    userEmail: user?.email,
    userRole: user?.role,
    action,
    resource,
    method: req.method,
    endpoint: req.originalUrl || req.url,
    ipAddress: req.ip || req.socket.remoteAddress,
    userAgent: req.get('user-agent'),
    ...options,
  });
}

/**
 * Get activity logs with filters
 */
export async function getActivityLogs(params: {
  limit?: number;
  offset?: number;
  userId?: number;
  action?: string;
  resource?: string;
  success?: boolean;
  startDate?: Date;
  endDate?: Date;
  search?: string;
}) {
  const {
    limit = 50,
    offset = 0,
    userId,
    action,
    resource,
    success,
    startDate,
    endDate,
    search,
  } = params;

  const conditions = [];

  if (userId !== undefined) {
    conditions.push(eq(activityLogs.userId, userId));
  }

  if (action) {
    conditions.push(eq(activityLogs.action, action));
  }

  if (resource) {
    conditions.push(eq(activityLogs.resource, resource));
  }

  if (success !== undefined) {
    conditions.push(eq(activityLogs.success, success));
  }

  if (startDate) {
    conditions.push(gte(activityLogs.createdAt, startDate));
  }

  if (endDate) {
    conditions.push(lte(activityLogs.createdAt, endDate));
  }

  if (search) {
    conditions.push(
      sql`(${activityLogs.username} ILIKE ${`%${search}%`} 
        OR ${activityLogs.description} ILIKE ${`%${search}%`}
        OR ${activityLogs.action} ILIKE ${`%${search}%`})`
    );
  }

  const logs = await db
    .select()
    .from(activityLogs)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(activityLogs.createdAt))
    .limit(limit)
    .offset(offset);

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(activityLogs)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  return {
    logs,
    total: countResult.count,
    hasMore: offset + limit < countResult.count,
  };
}

/**
 * Get activity log statistics
 */
export async function getActivityLogStats(params?: {
  startDate?: Date;
  endDate?: Date;
}) {
  const conditions = [];

  if (params?.startDate) {
    conditions.push(gte(activityLogs.createdAt, params.startDate));
  }

  if (params?.endDate) {
    conditions.push(lte(activityLogs.createdAt, params.endDate));
  }

  const [totalResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(activityLogs)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  const [successResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(activityLogs)
    .where(
      conditions.length > 0
        ? and(...conditions, eq(activityLogs.success, true))
        : eq(activityLogs.success, true)
    );

  const [failureResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(activityLogs)
    .where(
      conditions.length > 0
        ? and(...conditions, eq(activityLogs.success, false))
        : eq(activityLogs.success, false)
    );

  // Get activity by resource
  const byResource = await db
    .select({
      resource: activityLogs.resource,
      count: sql<number>`count(*)::int`,
    })
    .from(activityLogs)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(activityLogs.resource)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  // Get activity by action
  const byAction = await db
    .select({
      action: activityLogs.action,
      count: sql<number>`count(*)::int`,
    })
    .from(activityLogs)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(activityLogs.action)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  return {
    total: totalResult.count,
    success: successResult.count,
    failure: failureResult.count,
    byResource: byResource.map((r) => ({ resource: r.resource, count: r.count })),
    byAction: byAction.map((a) => ({ action: a.action, count: a.count })),
  };
}

/**
 * Delete old logs (for cleanup)
 */
export async function deleteOldLogs(daysOld: number) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const result = await db
    .delete(activityLogs)
    .where(lte(activityLogs.createdAt, cutoffDate));

  return result;
}

/**
 * Get activity log trends (success vs failure over time)
 */
export async function getActivityLogTrends(params?: {
  startDate?: Date;
  endDate?: Date;
  days?: number;
  filterByUser?: boolean; // if true, only show user logs (non-admin)
  filterByAdmin?: boolean; // if true, only show admin logs
}) {
  const days = params?.days || 7;
  const startDate = params?.startDate || new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const endDate = params?.endDate || new Date();

  let conditions = [
    gte(activityLogs.createdAt, startDate),
    lte(activityLogs.createdAt, endDate),
  ];

  // Filter by user type
  if (params?.filterByUser) {
    conditions.push(sql`${activityLogs.userRole} != 'admin' OR ${activityLogs.userRole} IS NULL`);
  }
  if (params?.filterByAdmin) {
    conditions.push(eq(activityLogs.userRole, 'admin'));
  }

  // Get daily success/failure counts
  const trends = await db
    .select({
      date: sql<string>`DATE(${activityLogs.createdAt})`,
      success: sql<number>`COUNT(CASE WHEN ${activityLogs.success} = true THEN 1 END)::int`,
      failure: sql<number>`COUNT(CASE WHEN ${activityLogs.success} = false THEN 1 END)::int`,
      total: sql<number>`COUNT(*)::int`,
    })
    .from(activityLogs)
    .where(and(...conditions))
    .groupBy(sql`DATE(${activityLogs.createdAt})`)
    .orderBy(sql`DATE(${activityLogs.createdAt})`);

  return trends.map(t => ({
    date: t.date,
    success: t.success,
    failure: t.failure,
    total: t.total,
    successRate: t.total > 0 ? Math.round((t.success / t.total) * 100) : 0,
  }));
}

/**
 * Get failed API calls (for debugging)
 */
export async function getFailedApiCalls(params?: {
  limit?: number;
  startDate?: Date;
  endDate?: Date;
}) {
  const limit = params?.limit || 50;
  const conditions = [eq(activityLogs.success, false)];

  if (params?.startDate) {
    conditions.push(gte(activityLogs.createdAt, params.startDate));
  }

  if (params?.endDate) {
    conditions.push(lte(activityLogs.createdAt, params.endDate));
  }

  const failedCalls = await db
    .select()
    .from(activityLogs)
    .where(and(...conditions))
    .orderBy(desc(activityLogs.createdAt))
    .limit(limit);

  // Group by endpoint to see which APIs are failing most
  const byEndpoint = await db
    .select({
      endpoint: activityLogs.endpoint,
      count: sql<number>`count(*)::int`,
      latestError: sql<string>`MAX(${activityLogs.errorMessage})`,
    })
    .from(activityLogs)
    .where(and(...conditions))
    .groupBy(activityLogs.endpoint)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  return {
    failedCalls,
    byEndpoint: byEndpoint.map(e => ({
      endpoint: e.endpoint,
      count: e.count,
      latestError: e.latestError,
    })),
  };
}

