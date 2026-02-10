/**
 * Contact Query Service
 * Handles contact form submissions
 */

import { db } from '../db';
import { contactQueries, users } from '../../shared/schema';
import { eq, desc, sql, and } from 'drizzle-orm';

/**
 * Create a contact query
 */
export async function createContactQuery(data: {
  name: string;
  email: string;
  subject?: string;
  message: string;
}) {
  const [query] = await db
    .insert(contactQueries)
    .values(data)
    .returning();

  return query;
}

/**
 * Get all queries with pagination
 */
export async function getAllQueries(opts: {
  limit?: number;
  offset?: number;
  status?: string;
}) {
  const { limit = 20, offset = 0, status } = opts;

  const whereCondition = status ? eq(contactQueries.status, status) : undefined;

  const queries = await db
    .select({
      query: contactQueries,
      assignedToUser: {
        id: users.id,
        username: users.username,
        email: users.email,
      },
    })
    .from(contactQueries)
    .leftJoin(users, eq(contactQueries.assignedTo, users.id))
    .where(whereCondition)
    .orderBy(desc(contactQueries.createdAt))
    .limit(limit)
    .offset(offset);

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(contactQueries)
    .where(whereCondition);

  return {
    queries,
    total: countResult.count,
    hasMore: offset + limit < countResult.count,
  };
}

/**
 * Get query by ID
 */
export async function getQuery(id: number) {
  const [query] = await db
    .select({
      query: contactQueries,
      assignedToUser: {
        id: users.id,
        username: users.username,
        email: users.email,
      },
    })
    .from(contactQueries)
    .leftJoin(users, eq(contactQueries.assignedTo, users.id))
    .where(eq(contactQueries.id, id))
    .limit(1);

  return query;
}

/**
 * Update query status
 */
export async function updateQueryStatus(id: number, status: string, adminNotes?: string) {
  const [query] = await db
    .update(contactQueries)
    .set({
      status,
      adminNotes,
      updatedAt: new Date()
    })
    .where(eq(contactQueries.id, id))
    .returning();

  return query;
}

/**
 * Assign query to admin
 */
export async function assignQuery(id: number, adminId: number) {
  const [query] = await db
    .update(contactQueries)
    .set({
      assignedTo: adminId,
      status: 'in_progress',
      updatedAt: new Date()
    })
    .where(eq(contactQueries.id, id))
    .returning();

  return query;
}

/**
 * Delete a query
 */
export async function deleteQuery(id: number) {
  await db.delete(contactQueries).where(eq(contactQueries.id, id));
}

/**
 * Get query statistics
 */
export async function getQueryStats() {
  try {
    console.log('📊 Fetching query statistics...');

    const [total] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(contactQueries);

    console.log('  Total queries:', total?.count);

    const [newQueries] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(contactQueries)
      .where(eq(contactQueries.status, 'new'));

    console.log('  New queries:', newQueries?.count);

    const [inProgress] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(contactQueries)
      .where(eq(contactQueries.status, 'in_progress'));

    console.log('  In progress queries:', inProgress?.count);

    const [resolved] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(contactQueries)
      .where(eq(contactQueries.status, 'resolved'));

    console.log('  Resolved queries:', resolved?.count);

    const stats = {
      total: total?.count || 0,
      new: newQueries?.count || 0,
      inProgress: inProgress?.count || 0,
      resolved: resolved?.count || 0,
    };

    console.log('✅ Query stats fetched successfully:', stats);
    return stats;
  } catch (error) {
    console.error('❌ Error fetching query stats:', error);
    // Return empty stats instead of failing
    return {
      total: 0,
      new: 0,
      inProgress: 0,
      resolved: 0,
    };
  }
}
