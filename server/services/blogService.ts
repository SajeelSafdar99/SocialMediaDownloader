/**
 * Blog Service
 * Handles blog posts and categories
 */

import { db } from '../db';
import { blogPosts, blogCategories, users } from '../../shared/schema';
import { eq, desc, sql, like, and, or } from 'drizzle-orm';

/**
 * Create a blog post
 */
export async function createBlogPost(data: {
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  featuredImage?: string;
  authorId: number;
  status?: string;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  canonicalUrl?: string;
  categoryId?: number;
  tags?: string[];
}) {
  const [post] = await db
    .insert(blogPosts)
    .values(data)
    .returning();

  return post;
}

/**
 * Update a blog post
 */
export async function updateBlogPost(id: number, data: Partial<typeof blogPosts.$inferInsert>) {
  const [post] = await db
    .update(blogPosts)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(blogPosts.id, id))
    .returning();

  return post;
}

/**
 * Get blog post by ID
 */
export async function getBlogPost(id: number) {
  const [post] = await db
    .select({
      post: blogPosts,
      author: {
        id: users.id,
        username: users.username,
        email: users.email,
      },
      category: blogCategories,
    })
    .from(blogPosts)
    .leftJoin(users, eq(blogPosts.authorId, users.id))
    .leftJoin(blogCategories, eq(blogPosts.categoryId, blogCategories.id))
    .where(eq(blogPosts.id, id))
    .limit(1);

  return post;
}

/**
 * Get blog post by slug
 */
export async function getBlogPostBySlug(slug: string) {
  const [post] = await db
    .select({
      post: blogPosts,
      author: {
        id: users.id,
        username: users.username,
        email: users.email,
      },
      category: blogCategories,
    })
    .from(blogPosts)
    .leftJoin(users, eq(blogPosts.authorId, users.id))
    .leftJoin(blogCategories, eq(blogPosts.categoryId, blogCategories.id))
    .where(eq(blogPosts.slug, slug))
    .limit(1);

  return post;
}

/**
 * Get all blog posts with pagination
 */
export async function getAllBlogPosts(opts: {
  limit?: number;
  offset?: number;
  status?: string;
  categoryId?: number;
  search?: string;
}) {
  const { limit = 20, offset = 0, status, categoryId, search } = opts;

  let whereConditions = [];

  if (status) {
    whereConditions.push(eq(blogPosts.status, status));
  }

  if (categoryId) {
    whereConditions.push(eq(blogPosts.categoryId, categoryId));
  }

  if (search) {
    whereConditions.push(
      or(
        like(blogPosts.title, `%${search}%`),
        like(blogPosts.content, `%${search}%`)
      )
    );
  }

  const posts = await db
    .select({
      post: blogPosts,
      author: {
        id: users.id,
        username: users.username,
      },
      category: blogCategories,
    })
    .from(blogPosts)
    .leftJoin(users, eq(blogPosts.authorId, users.id))
    .leftJoin(blogCategories, eq(blogPosts.categoryId, blogCategories.id))
    .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
    .orderBy(desc(blogPosts.createdAt))
    .limit(limit)
    .offset(offset);

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(blogPosts)
    .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

  return {
    posts,
    total: countResult.count,
    hasMore: offset + limit < countResult.count,
  };
}

/**
 * Delete a blog post
 */
export async function deleteBlogPost(id: number) {
  await db.delete(blogPosts).where(eq(blogPosts.id, id));
}

/**
 * Increment view count
 */
export async function incrementViewCount(id: number) {
  await db
    .update(blogPosts)
    .set({ viewCount: sql`${blogPosts.viewCount} + 1` })
    .where(eq(blogPosts.id, id));
}

/**
 * Publish a blog post
 */
export async function publishBlogPost(id: number) {
  const [post] = await db
    .update(blogPosts)
    .set({
      status: 'published',
      publishedAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(blogPosts.id, id))
    .returning();

  return post;
}

// ===== Category Functions =====

/**
 * Create a blog category
 */
export async function createBlogCategory(data: {
  name: string;
  slug: string;
  description?: string;
}) {
  const [category] = await db
    .insert(blogCategories)
    .values(data)
    .returning();

  return category;
}

/**
 * Get all categories
 */
export async function getAllCategories() {
  return await db.select().from(blogCategories).orderBy(blogCategories.name);
}

/**
 * Update a category
 */
export async function updateCategory(id: number, data: Partial<typeof blogCategories.$inferInsert>) {
  const [category] = await db
    .update(blogCategories)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(blogCategories.id, id))
    .returning();

  return category;
}

/**
 * Delete a category
 */
export async function deleteCategory(id: number) {
  await db.delete(blogCategories).where(eq(blogCategories.id, id));
}
