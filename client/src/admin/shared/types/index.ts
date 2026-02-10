/**
 * Shared TypeScript types for Admin Panel
 */

export interface Admin {
  id: number;
  username: string;
  email: string;
  role: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  isPremium: boolean;
  role: string;
  createdAt: string;
}

export interface Transaction {
  id: number;
  userId: number;
  username: string;
  email: string;
  provider: string;
  amount: number;
  currency: string;
  status: string;
  transactionId: string;
  createdAt: string;
  completedAt: string | null;
  refundedAt: string | null;
}

export interface Refund {
  id: number;
  paymentId: number;
  userId: number;
  username: string;
  email: string;
  amount: number;
  currency: string;
  reason: string | null;
  status: string;
  provider: string;
  providerRefundId: string | null;
  transactionId: string;
  createdAt: string;
  completedAt: string | null;
}

export interface DashboardStats {
  activeUsers: number;
  totalUsers: number;
  totalSubscriptions: number;
  totalRevenue: number;
  totalTransactions: number;
  totalRefunds: number;
  totalRefundAmount: number;
}

export interface TrendData {
  month: string;
  count: number;
  label: string;
}

export interface ApiResponse<T = any> {
  ok: boolean;
  error?: string;
  [key: string]: any;
}
