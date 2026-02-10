import { adminApi } from './adminApi';

export interface ActivityLog {
  id: number;
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
  requestBody?: string;
  responseStatus?: number;
  success: boolean;
  errorMessage?: string;
  durationMs?: number;
  createdAt: string;
}

export const activityLogsApi = {
  async getLogs(params?: {
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
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    if (params?.offset) queryParams.set('offset', params.offset.toString());
    if (params?.userId) queryParams.set('userId', params.userId.toString());
    if (params?.action) queryParams.set('action', params.action);
    if (params?.resource) queryParams.set('resource', params.resource);
    if (params?.success !== undefined) queryParams.set('success', params.success.toString());
    if (params?.startDate) queryParams.set('startDate', params.startDate.toISOString());
    if (params?.endDate) queryParams.set('endDate', params.endDate.toISOString());
    if (params?.search) queryParams.set('search', params.search);

    return adminApi.request<{
      logs: ActivityLog[];
      total: number;
      hasMore: boolean;
    }>(`/activity-logs?${queryParams}`);
  },

  async getStats(params?: {
    startDate?: Date;
    endDate?: Date;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.set('startDate', params.startDate.toISOString());
    if (params?.endDate) queryParams.set('endDate', params.endDate.toISOString());

    return adminApi.request<{
      stats: {
        total: number;
        success: number;
        failure: number;
        byResource: Array<{ resource: string; count: number }>;
        byAction: Array<{ action: string; count: number }>;
      };
    }>(`/activity-logs/stats?${queryParams}`);
  },

  async cleanupOldLogs(daysOld: number) {
    return adminApi.request(`/activity-logs/cleanup?daysOld=${daysOld}`, {
      method: 'DELETE',
    });
  },
};
