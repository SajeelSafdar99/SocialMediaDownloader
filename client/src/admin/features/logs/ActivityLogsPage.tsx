import { useState, useEffect } from 'react';
import { Card, CardContent } from '../../shared/components/Card';
import { Badge } from '../../shared/components/Badge';
import { Input } from '../../shared/components/Input';
import { Activity, CheckCircle, XCircle, Filter, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../shared/components/Button';

interface ActivityLog {
  id: number;
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
  success: boolean;
  errorMessage?: string;
  durationMs?: number;
  createdAt: string;
}

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [successFilter, setSuccessFilter] = useState<string>('');
  const [resourceFilter, setResourceFilter] = useState<string>('');
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadLogs();
    loadStats();
  }, [search, successFilter, resourceFilter]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: '50',
        search: search || '',
        ...(successFilter && { success: successFilter }),
        ...(resourceFilter && { resource: resourceFilter }),
      });

      const response = await fetch(`/api/admin/activity-logs?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
      });

      const data = await response.json();
      if (data.ok) {
        setLogs(data.logs);
        setTotal(data.total);
      }
    } catch (error) {
      toast.error('Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/admin/activity-logs/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
      });

      const data = await response.json();
      if (data.ok) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to load stats');
    }
  };

  const getSuccessBadge = (success: boolean) => {
    return success ? (
      <Badge variant="success" className="flex items-center gap-1">
        <CheckCircle className="h-3 w-3" />
        Success
      </Badge>
    ) : (
      <Badge variant="danger" className="flex items-center gap-1">
        <XCircle className="h-3 w-3" />
        Failed
      </Badge>
    );
  };

  const getActionBadge = (action: string) => {
    const colors: Record<string, string> = {
      create: 'success',
      update: 'warning',
      delete: 'danger',
      view: 'info',
      login: 'info',
    };
    return <Badge variant={(colors[action] as any) || 'default'}>{action}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Activity Logs</h1>
        <p className="text-gray-500 mt-1">Comprehensive system activity tracking</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Activities</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <Activity className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Successful</p>
                  <p className="text-2xl font-bold text-green-600">{stats.success}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Failed</p>
                  <p className="text-2xl font-bold text-red-600">{stats.failure}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Success Rate</p>
                  <p className="text-2xl font-bold text-indigo-600">
                    {stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0}%
                  </p>
                </div>
                <Activity className="h-8 w-8 text-indigo-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search logs..."
                value={search}
                onChange={(e: any) => setSearch(e.target.value)}
              />
            </div>
            <select
              value={successFilter}
              onChange={(e) => setSuccessFilter(e.target.value)}
              className="h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Status</option>
              <option value="true">Success</option>
              <option value="false">Failed</option>
            </select>
            <select
              value={resourceFilter}
              onChange={(e) => setResourceFilter(e.target.value)}
              className="h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Resources</option>
              <option value="user">Users</option>
              <option value="blog">Blog</option>
              <option value="query">Queries</option>
              <option value="transaction">Transactions</option>
              <option value="role">Roles</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      {loading ? (
        <div className="grid gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : logs.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Activity className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No logs found</h3>
            <p className="text-gray-500">Try adjusting your filters</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <Card key={log.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getActionBadge(log.action)}
                      <Badge variant="default">{log.resource}</Badge>
                      {getSuccessBadge(log.success)}
                      {log.method && (
                        <Badge variant="info">{log.method}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-900 mb-1">
                      {log.description || `${log.action} on ${log.resource}`}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      {log.username && <span>User: {log.username}</span>}
                      {log.userRole && <span>Role: {log.userRole}</span>}
                      {log.ipAddress && <span>IP: {log.ipAddress}</span>}
                      {log.durationMs && <span>{log.durationMs}ms</span>}
                      <span>{new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                    {log.errorMessage && (
                      <p className="text-xs text-red-600 mt-1">
                        Error: {log.errorMessage}
                      </p>
                    )}
                    {log.endpoint && (
                      <p className="text-xs text-gray-400 mt-1">
                        {log.endpoint}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Stats */}
      {total > 0 && (
        <div className="text-sm text-gray-500 text-center">
          Showing {logs.length} of {total} logs
        </div>
      )}
    </div>
  );
}
