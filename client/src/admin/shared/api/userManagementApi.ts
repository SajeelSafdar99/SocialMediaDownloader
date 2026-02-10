import { adminApi } from './adminApi';

export interface Role {
  id: number;
  name: string;
  description?: string;
}

export interface Permission {
  id: number;
  name: string;
  description?: string;
  resource: string;
  action: string;
}

export const userManagementApi = {
  // Users
  async getUsers(params?: {
    limit?: number;
    offset?: number;
    search?: string;
    role?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    if (params?.offset) queryParams.set('offset', params.offset.toString());
    if (params?.search) queryParams.set('search', params.search);
    if (params?.role) queryParams.set('role', params.role);

    return adminApi.request<any>(`/user-management/users?${queryParams}`);
  },

  async getUser(id: number) {
    return adminApi.request<any>(`/user-management/users/${id}`);
  },

  async createUser(data: any) {
    return adminApi.request<any>('/user-management/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateUser(id: number, data: any) {
    return adminApi.request<any>(`/user-management/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteUser(id: number) {
    return adminApi.request(`/user-management/users/${id}`, {
      method: 'DELETE',
    });
  },

  async assignRole(userId: number, roleId: number) {
    return adminApi.request<any>(`/user-management/users/${userId}/assign-role`, {
      method: 'POST',
      body: JSON.stringify({ roleId }),
    });
  },

  // Roles
  async getRoles() {
    return adminApi.request<{ roles: Role[] }>('/user-management/roles');
  },

  async createRole(data: { name: string; description?: string }) {
    return adminApi.request<{ role: Role }>('/user-management/roles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Permissions
  async getPermissions() {
    return adminApi.request<{ permissions: Permission[] }>('/user-management/permissions');
  },

  async getRolePermissions(roleId: number) {
    return adminApi.request<{ permissions: Permission[] }>(`/user-management/roles/${roleId}/permissions`);
  },

  async updateRolePermissions(roleId: number, permissionIds: number[]) {
    return adminApi.request(`/user-management/roles/${roleId}/permissions`, {
      method: 'PUT',
      body: JSON.stringify({ permissionIds }),
    });
  },
};
