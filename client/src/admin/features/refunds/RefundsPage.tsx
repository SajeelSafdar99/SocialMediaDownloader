import { useState } from "react";
import { useRefunds, useCreateRefund, useProcessRefund } from "../../shared/hooks/useAdminData";
import type { Refund } from "../../shared/types";

function RefundsPage() {
  const { data: refunds = [], loading, error, refetch } = useRefunds(50, 0);
  const { mutate: createRefund, loading: creating } = useCreateRefund();
  const { mutate: processRefundMutation, loading: processing } = useProcessRefund();
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRefund, setNewRefund] = useState({
    paymentId: "",
    userId: "",
    amount: "",
    currency: "USD",
    reason: "",
  });

  const handleProcessRefund = async (refundId: number) => {
    if (!confirm("Are you sure you want to process this refund? This action cannot be undone.")) {
      return;
    }

    try {
      setProcessingId(refundId);
      await processRefundMutation(refundId);
      alert("Refund processed successfully");
      await refetch();
    } catch (err) {
      console.error("Failed to process refund:", err);
      alert(`Failed to process refund: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleCreateRefund = async () => {
    try {
      await createRefund({
        paymentId: parseInt(newRefund.paymentId),
        userId: parseInt(newRefund.userId),
        amount: parseInt(newRefund.amount),
        currency: newRefund.currency,
        reason: newRefund.reason,
      });
      alert("Refund request created successfully");
      setShowCreateModal(false);
      setNewRefund({
        paymentId: "",
        userId: "",
        amount: "",
        currency: "USD",
        reason: "",
      });
      await refetch();
    } catch (err) {
      console.error("Failed to create refund:", err);
      alert(`Failed to create refund: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  const formatCurrency = (cents: number, currency: string) => {
    return `${currency} ${(cents / 100).toFixed(2)}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading refunds...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Refunds Management</h1>
          <p className="text-gray-600 mt-2">Process and track refund requests</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            disabled={loading}
          >
            ➕ Create Refund
          </button>
          <button
            onClick={refetch}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            disabled={loading}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Refunds Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Refund ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transaction
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Provider
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reason
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {refunds.map((refund) => (
                <tr key={refund.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">#{refund.id}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(refund.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {refund.username || "N/A"}
                    </div>
                    <div className="text-xs text-gray-500">{refund.email || "N/A"}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{refund.transactionId}</div>
                    <div className="text-xs text-gray-500">Payment: {refund.paymentId}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-gray-900">
                      {formatCurrency(refund.amount, refund.currency)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900 capitalize">{refund.provider}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                        refund.status
                      )}`}
                    >
                      {refund.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-xs truncate">
                      {refund.reason || "No reason provided"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {refund.status === "pending" && (
                      <button
                        onClick={() => handleProcessRefund(refund.id)}
                        disabled={processingId === refund.id}
                        className="text-blue-600 hover:text-blue-900 disabled:text-gray-400 disabled:cursor-not-allowed"
                      >
                        {processingId === refund.id ? "Processing..." : "Process"}
                      </button>
                    )}
                    {refund.status === "completed" && (
                      <span className="text-green-600">✓ Completed</span>
                    )}
                    {refund.status === "failed" && (
                      <span className="text-red-600">✗ Failed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {refunds.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No refunds found</p>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="text-sm text-gray-500 mb-1">Total Refunds</div>
          <div className="text-2xl font-bold text-gray-900">{refunds.length}</div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="text-sm text-gray-500 mb-1">Pending</div>
          <div className="text-2xl font-bold text-yellow-600">
            {refunds.filter((r) => r.status === "pending").length}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="text-sm text-gray-500 mb-1">Completed</div>
          <div className="text-2xl font-bold text-green-600">
            {refunds.filter((r) => r.status === "completed").length}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="text-sm text-gray-500 mb-1">Failed</div>
          <div className="text-2xl font-bold text-red-600">
            {refunds.filter((r) => r.status === "failed").length}
          </div>
        </div>
      </div>

      {/* Create Refund Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Create Refund Request</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment ID
                </label>
                <input
                  type="number"
                  value={newRefund.paymentId}
                  onChange={(e) => setNewRefund({ ...newRefund, paymentId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="Enter payment ID"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  User ID
                </label>
                <input
                  type="number"
                  value={newRefund.userId}
                  onChange={(e) => setNewRefund({ ...newRefund, userId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="Enter user ID"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (in cents)
                </label>
                <input
                  type="number"
                  value={newRefund.amount}
                  onChange={(e) => setNewRefund({ ...newRefund, amount: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="e.g., 999 for $9.99"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Currency
                </label>
                <select
                  value={newRefund.currency}
                  onChange={(e) => setNewRefund({ ...newRefund, currency: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason
                </label>
                <textarea
                  value={newRefund.reason}
                  onChange={(e) => setNewRefund({ ...newRefund, reason: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                  placeholder="Enter refund reason..."
                />
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={handleCreateRefund}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Create Refund
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RefundsPage;
