/**
 * Admin API Service
 * Centralized API calls for admin panel
 */

const API_BASE = '/api/admin';

interface ApiResponse<T> {
  ok: boolean;
  error?: string;
  [key: string]: any;
}

class AdminApiService {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('adminToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
          ...this.getAuthHeaders(),
          ...options?.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Authentication
  async login(username: string, password: string) {
    return this.request('/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }

  async getCurrentAdmin() {
    return this.request('/me');
  }

  // Analytics
  async getDashboardStats() {
    return this.request('/analytics/dashboard');
  }

  async getRegistrationTrends() {
    return this.request('/analytics/trends/registrations');
  }

  async getSubscriptionTrends() {
    return this.request('/analytics/trends/subscriptions');
  }

  // Users
  async getUsers(limit = 50, offset = 0) {
    return this.request(`/users?limit=${limit}&offset=${offset}`);
  }

  async getUser(id: number) {
    return this.request(`/users/${id}`);
  }

  async updateUser(id: number, updates: any) {
    return this.request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async getUserRefunds(id: number) {
    return this.request(`/users/${id}/refunds`);
  }

  // Transactions
  async getTransactions(limit = 50, offset = 0) {
    return this.request(`/transactions?limit=${limit}&offset=${offset}`);
  }

  // Refunds
  async getRefunds(limit = 50, offset = 0) {
    return this.request(`/refunds?limit=${limit}&offset=${offset}`);
  }

  async getRefund(id: number) {
    return this.request(`/refunds/${id}`);
  }


  async processRefund(id: number) {
    return this.request(`/refunds/${id}/process`, {
      method: 'POST',
    });
  }
}

export const adminApi = new AdminApiService();

/**
 * Generic admin API request helper
 * For use in other service modules
 */
export async function adminRequest<T = any>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  endpoint: string,
  body?: any
): Promise<T> {
  const token = localStorage.getItem('adminToken');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (body && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`/api/admin${endpoint}`, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Request failed: ${response.statusText}`);
  }

  return data;
}

