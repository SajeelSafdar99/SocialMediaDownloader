/**
 * Contact Query API Service
 */

import { adminApi } from './adminApi';

export interface ContactQuery {
  id: number;
  name: string;
  email: string;
  subject?: string;
  message: string;
  status: 'new' | 'in_progress' | 'resolved' | 'spam';
  adminNotes?: string;
  assignedTo?: number;
  createdAt: string;
  updatedAt: string;
  assignedToUser?: {
    id: number;
    username: string;
    email: string;
  };
}

export const queryApi = {
  async getQueries(params?: {
    limit?: number;
    offset?: number;
    status?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    if (params?.offset) queryParams.set('offset', params.offset.toString());
    if (params?.status) queryParams.set('status', params.status);

    return adminApi.request<{
      queries: ContactQuery[];
      total: number;
      hasMore: boolean;
    }>(`/queries?${queryParams}`);
  },

  async getQuery(id: number) {
    return adminApi.request<{ query: ContactQuery }>(`/queries/${id}`);
  },

  async updateQuery(id: number, data: { status: string; adminNotes?: string }) {
    return adminApi.request<{ query: ContactQuery }>(`/queries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async assignQuery(id: number, adminId?: number) {
    return adminApi.request<{ query: ContactQuery }>(`/queries/${id}/assign`, {
      method: 'POST',
      body: JSON.stringify({ adminId }),
    });
  },

  async deleteQuery(id: number) {
    return adminApi.request(`/queries/${id}`, {
      method: 'DELETE',
    });
  },

  async getStats() {
    return adminApi.request<{
      stats: {
        total: number;
        new: number;
        inProgress: number;
        resolved: number;
      };
    }>('/queries/stats');
  },
};
