import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/components/Card';
import { Badge } from '../../shared/components/Badge';
import { Button } from '../../shared/components/Button';
import { Input } from '../../shared/components/Input';
import { DollarSign, Search, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

interface Refund {
  id: number;
  paymentId: number;
  userId: number;
  amount: number;
  currency: string;
  reason?: string;
  status: string;
  processedAt?: string;
  createdAt: string;
  user?: {
    username: string;
    email: string;
  };
}

export default function RefundsPage() {
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadRefunds();
  }, [statusFilter, search]);

  const loadRefunds = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: '50',
        ...(statusFilter && { status: statusFilter }),
        ...(search && { search }),
      });

      const response = await fetch(`/api/admin/refunds?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
      });

      const data = await response.json();
      if (data.ok) {
        setRefunds(data.refunds);
        setTotal(data.total);
      }
    } catch (error) {
      toast.error('Failed to load refunds');
    } finally {
      setLoading(false);
    }
  };


  const handleProcessRefund = async (refundId: number) => {
    if (!confirm('Are you sure you want to process this refund? This action cannot be undone.')) {
      return;
    }

    try {
      setProcessingId(refundId);
      const response = await fetch(`/api/admin/refunds/${refundId}/process`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
      });

      const data = await response.json();
      if (data.ok) {
        toast.success('Refund processed successfully');
        loadRefunds();
      } else {
        toast.error(data.error || 'Failed to process refund');
      }
    } catch (error) {
      toast.error('Failed to process refund');
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: { variant: 'warning', icon: Clock, text: 'Pending' },
      processing: { variant: 'info', icon: Clock, text: 'Processing' },
      completed: { variant: 'success', icon: CheckCircle, text: 'Completed' },
      failed: { variant: 'danger', icon: XCircle, text: 'Failed' },
      cancelled: { variant: 'default', icon: XCircle, text: 'Cancelled' },
    };

    const config = variants[status] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.text}
      </Badge>
    );
  };

  const stats = {
    total: refunds.length,
    pending: refunds.filter(r => r.status === 'pending').length,
    completed: refunds.filter(r => r.status === 'completed').length,
    totalAmount: refunds.reduce((sum, r) => sum + r.amount, 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Refund Requests</h1>
          <p className="text-gray-500 mt-1">Review and process user refund requests</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Refunds</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <DollarSign className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Amount</p>
                <p className="text-2xl font-bold text-indigo-600">
                  ${stats.totalAmount.toFixed(2)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-indigo-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search refunds..."
                value={search}
                onChange={(e: any) => setSearch(e.target.value)}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Refunds List */}
      {loading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : refunds.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No refunds found</h3>
            <p className="text-gray-500">Try adjusting your filters or create a new refund</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {refunds.map((refund) => (
            <Card key={refund.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Refund #{refund.id}
                      </h3>
                      {getStatusBadge(refund.status)}
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-2">
                      <div>
                        <p className="font-medium text-gray-900">Amount:</p>
                        <p className="text-xl font-bold text-green-600">
                          {refund.currency} ${refund.amount.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">User:</p>
                        <p>{refund.user?.username || `User #${refund.userId}`}</p>
                        <p className="text-xs text-gray-500">{refund.user?.email}</p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Payment ID:</p>
                        <p>#{refund.paymentId}</p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Created:</p>
                        <p>{new Date(refund.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                    {refund.reason && (
                      <div className="mt-2 p-3 bg-gray-50 rounded border border-gray-200">
                        <p className="text-sm font-medium text-gray-700">Reason:</p>
                        <p className="text-sm text-gray-600">{refund.reason}</p>
                      </div>
                    )}
                    {refund.processedAt && (
                      <p className="text-xs text-gray-500 mt-2">
                        Processed: {new Date(refund.processedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="ml-4">
                    {refund.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => handleProcessRefund(refund.id)}
                        isLoading={processingId === refund.id}
                      >
                        Process Refund
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Total */}
      {total > 0 && (
        <div className="text-sm text-gray-500 text-center">
          Showing {refunds.length} of {total} refunds
        </div>
      )}
    </div>
  );
}

