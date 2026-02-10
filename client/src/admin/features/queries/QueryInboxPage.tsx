import { useState, useEffect } from 'react';
import { queryApi, ContactQuery } from '../../shared/api/queryApi';
import { Button } from '../../shared/components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/components/Card';
import { Badge } from '../../shared/components/Badge';
import { Mail, MailOpen, CheckCircle, XCircle, Clock, User } from 'lucide-react';
import toast from 'react-hot-toast';

export default function QueryInboxPage() {
  const [queries, setQueries] = useState<ContactQuery[]>([]);
  const [selectedQuery, setSelectedQuery] = useState<ContactQuery | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [stats, setStats] = useState({ total: 0, new: 0, inProgress: 0, resolved: 0 });

  useEffect(() => {
    loadQueries();
    loadStats();
  }, [statusFilter]);

  const loadQueries = async () => {
    try {
      setLoading(true);
      const response = await queryApi.getQueries({
        status: statusFilter || undefined,
        limit: 50,
      });

      if (response.ok) {
        // API returns array of {query, assignedToUser}, extract just the query objects
        const queriesData = response.queries.map((item: any) => ({
          ...item.query,
          assignedToUser: item.assignedToUser
        }));
        setQueries(queriesData);
      }
    } catch (error) {
      toast.error('Failed to load queries');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await queryApi.getStats();
      if (response.ok) {
        setStats(response.stats);
      }
    } catch (error) {
      console.error('Failed to load stats');
    }
  };

  const handleUpdateStatus = async (id: number, status: string, notes?: string) => {
    try {
      const response = await queryApi.updateQuery(id, { status, adminNotes: notes });
      if (response.ok) {
        toast.success('Status updated successfully');
        loadQueries();
        loadStats();
        if (selectedQuery?.id === id) {
          setSelectedQuery(response.query);
        }
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleAssign = async (id: number) => {
    try {
      const response = await queryApi.assignQuery(id);
      if (response.ok) {
        toast.success('Query assigned to you');
        loadQueries();
        if (selectedQuery?.id === id) {
          setSelectedQuery(response.query);
        }
      }
    } catch (error) {
      toast.error('Failed to assign query');
    }
  };

  const getStatusBadge = (status?: string) => {
    const config: Record<string, { variant: 'default' | 'warning' | 'info' | 'success' | 'danger', icon: any }> = {
      new: { variant: 'info', icon: Mail },
      in_progress: { variant: 'warning', icon: Clock },
      resolved: { variant: 'success', icon: CheckCircle },
      spam: { variant: 'danger', icon: XCircle },
    };
    const displayStatus = status || 'new';
    const { variant, icon: Icon } = config[displayStatus] || config.new;
    return (
      <Badge variant={variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {displayStatus.replace('_', ' ')}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Contact Queries</h1>
        <p className="text-gray-500 mt-1">Manage customer inquiries</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card key="stat-total">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <Mail className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card key="stat-new">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">New</p>
                <p className="text-2xl font-bold text-blue-600">{stats.new}</p>
              </div>
              <MailOpen className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card key="stat-inProgress">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">In Progress</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.inProgress}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
        <Card key="stat-resolved">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Resolved</p>
                <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-3 gap-6">
        {/* Query List */}
        <div className="col-span-1 space-y-2">
          <div className="mb-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Queries</option>
              <option value="new">New</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="spam">Spam</option>
            </select>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : queries.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Mail className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">No queries found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {queries.map((query) => (
                <Card
                  key={query.id}
                  className={`cursor-pointer hover:shadow-md transition-shadow ${
                    selectedQuery?.id === query.id ? 'ring-2 ring-indigo-500' : ''
                  }`}
                  onClick={() => setSelectedQuery(query)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-900 text-sm">{query.name}</h4>
                      {getStatusBadge(query.status)}
                    </div>
                    <p className="text-xs text-gray-500 mb-1">{query.email}</p>
                    <p className="text-sm text-gray-600 line-clamp-2">{query.message}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {query.createdAt ? new Date(query.createdAt).toLocaleDateString() : 'No date'}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Query Detail */}
        <div className="col-span-2">
          {selectedQuery ? (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{selectedQuery.subject || 'No Subject'}</CardTitle>
                    <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                      <User className="h-4 w-4" />
                      {selectedQuery.name} ({selectedQuery.email})
                    </div>
                  </div>
                  {getStatusBadge(selectedQuery.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Message</h4>
                  <p className="text-gray-900 whitespace-pre-wrap">{selectedQuery.message}</p>
                </div>

                {selectedQuery.adminNotes && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Admin Notes</h4>
                    <p className="text-gray-600 whitespace-pre-wrap">{selectedQuery.adminNotes}</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-4 border-t">
                  {selectedQuery.status === 'new' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleAssign(selectedQuery.id)}
                      >
                        Assign to Me
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateStatus(selectedQuery.id, 'in_progress')}
                      >
                        Mark In Progress
                      </Button>
                    </>
                  )}
                  {selectedQuery.status === 'in_progress' && (
                    <Button
                      size="sm"
                      onClick={() => handleUpdateStatus(selectedQuery.id, 'resolved')}
                    >
                      Mark Resolved
                    </Button>
                  )}
                  {selectedQuery.status !== 'spam' && (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleUpdateStatus(selectedQuery.id, 'spam')}
                    >
                      Mark as Spam
                    </Button>
                  )}
                </div>

                <div className="text-xs text-gray-500">
                  Created: {selectedQuery.createdAt ? new Date(selectedQuery.createdAt).toLocaleString() : 'No date'}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Mail className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">Select a query to view details</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
