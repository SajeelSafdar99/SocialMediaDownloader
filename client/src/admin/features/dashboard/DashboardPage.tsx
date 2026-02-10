import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useDashboardStats, useRegistrationTrends, useSubscriptionTrends } from "../../shared/hooks/useAdminData";

function DashboardPage() {
  const { data: stats, loading: statsLoading, error: statsError, refetch: refetchStats } = useDashboardStats();
  const { data: registrationTrends, loading: regLoading, refetch: refetchReg } = useRegistrationTrends();
  const { data: subscriptionTrends, loading: subLoading, refetch: refetchSub } = useSubscriptionTrends();

  const loading = statsLoading || regLoading || subLoading;
  const error = statsError;

  const fetchDashboardData = async () => {
    await Promise.all([refetchStats(), refetchReg(), refetchSub()]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
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

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const statCards = [
    {
      title: "Active Users",
      value: stats?.activeUsers || 0,
      icon: "👥",
      color: "bg-blue-500",
      description: "Last 24 hours",
    },
    {
      title: "Total Users",
      value: stats?.totalUsers || 0,
      icon: "📊",
      color: "bg-green-500",
      description: "All time",
    },
    {
      title: "Subscriptions",
      value: stats?.totalSubscriptions || 0,
      icon: "⭐",
      color: "bg-purple-500",
      description: "Premium users",
    },
    {
      title: "Total Revenue",
      value: formatCurrency(stats?.totalRevenue || 0),
      icon: "💰",
      color: "bg-yellow-500",
      description: "All time earnings",
    },
    {
      title: "Transactions",
      value: stats?.totalTransactions || 0,
      icon: "💳",
      color: "bg-indigo-500",
      description: "Completed payments",
    },
    {
      title: "Refunds",
      value: stats?.totalRefunds || 0,
      icon: "↩️",
      color: "bg-red-500",
      description: formatCurrency(stats?.totalRefundAmount || 0),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Overview of your platform's performance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((card, index) => (
          <div key={index} className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 ${card.color} rounded-lg flex items-center justify-center text-2xl`}>
                  {card.icon}
                </div>
              </div>
              <h3 className="text-gray-500 text-sm font-medium mb-1">{card.title}</h3>
              <p className="text-3xl font-bold text-gray-900 mb-1">{card.value}</p>
              <p className="text-sm text-gray-500">{card.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Monthly User Registrations */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Monthly User Registrations</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={registrationTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} name="New Users" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Subscription Purchases */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Subscription Purchases</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={subscriptionTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#8b5cf6" name="Subscriptions" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <a
            href="/admin/users"
            className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-center"
          >
            <div className="text-2xl mb-2">👥</div>
            <div className="font-medium text-gray-900">Manage Users</div>
          </a>
          <a
            href="/admin/transactions"
            className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-center"
          >
            <div className="text-2xl mb-2">💳</div>
            <div className="font-medium text-gray-900">View Transactions</div>
          </a>
          <a
            href="/admin/refunds"
            className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-center"
          >
            <div className="text-2xl mb-2">💰</div>
            <div className="font-medium text-gray-900">Process Refunds</div>
          </a>
          <button
            onClick={fetchDashboardData}
            className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-center"
          >
            <div className="text-2xl mb-2">🔄</div>
            <div className="font-medium text-gray-900">Refresh Data</div>
          </button>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
