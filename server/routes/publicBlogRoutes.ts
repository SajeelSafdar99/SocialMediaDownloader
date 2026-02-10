/**
 * Public Blog Routes
 * For displaying blog posts on the main website
 */

import type { Express } from "express";
import { db } from "../db";
import { blogPosts, blogCategories, users } from "../../shared/schema";
import { eq, and, desc, like, or } from "drizzle-orm";

export function registerPublicBlogRoutes(app: Express) {

  /**
   * Get published blog posts
   * GET /api/public/blog/posts
   */
  app.get("/api/public/blog/posts", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 12;
      const offset = parseInt(req.query.offset as string) || 0;
      const search = req.query.search as string;
      const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;

      let conditions: any[] = [eq(blogPosts.status, 'published')];

      if (search) {
        conditions.push(
          or(
            like(blogPosts.title, `%${search}%`),
            like(blogPosts.excerpt, `%${search}%`)
          )
        );
      }

      if (categoryId) {
        conditions.push(eq(blogPosts.categoryId, categoryId));
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
        .where(conditions.length > 1 ? and(...conditions) : conditions[0])
        .orderBy(desc(blogPosts.publishedAt))
        .limit(limit)
        .offset(offset);

      const formattedPosts = posts.map(p => ({
        ...p.post,
        author: p.author,
        category: p.category,
      }));

      res.json({
        ok: true,
        posts: formattedPosts,
        total: formattedPosts.length,
        hasMore: formattedPosts.length === limit,
      });
    } catch (error) {
      console.error("Get public blog posts error:", error);
      res.status(500).json({ ok: false, error: "Internal server error" });
    }
  });

  /**
   * Get single published blog post by slug
   * GET /api/public/blog/posts/:slug
   */
  app.get("/api/public/blog/posts/:slug", async (req, res) => {
    try {
      const { slug } = req.params;

      const [result] = await db
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
        .where(
          and(
            eq(blogPosts.slug, slug),
            eq(blogPosts.status, 'published')
          )
        )
        .limit(1);

      if (!result) {
        return res.status(404).json({ ok: false, error: "Post not found" });
      }

      // Increment view count
      await db
        .update(blogPosts)
        .set({ viewCount: result.post.viewCount + 1 })
        .where(eq(blogPosts.id, result.post.id));

      res.json({
        ok: true,
        post: {
          ...result.post,
          author: result.author,
          category: result.category,
        },
      });
    } catch (error) {
      console.error("Get public blog post error:", error);
      res.status(500).json({ ok: false, error: "Internal server error" });
    }
  });

  /**
   * Get blog categories
   * GET /api/public/blog/categories
   */
  app.get("/api/public/blog/categories", async (req, res) => {
    try {
      const categories = await db
        .select()
        .from(blogCategories)
        .orderBy(blogCategories.name);

      res.json({ ok: true, categories });
    } catch (error) {
      console.error("Get blog categories error:", error);
      res.status(500).json({ ok: false, error: "Internal server error" });
    }
  });
}
