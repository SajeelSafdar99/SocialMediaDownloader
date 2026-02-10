/**
 * Blog API Service
 */

import { adminApi } from './adminApi';

export interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  featuredImage?: string;
  authorId: number;
  status: 'draft' | 'published' | 'archived';
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  canonicalUrl?: string;
  categoryId?: number;
  tags?: string[];
  viewCount: number;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  author?: {
    id: number;
    username: string;
    email: string;
  };
  category?: BlogCategory;
}

export interface BlogCategory {
  id: number;
  name: string;
  slug: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export const blogApi = {
  // Posts
  async getPosts(params?: {
    limit?: number;
    offset?: number;
    status?: string;
    categoryId?: number;
    search?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    if (params?.offset) queryParams.set('offset', params.offset.toString());
    if (params?.status) queryParams.set('status', params.status);
    if (params?.categoryId) queryParams.set('categoryId', params.categoryId.toString());
    if (params?.search) queryParams.set('search', params.search);

    return adminApi.request<{
      posts: BlogPost[];
      total: number;
      hasMore: boolean;
    }>(`/blog/posts?${queryParams}`);
  },

  async getPost(id: number) {
    return adminApi.request<{ post: BlogPost }>(`/blog/posts/${id}`);
  },

  async createPost(data: Partial<BlogPost>) {
    return adminApi.request<{ post: BlogPost }>('/blog/posts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updatePost(id: number, data: Partial<BlogPost>) {
    return adminApi.request<{ post: BlogPost }>(`/blog/posts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async publishPost(id: number) {
    return adminApi.request<{ post: BlogPost }>(`/blog/posts/${id}/publish`, {
      method: 'POST',
    });
  },

  async deletePost(id: number) {
    return adminApi.request(`/blog/posts/${id}`, {
      method: 'DELETE',
    });
  },

  // Categories
  async getCategories() {
    return adminApi.request<{ categories: BlogCategory[] }>('/blog/categories');
  },

  async createCategory(data: { name: string; slug: string; description?: string }) {
    return adminApi.request<{ category: BlogCategory }>('/blog/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateCategory(id: number, data: Partial<BlogCategory>) {
    return adminApi.request<{ category: BlogCategory }>(`/blog/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteCategory(id: number) {
    return adminApi.request(`/blog/categories/${id}`, {
      method: 'DELETE',
    });
  },
};
