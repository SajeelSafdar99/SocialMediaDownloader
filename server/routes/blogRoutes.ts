/**
 * Blog Management Routes
 * Handles blog posts and categories
 */

import type { Express } from "express";
import { requireAdmin, type AdminRequest } from "../middleware/adminAuth";
import { requirePermission, requireAnyPermission } from "../middleware/permissionMiddleware";
import {
  createBlogPost,
  updateBlogPost,
  getBlogPost,
  getBlogPostBySlug,
  getAllBlogPosts,
  deleteBlogPost,
  publishBlogPost,
  createBlogCategory,
  getAllCategories,
  updateCategory,
  deleteCategory,
} from "../services/blogService";

export function registerBlogRoutes(app: Express) {

  // ===== Blog Posts =====

  /**
   * Get all blog posts
   * GET /api/admin/blog/posts
   */
  app.get(
    "/api/admin/blog/posts",
    requireAdmin,
    requirePermission("blog.read"),
    async (req, res) => {
      try {
        const limit = parseInt(req.query.limit as string) || 20;
        const offset = parseInt(req.query.offset as string) || 0;
        const status = req.query.status as string;
        const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
        const search = req.query.search as string;

        const result = await getAllBlogPosts({ limit, offset, status, categoryId, search });

        res.json({ ok: true, ...result });
      } catch (error) {
        console.error("Get blog posts error:", error);
        res.status(500).json({ ok: false, error: "Internal server error" });
      }
    }
  );

  /**
   * Get single blog post
   * GET /api/admin/blog/posts/:id
   */
  app.get(
    "/api/admin/blog/posts/:id",
    requireAdmin,
    requirePermission("blog.read"),
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const post = await getBlogPost(id);

        if (!post) {
          return res.status(404).json({ ok: false, error: "Post not found" });
        }

        res.json({ ok: true, post });
      } catch (error) {
        console.error("Get blog post error:", error);
        res.status(500).json({ ok: false, error: "Internal server error" });
      }
    }
  );

  /**
   * Create blog post
   * POST /api/admin/blog/posts
   */
  app.post(
    "/api/admin/blog/posts",
    requireAdmin,
    requirePermission("blog.create"),
    async (req: AdminRequest, res) => {
      try {
        const {
          title,
          slug,
          excerpt,
          content,
          featuredImage,
          status,
          metaTitle,
          metaDescription,
          metaKeywords,
          canonicalUrl,
          categoryId,
          tags,
        } = req.body;

        if (!title || !slug || !content) {
          return res.status(400).json({
            ok: false,
            error: "Title, slug, and content are required",
          });
        }

        const post = await createBlogPost({
          title,
          slug,
          excerpt,
          content,
          featuredImage,
          authorId: req.admin!.userId,
          status: status || "draft",
          metaTitle,
          metaDescription,
          metaKeywords,
          canonicalUrl,
          categoryId,
          tags,
        });

        res.json({ ok: true, post });
      } catch (error: any) {
        console.error("Create blog post error:", error);
        if (error.message?.includes('unique')) {
          return res.status(400).json({ ok: false, error: "Slug already exists" });
        }
        res.status(500).json({ ok: false, error: "Internal server error" });
      }
    }
  );

  /**
   * Update blog post
   * PUT /api/admin/blog/posts/:id
   */
  app.put(
    "/api/admin/blog/posts/:id",
    requireAdmin,
    requirePermission("blog.update"),
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const updates = req.body;

        const post = await updateBlogPost(id, updates);

        if (!post) {
          return res.status(404).json({ ok: false, error: "Post not found" });
        }

        res.json({ ok: true, post });
      } catch (error: any) {
        console.error("Update blog post error:", error);
        if (error.message?.includes('unique')) {
          return res.status(400).json({ ok: false, error: "Slug already exists" });
        }
        res.status(500).json({ ok: false, error: "Internal server error" });
      }
    }
  );

  /**
   * Publish blog post
   * POST /api/admin/blog/posts/:id/publish
   */
  app.post(
    "/api/admin/blog/posts/:id/publish",
    requireAdmin,
    requirePermission("blog.publish"),
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const post = await publishBlogPost(id);

        if (!post) {
          return res.status(404).json({ ok: false, error: "Post not found" });
        }

        res.json({ ok: true, post });
      } catch (error) {
        console.error("Publish blog post error:", error);
        res.status(500).json({ ok: false, error: "Internal server error" });
      }
    }
  );

  /**
   * Delete blog post
   * DELETE /api/admin/blog/posts/:id
   */
  app.delete(
    "/api/admin/blog/posts/:id",
    requireAdmin,
    requirePermission("blog.delete"),
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        await deleteBlogPost(id);

        res.json({ ok: true });
      } catch (error) {
        console.error("Delete blog post error:", error);
        res.status(500).json({ ok: false, error: "Internal server error" });
      }
    }
  );

  // ===== Blog Categories =====

  /**
   * Get all categories
   * GET /api/admin/blog/categories
   */
  app.get(
    "/api/admin/blog/categories",
    requireAdmin,
    requirePermission("blog.read"),
    async (req, res) => {
      try {
        const categories = await getAllCategories();
        res.json({ ok: true, categories });
      } catch (error) {
        console.error("Get categories error:", error);
        res.status(500).json({ ok: false, error: "Internal server error" });
      }
    }
  );

  /**
   * Create category
   * POST /api/admin/blog/categories
   */
  app.post(
    "/api/admin/blog/categories",
    requireAdmin,
    requirePermission("blog.create"),
    async (req, res) => {
      try {
        const { name, slug, description } = req.body;

        if (!name || !slug) {
          return res.status(400).json({
            ok: false,
            error: "Name and slug are required",
          });
        }

        const category = await createBlogCategory({ name, slug, description });
        res.json({ ok: true, category });
      } catch (error: any) {
        console.error("Create category error:", error);
        if (error.message?.includes('unique')) {
          return res.status(400).json({ ok: false, error: "Category name or slug already exists" });
        }
        res.status(500).json({ ok: false, error: "Internal server error" });
      }
    }
  );

  /**
   * Update category
   * PUT /api/admin/blog/categories/:id
   */
  app.put(
    "/api/admin/blog/categories/:id",
    requireAdmin,
    requirePermission("blog.update"),
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const updates = req.body;

        const category = await updateCategory(id, updates);

        if (!category) {
          return res.status(404).json({ ok: false, error: "Category not found" });
        }

        res.json({ ok: true, category });
      } catch (error) {
        console.error("Update category error:", error);
        res.status(500).json({ ok: false, error: "Internal server error" });
      }
    }
  );

  /**
   * Delete category
   * DELETE /api/admin/blog/categories/:id
   */
  app.delete(
    "/api/admin/blog/categories/:id",
    requireAdmin,
    requirePermission("blog.delete"),
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        await deleteCategory(id);

        res.json({ ok: true });
      } catch (error) {
        console.error("Delete category error:", error);
        res.status(500).json({ ok: false, error: "Internal server error" });
      }
    }
  );
}
