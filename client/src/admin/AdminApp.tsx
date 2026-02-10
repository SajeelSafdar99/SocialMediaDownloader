import { Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { adminApi } from "./shared/api/adminApi";
import type { Admin } from "./shared/types";
import LoginPage from "./features/auth/LoginPage";
import DashboardPage from "./features/dashboard/DashboardPage";
import UsersPage from "./features/users/UsersPage";
import TransactionsPage from "./features/transactions/TransactionsPage";
import RefundsPage from "./features/refunds/RefundsPageNew";
import BlogListPage from "./features/blog/BlogListPage";
import BlogEditorPage from "./features/blog/BlogEditorPage";
import QueryInboxPage from "./features/queries/QueryInboxPage";
import UserManagementPage from "./features/users/UserManagementPage";
import EnhancedActivityLogsPage from "./features/logs/EnhancedActivityLogsPage";
import EmailTemplatesPage from "./features/emails/EmailTemplatesPage";
import SubscriptionPlansPage from "./features/subscriptions/SubscriptionPlansPage";
import AdminLayout from "./core/layout/AdminLayout";

function AdminApp() {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const data = await adminApi.getCurrentAdmin();
      if (data.ok && data.admin) {
        setAdmin(data.admin);
      } else {
        localStorage.removeItem("adminToken");
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      localStorage.removeItem("adminToken");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (token: string, adminData: Admin) => {
    localStorage.setItem("adminToken", token);
    setAdmin(adminData);
  };

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    setAdmin(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!admin) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#fff',
            color: '#363636',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      <AdminLayout admin={admin} onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/user-management" element={<UserManagementPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/refunds" element={<RefundsPage />} />
          <Route path="/subscription-plans" element={<SubscriptionPlansPage />} />
          <Route path="/blog" element={<BlogListPage />} />
          <Route path="/blog/new" element={<BlogEditorPage />} />
          <Route path="/blog/edit/:id" element={<BlogEditorPage />} />
          <Route path="/queries" element={<QueryInboxPage />} />
          <Route path="/email-templates" element={<EmailTemplatesPage />} />
          <Route path="/activity-logs" element={<EnhancedActivityLogsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AdminLayout>
    </>
  );
}

export default AdminApp;
