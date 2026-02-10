import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/components/Card';
import { Badge } from '../../shared/components/Badge';
import { Input } from '../../shared/components/Input';
import { Activity, CheckCircle, XCircle, TrendingUp, TrendingDown, AlertTriangle, Users, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../shared/components/Button';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

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
  const [activeTab, setActiveTab] = useState<'all' | 'admin' | 'users'>('all');
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [failedCalls, setFailedCalls] = useState<any>({ failedCalls: [], byEndpoint: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [successFilter, setSuccessFilter] = useState<string>('');
  const [resourceFilter, setResourceFilter] = useState<string>('');
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadLogs();
    loadStats();
    loadTrends();
    loadFailedCalls();
  }, [activeTab, search, successFilter, resourceFilter]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: '50',
        search: search || '',
        ...(successFilter && { success: successFilter }),
        ...(resourceFilter && { resource: resourceFilter }),
      });

      const endpoint =
        activeTab === 'admin' ? '/api/admin/activity-logs/admin' :
        activeTab === 'users' ? '/api/admin/activity-logs/users' :
        '/api/admin/activity-logs';

      const response = await fetch(`${endpoint}?${params}`, {
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

  const loadTrends = async () => {
    try {
      const filterByUser = activeTab === 'users';
      const filterByAdmin = activeTab === 'admin';

      const params = new URLSearchParams({
        days: '7',
        ...(filterByUser && { filterByUser: 'true' }),
        ...(filterByAdmin && { filterByAdmin: 'true' }),
      });

      const response = await fetch(`/api/admin/activity-logs/trends?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
      });

      const data = await response.json();
      if (data.ok) {
        setTrends(data.trends);
      }
    } catch (error) {
      console.error('Failed to load trends');
    }
  };

  const loadFailedCalls = async () => {
    try {
      const response = await fetch('/api/admin/activity-logs/failed?limit=20', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
      });

      const data = await response.json();
      if (data.ok) {
        setFailedCalls(data);
      }
    } catch (error) {
      console.error('Failed to load failed calls');
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
      download: 'info',
    };
    return <Badge variant={(colors[action] as any) || 'default'}>{action}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Activity Logs</h1>
        <p className="text-gray-500 mt-1">Comprehensive system activity tracking with trends</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'all'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('all')}
        >
          <Activity className="inline h-4 w-4 mr-2" />
          All Logs
        </button>
        <button
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'admin'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('admin')}
        >
          <Shield className="inline h-4 w-4 mr-2" />
          Admin Logs
        </button>
        <button
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'users'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('users')}
        >
          <Users className="inline h-4 w-4 mr-2" />
          User Logs
        </button>
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
                <TrendingUp className="h-8 w-8 text-indigo-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Trends Chart */}
      {trends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Success vs Failure Trends (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="success" stroke="#10b981" strokeWidth={2} name="Success" />
                <Line type="monotone" dataKey="failure" stroke="#ef4444" strokeWidth={2} name="Failure" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Failed API Calls */}
      {failedCalls.byEndpoint.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Failing APIs (Most Common)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {failedCalls.byEndpoint.map((item: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                  <div className="flex-1">
                    <p className="font-mono text-sm text-gray-900">{item.endpoint}</p>
                    <p className="text-xs text-gray-500 mt-1">{item.latestError}</p>
                  </div>
                  <Badge variant="danger">{item.count} failures</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
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
              <option value="download">Downloads</option>
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
            <Card key={log.id} className={`hover:shadow-sm transition-shadow ${!log.success ? 'border-red-200 bg-red-50' : ''}`}>
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
                      {log.userRole === 'admin' && (
                        <Badge variant="warning">
                          <Shield className="h-3 w-3 inline mr-1" />
                          Admin
                        </Badge>
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
                      <div className="mt-2 p-2 bg-red-100 border border-red-200 rounded">
                        <p className="text-xs text-red-700 font-semibold">
                          <AlertTriangle className="h-3 w-3 inline mr-1" />
                          Error: {log.errorMessage}
                        </p>
                      </div>
                    )}
                    {log.endpoint && (
                      <p className="text-xs text-gray-400 mt-1 font-mono">
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
