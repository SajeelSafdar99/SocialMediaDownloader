import { Link, useLocation } from "react-router-dom";
import { ReactNode, useState } from "react";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  DollarSign,
  FileText,
  Mail,
  LogOut,
  Shield,
  Activity,
  Send,
  Calendar,
  Menu,
  X,
} from "lucide-react";

interface AdminLayoutProps {
  admin: {
    username: string;
    email: string;
    permissions?: string[];
  };
  onLogout: () => void;
  children: ReactNode;
}

function AdminLayout({ admin, onLogout, children }: AdminLayoutProps) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Helper to check if user has permission
  const hasPermission = (permission: string) => {
    if (!admin.permissions) return true; // If no permissions array, show all (backward compatible)
    return admin.permissions.includes(permission);
  };

  // Helper to check if user has any of the permissions
  const hasAnyPermission = (permissions: string[]) => {
    if (!admin.permissions) return true;
    return permissions.some(p => admin.permissions!.includes(p));
  };

  const navItems = [
    {
      path: "/",
      label: "Dashboard",
      icon: LayoutDashboard,
      permission: null, // Dashboard visible to everyone
    },
    {
      path: "/users",
      label: "Users",
      icon: Users,
      permission: "users.read",
    },
    {
      path: "/user-management",
      label: "Roles & Permissions",
      icon: Shield,
      permission: "users.assign_roles",
    },
    {
      path: "/blog",
      label: "Blog",
      icon: FileText,
      permission: "blog.read",
    },
    {
      path: "/queries",
      label: "Queries",
      icon: Mail,
      permission: "queries.read",
    },
    {
      path: "/transactions",
      label: "Transactions",
      icon: CreditCard,
      permission: "transactions.read",
    },
    {
      path: "/refunds",
      label: "Refunds",
      icon: DollarSign,
      permission: "refunds.read",
    },
    {
      path: "/subscription-plans",
      label: "Subscription Plans",
      icon: Calendar,
      permission: "transactions.read", // Same as transactions for now
    },
    {
      path: "/email-templates",
      label: "Email Templates",
      icon: Send,
      permission: "email_templates.read",
    },
    {
      path: "/activity-logs",
      label: "Activity Logs",
      icon: Activity,
      permission: "analytics.read",
    },
  ];

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/admin" || location.pathname === "/admin/";
    }
    return location.pathname.startsWith(`/admin${path}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-lg font-bold text-white">VidGrabber Admin</h1>
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-white p-2 hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Toggle menu"
          >
            {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Reduced width from w-64 to w-56 */}
      <div className={`fixed inset-y-0 left-0 w-56 bg-gray-900 text-white transform transition-transform duration-300 ease-in-out z-40 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0`}>
        <div className="flex flex-col h-full">
          {/* Logo - Hidden on mobile (shown in top bar) */}
          <div className="hidden lg:block px-4 py-4 border-b border-gray-800">
            <h1 className="text-xl font-bold">VidGrabber</h1>
            <p className="text-xs text-gray-400">Admin Panel</p>
          </div>

          {/* Navigation - Reduced padding */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto mt-14 lg:mt-0">
            {navItems
              .filter(item => !item.permission || hasPermission(item.permission))
              .map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center px-3 py-2.5 rounded-lg transition-colors text-sm ${
                      isActive(item.path)
                        ? "bg-indigo-600 text-white"
                        : "text-gray-300 hover:bg-gray-800"
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="font-medium truncate">{item.label}</span>
                  </Link>
                );
              })}
          </nav>

          {/* User info & Logout - Compact version */}
          <div className="px-3 py-3 border-t border-gray-800">
            <div className="px-2 py-1.5 mb-2">
              <p className="text-xs font-medium truncate">{admin.username}</p>
              <p className="text-xs text-gray-400 truncate">{admin.email}</p>
            </div>
            <button
              onClick={onLogout}
              className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2"
            >
              <LogOut className="h-3.5 w-3.5" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - Adjusted margin and padding for mobile */}
      <div className="lg:ml-56 pt-14 lg:pt-0">
        <div className="p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}

export default AdminLayout;
